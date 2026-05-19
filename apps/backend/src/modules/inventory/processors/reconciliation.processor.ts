import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Business } from '../../../common/entities/business.entity';
import { StockDiscrepancyAlert } from '../../../common/entities/stock-discrepancy-alert.entity';
import { StockConsumptionService } from '../stock-consumption.service';
import { EventGateway } from '../../../common/gateways/event.gateway';

export const RECONCILIATION_QUEUE = 'inventory-reconciliation';

@Processor(RECONCILIATION_QUEUE)
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    @InjectRepository(StockDiscrepancyAlert) private discrepancyRepo: Repository<StockDiscrepancyAlert>,
    private readonly stockConsumptionService: StockConsumptionService,
    private readonly eventGateway: EventGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Running daily stock reconciliation');
    const businesses = await this.businessRepo.find({ where: { is_active: true } });

    for (const business of businesses) {
      try {
        await this.reconcileBusiness(business.id);
      } catch (err) {
        this.logger.error(`Reconciliation failed for business ${business.id}: ${(err as Error).message}`);
      }
    }
  }

  private async reconcileBusiness(businessId: string): Promise<void> {
    // Step 1: Find batches with negative quantity_remaining
    const negativeBatches = await this.stockConsumptionService.findNegativeBatches(businessId);
    for (const batch of negativeBatches) {
      await this.createOrSkipDiscrepancyAlert({
        business_id: businessId,
        batch_id: batch.id,
        warehouse_id: batch.warehouse_id,
        product_id: batch.product_id,
        expected_remaining: 0,
        actual_remaining: Number(batch.quantity_remaining),
        discrepancy_quantity: Number(batch.quantity_remaining),
        source: 'system_detected',
      });
    }

    // Step 2: Find offline_sync movements in last 24h that pushed batches negative
    const offlineIssues = await this.stockConsumptionService.findRecentOfflineSyncBatches(businessId);
    for (const issue of offlineIssues) {
      await this.createOrSkipDiscrepancyAlert({
        business_id: businessId,
        batch_id: issue.batch_id,
        warehouse_id: issue.warehouse_id,
        product_id: issue.product_id,
        expected_remaining: 0,
        actual_remaining: Number(issue.quantity_remaining),
        discrepancy_quantity: Number(issue.quantity_remaining),
        source: 'offline_sync',
      });
    }
  }

  private async createOrSkipDiscrepancyAlert(data: {
    business_id: string;
    batch_id: string;
    warehouse_id: string;
    product_id: string;
    expected_remaining: number;
    actual_remaining: number;
    discrepancy_quantity: number;
    source: string;
  }): Promise<void> {
    const existing = await this.discrepancyRepo.findOne({
      where: { batch_id: data.batch_id, source: data.source as any, resolved_at: null as any },
    });
    if (existing) return;

    const alert = this.discrepancyRepo.create(data);
    const saved = await this.discrepancyRepo.save(alert);
    this.logger.log(`[INV-095] Discrepancy alert created: batch ${data.batch_id} source=${data.source}`);
    this.eventGateway.emitToRoom(`dashboard:${data.business_id}`, 'inventory:discrepancy_alert', {
      alert_id: saved.id,
      batch_id: data.batch_id,
      product_id: data.product_id,
      warehouse_id: data.warehouse_id,
      source: data.source,
      discrepancy_quantity: data.discrepancy_quantity,
    });
  }
}
