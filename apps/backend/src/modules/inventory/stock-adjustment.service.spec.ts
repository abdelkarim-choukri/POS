import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockAdjustmentService } from './stock-adjustment.service';
import { StockBatchService } from './stock-batch.service';
import { StockAdjustment } from '../../common/entities/stock-adjustment.entity';
import { StockAdjustmentItem } from '../../common/entities/stock-adjustment-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const USER_ID = 'user-1';
const ADJ_ID = 'adj-1';
const BATCH_ID = 'batch-1';
const WH_ID = 'wh-1';

function makeAdj(overrides: Partial<StockAdjustment> = {}): StockAdjustment {
  return {
    id: ADJ_ID,
    business_id: BIZ,
    adjustment_number: 'ADJ-2026-00001',
    warehouse_id: WH_ID,
    status: 'draft',
    reason: 'inventory count correction',
    proposed_by_user_id: USER_ID,
    approved_by_user_id: null,
    approved_at: null,
    posted_at: null,
    rejected_reason: null,
    notes: null,
    created_at: new Date(),
    items: [],
    ...overrides,
  } as StockAdjustment;
}

function makeBatch(): StockBatch {
  return { id: BATCH_ID, business_id: BIZ, quantity_remaining: 50 } as StockBatch;
}

describe('StockAdjustmentService', () => {
  let service: StockAdjustmentService;
  let adjRepo: jest.Mocked<any>;
  let adjItemRepo: jest.Mocked<any>;
  let batchRepo: jest.Mocked<any>;
  let stockBatchService: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    adjRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    adjItemRepo = {};
    batchRepo = { findOne: jest.fn() };
    stockBatchService = { applyBatchAdjustmentInQr: jest.fn() };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(mockQr) };

    const module = await Test.createTestingModule({
      providers: [
        StockAdjustmentService,
        { provide: getRepositoryToken(StockAdjustment), useValue: adjRepo },
        { provide: getRepositoryToken(StockAdjustmentItem), useValue: adjItemRepo },
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
        { provide: StockBatchService, useValue: stockBatchService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockAdjustmentService);

    Object.values(mockQr).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  describe('listAdjustments', () => {
    it('returns paginated adjustments for the business', async () => {
      const adj = makeAdj();
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[adj], 1]),
      };
      adjRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listAdjustments(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getAdjustment', () => {
    it('returns adjustment with items', async () => {
      const adj = makeAdj({ items: [] });
      adjRepo.findOne.mockResolvedValue(adj);
      const result = await service.getAdjustment(ADJ_ID, BIZ);
      expect(result.id).toBe(ADJ_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      adjRepo.findOne.mockResolvedValue(null);
      await expect(service.getAdjustment(ADJ_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAdjustment', () => {
    it('creates draft adjustment with items and snapshots current_quantity', async () => {
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const savedAdj = makeAdj();
      mockQr.manager.create.mockReturnValueOnce({}).mockReturnValueOnce({});
      mockQr.manager.save.mockResolvedValueOnce(savedAdj).mockResolvedValueOnce([{}]);
      mockQr.manager.findOne.mockResolvedValue(makeBatch());
      adjRepo.findOne.mockResolvedValue({ ...savedAdj, items: [{}] });

      const dto = {
        warehouse_id: WH_ID,
        reason: 'inventory count correction',
        items: [{ product_id: 'prod-1', batch_id: BATCH_ID, proposed_delta: -5 }],
      };
      const result = await service.createAdjustment(BIZ, USER_ID, dto);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws 404 if batch does not belong to business', async () => {
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(makeAdj());
      mockQr.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createAdjustment(BIZ, USER_ID, {
          warehouse_id: WH_ID,
          reason: 'inventory count correction',
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, proposed_delta: -5 }],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('submitAdjustment', () => {
    it('transitions draft → pending_approval', async () => {
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'draft' }))
        .mockResolvedValueOnce(makeAdj({ status: 'pending_approval', items: [] }));
      adjRepo.update.mockResolvedValue(undefined);

      const result = await service.submitAdjustment(ADJ_ID, BIZ);
      expect(adjRepo.update).toHaveBeenCalledWith(ADJ_ID, { status: 'pending_approval' });
      expect(result?.status).toBe('pending_approval');
    });

    it('throws 422 if not draft', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'pending_approval' }));
      await expect(service.submitAdjustment(ADJ_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      adjRepo.findOne.mockResolvedValue(null);
      await expect(service.submitAdjustment(ADJ_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveAdjustment', () => {
    it('transitions pending_approval → approved', async () => {
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'pending_approval' }))
        .mockResolvedValueOnce(makeAdj({ status: 'approved', items: [] }));
      adjRepo.update.mockResolvedValue(undefined);

      const result = await service.approveAdjustment(ADJ_ID, BIZ, USER_ID);
      expect(adjRepo.update).toHaveBeenCalledWith(ADJ_ID, expect.objectContaining({ status: 'approved' }));
      expect(result?.status).toBe('approved');
    });

    it('throws 422 if not pending_approval', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'draft' }));
      await expect(service.approveAdjustment(ADJ_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('postAdjustment', () => {
    it('applies deltas via applyBatchAdjustmentInQr and sets status to posted', async () => {
      const item = { batch_id: BATCH_ID, proposed_delta: -5 };
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'approved', items: [item as any] }))
        .mockResolvedValueOnce(makeAdj({ status: 'posted', items: [item as any] }));
      mockQr.query.mockResolvedValue([{ status: 'approved' }]);
      stockBatchService.applyBatchAdjustmentInQr.mockResolvedValue(undefined);
      mockQr.manager.update.mockResolvedValue(undefined);

      const result = await service.postAdjustment(ADJ_ID, BIZ, USER_ID);
      expect(stockBatchService.applyBatchAdjustmentInQr).toHaveBeenCalledWith(
        mockQr, BATCH_ID, BIZ, -5, USER_ID, expect.any(String), 'stock_adjustment', ADJ_ID,
      );
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result?.status).toBe('posted');
    });

    it('throws 422 if not approved', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'pending_approval', items: [] }));
      await expect(service.postAdjustment(ADJ_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('rolls back on applyBatchAdjustmentInQr failure', async () => {
      const item = { batch_id: BATCH_ID, proposed_delta: -5 };
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'approved', items: [item as any] }));
      mockQr.query.mockResolvedValue([{ status: 'approved' }]);
      stockBatchService.applyBatchAdjustmentInQr.mockRejectedValue(new Error('DB error'));

      await expect(service.postAdjustment(ADJ_ID, BIZ, USER_ID)).rejects.toThrow('DB error');
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('rejectAdjustment', () => {
    it('transitions pending_approval → rejected with reason', async () => {
      adjRepo.findOne
        .mockResolvedValueOnce(makeAdj({ status: 'pending_approval' }))
        .mockResolvedValueOnce(makeAdj({ status: 'rejected', rejected_reason: 'wrong count', items: [] }));
      adjRepo.update.mockResolvedValue(undefined);

      const result = await service.rejectAdjustment(ADJ_ID, BIZ, { reason: 'wrong count' });
      expect(adjRepo.update).toHaveBeenCalledWith(ADJ_ID, expect.objectContaining({ status: 'rejected' }));
      expect(result?.status).toBe('rejected');
    });

    it('throws 422 if not pending_approval', async () => {
      adjRepo.findOne.mockResolvedValue(makeAdj({ status: 'approved' }));
      await expect(service.rejectAdjustment(ADJ_ID, BIZ, { reason: 'x' })).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
