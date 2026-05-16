import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockBatchService } from './stock-batch.service';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const BATCH_ID = 'batch-1';
const WH_ID = 'wh-1';
const WH2_ID = 'wh-2';
const PROD_ID = 'prod-1';
const USER_ID = 'user-1';

function makeBatch(overrides: Partial<StockBatch> = {}): StockBatch {
  return {
    id: BATCH_ID,
    business_id: BIZ,
    warehouse_id: WH_ID,
    product_id: PROD_ID,
    variant_id: null,
    batch_code: 'BATCH-001',
    quantity_initial: 100,
    quantity_remaining: 80,
    unit_cost: 5.5,
    unit_cost_tva_rate: 20,
    unit_of_measure: 'unit',
    received_at: new Date(),
    expires_at: null,
    vendor_id: null,
    purchase_order_id: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as StockBatch;
}

function makeWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: WH_ID,
    business_id: BIZ,
    name: 'Main WH',
    code: 'WH-01',
    address: null,
    manager_user_id: null,
    is_central: false,
    linked_location_id: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as Warehouse;
}

describe('StockBatchService', () => {
  let service: StockBatchService;
  let batchRepo: jest.Mocked<any>;
  let movementRepo: jest.Mocked<any>;
  let warehouseRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      query: jest.fn(),
    },
    query: jest.fn(),
  };

  beforeEach(async () => {
    batchRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    movementRepo = { create: jest.fn(), save: jest.fn() };
    warehouseRepo = { findOne: jest.fn() };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQr),
      query: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        StockBatchService,
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
        { provide: getRepositoryToken(StockMovement), useValue: movementRepo },
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockBatchService);

    // Reset QR mocks before each test
    Object.values(mockQr).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  // ── INV-040: List batches ─────────────────────────────────────────────────

  describe('listBatches', () => {
    it('returns paginated batches filtered by business_id', async () => {
      const batch = makeBatch();
      const getManyAndCount = jest.fn().mockResolvedValue([[batch], 1]);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      batchRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listBatches(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── INV-041: Receive batch ────────────────────────────────────────────────

  describe('receiveBatch', () => {
    it('creates batch + receive movement atomically', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      const savedBatch = makeBatch();
      mockQr.manager.create.mockReturnValueOnce({}).mockReturnValueOnce({});
      mockQr.manager.save.mockResolvedValueOnce(savedBatch).mockResolvedValueOnce({});

      const result = await service.receiveBatch(BIZ, USER_ID, {
        warehouse_id: WH_ID,
        product_id: PROD_ID,
        batch_code: 'BATCH-001',
        quantity_initial: 100,
        unit_cost: 5.5,
      });

      expect(result).toEqual(savedBatch);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('returns 404 if warehouse belongs to another business', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.receiveBatch(BIZ, USER_ID, { warehouse_id: WH_ID, product_id: PROD_ID, batch_code: 'X', quantity_initial: 1, unit_cost: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-042: Adjust batch ─────────────────────────────────────────────────

  describe('adjustBatch', () => {
    it('updates quantity_remaining and inserts movement', async () => {
      batchRepo.findOne.mockResolvedValueOnce(makeBatch()).mockResolvedValueOnce(makeBatch({ quantity_remaining: 75 }));
      dataSource.query.mockResolvedValue(undefined);
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      const result = await service.adjustBatch(BATCH_ID, BIZ, USER_ID, { delta: -5, reason: 'correction' });
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE stock_batches'), expect.any(Array));
      expect(movementRepo.save).toHaveBeenCalled();
      expect(result?.quantity_remaining).toBe(75);
    });

    it('returns 404 for cross-tenant batch', async () => {
      batchRepo.findOne.mockResolvedValue(null);
      await expect(service.adjustBatch(BATCH_ID, OTHER_BIZ, USER_ID, { delta: 1, reason: 'test' })).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-043: Dispose batch ────────────────────────────────────────────────

  describe('disposeBatch', () => {
    it('decrements quantity_remaining', async () => {
      batchRepo.findOne.mockResolvedValueOnce(makeBatch({ quantity_remaining: 80 })).mockResolvedValueOnce(makeBatch({ quantity_remaining: 70 }));
      dataSource.query.mockResolvedValue(undefined);
      movementRepo.create.mockReturnValue({});
      movementRepo.save.mockResolvedValue({});

      await service.disposeBatch(BATCH_ID, BIZ, USER_ID, { quantity: 10, reason: 'damaged' });
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('returns 422 if disposal qty > available', async () => {
      batchRepo.findOne.mockResolvedValue(makeBatch({ quantity_remaining: 5 }));
      await expect(
        service.disposeBatch(BATCH_ID, BIZ, USER_ID, { quantity: 10, reason: 'damaged' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('returns 404 for cross-tenant access', async () => {
      batchRepo.findOne.mockResolvedValue(null);
      await expect(
        service.disposeBatch(BATCH_ID, OTHER_BIZ, USER_ID, { quantity: 1, reason: 'damaged' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-044: Transfer batch ───────────────────────────────────────────────

  describe('transferBatch', () => {
    it('creates target batch and two movements atomically', async () => {
      batchRepo.findOne.mockResolvedValue(makeBatch({ quantity_remaining: 80 }));
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse({ id: WH2_ID }));
      const targetBatch = makeBatch({ id: 'batch-2', warehouse_id: WH2_ID });
      mockQr.manager.query.mockResolvedValue(undefined);
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save
        .mockResolvedValueOnce(targetBatch)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await service.transferBatch(BATCH_ID, BIZ, USER_ID, {
        target_warehouse_id: WH2_ID,
        quantity: 20,
      });
      expect(result.target_batch).toEqual(targetBatch);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('returns 422 if transfer qty > available', async () => {
      batchRepo.findOne.mockResolvedValue(makeBatch({ quantity_remaining: 5 }));
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse({ id: WH2_ID }));
      await expect(
        service.transferBatch(BATCH_ID, BIZ, USER_ID, { target_warehouse_id: WH2_ID, quantity: 50 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
