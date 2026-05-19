import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockTransfer } from '../../common/entities/stock-transfer.entity';
import { StockTransferItem } from '../../common/entities/stock-transfer-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { StockBatchService } from './stock-batch.service';
import {
  CreateTransferDto,
  ListTransfersQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Injectable()
export class StockTransferService {
  constructor(
    @InjectRepository(StockTransfer) private transferRepo: Repository<StockTransfer>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    private stockBatchService: StockBatchService,
    private dataSource: DataSource,
  ) {}

  private async generateTrfNumber(businessId: string, qr: any): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM stock_transfers WHERE business_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [businessId, year],
    );
    return `TRF-${year}-${String((row.cnt ?? 0) + 1).padStart(5, '0')}`;
  }

  // EXT-INV-020: List transfers
  async listTransfers(businessId: string, query: ListTransfersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.transferRepo
      .createQueryBuilder('t')
      .where('t.business_id = :businessId', { businessId })
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('t.status = :status', { status: query.status });
    if (query.warehouse_id) {
      qb.andWhere(
        '(t.source_warehouse_id = :wh OR t.target_warehouse_id = :wh)',
        { wh: query.warehouse_id },
      );
    }
    if (query.from_date) qb.andWhere('t.created_at >= :from', { from: query.from_date });
    if (query.to_date) qb.andWhere('t.created_at <= :to', { to: query.to_date });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // EXT-INV-021: Get transfer detail
  async getTransfer(id: string, businessId: string) {
    const transfer = await this.transferRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!transfer) throw new NotFoundException({ error: 'INV_TRANSFER_NOT_FOUND', message: 'Stock transfer not found' });
    return transfer;
  }

  // EXT-INV-022: Create draft transfer
  async createTransfer(businessId: string, userId: string, dto: CreateTransferDto) {
    if (dto.source_warehouse_id === dto.target_warehouse_id) {
      throw new UnprocessableEntityException({ error: 'INV_TRANSFER_SAME_WAREHOUSE', message: 'Source and target warehouses must be different' });
    }

    const sourceWh = await this.warehouseRepo.findOne({
      where: { id: dto.source_warehouse_id, business_id: businessId },
    });
    if (!sourceWh) throw new NotFoundException({ error: 'INV_TRANSFER_SOURCE_NOT_FOUND', message: 'Source warehouse not found' });

    const targetWh = await this.warehouseRepo.findOne({
      where: { id: dto.target_warehouse_id, business_id: businessId },
    });
    if (!targetWh) throw new NotFoundException({ error: 'INV_TRANSFER_TARGET_NOT_FOUND', message: 'Target warehouse not found' });

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const trfNumber = await this.generateTrfNumber(businessId, qr);

      const transfer = qr.manager.create(StockTransfer, {
        business_id: businessId,
        transfer_number: trfNumber,
        source_warehouse_id: dto.source_warehouse_id,
        target_warehouse_id: dto.target_warehouse_id,
        status: 'draft',
        notes: dto.notes ?? null,
        created_by_user_id: userId,
      });
      const savedTransfer = await qr.manager.save(StockTransfer, transfer);

      const items: StockTransferItem[] = [];
      for (const itemDto of dto.items) {
        const batch = await qr.manager.findOne(StockBatch, {
          where: { id: itemDto.batch_id, business_id: businessId, warehouse_id: dto.source_warehouse_id },
        });
        if (!batch) {
          throw new UnprocessableEntityException({
            error: 'INV_TRANSFER_INSUFFICIENT_STOCK',
            message: `Batch ${itemDto.batch_id} not found in source warehouse`,
          });
        }
        items.push(qr.manager.create(StockTransferItem, {
          transfer_id: savedTransfer.id,
          product_id: itemDto.product_id,
          variant_id: itemDto.variant_id ?? null,
          batch_id: itemDto.batch_id,
          quantity: itemDto.quantity,
          notes: itemDto.notes ?? null,
        }));
      }
      await qr.manager.save(StockTransferItem, items);

      await qr.commitTransaction();
      return this.transferRepo.findOne({ where: { id: savedTransfer.id }, relations: ['items'] });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // EXT-INV-023: Post transfer (draft → posted, immutable after)
  async postTransfer(id: string, businessId: string, userId: string) {
    const transfer = await this.transferRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!transfer) throw new NotFoundException({ error: 'INV_TRANSFER_NOT_FOUND', message: 'Stock transfer not found' });
    if (transfer.status !== 'draft') {
      throw new UnprocessableEntityException({ error: 'INV_TRANSFER_INVALID_STATUS', message: 'Only draft transfers can be posted' });
    }
    if (!transfer.items?.length) {
      throw new UnprocessableEntityException({ error: 'INV_TRANSFER_EMPTY', message: 'Transfer has no items' });
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Re-check status under row lock to prevent concurrent double-post
      const locked = await qr.query(
        `SELECT status FROM stock_transfers WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [id, businessId],
      );
      if (!locked[0] || locked[0].status !== 'draft') {
        throw new UnprocessableEntityException({ error: 'INV_TRANSFER_INVALID_STATUS', message: 'Only draft transfers can be posted' });
      }

      for (const item of transfer.items) {
        await this.stockBatchService.executeBatchTransferInQr(
          qr,
          item.batch_id,
          businessId,
          transfer.target_warehouse_id,
          Number(item.quantity),
          userId,
          transfer.notes,
          'stock_transfer',
          transfer.id,
        );
      }
      await qr.manager.update(StockTransfer, id, {
        status: 'posted',
        posted_at: new Date(),
        posted_by_user_id: userId,
      });
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return this.transferRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // EXT-INV-024: Cancel (draft → cancelled)
  async cancelTransfer(id: string, businessId: string) {
    const transfer = await this.transferRepo.findOne({ where: { id, business_id: businessId } });
    if (!transfer) throw new NotFoundException({ error: 'INV_TRANSFER_NOT_FOUND', message: 'Stock transfer not found' });
    if (transfer.status !== 'draft') {
      throw new UnprocessableEntityException({ error: 'INV_TRANSFER_INVALID_STATUS', message: 'Only draft transfers can be cancelled' });
    }
    await this.transferRepo.update(id, { status: 'cancelled' });
    return this.transferRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // EXT-INV-025: Delete draft (hard delete)
  async deleteTransfer(id: string, businessId: string) {
    const transfer = await this.transferRepo.findOne({ where: { id, business_id: businessId } });
    if (!transfer) throw new NotFoundException({ error: 'INV_TRANSFER_NOT_FOUND', message: 'Stock transfer not found' });
    if (transfer.status !== 'draft') {
      throw new UnprocessableEntityException({ error: 'INV_TRANSFER_INVALID_STATUS', message: 'Only draft transfers can be deleted' });
    }
    await this.transferRepo.delete(id);
    return { deleted: true };
  }
}
