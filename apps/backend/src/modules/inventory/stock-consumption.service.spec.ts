import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StockConsumptionService } from './stock-consumption.service';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { Product } from '../../common/entities/product.entity';

const BIZ = 'biz-1';
const LOC_ID = 'loc-1';
const WH_ID = 'wh-1';
const PROD_ID = 'prod-1';
const TXN_ID = 'txn-1';

function makeWarehouse(): Warehouse {
  return {
    id: WH_ID,
    business_id: BIZ,
    linked_location_id: LOC_ID,
    is_active: true,
    is_central: false,
  } as Warehouse;
}

function makeProduct(track_stock = true): Product {
  return { id: PROD_ID, track_stock } as Product;
}

describe('StockConsumptionService', () => {
  let service: StockConsumptionService;
  let warehouseRepo: jest.Mocked<any>;
  let batchRepo: jest.Mocked<any>;

  const mockQr = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    warehouseRepo = { findOne: jest.fn() };
    batchRepo = {
      createQueryBuilder: jest.fn(),
      manager: { query: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        StockConsumptionService,
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
      ],
    }).compile();

    service = module.get(StockConsumptionService);
    mockQr.query.mockReset();
  });

  describe('consumeForTransaction', () => {
    it('skips FIFO gracefully when no warehouse is linked to location', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      const productMap = new Map([[PROD_ID, makeProduct()]]);

      await service.consumeForTransaction(
        mockQr as any,
        BIZ,
        LOC_ID,
        TXN_ID,
        [{ product_id: PROD_ID, quantity: 5 }],
        productMap,
        'realtime',
      );

      expect(mockQr.query).not.toHaveBeenCalled();
    });

    it('skips items where product.track_stock = false', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      const productMap = new Map([[PROD_ID, makeProduct(false)]]);

      await service.consumeForTransaction(
        mockQr as any,
        BIZ,
        LOC_ID,
        TXN_ID,
        [{ product_id: PROD_ID, quantity: 5 }],
        productMap,
        'realtime',
      );

      expect(mockQr.query).not.toHaveBeenCalled();
    });

    it('consumes FIFO from a single batch with enough stock', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      const productMap = new Map([[PROD_ID, makeProduct(true)]]);

      // First call: FIFO batch query
      mockQr.query
        .mockResolvedValueOnce([{ id: 'batch-1', quantity_remaining: '20' }]) // batches
        .mockResolvedValueOnce(undefined) // UPDATE batch
        .mockResolvedValueOnce(undefined); // INSERT movement

      await service.consumeForTransaction(
        mockQr as any,
        BIZ,
        LOC_ID,
        TXN_ID,
        [{ product_id: PROD_ID, quantity: 5 }],
        productMap,
        'realtime',
      );

      expect(mockQr.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY expires_at ASC NULLS LAST'),
        expect.any(Array),
      );
      expect(mockQr.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE stock_batches'),
        expect.any(Array),
      );
      expect(mockQr.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO stock_movements"),
        expect.any(Array),
      );
    });

    it('creates discrepancy alert when stock is insufficient', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      const productMap = new Map([[PROD_ID, makeProduct(true)]]);

      // No batches available
      mockQr.query
        .mockResolvedValueOnce([]) // empty batches
        .mockResolvedValueOnce(undefined); // INSERT discrepancy

      await service.consumeForTransaction(
        mockQr as any,
        BIZ,
        LOC_ID,
        TXN_ID,
        [{ product_id: PROD_ID, quantity: 5 }],
        productMap,
        'realtime',
      );

      expect(mockQr.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stock_discrepancy_alerts'),
        expect.any(Array),
      );
    });

    it('consumes across multiple batches in FIFO order', async () => {
      warehouseRepo.findOne.mockResolvedValue(makeWarehouse());
      const productMap = new Map([[PROD_ID, makeProduct(true)]]);

      // Two batches, need 15 total
      mockQr.query
        .mockResolvedValueOnce([
          { id: 'batch-1', quantity_remaining: '10' },
          { id: 'batch-2', quantity_remaining: '20' },
        ])
        .mockResolvedValueOnce(undefined) // UPDATE batch-1
        .mockResolvedValueOnce(undefined) // INSERT movement for batch-1
        .mockResolvedValueOnce(undefined) // UPDATE batch-2
        .mockResolvedValueOnce(undefined); // INSERT movement for batch-2

      await service.consumeForTransaction(
        mockQr as any,
        BIZ,
        LOC_ID,
        TXN_ID,
        [{ product_id: PROD_ID, quantity: 15 }],
        productMap,
        'realtime',
      );

      // Should have 5 query calls (1 select + 4 update/insert)
      expect(mockQr.query).toHaveBeenCalledTimes(5);
    });
  });

  describe('findExpiringBatches', () => {
    it('returns batches expiring within lead days', async () => {
      const batch = { id: 'b-1' };
      const getMany = jest.fn().mockResolvedValue([batch]);
      batchRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      });

      const result = await service.findExpiringBatches(BIZ, 7);
      expect(result).toEqual([batch]);
    });
  });

  describe('findNegativeBatches', () => {
    it('returns batches with negative quantity_remaining', async () => {
      const batch = { id: 'b-neg', quantity_remaining: -5 };
      const getMany = jest.fn().mockResolvedValue([batch]);
      batchRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      });

      const result = await service.findNegativeBatches(BIZ);
      expect(result).toEqual([batch]);
    });
  });

  describe('findRecentOfflineSyncBatches', () => {
    it('returns offline_sync movements that caused negative stock', async () => {
      const row = { movement_id: 'm-1', batch_id: 'b-1', quantity_remaining: '-3', product_id: PROD_ID, warehouse_id: WH_ID };
      batchRepo.manager.query.mockResolvedValue([row]);

      const result = await service.findRecentOfflineSyncBatches(BIZ);
      expect(result).toEqual([row]);
    });
  });
});
