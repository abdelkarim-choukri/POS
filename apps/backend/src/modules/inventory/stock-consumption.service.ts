import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { Product } from '../../common/entities/product.entity';

export interface ConsumeItem {
  product_id: string;
  quantity: number;
  variant_id?: string | null;
}

@Injectable()
export class StockConsumptionService {
  private readonly logger = new Logger(StockConsumptionService.name);

  constructor(
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(StockBatch) private batchRepo: Repository<StockBatch>,
  ) {}

  async consumeForTransaction(
    qr: QueryRunner,
    businessId: string,
    locationId: string,
    transactionId: string,
    items: ConsumeItem[],
    productMap: Map<string, Product>,
    sourceOrigin: 'realtime' | 'offline_sync',
  ): Promise<void> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { business_id: businessId, linked_location_id: locationId, is_active: true },
      order: { is_central: 'DESC' },
    });

    if (!warehouse) {
      this.logger.warn(`No warehouse linked to location ${locationId} — skipping FIFO`);
      return;
    }

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product?.track_stock) continue;

      await this.consumeItem(qr, businessId, warehouse.id, transactionId, item, sourceOrigin);
    }
  }

  private async consumeItem(
    qr: QueryRunner,
    businessId: string,
    warehouseId: string,
    transactionId: string,
    item: ConsumeItem,
    sourceOrigin: string,
  ): Promise<void> {
    // FIFO: oldest expiry first, then oldest received_at
    const batches: Array<{ id: string; quantity_remaining: string }> = await qr.query(
      `SELECT id, quantity_remaining
       FROM stock_batches
       WHERE product_id = $1
         AND warehouse_id = $2
         AND is_active = true
       ORDER BY expires_at ASC NULLS LAST, received_at ASC`,
      [item.product_id, warehouseId],
    );

    let needed = item.quantity;

    for (const batch of batches) {
      if (needed <= 0) break;

      const available = Number(batch.quantity_remaining);
      const consume = available > 0 ? Math.min(needed, available) : needed;
      // consume from this batch (may go negative for the last batch)
      const actualConsume = needed <= available ? needed : available > 0 ? available : 0;

      if (actualConsume <= 0) continue;

      await qr.query(
        `UPDATE stock_batches SET quantity_remaining = quantity_remaining - $1, updated_at = now() WHERE id = $2`,
        [actualConsume, batch.id],
      );

      await qr.query(
        `INSERT INTO stock_movements
          (id, business_id, batch_id, movement_type, quantity, reference_type, reference_id, source_origin, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'sale', $3, 'transaction', $4, $5, now())`,
        [businessId, batch.id, actualConsume, transactionId, sourceOrigin],
      );

      needed -= actualConsume;
    }

    // If still needed > 0: no batches left (or all empty) — allow negative on last batch or create discrepancy
    if (needed > 0) {
      // Queue discrepancy alert — spec says sell goes through, shortfall logged
      await qr.query(
        `INSERT INTO stock_discrepancy_alerts
          (id, business_id, warehouse_id, product_id, expected_remaining, actual_remaining, discrepancy_quantity, source, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 0, $4, $4, 'system_detected', now(), now())`,
        [businessId, warehouseId, item.product_id, -needed],
      );
    }
  }

  // ─── Called by ExpirationScanProcessor ──────────────────────────────────────

  async findExpiringBatches(businessId: string, leadDays: number) {
    return this.batchRepo
      .createQueryBuilder('b')
      .where('b.business_id = :businessId', { businessId })
      .andWhere('b.expires_at <= NOW() + CAST(:leadDays || \' days\' AS INTERVAL)', { leadDays })
      .andWhere('b.quantity_remaining > 0')
      .andWhere('b.is_active = true')
      .getMany();
  }

  // ─── Called by ReconciliationProcessor ──────────────────────────────────────

  async findNegativeBatches(businessId: string) {
    return this.batchRepo
      .createQueryBuilder('b')
      .where('b.business_id = :businessId', { businessId })
      .andWhere('b.quantity_remaining < 0')
      .andWhere('b.is_active = true')
      .getMany();
  }

  async findRecentOfflineSyncBatches(businessId: string) {
    // Returns movements from last 24h with source_origin=offline_sync that caused negative remaining
    return (await this.batchRepo.manager.query(
      `SELECT sm.id AS movement_id, sm.batch_id, b.quantity_remaining, b.product_id, b.warehouse_id
       FROM stock_movements sm
       JOIN stock_batches b ON b.id = sm.batch_id
       WHERE sm.business_id = $1
         AND sm.source_origin = 'offline_sync'
         AND sm.created_at >= NOW() - INTERVAL '24 hours'
         AND b.quantity_remaining < 0`,
      [businessId],
    )) as Array<{ movement_id: string; batch_id: string; quantity_remaining: string; product_id: string; warehouse_id: string }>;
  }
}
