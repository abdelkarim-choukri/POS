import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReconciliationProcessor, RECONCILIATION_QUEUE } from './reconciliation.processor';
import { Business } from '../../../common/entities/business.entity';
import { StockDiscrepancyAlert } from '../../../common/entities/stock-discrepancy-alert.entity';
import { StockConsumptionService } from '../stock-consumption.service';

const BIZ_ID = 'biz-1';

function makeBusiness() {
  return { id: BIZ_ID, is_active: true };
}

function makeNegativeBatch() {
  return {
    id: 'batch-1',
    business_id: BIZ_ID,
    warehouse_id: 'wh-1',
    product_id: 'prod-1',
    quantity_remaining: '-5',
    is_active: true,
  };
}

describe('ReconciliationProcessor', () => {
  let processor: ReconciliationProcessor;
  let businessRepo: jest.Mocked<any>;
  let discrepancyRepo: jest.Mocked<any>;
  let stockConsumptionService: jest.Mocked<any>;

  beforeEach(async () => {
    businessRepo = { find: jest.fn() };
    discrepancyRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    stockConsumptionService = {
      findNegativeBatches: jest.fn(),
      findRecentOfflineSyncBatches: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ReconciliationProcessor,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(StockDiscrepancyAlert), useValue: discrepancyRepo },
        { provide: StockConsumptionService, useValue: stockConsumptionService },
      ],
    }).compile();

    processor = module.get(ReconciliationProcessor);
  });

  it('creates discrepancy alert for negative batches', async () => {
    businessRepo.find.mockResolvedValue([makeBusiness()]);
    stockConsumptionService.findNegativeBatches.mockResolvedValue([makeNegativeBatch()]);
    stockConsumptionService.findRecentOfflineSyncBatches.mockResolvedValue([]);
    discrepancyRepo.findOne.mockResolvedValue(null);
    discrepancyRepo.create.mockReturnValue({});
    discrepancyRepo.save.mockResolvedValue({});

    await processor.process({} as any);

    expect(discrepancyRepo.save).toHaveBeenCalled();
    expect(discrepancyRepo.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'system_detected' }));
  });

  it('creates offline_sync alert for offline-caused negative stock', async () => {
    businessRepo.find.mockResolvedValue([makeBusiness()]);
    stockConsumptionService.findNegativeBatches.mockResolvedValue([]);
    stockConsumptionService.findRecentOfflineSyncBatches.mockResolvedValue([
      { batch_id: 'b-1', warehouse_id: 'wh-1', product_id: 'prod-1', quantity_remaining: '-3' },
    ]);
    discrepancyRepo.findOne.mockResolvedValue(null);
    discrepancyRepo.create.mockReturnValue({});
    discrepancyRepo.save.mockResolvedValue({});

    await processor.process({} as any);

    expect(discrepancyRepo.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'offline_sync' }));
  });

  it('skips creating alert if unresolved alert already exists (idempotent)', async () => {
    businessRepo.find.mockResolvedValue([makeBusiness()]);
    stockConsumptionService.findNegativeBatches.mockResolvedValue([makeNegativeBatch()]);
    stockConsumptionService.findRecentOfflineSyncBatches.mockResolvedValue([]);
    discrepancyRepo.findOne.mockResolvedValue({ id: 'existing' });

    await processor.process({} as any);

    expect(discrepancyRepo.save).not.toHaveBeenCalled();
  });

  it('continues processing other businesses if one fails', async () => {
    const biz2 = { id: 'biz-2', is_active: true };
    businessRepo.find.mockResolvedValue([makeBusiness(), biz2]);
    stockConsumptionService.findNegativeBatches
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce([]);
    stockConsumptionService.findRecentOfflineSyncBatches.mockResolvedValue([]);

    await expect(processor.process({} as any)).resolves.not.toThrow();
  });

  it('does nothing when no businesses are active', async () => {
    businessRepo.find.mockResolvedValue([]);
    await processor.process({} as any);
    expect(stockConsumptionService.findNegativeBatches).not.toHaveBeenCalled();
  });
});
