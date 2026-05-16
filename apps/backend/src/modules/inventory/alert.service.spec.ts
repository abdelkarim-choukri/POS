import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlertService } from './alert.service';
import { ExpirationAlert } from '../../common/entities/expiration-alert.entity';
import { StockDiscrepancyAlert } from '../../common/entities/stock-discrepancy-alert.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const ALERT_ID = 'alert-1';
const BATCH_ID = 'batch-1';
const USER_ID = 'user-1';

function makeExpirationAlert(overrides: Partial<ExpirationAlert> = {}): ExpirationAlert {
  return {
    id: ALERT_ID,
    business_id: BIZ,
    batch_id: BATCH_ID,
    product_id: 'prod-1',
    warehouse_id: 'wh-1',
    severity: 'expires_soon',
    resolved_at: null,
    resolved_by_user_id: null,
    action: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as ExpirationAlert;
}

function makeDiscrepancyAlert(overrides: Partial<StockDiscrepancyAlert> = {}): StockDiscrepancyAlert {
  return {
    id: ALERT_ID,
    business_id: BIZ,
    warehouse_id: 'wh-1',
    product_id: 'prod-1',
    batch_id: BATCH_ID,
    expected_remaining: 10,
    actual_remaining: 3,
    discrepancy_quantity: -7,
    source: 'system_detected',
    resolved_at: null,
    resolved_by_user_id: null,
    resolution_notes: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as StockDiscrepancyAlert;
}

describe('AlertService', () => {
  let service: AlertService;
  let expirationRepo: jest.Mocked<any>;
  let discrepancyRepo: jest.Mocked<any>;
  let movementRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    expirationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    discrepancyRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb, getManyAndCount: jest.fn() }),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    movementRepo = { create: jest.fn(), save: jest.fn() };
    dataSource = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: getRepositoryToken(ExpirationAlert), useValue: expirationRepo },
        { provide: getRepositoryToken(StockDiscrepancyAlert), useValue: discrepancyRepo },
        { provide: getRepositoryToken(StockMovement), useValue: movementRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AlertService);
  });

  // ── INV-081: List Expiration Alerts ──────────────────────────────────────

  describe('listExpirationAlerts', () => {
    it('returns paginated unresolved alerts by default', async () => {
      const alert = makeExpirationAlert();
      const getManyAndCount = jest.fn().mockResolvedValue([[alert], 1]);
      expirationRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      });

      const result = await service.listExpirationAlerts(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── INV-082: Resolve Expiration Alert ─────────────────────────────────────

  describe('resolveExpirationAlert', () => {
    it('resolves an unresolved alert', async () => {
      const alert = makeExpirationAlert();
      expirationRepo.findOne.mockResolvedValue(alert);
      expirationRepo.save.mockResolvedValue({ ...alert, resolved_at: new Date(), action: 'disposed' });

      const result = await service.resolveExpirationAlert(ALERT_ID, BIZ, USER_ID, { action: 'disposed' });
      expect(result.resolved_at).toBeTruthy();
    });

    it('throws 404 for cross-tenant access', async () => {
      expirationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resolveExpirationAlert(ALERT_ID, OTHER_BIZ, USER_ID, { action: 'disposed' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 422 if alert is already resolved', async () => {
      expirationRepo.findOne.mockResolvedValue(makeExpirationAlert({ resolved_at: new Date() }));
      await expect(
        service.resolveExpirationAlert(ALERT_ID, BIZ, USER_ID, { action: 'disposed' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── INV-094: List Discrepancy Alerts ─────────────────────────────────────

  describe('listDiscrepancyAlerts', () => {
    it('returns paginated unresolved discrepancy alerts', async () => {
      const alert = makeDiscrepancyAlert();
      const getManyAndCount = jest.fn().mockResolvedValue([[alert], 1]);
      discrepancyRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      });

      const result = await service.listDiscrepancyAlerts(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── INV-096: Resolve Discrepancy Alert ───────────────────────────────────

  describe('resolveDiscrepancyAlert', () => {
    it('manual_recount: marks resolved without creating movement', async () => {
      const alert = makeDiscrepancyAlert();
      discrepancyRepo.findOne.mockResolvedValue(alert);
      discrepancyRepo.save.mockResolvedValue({ ...alert, resolved_at: new Date() });

      const result = await service.resolveDiscrepancyAlert(ALERT_ID, BIZ, USER_ID, { action: 'manual_recount' });
      expect(result.resolved_at).toBeTruthy();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('accept_loss: creates waste movement then marks resolved', async () => {
      const alert = makeDiscrepancyAlert({ discrepancy_quantity: -7 });
      discrepancyRepo.findOne.mockResolvedValue(alert);
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});
      discrepancyRepo.save.mockResolvedValue({ ...alert, resolved_at: new Date() });

      await service.resolveDiscrepancyAlert(ALERT_ID, BIZ, USER_ID, { action: 'accept_loss' });
      expect(movementRepo.save).toHaveBeenCalled();
    });

    it('adjust_batch: updates quantity_remaining and creates adjustment movement', async () => {
      const alert = makeDiscrepancyAlert({ actual_remaining: 3 });
      discrepancyRepo.findOne.mockResolvedValue(alert);
      dataSource.query.mockResolvedValue(undefined);
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});
      discrepancyRepo.save.mockResolvedValue({ ...alert, resolved_at: new Date() });

      await service.resolveDiscrepancyAlert(ALERT_ID, BIZ, USER_ID, {
        action: 'adjust_batch',
        adjustment_quantity: 8,
      });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE stock_batches'),
        expect.any(Array),
      );
      expect(movementRepo.save).toHaveBeenCalled();
    });

    it('throws 404 for cross-tenant access', async () => {
      discrepancyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resolveDiscrepancyAlert(ALERT_ID, OTHER_BIZ, USER_ID, { action: 'manual_recount' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 422 if alert is already resolved', async () => {
      discrepancyRepo.findOne.mockResolvedValue(makeDiscrepancyAlert({ resolved_at: new Date() }));
      await expect(
        service.resolveDiscrepancyAlert(ALERT_ID, BIZ, USER_ID, { action: 'manual_recount' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
