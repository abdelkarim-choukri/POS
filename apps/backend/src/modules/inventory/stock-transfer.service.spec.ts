import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockTransferService } from './stock-transfer.service';
import { StockBatchService } from './stock-batch.service';
import { StockTransfer } from '../../common/entities/stock-transfer.entity';
import { StockTransferItem } from '../../common/entities/stock-transfer-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const USER_ID = 'user-1';
const TRF_ID = 'trf-1';
const BATCH_ID = 'batch-1';
const WH_SRC = 'wh-src';
const WH_TGT = 'wh-tgt';

function makeTransfer(overrides: Partial<StockTransfer> = {}): StockTransfer {
  return {
    id: TRF_ID,
    business_id: BIZ,
    transfer_number: 'TRF-2026-00001',
    source_warehouse_id: WH_SRC,
    target_warehouse_id: WH_TGT,
    status: 'draft',
    notes: null,
    created_by_user_id: USER_ID,
    posted_at: null,
    posted_by_user_id: null,
    created_at: new Date(),
    items: [],
    ...overrides,
  } as StockTransfer;
}

function makeWarehouse(id: string): Warehouse {
  return { id, business_id: BIZ } as Warehouse;
}

describe('StockTransferService', () => {
  let service: StockTransferService;
  let transferRepo: jest.Mocked<any>;
  let transferItemRepo: jest.Mocked<any>;
  let batchRepo: jest.Mocked<any>;
  let warehouseRepo: jest.Mocked<any>;
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
    transferRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    transferItemRepo = {};
    batchRepo = {};
    warehouseRepo = { findOne: jest.fn() };
    stockBatchService = { executeBatchTransferInQr: jest.fn() };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(mockQr) };

    const module = await Test.createTestingModule({
      providers: [
        StockTransferService,
        { provide: getRepositoryToken(StockTransfer), useValue: transferRepo },
        { provide: getRepositoryToken(StockTransferItem), useValue: transferItemRepo },
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: StockBatchService, useValue: stockBatchService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockTransferService);

    Object.values(mockQr).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  describe('listTransfers', () => {
    it('returns paginated transfers filtered by business_id', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[makeTransfer()], 1]),
      };
      transferRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listTransfers(BIZ, {});
      expect(result.total).toBe(1);
    });
  });

  describe('getTransfer', () => {
    it('returns transfer with items', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ items: [] }));
      const result = await service.getTransfer(TRF_ID, BIZ);
      expect(result.id).toBe(TRF_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      transferRepo.findOne.mockResolvedValue(null);
      await expect(service.getTransfer(TRF_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTransfer', () => {
    it('creates draft transfer with items', async () => {
      warehouseRepo.findOne
        .mockResolvedValueOnce(makeWarehouse(WH_SRC))
        .mockResolvedValueOnce(makeWarehouse(WH_TGT));
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const savedTransfer = makeTransfer();
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(savedTransfer).mockResolvedValueOnce([{}]);
      mockQr.manager.findOne.mockResolvedValue({ id: BATCH_ID, quantity_remaining: 50 });
      transferRepo.findOne.mockResolvedValue({ ...savedTransfer, items: [{}] });

      const dto = {
        source_warehouse_id: WH_SRC,
        target_warehouse_id: WH_TGT,
        items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
      };
      const result = await service.createTransfer(BIZ, USER_ID, dto);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws 422 when source equals target warehouse', async () => {
      await expect(
        service.createTransfer(BIZ, USER_ID, {
          source_warehouse_id: WH_SRC,
          target_warehouse_id: WH_SRC,
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 if source warehouse not found', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createTransfer(BIZ, USER_ID, {
          source_warehouse_id: WH_SRC,
          target_warehouse_id: WH_TGT,
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 422 if batch does not belong to source warehouse', async () => {
      warehouseRepo.findOne
        .mockResolvedValueOnce(makeWarehouse(WH_SRC))
        .mockResolvedValueOnce(makeWarehouse(WH_TGT));
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(makeTransfer());
      mockQr.manager.findOne.mockResolvedValue(null);

      await expect(
        service.createTransfer(BIZ, USER_ID, {
          source_warehouse_id: WH_SRC,
          target_warehouse_id: WH_TGT,
          items: [{ product_id: 'prod-1', batch_id: BATCH_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('postTransfer', () => {
    it('calls executeBatchTransferInQr per item and sets status to posted', async () => {
      const item = { batch_id: BATCH_ID, quantity: 10 };
      transferRepo.findOne
        .mockResolvedValueOnce(makeTransfer({ status: 'draft', items: [item as any] }))
        .mockResolvedValueOnce(makeTransfer({ status: 'posted', items: [item as any] }));
      mockQr.query.mockResolvedValue([{ status: 'draft' }]);
      stockBatchService.executeBatchTransferInQr.mockResolvedValue({});
      mockQr.manager.update.mockResolvedValue(undefined);

      const result = await service.postTransfer(TRF_ID, BIZ, USER_ID);
      expect(stockBatchService.executeBatchTransferInQr).toHaveBeenCalledWith(
        mockQr, BATCH_ID, BIZ, WH_TGT, 10, USER_ID, null, 'stock_transfer', TRF_ID,
      );
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result?.status).toBe('posted');
    });

    it('throws 422 if not draft (immutability after post)', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'posted', items: [] }));
      await expect(service.postTransfer(TRF_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('rolls back on executeBatchTransferInQr failure', async () => {
      const item = { batch_id: BATCH_ID, quantity: 10 };
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'draft', items: [item as any] }));
      mockQr.query.mockResolvedValue([{ status: 'draft' }]);
      stockBatchService.executeBatchTransferInQr.mockRejectedValue(new Error('insufficient stock'));

      await expect(service.postTransfer(TRF_ID, BIZ, USER_ID)).rejects.toThrow('insufficient stock');
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('cancelTransfer', () => {
    it('sets status to cancelled', async () => {
      transferRepo.findOne
        .mockResolvedValueOnce(makeTransfer({ status: 'draft' }))
        .mockResolvedValueOnce(makeTransfer({ status: 'cancelled', items: [] }));
      transferRepo.update.mockResolvedValue(undefined);

      const result = await service.cancelTransfer(TRF_ID, BIZ);
      expect(transferRepo.update).toHaveBeenCalledWith(TRF_ID, { status: 'cancelled' });
      expect(result?.status).toBe('cancelled');
    });

    it('throws 422 if not draft', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'posted' }));
      await expect(service.cancelTransfer(TRF_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      transferRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelTransfer(TRF_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTransfer', () => {
    it('hard-deletes a draft transfer', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'draft' }));
      transferRepo.delete.mockResolvedValue(undefined);

      const result = await service.deleteTransfer(TRF_ID, BIZ);
      expect(transferRepo.delete).toHaveBeenCalledWith(TRF_ID);
      expect(result.deleted).toBe(true);
    });

    it('throws 422 if not draft', async () => {
      transferRepo.findOne.mockResolvedValue(makeTransfer({ status: 'cancelled' }));
      await expect(service.deleteTransfer(TRF_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
