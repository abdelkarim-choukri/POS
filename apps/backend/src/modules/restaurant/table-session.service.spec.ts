import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException, ConflictException,
  UnprocessableEntityException, ForbiddenException,
} from '@nestjs/common';
import { TableSessionService } from './table-session.service';
import { TableSession } from '../../common/entities/table-session.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { RestaurantTable } from '../../common/entities/table.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { EventGateway } from '../../common/gateways/event.gateway';
import { UserRole } from '../../common/enums';

const mockEventGateway = { emitToRoom: jest.fn() };

const BIZ_A = 'biz-a';
const BIZ_B = 'biz-b';
const TABLE_ID = 'table-1';
const SESSION_ID = 'session-1';
const SESSION_2_ID = 'session-2';
const ITEM_ID = 'item-1';
const PRODUCT_ID = 'product-1';
const LOC_ID = 'loc-1';
const USER_ID = 'user-1';

const managerUser = {
  id: USER_ID, business_id: BIZ_A,
  role: UserRole.MANAGER, permissions: {},
};
const employeeUser = {
  id: USER_ID, business_id: BIZ_A,
  role: UserRole.EMPLOYEE, permissions: {},
};
const employeeWithVoid = {
  ...employeeUser, permissions: { can_void: true },
};
const employeeWithOpen = {
  ...employeeUser, permissions: { can_open_table_session: true },
};
const employeeWithTransfer = {
  ...employeeUser, permissions: { can_transfer_table_items: true },
};
const employeeWithPartialClose = {
  ...employeeUser, permissions: { can_close_table_session_partial: true },
};

function makeTable(overrides: Partial<RestaurantTable> = {}): RestaurantTable {
  return {
    id: TABLE_ID,
    business_id: BIZ_A,
    location_id: LOC_ID,
    area_id: 'area-1',
    table_type_id: null,
    table_number: 'T-01',
    capacity: 4,
    position_x: null,
    position_y: null,
    qr_code: null,
    is_active: true,
    business: null as any,
    location: null as any,
    area: null as any,
    table_type: null,
    ...overrides,
  };
}

function makeSession(overrides: Partial<TableSession> = {}): TableSession {
  return {
    id: SESSION_ID,
    business_id: BIZ_A,
    location_id: LOC_ID,
    table_id: TABLE_ID,
    opened_at: new Date(),
    opened_by_user_id: USER_ID,
    closed_at: null,
    closed_in_transaction_id: null,
    customer_id: null,
    guest_count: null,
    expected_split_count: 1,
    partial_payment: false,
    notes: null,
    status: 'open',
    business: null as any,
    location: null as any,
    table: null as any,
    opened_by_user: null as any,
    customer: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<TableSessionItem> = {}): TableSessionItem {
  return {
    id: ITEM_ID,
    business_id: BIZ_A,
    table_session_id: SESSION_ID,
    product_id: PRODUCT_ID,
    variant_id: null,
    customer_id: null,
    quantity: 2,
    unit_price_ttc: 65 as any,
    modifiers_json: {},
    notes: null,
    added_at: new Date(),
    added_by_user_id: USER_ID,
    kds_status: 'new',
    business: null as any,
    table_session: null as any,
    product: null as any,
    variant: null,
    customer: null,
    added_by_user: null as any,
    ...overrides,
  };
}

function makeProduct(): Product {
  return { id: PRODUCT_ID, business_id: BIZ_A, name: 'Tajine Poulet', price: 65 as any } as any;
}

describe('TableSessionService', () => {
  let service: TableSessionService;
  let tableRepo: jest.Mocked<any>;
  let sessionRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let productRepo: jest.Mocked<any>;
  let variantRepo: jest.Mocked<any>;
  let auditLogRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const makeRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve(
          Array.isArray(entity)
            ? entity.map((e: any) => ({ id: 'new-id', ...e }))
            : { id: 'new-id', ...entity },
        ),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    });

    tableRepo = makeRepo();
    sessionRepo = makeRepo();
    itemRepo = makeRepo();
    productRepo = makeRepo();
    variantRepo = makeRepo();
    auditLogRepo = { create: jest.fn((dto) => ({ ...dto })), save: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        TableSessionService,
        { provide: getRepositoryToken(RestaurantTable), useValue: tableRepo },
        { provide: getRepositoryToken(TableSession), useValue: sessionRepo },
        { provide: getRepositoryToken(TableSessionItem), useValue: itemRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(ProductVariant), useValue: variantRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: EventGateway, useValue: mockEventGateway },
      ],
    }).compile();

    service = module.get(TableSessionService);
  });

  // ── RST-031: Open table ─────────────────────────────────────────────────

  describe('openTable', () => {
    it('creates a new session for an available table (happy path)', async () => {
      tableRepo.findOne.mockResolvedValue(makeTable());
      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.save.mockResolvedValue(makeSession({ id: 'new-session' }));

      const result = await service.openTable(BIZ_A, TABLE_ID, USER_ID, { guest_count: 4 }, managerUser);

      expect(result.status).toBe('open');
      expect(result.table_number).toBe('T-01');
      expect(result.guest_count).toBe(null); // from makeSession default (save overrides dto)
      expect(result.items).toEqual([]);
    });

    it('throws 409 when table already has an active session', async () => {
      tableRepo.findOne.mockResolvedValue(makeTable());
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'open' }));

      await expect(
        service.openTable(BIZ_A, TABLE_ID, USER_ID, {}, managerUser),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 403 when employee lacks can_open_table_session permission', async () => {
      await expect(
        service.openTable(BIZ_A, TABLE_ID, USER_ID, {}, employeeUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows employee with can_open_table_session to open a table', async () => {
      tableRepo.findOne.mockResolvedValue(makeTable());
      sessionRepo.findOne.mockResolvedValue(null);
      sessionRepo.save.mockResolvedValue(makeSession());

      await expect(
        service.openTable(BIZ_A, TABLE_ID, USER_ID, {}, employeeWithOpen),
      ).resolves.not.toThrow();
    });

    it('throws 404 for cross-tenant table access', async () => {
      tableRepo.findOne.mockResolvedValue(null); // BIZ_B cannot see BIZ_A table

      await expect(
        service.openTable(BIZ_B, TABLE_ID, USER_ID, {}, managerUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RST-032: Add items ──────────────────────────────────────────────────

  describe('addItems', () => {
    function mockTotalQb(total = '130') {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total }),
      };
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('locks unit_price_ttc from the product price at add-time', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'open' }));
      productRepo.find.mockResolvedValue([makeProduct()]);
      variantRepo.find.mockResolvedValue([]);
      itemRepo.save.mockImplementation((items: any[]) =>
        Promise.resolve(items.map((i) => ({ id: 'item-new', ...i }))),
      );
      mockTotalQb('130');

      const result = await service.addItems(BIZ_A, SESSION_ID, USER_ID, {
        items: [{ product_id: PRODUCT_ID, quantity: 2 }],
      });

      expect(result.added_items[0].unit_price_ttc).toBe(65);
      expect(result.added_items[0].product_name).toBe('Tajine Poulet');
      expect(result.session_total_ttc).toBe(130);
    });

    it('uses variant price_override when variant is provided', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'open' }));
      productRepo.find.mockResolvedValue([makeProduct()]); // product price = 65
      variantRepo.find.mockResolvedValue([
        { id: 'variant-1', product_id: PRODUCT_ID, price_override: 75 },
      ]);
      itemRepo.save.mockImplementation((items: any[]) =>
        Promise.resolve(items.map((i) => ({ id: 'item-new', ...i }))),
      );
      mockTotalQb('75');

      const result = await service.addItems(BIZ_A, SESSION_ID, USER_ID, {
        items: [{ product_id: PRODUCT_ID, variant_id: 'variant-1', quantity: 1 }],
      });

      expect(result.added_items[0].unit_price_ttc).toBe(75);
    });

    it('throws 422 when session is not in open status', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'awaiting_payment' }));

      await expect(
        service.addItems(BIZ_A, SESSION_ID, USER_ID, {
          items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant session access', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addItems(BIZ_B, SESSION_ID, USER_ID, {
          items: [{ product_id: PRODUCT_ID, quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RST-033: Modify item ────────────────────────────────────────────────

  describe('modifyItem', () => {
    it('throws 422 when modifying quantity on a preparing item', async () => {
      itemRepo.findOne.mockResolvedValue(makeItem({ kds_status: 'preparing' }));

      await expect(
        service.modifyItem(BIZ_A, ITEM_ID, { quantity: 3 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when modifying notes on a ready item', async () => {
      itemRepo.findOne.mockResolvedValue(makeItem({ kds_status: 'ready' }));

      await expect(
        service.modifyItem(BIZ_A, ITEM_ID, { notes: 'extra spicy' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows customer_id update even when kds_status is preparing', async () => {
      const item = makeItem({ kds_status: 'preparing' });
      itemRepo.findOne.mockResolvedValue(item);
      itemRepo.save.mockResolvedValue({ ...item, customer_id: 'cust-1' });

      // Should NOT throw — customer_id is always modifiable
      await expect(
        service.modifyItem(BIZ_A, ITEM_ID, { customer_id: 'cust-1' }),
      ).resolves.not.toThrow();
      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ customer_id: 'cust-1' }),
      );
    });

    it('throws 404 for cross-tenant item access', async () => {
      itemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.modifyItem(BIZ_B, ITEM_ID, { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RST-034: Remove item ────────────────────────────────────────────────

  describe('removeItem', () => {
    it('throws 422 when item is in kitchen and user lacks can_void', async () => {
      itemRepo.findOne.mockResolvedValue(makeItem({ kds_status: 'preparing' }));

      await expect(
        service.removeItem(BIZ_A, ITEM_ID, employeeUser),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('soft-deletes (sets kds_status=cancelled) when user has can_void and writes audit log', async () => {
      const item = makeItem({ kds_status: 'preparing' });
      itemRepo.findOne.mockResolvedValue(item);
      // auditLogRepo.save is called first, then itemRepo.save
      itemRepo.save.mockResolvedValue({ ...item, kds_status: 'cancelled' });
      // sessionRepo/tableRepo for the event emission best-effort
      sessionRepo.findOne.mockResolvedValue(makeSession());
      tableRepo.findOne.mockResolvedValue(makeTable());

      const result = await service.removeItem(BIZ_A, ITEM_ID, employeeWithVoid);

      expect(itemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ kds_status: 'cancelled' }),
      );
      expect(result.cancelled).toBe(true);
      expect(result.deleted).toBe(false);
      expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'void' }));
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('hard-deletes item when kds_status is new', async () => {
      itemRepo.findOne.mockResolvedValue(makeItem({ kds_status: 'new' }));

      const result = await service.removeItem(BIZ_A, ITEM_ID, employeeUser);

      expect(itemRepo.remove).toHaveBeenCalled();
      expect(result.deleted).toBe(true);
      expect(result.cancelled).toBe(false);
    });
  });

  // ── RST-037: Transfer items ─────────────────────────────────────────────

  describe('transferItems', () => {
    it('transfers items between two open sessions (happy path)', async () => {
      itemRepo.find.mockResolvedValue([makeItem({ table_session_id: SESSION_ID })]);
      sessionRepo.findOne
        .mockResolvedValueOnce(makeSession({ id: SESSION_ID, status: 'open' }))   // source
        .mockResolvedValueOnce(makeSession({ id: SESSION_2_ID, status: 'open' })); // target
      itemRepo.save.mockResolvedValue([]);

      const result = await service.transferItems(
        BIZ_A,
        { item_ids: [ITEM_ID], target_table_session_id: SESSION_2_ID },
        managerUser,
      );

      expect(result.transferred).toBe(1);
      expect(result.source_session_id).toBe(SESSION_ID);
      expect(result.target_session_id).toBe(SESSION_2_ID);
    });

    it('throws 422 when target session is not open', async () => {
      itemRepo.find.mockResolvedValue([makeItem({ table_session_id: SESSION_ID })]);
      sessionRepo.findOne
        .mockResolvedValueOnce(makeSession({ status: 'open' }))               // source open
        .mockResolvedValueOnce(makeSession({ status: 'awaiting_payment' }));  // target blocked

      await expect(
        service.transferItems(
          BIZ_A,
          { item_ids: [ITEM_ID], target_table_session_id: SESSION_2_ID },
          managerUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 403 when employee lacks can_transfer_table_items', async () => {
      await expect(
        service.transferItems(
          BIZ_A,
          { item_ids: [ITEM_ID], target_table_session_id: SESSION_2_ID },
          employeeUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 when items not found in this business', async () => {
      itemRepo.find.mockResolvedValue([]); // cross-tenant: no items returned

      await expect(
        service.transferItems(
          BIZ_B,
          { item_ids: [ITEM_ID], target_table_session_id: SESSION_2_ID },
          managerUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RST-038: Cancel session ─────────────────────────────────────────────

  describe('cancelSession', () => {
    function mockItemUpdateQb() {
      const qb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('cancels open session, bulk-cancels all its items, and writes audit log', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'open' }));
      const qb = mockItemUpdateQb();
      sessionRepo.save.mockResolvedValue(makeSession({ status: 'cancelled' }));

      const result = await service.cancelSession(
        BIZ_A, SESSION_ID,
        { reason: 'Customer walked out' },
        managerUser,
      );

      expect(qb.execute).toHaveBeenCalled();
      expect(result.status).toBe('cancelled');
      expect(result.partial_payment).toBe(false);
      expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'cancel' }));
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('force-closes awaiting_payment session with partial_payment=true when permitted and writes audit log', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'awaiting_payment' }));
      sessionRepo.save.mockResolvedValue(
        makeSession({ status: 'paid', partial_payment: true }),
      );

      const result = await service.cancelSession(
        BIZ_A, SESSION_ID,
        { reason: 'One guest left before paying', force_close_partial: true },
        managerUser,
      );

      expect(result.status).toBe('paid');
      expect(result.partial_payment).toBe(true);
      expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'force_close' }));
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('throws 403 when employee lacks can_close_table_session_partial for force close', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'awaiting_payment' }));

      await expect(
        service.cancelSession(
          BIZ_A, SESSION_ID,
          { reason: 'Trying to force close it', force_close_partial: true },
          employeeUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 422 for invalid state transition (already paid session)', async () => {
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'paid' }));

      await expect(
        service.cancelSession(
          BIZ_A, SESSION_ID,
          { reason: 'Cannot cancel paid session' },
          managerUser,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant session access', async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelSession(
          BIZ_B, SESSION_ID,
          { reason: 'Cross tenant attempt' },
          managerUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
