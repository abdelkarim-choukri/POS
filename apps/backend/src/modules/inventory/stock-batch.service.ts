import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import {
  ListBatchesQueryDto,
  CreateBatchDto,
  AdjustBatchDto,
  DisposeBatchDto,
  TransferBatchDto,
} from './dto/stock-engine.dto';

@Injectable()
export class StockBatchService {
  constructor(
    @InjectRepository(StockBatch) private batchRepo: Repository<StockBatch>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    private dataSource: DataSource,
  ) {}

  // ── INV-040: List Batches ───────────────────────────────────────────────────

  async listBatches(businessId: string, query: ListBatchesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const minQty = query.min_quantity ?? 0.001;

    const qb = this.batchRepo
      .createQueryBuilder('b')
      .where('b.business_id = :businessId', { businessId })
      .andWhere('b.quantity_remaining >= :minQty', { minQty })
      .orderBy('b.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.warehouse_id) {
      qb.andWhere('b.warehouse_id = :warehouseId', { warehouseId: query.warehouse_id });
    }

    if (query.product_id) {
      qb.andWhere('b.product_id = :productId', { productId: query.product_id });
    }

    if (query.expires_before) {
      qb.andWhere('b.expires_at <= :expiresBefore', { expiresBefore: query.expires_before });
    }

    if (query.is_active !== undefined) {
      qb.andWhere('b.is_active = :isActive', { isActive: query.is_active });
    }

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  // ── INV-041: Receive Batch ──────────────────────────────────────────────────

  async receiveBatch(businessId: string, userId: string, dto: CreateBatchDto) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouse_id, business_id: businessId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const batch = qr.manager.create(StockBatch, {
        business_id: businessId,
        warehouse_id: dto.warehouse_id,
        product_id: dto.product_id,
        variant_id: dto.variant_id ?? null,
        batch_code: dto.batch_code,
        quantity_initial: dto.quantity_initial,
        quantity_remaining: dto.quantity_initial,
        unit_cost: dto.unit_cost,
        unit_cost_tva_rate: dto.unit_cost_tva_rate ?? 0,
        unit_of_measure: dto.unit_of_measure ?? 'unit',
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
        vendor_id: dto.vendor_id ?? null,
        purchase_order_id: dto.purchase_order_id ?? null,
      });
      const savedBatch = await qr.manager.save(StockBatch, batch);

      const movement = qr.manager.create(StockMovement, {
        business_id: businessId,
        batch_id: savedBatch.id,
        movement_type: 'receive',
        quantity: dto.quantity_initial,
        source_origin: 'realtime',
        performed_by_user_id: userId,
        notes: null,
      });
      await qr.manager.save(StockMovement, movement);

      await qr.commitTransaction();
      return savedBatch;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── INV-042: Adjust Batch ───────────────────────────────────────────────────

  async adjustBatch(batchId: string, businessId: string, userId: string, dto: AdjustBatchDto) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId, business_id: businessId } });
    if (!batch) throw new NotFoundException('Batch not found');

    await this.dataSource.query(
      `UPDATE stock_batches SET quantity_remaining = quantity_remaining + $1, updated_at = now() WHERE id = $2`,
      [dto.delta, batchId],
    );

    const movement = this.movementRepo.create({
      business_id: businessId,
      batch_id: batchId,
      movement_type: 'adjustment',
      quantity: dto.delta,
      source_origin: 'realtime',
      performed_by_user_id: userId,
      notes: dto.reason,
    });
    await this.movementRepo.save(movement);

    return this.batchRepo.findOne({ where: { id: batchId } });
  }

  // ── INV-043: Dispose Batch ──────────────────────────────────────────────────

  async disposeBatch(batchId: string, businessId: string, userId: string, dto: DisposeBatchDto) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId, business_id: businessId } });
    if (!batch) throw new NotFoundException('Batch not found');

    if (dto.quantity > Number(batch.quantity_remaining)) {
      throw new UnprocessableEntityException('Disposal quantity exceeds available quantity');
    }

    const movementType = dto.reason === 'expired' ? 'expiry_disposal' : 'waste';

    await this.dataSource.query(
      `UPDATE stock_batches SET quantity_remaining = quantity_remaining - $1, updated_at = now() WHERE id = $2`,
      [dto.quantity, batchId],
    );

    const movement = this.movementRepo.create({
      business_id: businessId,
      batch_id: batchId,
      movement_type: movementType,
      quantity: dto.quantity,
      source_origin: 'realtime',
      performed_by_user_id: userId,
      notes: dto.notes ?? dto.reason,
    });
    await this.movementRepo.save(movement);

    return this.batchRepo.findOne({ where: { id: batchId } });
  }

  // ── INV-044: Transfer Batch ─────────────────────────────────────────────────

  async transferBatch(batchId: string, businessId: string, userId: string, dto: TransferBatchDto) {
    const sourceBatch = await this.batchRepo.findOne({ where: { id: batchId, business_id: businessId } });
    if (!sourceBatch) throw new NotFoundException('Batch not found');

    const targetWarehouse = await this.warehouseRepo.findOne({
      where: { id: dto.target_warehouse_id, business_id: businessId },
    });
    if (!targetWarehouse) throw new NotFoundException('Target warehouse not found');

    if (dto.quantity > Number(sourceBatch.quantity_remaining)) {
      throw new UnprocessableEntityException('Transfer quantity exceeds available quantity');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // a) Decrement source
      await qr.manager.query(
        `UPDATE stock_batches SET quantity_remaining = quantity_remaining - $1, updated_at = now() WHERE id = $2`,
        [dto.quantity, batchId],
      );

      // b) Create new batch at target warehouse
      const newBatch = qr.manager.create(StockBatch, {
        business_id: businessId,
        warehouse_id: dto.target_warehouse_id,
        product_id: sourceBatch.product_id,
        variant_id: sourceBatch.variant_id,
        batch_code: sourceBatch.batch_code,
        quantity_initial: dto.quantity,
        quantity_remaining: dto.quantity,
        unit_cost: sourceBatch.unit_cost,
        unit_cost_tva_rate: sourceBatch.unit_cost_tva_rate,
        unit_of_measure: sourceBatch.unit_of_measure,
        expires_at: sourceBatch.expires_at,
        vendor_id: sourceBatch.vendor_id,
        purchase_order_id: null,
      });
      const savedNewBatch = await qr.manager.save(StockBatch, newBatch);

      // c) Transfer-out movement on source
      const outMovement = qr.manager.create(StockMovement, {
        business_id: businessId,
        batch_id: batchId,
        movement_type: 'transfer_out',
        quantity: dto.quantity,
        source_origin: 'realtime',
        performed_by_user_id: userId,
        notes: dto.notes ?? null,
      });
      await qr.manager.save(StockMovement, outMovement);

      // d) Transfer-in movement on new batch
      const inMovement = qr.manager.create(StockMovement, {
        business_id: businessId,
        batch_id: savedNewBatch.id,
        movement_type: 'transfer_in',
        quantity: dto.quantity,
        source_origin: 'realtime',
        performed_by_user_id: userId,
        notes: dto.notes ?? null,
      });
      await qr.manager.save(StockMovement, inMovement);

      await qr.commitTransaction();

      const updatedSource = await this.batchRepo.findOne({ where: { id: batchId } });
      return { source_batch: updatedSource, target_batch: savedNewBatch };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
