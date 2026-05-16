import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Business } from '../../../common/entities/business.entity';
import { ExpirationAlert } from '../../../common/entities/expiration-alert.entity';
import { StockConsumptionService } from '../stock-consumption.service';

export const EXPIRATION_SCAN_QUEUE = 'inventory-expiration-scan';

@Processor(EXPIRATION_SCAN_QUEUE)
export class ExpirationScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpirationScanProcessor.name);

  constructor(
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    @InjectRepository(ExpirationAlert) private alertRepo: Repository<ExpirationAlert>,
    private readonly stockConsumptionService: StockConsumptionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Running daily expiration scan');
    const businesses = await this.businessRepo.find({ where: { is_active: true } });

    for (const business of businesses) {
      try {
        await this.scanBusiness(business);
      } catch (err) {
        this.logger.error(`Expiration scan failed for business ${business.id}: ${(err as Error).message}`);
      }
    }
  }

  private async scanBusiness(business: any): Promise<void> {
    const leadDays = (business as any).expiration_alert_lead_days ?? 7;
    const batches = await this.stockConsumptionService.findExpiringBatches(business.id, leadDays);

    for (const batch of batches) {
      const now = new Date();
      const severity = batch.expires_at && batch.expires_at <= now ? 'expired' : 'expires_soon';

      const existingAlert = await this.alertRepo.findOne({
        where: { batch_id: batch.id, severity, resolved_at: null as any },
      });
      if (existingAlert) continue;

      const alert = this.alertRepo.create({
        business_id: business.id,
        batch_id: batch.id,
        warehouse_id: batch.warehouse_id,
        product_id: batch.product_id,
        severity,
      });
      await this.alertRepo.save(alert);
      this.logger.log(`[INV-080] Alert created: batch ${batch.id} severity=${severity}`);
    }
  }
}
