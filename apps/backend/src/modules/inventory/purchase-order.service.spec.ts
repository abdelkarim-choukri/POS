import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../common/entities/purchase-order-item.entity';
import { StockBatch } from '../../common/entities/stock-batch.entity';
import { StockMovement } from '../../common/entities/stock-movement.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const PO_ID = 'po-1';
const USER_ID = 'user-1';
const WH_ID = 'wh-1';
const PROD_ID = 'prod-1';

function makePoItem(overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem {
  return {
    id: 'poi-1',
    purchase_order_id: PO_ID,
    product_id: PROD_ID,
    variant_id: null,
    quantity_ordered: 10,
    quantity_received: 0,
    unit_of_measure: 'unit',
    unit_cost_ht: 5,
    tva_rate: 20,
    line_total_ht: 50,
    line_total_tva: 10,
    line_total_ttc: 60,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as PurchaseOrderItem;
}

function makePo(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: PO_ID,
    business_id: BIZ,
    po_number: 'PO-2026-0001',
    vendor_id: null,
    warehouse_id: WH_ID,
    status: 'draft',
    order_date: new Date(),
    expected_delivery_date: null,
    subtotal_ht: 50,
    total_tva: 10,
    total_ttc: 60,
    notes: null,
    created_by_user_id: USER_ID,
    approved_by_user_id: null,
    items: [makePoItem()],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as PurchaseOrder;
}

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let poRepo: jest.Mocked<any>;
  let poItemRepo: jest.Mocked<any>;
  let batchRepo: jest.Mocked<any>;
  let movementRepo: jest.Mocked<any>;
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
      remove: jest.fn(),
    },
    query: jest.fn(),
  };

  beforeEach(async () => {
    poRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    poItemRepo = {};
    batchRepo = {};
    movementRepo = { create: jest.fn(), save: jest.fn() };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQr),
    };

    const module = await Test.createTestingModule({
      providers: [
        PurchaseOrderService,
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: poItemRepo },
        { provide: getRepositoryToken(StockBatch), useValue: batchRepo },
        { provide: getRepositoryToken(StockMovement), useValue: movementRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(PurchaseOrderService);

    Object.values(mockQr).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((fn) => typeof fn === 'function' && (fn as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  // ── INV-070: List POs ─────────────────────────────────────────────────────

  describe('listPurchaseOrders', () => {
    it('returns paginated POs filtered by business', async () => {
      const getManyAndCount = jest.fn().mockResolvedValue([[makePo()], 1]);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount,
      };
      poRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listPurchaseOrders(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ── INV-071: Get PO ───────────────────────────────────────────────────────

  describe('getPurchaseOrder', () => {
    it('returns PO with items', async () => {
      poRepo.findOne.mockResolvedValue(makePo());
      const result = await service.getPurchaseOrder(PO_ID, BIZ);
      expect(result.id).toBe(PO_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(service.getPurchaseOrder(PO_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });

    it('throws 404 with INV_PO_NOT_FOUND key for unknown PO', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getPurchaseOrder('bad-id', BIZ),
      ).rejects.toMatchObject({ response: { error: 'INV_PO_NOT_FOUND' } });
    });
  });

  describe('getPurchaseOrder — enrichment', () => {
    it('includes amount_paid and balance_due from vendor_payments', async () => {
      const po = makePo();
      poRepo.findOne.mockResolvedValue(po);
      dataSource.query = jest.fn().mockResolvedValue([{ amount_paid: '2000' }]);

      const result = await service.getPurchaseOrder(PO_ID, BIZ);
      expect((result as any).amount_paid).toBe(2000);
      expect((result as any).balance_due).toBe(Number(po.total_ttc) - 2000);
    });

    it('defaults amount_paid to 0 when query fails', async () => {
      const po = makePo();
      poRepo.findOne.mockResolvedValue(po);
      dataSource.query = jest.fn().mockRejectedValue(new Error('table not found'));

      const result = await service.getPurchaseOrder(PO_ID, BIZ);
      expect((result as any).amount_paid).toBe(0);
      expect((result as any).balance_due).toBe(Number(po.total_ttc));
    });
  });

  // ── INV-072: Create PO ────────────────────────────────────────────────────

  describe('createPurchaseOrder', () => {
    it('creates PO with computed line totals atomically', async () => {
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const savedPo = makePo({ id: 'po-new' });
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValueOnce(savedPo).mockResolvedValue([]);
      poRepo.findOne.mockResolvedValue(savedPo);

      const result = await service.createPurchaseOrder(BIZ, USER_ID, {
        warehouse_id: WH_ID,
        items: [{ product_id: PROD_ID, quantity_ordered: 10, unit_cost_ht: 5, tva_rate: 20 }],
      });

      expect(result).toEqual(savedPo);
      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('rolls back and rethrows on error', async () => {
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createPurchaseOrder(BIZ, USER_ID, {
          warehouse_id: WH_ID,
          items: [{ product_id: PROD_ID, quantity_ordered: 1, unit_cost_ht: 1 }],
        }),
      ).rejects.toThrow('DB error');
      expect(mockQr.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ── INV-073: Update PO ────────────────────────────────────────────────────

  describe('updatePurchaseOrder', () => {
    it('updates draft PO notes without touching items', async () => {
      const po = makePo();
      poRepo.findOne.mockResolvedValueOnce(po).mockResolvedValueOnce({ ...po, notes: 'Updated' });
      poRepo.save.mockResolvedValue({ ...po, notes: 'Updated' });

      const result = await service.updatePurchaseOrder(PO_ID, BIZ, { notes: 'Updated' });
      expect(poRepo.save).toHaveBeenCalled();
      expect(result?.notes).toBe('Updated');
    });

    it('throws 422 if PO is not in draft status', async () => {
      poRepo.findOne.mockResolvedValue(makePo({ status: 'sent' }));
      await expect(
        service.updatePurchaseOrder(PO_ID, BIZ, { notes: 'X' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(service.updatePurchaseOrder(PO_ID, OTHER_BIZ, {})).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-074: Send PO ──────────────────────────────────────────────────────

  describe('sendPurchaseOrder', () => {
    it('transitions draft to sent', async () => {
      const po = makePo();
      poRepo.findOne.mockResolvedValue(po);
      poRepo.save.mockResolvedValue({ ...po, status: 'sent' });

      const result = await service.sendPurchaseOrder(PO_ID, BIZ, USER_ID);
      expect(result.status).toBe('sent');
    });

    it('throws 422 if PO is not draft', async () => {
      poRepo.findOne.mockResolvedValue(makePo({ status: 'confirmed' }));
      await expect(service.sendPurchaseOrder(PO_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(service.sendPurchaseOrder(PO_ID, OTHER_BIZ, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-075: Confirm PO ───────────────────────────────────────────────────

  describe('confirmPurchaseOrder', () => {
    it('transitions sent to confirmed', async () => {
      const po = makePo({ status: 'sent' });
      poRepo.findOne.mockResolvedValue(po);
      poRepo.save.mockResolvedValue({ ...po, status: 'confirmed' });

      const result = await service.confirmPurchaseOrder(PO_ID, BIZ);
      expect(result.status).toBe('confirmed');
    });

    it('throws 422 if PO is already received', async () => {
      poRepo.findOne.mockResolvedValue(makePo({ status: 'received' }));
      await expect(service.confirmPurchaseOrder(PO_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── INV-076: Receive PO items ─────────────────────────────────────────────

  describe('receivePurchaseOrder', () => {
    it('creates batches and movements, updates status to received', async () => {
      const po = makePo({ status: 'confirmed' });
      poRepo.findOne.mockResolvedValueOnce(po).mockResolvedValueOnce(po);
      mockQr.query
        .mockResolvedValueOnce(undefined) // UPDATE poi quantity_received
        .mockResolvedValueOnce([{ quantity_ordered: 10, quantity_received: 10 }]) // reload items
        .mockResolvedValueOnce(undefined); // UPDATE po status
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValue({ id: 'batch-new' });

      await service.receivePurchaseOrder(PO_ID, BIZ, USER_ID, {
        received_items: [{ po_item_id: 'poi-1', quantity_received: 10, batch_code: 'B-001' }],
      });

      expect(mockQr.commitTransaction).toHaveBeenCalled();
    });

    it('throws 404 if po item not found on this PO', async () => {
      const po = makePo({ status: 'confirmed', items: [] });
      poRepo.findOne.mockResolvedValue(po);

      await expect(
        service.receivePurchaseOrder(PO_ID, BIZ, USER_ID, {
          received_items: [{ po_item_id: 'nonexistent', quantity_received: 1, batch_code: 'B' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 422 if PO is already cancelled', async () => {
      poRepo.findOne.mockResolvedValue(makePo({ status: 'cancelled' }));
      await expect(
        service.receivePurchaseOrder(PO_ID, BIZ, USER_ID, { received_items: [] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(
        service.receivePurchaseOrder(PO_ID, OTHER_BIZ, USER_ID, { received_items: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── INV-077: Cancel PO ────────────────────────────────────────────────────

  describe('cancelPurchaseOrder', () => {
    it('cancels a draft PO with no received items', async () => {
      const po = makePo({ status: 'draft' });
      poRepo.findOne.mockResolvedValue(po);
      poRepo.save.mockResolvedValue({ ...po, status: 'cancelled' });

      const result = await service.cancelPurchaseOrder(PO_ID, BIZ);
      expect(result.status).toBe('cancelled');
    });

    it('throws 422 if any items received', async () => {
      const po = makePo({ items: [makePoItem({ quantity_received: 5 })] });
      poRepo.findOne.mockResolvedValue(po);
      await expect(service.cancelPurchaseOrder(PO_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 if PO is already fully received', async () => {
      poRepo.findOne.mockResolvedValue(makePo({ status: 'received' }));
      await expect(service.cancelPurchaseOrder(PO_ID, BIZ)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      poRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelPurchaseOrder(PO_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });
});
