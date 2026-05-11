import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException, UnprocessableEntityException, ForbiddenException,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { TableSession } from '../../common/entities/table-session.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { Business } from '../../common/entities/business.entity';
import { EventGateway } from '../../common/gateways/event.gateway';
import { PromotionEvaluatorService } from '../promotion/promotion-evaluator.service';
import { UserRole } from '../../common/enums';
import { bankersRound } from '../../common/utils/money';
import { buildReceipt } from '../../common/utils/receipt-builder';

// ── Constants ────────────────────────────────────────────────────────────────

const BIZ_A = 'biz-a';
const BIZ_B = 'biz-b';
const SESSION_ID = 'session-1';
const LOC_ID = 'loc-1';
const TABLE_ID = 'table-1';
const TERM_ID = 'term-1';
const USER_ID = 'user-1';

const managerUser = { id: USER_ID, role: UserRole.MANAGER, permissions: {} };
const employeeUser = { id: USER_ID, role: UserRole.EMPLOYEE, permissions: {} };

// ── Factories ─────────────────────────────────────────────────────────────────

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
    guest_count: 4,
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

function makeItem(
  id: string,
  price: number,
  qty = 1,
  overrides: Partial<TableSessionItem> = {},
): TableSessionItem {
  return {
    id,
    business_id: BIZ_A,
    table_session_id: SESSION_ID,
    product_id: `prod-${id}`,
    variant_id: null,
    customer_id: null,
    quantity: qty,
    unit_price_ttc: price as any,
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

// ── Module setup ──────────────────────────────────────────────────────────────

function makeModule() {
  const sessionRepo = {
    findOne: jest.fn(),
    save: jest.fn((e) => Promise.resolve({ ...e })),
  };
  const itemRepo = {
    find: jest.fn(),
  };
  const businessRepo = {
    findOne: jest.fn().mockResolvedValue({ promotion_stacking_mode: 'best_only' }),
  };
  const mockEvaluator = {
    evaluateWithStackingMode: jest.fn().mockResolvedValue({ applicable_promotions: [] }),
  };
  const mockEventGateway = { emitToRoom: jest.fn() };

  const moduleRef = Test.createTestingModule({
    providers: [
      CheckoutService,
      { provide: getRepositoryToken(TableSession), useValue: sessionRepo },
      { provide: getRepositoryToken(TableSessionItem), useValue: itemRepo },
      { provide: getRepositoryToken(Business), useValue: businessRepo },
      { provide: PromotionEvaluatorService, useValue: mockEvaluator },
      { provide: EventGateway, useValue: mockEventGateway },
    ],
  });

  return { moduleRef, sessionRepo, itemRepo, businessRepo, mockEvaluator, mockEventGateway };
}

// ── RST-035: Close table ──────────────────────────────────────────────────────

describe('CheckoutService.closeTable', () => {
  let service: CheckoutService;
  let sessionRepo: any;
  let itemRepo: any;
  let mockEventGateway: any;

  beforeEach(async () => {
    const mocks = makeModule();
    sessionRepo = mocks.sessionRepo;
    itemRepo = mocks.itemRepo;
    mockEventGateway = mocks.mockEventGateway;
    const module = await mocks.moduleRef.compile();
    service = module.get(CheckoutService);
  });

  it('returns a valid checkout_payload with all active items', async () => {
    const item1 = makeItem('item-1', 65, 2);
    const item2 = makeItem('item-2', 45, 1);
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([item1, item2]);

    const result = await service.closeTable(BIZ_A, SESSION_ID, TERM_ID, managerUser);

    expect(result.checkout_payload).toBeDefined();
    expect(result.checkout_payload.table_session_id).toBe(SESSION_ID);
    expect(result.checkout_payload.items).toHaveLength(2);
    expect(result.checkout_payload.items[0].source_table_session_item_id).toBe('item-1');
    expect(result.checkout_payload.terminal_id).toBe(TERM_ID);
  });

  it('filters out cancelled items from the checkout_payload', async () => {
    const activeItem = makeItem('item-1', 65, 1);
    const cancelledItem = makeItem('item-2', 45, 1, { kds_status: 'cancelled' });
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([activeItem, cancelledItem]);

    const result = await service.closeTable(BIZ_A, SESSION_ID, TERM_ID, managerUser);

    expect(result.checkout_payload.items).toHaveLength(1);
    expect(result.checkout_payload.items[0].source_table_session_item_id).toBe('item-1');
  });

  it('transitions session status to awaiting_payment with expected_split_count=1', async () => {
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([makeItem('item-1', 65)]);

    await service.closeTable(BIZ_A, SESSION_ID, TERM_ID, managerUser);

    expect(sessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'awaiting_payment', expected_split_count: 1 }),
    );
  });

  it('emits floor:table_closed WebSocket event', async () => {
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([makeItem('item-1', 65)]);

    await service.closeTable(BIZ_A, SESSION_ID, TERM_ID, managerUser);

    expect(mockEventGateway.emitToRoom).toHaveBeenCalledWith(
      `floor:${BIZ_A}`,
      'floor:table_closed',
      expect.objectContaining({ status: 'awaiting_payment', session_id: SESSION_ID }),
    );
  });

  it('throws 404 when session not found (cross-tenant)', async () => {
    sessionRepo.findOne.mockResolvedValue(null);

    await expect(
      service.closeTable(BIZ_B, SESSION_ID, TERM_ID, managerUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 422 when session is not open', async () => {
    sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'awaiting_payment' }));

    await expect(
      service.closeTable(BIZ_A, SESSION_ID, TERM_ID, managerUser),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws 422 when session has no active items', async () => {
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([makeItem('item-1', 65, 1, { kds_status: 'cancelled' })]);

    await expect(
      service.closeTable(BIZ_A, SESSION_ID, TERM_ID, managerUser),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws 403 when employee lacks can_close_table_session', async () => {
    await expect(
      service.closeTable(BIZ_A, SESSION_ID, TERM_ID, employeeUser),
    ).rejects.toThrow(ForbiddenException);
  });
});

// ── RST-036: Split bill ───────────────────────────────────────────────────────

describe('CheckoutService.splitBill – by_item', () => {
  let service: CheckoutService;
  let sessionRepo: any;
  let itemRepo: any;

  beforeEach(async () => {
    const mocks = makeModule();
    sessionRepo = mocks.sessionRepo;
    itemRepo = mocks.itemRepo;
    const module = await mocks.moduleRef.compile();
    service = module.get(CheckoutService);
  });

  it('groups items by customer_id into separate payloads', async () => {
    const custA = 'cust-a';
    const custB = 'cust-b';
    const itemA1 = makeItem('item-1', 60, 1, { customer_id: custA });
    const itemA2 = makeItem('item-2', 40, 1, { customer_id: custA });
    const itemB1 = makeItem('item-3', 80, 1, { customer_id: custB });

    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([itemA1, itemA2, itemB1]);

    const result = await service.splitBill(
      BIZ_A, SESSION_ID, TERM_ID,
      { split_type: 'by_item' },
      managerUser,
    );

    expect(result.checkout_payloads).toHaveLength(2);

    const aPayload = result.checkout_payloads.find((p: any) => p.customer_id === custA) as any;
    const bPayload = result.checkout_payloads.find((p: any) => p.customer_id === custB) as any;

    expect(aPayload).toBeDefined();
    expect(aPayload.items).toHaveLength(2);
    expect(bPayload).toBeDefined();
    expect(bPayload.items).toHaveLength(1);
  });

  it('groups null-customer items into an anonymous payload', async () => {
    const itemAnon = makeItem('item-1', 50, 1, { customer_id: null });
    const itemAnon2 = makeItem('item-2', 30, 1, { customer_id: null });

    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([itemAnon, itemAnon2]);

    const result = await service.splitBill(
      BIZ_A, SESSION_ID, TERM_ID,
      { split_type: 'by_item' },
      managerUser,
    );

    expect(result.checkout_payloads).toHaveLength(1);
    expect(result.checkout_payloads[0].customer_id).toBeNull();
    expect(result.checkout_payloads[0].items).toHaveLength(2);
  });
});

describe('CheckoutService.splitBill – even', () => {
  let service: CheckoutService;
  let sessionRepo: any;
  let itemRepo: any;

  beforeEach(async () => {
    const mocks = makeModule();
    sessionRepo = mocks.sessionRepo;
    itemRepo = mocks.itemRepo;
    const module = await mocks.moduleRef.compile();
    service = module.get(CheckoutService);
  });

  it('divides 100 MAD into 3 splits: 33.34 + 33.33 + 33.33', async () => {
    // Single item, qty=1, price=100
    const item = makeItem('item-1', 100, 1);
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([item]);

    const result = await service.splitBill(
      BIZ_A, SESSION_ID, TERM_ID,
      {
        split_type: 'even',
        splits: [{ label: 'Guest 1' }, { label: 'Guest 2' }, { label: 'Guest 3' }],
      },
      managerUser,
    );

    expect(result.checkout_payloads).toHaveLength(3);

    const totals = result.checkout_payloads.map(
      (p: any) => bankersRound(p.items.reduce((s: number, i: any) => s + i.quantity * i.unit_price_ttc, 0)),
    );

    expect(totals[0]).toBe(33.34);
    expect(totals[1]).toBe(33.33);
    expect(totals[2]).toBe(33.33);

    // TVA invariant: sum of all splits = original session total
    const grandTotal = bankersRound(totals.reduce((s: number, t: number) => s + t, 0));
    expect(grandTotal).toBe(100);
  });

  it('assigns session customer_id to the split at customer_split_index', async () => {
    const custId = 'cust-loyalty';
    const item = makeItem('item-1', 60, 1);
    sessionRepo.findOne.mockResolvedValue(makeSession({ customer_id: custId }));
    itemRepo.find.mockResolvedValue([item]);

    const result = await service.splitBill(
      BIZ_A, SESSION_ID, TERM_ID,
      { split_type: 'even', splits: [{ label: 'A' }, { label: 'B' }], customer_split_index: 1 },
      managerUser,
    );

    expect(result.checkout_payloads[0].customer_id).toBeNull();
    expect(result.checkout_payloads[1].customer_id).toBe(custId);
  });

  it('throws 422 when splits array is missing for even split', async () => {
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([makeItem('item-1', 100)]);

    await expect(
      service.splitBill(BIZ_A, SESSION_ID, TERM_ID, { split_type: 'even' }, managerUser),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('TVA invariant holds for multi-item even split', async () => {
    // 2 items: 60 MAD × 2 qty + 45 MAD × 1 qty = total 165 MAD, split 4 ways
    const item1 = makeItem('item-1', 60, 2);
    const item2 = makeItem('item-2', 45, 1);
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([item1, item2]);

    const result = await service.splitBill(
      BIZ_A, SESSION_ID, TERM_ID,
      { split_type: 'even', splits: [{ label: '1' }, { label: '2' }, { label: '3' }, { label: '4' }] },
      managerUser,
    );

    const sessionTotal = 2 * 60 + 1 * 45; // 165
    const splitsTotal = bankersRound(
      result.checkout_payloads.reduce(
        (s: number, p: any) =>
          s + p.items.reduce((si: number, i: any) => si + i.quantity * i.unit_price_ttc, 0),
        0,
      ),
    );
    expect(splitsTotal).toBe(sessionTotal);
  });
});

describe('CheckoutService.splitBill – custom', () => {
  let service: CheckoutService;
  let sessionRepo: any;
  let itemRepo: any;

  beforeEach(async () => {
    const mocks = makeModule();
    sessionRepo = mocks.sessionRepo;
    itemRepo = mocks.itemRepo;
    const module = await mocks.moduleRef.compile();
    service = module.get(CheckoutService);
  });

  it('assigns items to each split based on item_ids', async () => {
    const item1 = makeItem('item-1', 60);
    const item2 = makeItem('item-2', 40);
    const item3 = makeItem('item-3', 80);
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([item1, item2, item3]);

    const result = await service.splitBill(
      BIZ_A, SESSION_ID, TERM_ID,
      {
        split_type: 'custom',
        splits: [
          { label: 'A', item_ids: ['item-1', 'item-2'] },
          { label: 'B', item_ids: ['item-3'] },
        ],
      },
      managerUser,
    );

    expect(result.checkout_payloads).toHaveLength(2);
    expect(result.checkout_payloads[0].items).toHaveLength(2);
    expect(result.checkout_payloads[1].items).toHaveLength(1);
  });

  it('throws 422 when a duplicate item_id appears in two splits', async () => {
    const item1 = makeItem('item-1', 60);
    const item2 = makeItem('item-2', 40);
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([item1, item2]);

    await expect(
      service.splitBill(
        BIZ_A, SESSION_ID, TERM_ID,
        {
          split_type: 'custom',
          splits: [
            { label: 'A', item_ids: ['item-1', 'item-2'] },
            { label: 'B', item_ids: ['item-1'] }, // duplicate
          ],
        },
        managerUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws 422 when an item is not assigned to any split (orphan)', async () => {
    const item1 = makeItem('item-1', 60);
    const item2 = makeItem('item-2', 40);
    const item3 = makeItem('item-3', 80); // orphan
    sessionRepo.findOne.mockResolvedValue(makeSession());
    itemRepo.find.mockResolvedValue([item1, item2, item3]);

    await expect(
      service.splitBill(
        BIZ_A, SESSION_ID, TERM_ID,
        {
          split_type: 'custom',
          splits: [
            { label: 'A', item_ids: ['item-1'] },
            { label: 'B', item_ids: ['item-2'] },
            // item-3 is not assigned anywhere
          ],
        },
        managerUser,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

// ── i18n: receipt-builder with language param ─────────────────────────────────

describe('buildReceipt – language support', () => {
  const mockBusiness = { name: 'Café Atlas', legal_name: null, address: null, ice_number: null, if_number: null };
  const mockTransaction = {
    invoice_number: 'INV-001',
    transaction_number: 'TXN-001',
    created_at: new Date('2026-05-11T10:00:00Z'),
    payment_method: 'cash',
    total_ht: 83.33,
    total_tva: 16.67,
    total_ttc: 100,
    items: [
      { product_name: 'Café', variant_name: null, quantity: 1, unit_price: 100, tva_rate: 20, item_ht: 83.33, item_tva: 16.67, item_ttc: 100 },
    ],
  };

  it('returns French labels by default', () => {
    const receipt = buildReceipt(mockTransaction, mockBusiness);
    expect(receipt.labels.total).toBe('Total TTC');
    expect(receipt.labels.tax).toBe('TVA');
    expect(receipt.labels.subtotal).toBe('Sous-total');
  });

  it('returns Arabic labels when language=ar', () => {
    const receipt = buildReceipt(mockTransaction, mockBusiness, 'ar');
    expect(receipt.labels.total).toBe('المجموع الكلي');
    expect(receipt.labels.tax).toBe('الضريبة');
    expect(receipt.labels.subtotal).toBe('المجموع الفرعي');
    expect(receipt.labels.thank_you).toBe('شكراً على تسوقكم');
  });

  it('returns English labels when language=en', () => {
    const receipt = buildReceipt(mockTransaction, mockBusiness, 'en');
    expect(receipt.labels.total).toBe('Total');
    expect(receipt.labels.tax).toBe('VAT');
  });
});
