import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExpirationScanProcessor, EXPIRATION_SCAN_QUEUE } from './expiration-scan.processor';
import { Business } from '../../../common/entities/business.entity';
import { ExpirationAlert } from '../../../common/entities/expiration-alert.entity';
import { StockConsumptionService } from '../stock-consumption.service';

const BIZ_ID = 'biz-1';

function makeBusiness(overrides: any = {}) {
  return { id: BIZ_ID, is_active: true, expiration_alert_lead_days: 7, ...overrides };
}

function makeBatch(overrides: any = {}) {
  return {
    id: 'batch-1',
    business_id: BIZ_ID,
    warehouse_id: 'wh-1',
    product_id: 'prod-1',
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    quantity_remaining: 10,
    is_active: true,
    ...overrides,
  };
}

describe('ExpirationScanProcessor', () => {
  let processor: ExpirationScanProcessor;
  let businessRepo: jest.Mocked<any>;
  let alertRepo: jest.Mocked<any>;
  let stockConsumptionService: jest.Mocked<any>;

  beforeEach(async () => {
    businessRepo = { find: jest.fn() };
    alertRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    stockConsumptionService = { findExpiringBatches: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ExpirationScanProcessor,
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(ExpirationAlert), useValue: alertRepo },
        { provide: StockConsumptionService, useValue: stockConsumptionService },
      ],
    }).compile();

    processor = module.get(ExpirationScanProcessor);
  });

  it('creates expires_soon alert for batches expiring within lead days', async () => {
    businessRepo.find.mockResolvedValue([makeBusiness()]);
    stockConsumptionService.findExpiringBatches.mockResolvedValue([makeBatch()]);
    alertRepo.findOne.mockResolvedValue(null); // no existing alert
    alertRepo.create.mockReturnValue({});
    alertRepo.save.mockResolvedValue({});

    await processor.process({} as any);

    expect(alertRepo.save).toHaveBeenCalled();
    expect(alertRepo.create).toHaveBeenCalledWith(expect.objectContaining({ severity: 'expires_soon' }));
  });

  it('creates expired alert for batches already past expiry', async () => {
    businessRepo.find.mockResolvedValue([makeBusiness()]);
    const expiredBatch = makeBatch({ expires_at: new Date(Date.now() - 1000) });
    stockConsumptionService.findExpiringBatches.mockResolvedValue([expiredBatch]);
    alertRepo.findOne.mockResolvedValue(null);
    alertRepo.create.mockReturnValue({});
    alertRepo.save.mockResolvedValue({});

    await processor.process({} as any);

    expect(alertRepo.create).toHaveBeenCalledWith(expect.objectContaining({ severity: 'expired' }));
  });

  it('skips batch if alert already exists (idempotent)', async () => {
    businessRepo.find.mockResolvedValue([makeBusiness()]);
    stockConsumptionService.findExpiringBatches.mockResolvedValue([makeBatch()]);
    alertRepo.findOne.mockResolvedValue({ id: 'existing-alert' }); // already exists

    await processor.process({} as any);

    expect(alertRepo.save).not.toHaveBeenCalled();
  });

  it('continues processing other businesses if one fails', async () => {
    const biz2 = { id: 'biz-2', is_active: true, expiration_alert_lead_days: 7 };
    businessRepo.find.mockResolvedValue([makeBusiness(), biz2]);
    stockConsumptionService.findExpiringBatches
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce([]);

    // Should not throw
    await expect(processor.process({} as any)).resolves.not.toThrow();
  });

  it('does nothing when no businesses are active', async () => {
    businessRepo.find.mockResolvedValue([]);
    await processor.process({} as any);
    expect(stockConsumptionService.findExpiringBatches).not.toHaveBeenCalled();
  });
});
