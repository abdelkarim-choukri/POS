import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EXPIRATION_SCAN_QUEUE } from './processors/expiration-scan.processor';
import { RECONCILIATION_QUEUE } from './processors/reconciliation.processor';

@Injectable()
export class StockSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(StockSchedulerService.name);

  constructor(
    @InjectQueue(EXPIRATION_SCAN_QUEUE) private expirationQueue: Queue,
    @InjectQueue(RECONCILIATION_QUEUE) private reconciliationQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Daily at 01:00 UTC — expiration scan
    await this.expirationQueue.add(
      'daily-expiration-scan',
      {},
      {
        repeat: { pattern: '0 1 * * *' },
        jobId: 'daily-expiration-scan',
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );

    // Daily at 02:00 UTC — reconciliation
    await this.reconciliationQueue.add(
      'daily-reconciliation',
      {},
      {
        repeat: { pattern: '0 2 * * *' },
        jobId: 'daily-reconciliation',
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );

    this.logger.log('Inventory daily jobs scheduled');
  }
}
