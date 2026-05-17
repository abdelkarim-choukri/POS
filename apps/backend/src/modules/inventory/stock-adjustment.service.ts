import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockAdjustment } from '../../common/entities/stock-adjustment.entity';
import { StockAdjustmentItem } from '../../common/entities/stock-adjustment-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockBatchService } from './stock-batch.service';
import {
  CreateAdjustmentDto,
  RejectAdjustmentDto,
  ListAdjustmentsQueryDto,
} from './dto/stock-adjustment-transfer.dto';

@Injectable()
export class StockAdjustmentService {
  constructor(
    @InjectRepository(StockAdjustment) private adjRepo: Repository<StockAdjustment>,
    private stockBatchService: StockBatchService,
    private dataSource: DataSource,
  ) {}

  private async generateAdjNumber(businessId: string, qr: any): Promise<string> {
    const year = new Date().getFullYear();
    const [row] = await qr.query(
      `SELECT COUNT(*)::int AS cnt FROM stock_adjustments WHERE business_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [businessId, year],
    );
    return `ADJ-${year}-${String((row.cnt ?? 0) + 1).padStart(5, '0')}`;
  }

  // EXT-INV-010: List adjustments
  async listAdjustments(businessId: string, query: ListAdjustmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.adjRepo
      .createQueryBuilder('a')
      .where('a.business_id = :businessId', { businessId })
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.warehouse_id) qb.andWhere('a.warehouse_id = :wh', { wh: query.warehouse_id });
    if (query.from_date) qb.andWhere('a.created_at >= :from', { from: query.from_date });
    if (query.to_date) qb.andWhere('a.created_at <= :to', { to: query.to_date });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // EXT-INV-011: Get adjustment detail
  async getAdjustment(id: string, businessId: string) {
    const adj = await this.adjRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    return adj;
  }

  // EXT-INV-012: Create draft adjustment
  async createAdjustment(businessId: string, userId: string, dto: CreateAdjustmentDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const adjNumber = await this.generateAdjNumber(businessId, qr);

      const adj = qr.manager.create(StockAdjustment, {
        business_id: businessId,
        adjustment_number: adjNumber,
        warehouse_id: dto.warehouse_id,
        status: 'draft',
        reason: dto.reason,
        proposed_by_user_id: userId,
        notes: dto.notes ?? null,
      });
      const savedAdj = await qr.manager.save(StockAdjustment, adj);

      const items: StockAdjustmentItem[] = [];
      for (const itemDto of dto.items) {
        const batch = await qr.manager.findOne(StockBatch, {
          where: { id: itemDto.batch_id, business_id: businessId, warehouse_id: dto.warehouse_id },
        });
        if (!batch) throw new NotFoundException(
          `Batch ${itemDto.batch_id} not found`,
        );

        items.push(qr.manager.create(StockAdjustmentItem, {
          adjustment_id: savedAdj.id,
          product_id: itemDto.product_id,
          variant_id: itemDto.variant_id ?? null,
          batch_id: itemDto.batch_id,
          proposed_delta: itemDto.proposed_delta,
          current_quantity: Number(batch.quantity_remaining),
          notes: itemDto.notes ?? null,
        }));
      }
      await qr.manager.save(StockAdjustmentItem, items);

      await qr.commitTransaction();
      return this.adjRepo.findOne({ where: { id: savedAdj.id }, relations: ['items'] });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // EXT-INV-013: Submit (draft → pending_approval)
  async submitAdjustment(id: string, businessId: string) {
    const adj = await this.adjRepo.findOne({ where: { id, business_id: businessId } });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'draft') {
      throw new UnprocessableEntityException('Only draft adjustments can be submitted');
    }
    await this.adjRepo.update(id, { status: 'pending_approval' });
    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // EXT-INV-014: Approve (pending_approval → approved)
  async approveAdjustment(id: string, businessId: string, userId: string) {
    const adj = await this.adjRepo.findOne({ where: { id, business_id: businessId } });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'pending_approval') {
      throw new UnprocessableEntityException('Only pending_approval adjustments can be approved');
    }
    await this.adjRepo.update(id, {
      status: 'approved',
      approved_by_user_id: userId,
      approved_at: new Date(),
    });
    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // EXT-INV-015: Post (approved → posted, applies deltas atomically)
  async postAdjustment(id: string, businessId: string, userId: string) {
    const adj = await this.adjRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'approved') {
      throw new UnprocessableEntityException('Only approved adjustments can be posted');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Re-check status under row lock to prevent concurrent double-apply
      const locked = await qr.query(
        `SELECT status FROM stock_adjustments WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [id, businessId],
      );
      if (!locked[0] || locked[0].status !== 'approved') {
        throw new UnprocessableEntityException('Only approved adjustments can be posted');
      }

      for (const item of adj.items) {
        await this.stockBatchService.applyBatchAdjustmentInQr(
          qr,
          item.batch_id,
          businessId,
          Number(item.proposed_delta),
          userId,
          adj.reason,
          'stock_adjustment',
          adj.id,
        );
      }
      await qr.manager.update(StockAdjustment, id, {
        status: 'posted',
        posted_at: new Date(),
      });
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // EXT-INV-016: Reject (pending_approval → rejected)
  async rejectAdjustment(id: string, businessId: string, dto: RejectAdjustmentDto) {
    const adj = await this.adjRepo.findOne({ where: { id, business_id: businessId } });
    if (!adj) throw new NotFoundException('Stock adjustment not found');
    if (adj.status !== 'pending_approval') {
      throw new UnprocessableEntityException('Only pending_approval adjustments can be rejected');
    }
    await this.adjRepo.update(id, {
      status: 'rejected',
      rejected_reason: dto.reason,
    });
    return this.adjRepo.findOne({ where: { id }, relations: ['items'] });
  }
}
