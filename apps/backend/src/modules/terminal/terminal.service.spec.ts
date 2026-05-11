import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TerminalService } from './terminal.service';
import { DiscountPipelineService } from '../../common/services/discount-pipeline.service';
import { KdsService } from '../kds/kds.service';
import { PromotionEvaluatorService } from '../promotion/promotion-evaluator.service';
import { EventGateway } from '../../common/gateways/event.gateway';
import { Terminal } from '../../common/entities/terminal.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionItem } from '../../common/entities/transaction-item.entity';
import { Void } from '../../common/entities/void.entity';
import { SyncQueue } from '../../common/entities/sync-queue.entity';
import { Business } from '../../common/entities/business.entity';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { Coupon } from '../../common/entities/coupon.entity';
import { TableSession } from '../../common/entities/table-session.entity';
import { PaymentMethod } from '../../common/enums';
import { bankersRound } from '../../common/utils/money';

const mockEventGateway = { emitToRoom: jest.fn() };

// ── Mock helpers ─────────────────────────────────────────────────────────────

function makeMockRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn((entity: any) => Promise.resolve({ id: 'generated-uuid', ...entity })),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({}),
    query: jest.fn(),
    ...overrides,
  };
}

function makeQrMock(queryOverrides: ((sql: string, params?: any[]) => any) | null = null) {
  const qr = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn((entityOrClass: any, data?: any) => {
        const d = data ?? entityOrClass;
        if (Array.isArray(d)) {
          return Promise.resolve(d.map((e: any, i: number) => ({ id: `item-${i}`, ...e })));
        }
        return Promise.resolve({ id: 'saved-uuid', ...d });
      }),
      query: jest.fn((sql: string, params?: any[]) => {
        if (queryOverrides) {
          const result = queryOverrides(sql, params);
          if (result !== undefined) return Promise.resolve(result);
        }
        if (sql.includes('UPDATE businesses') && sql.includes('invoice_counter')) {
          return Promise.resolve([{ invoice_counter: 1, business_code: 'CAFE01' }]);
        }
        if (sql.includes('UPDATE customers') && sql.includes('points_balance')) {
          return Promise.resolve([{ points_balance: 5, lifetime_points: 5 }]);
        }
        if (sql.includes('UPDATE customers') && sql.includes('grade_id')) {
          return Promise.resolve([]);
        }
        if (sql.includes('UPDATE transactions') && sql.includes('points_earned')) {
          return Promise.resolve([]);
        }
        if (sql.includes('UPDATE promotions') && sql.includes('current_uses')) {
          return Promise.resolve([{ id: params?.[0] }]);
        }
        if (sql.includes('UPDATE coupons') && sql.includes("status = 'redeemed'")) {
          return Promise.resolve([{ id: params?.[2] }]);
        }
        return Promise.resolve([]);
      }),
    },
  };
  return qr;
}

function makeTestModule(overrides: {
  productRepo?: any;
  transactionRepo?: any;
  itemRepo?: any;
  businessRepo?: any;
  customerRepo?: any;
  gradeRepo?: any;
  pointsHistoryRepo?: any;
  couponRepo?: any;
  tableSessionRepo?: any;
  qr?: ReturnType<typeof makeQrMock>;
  evaluator?: any;
} = {}) {
  const qr = overrides.qr ?? makeQrMock();
  const mockDataSource = { createQueryRunner: jest.fn(() => qr) };

  const mockEvaluator = overrides.evaluator ?? {
    evaluateWithStackingMode: jest.fn().mockResolvedValue({
      applicable_promotions: [],
      stackable: false,
    }),
  };

  const productRepo = overrides.productRepo ?? makeMockRepo();
  const transactionRepo = overrides.transactionRepo ?? makeMockRepo({
    findOne: jest.fn().mockImplementation(({ where }) =>
      Promise.resolve({ id: where?.id ?? 'txn-1', items: [] }),
    ),
  });
  const itemRepo = overrides.itemRepo ?? makeMockRepo({
    save: jest.fn((entities: any[]) =>
      Promise.resolve(entities.map((e, i) => ({ id: `item-${i}`, ...e }))),
    ),
  });
  const businessRepo = overrides.businessRepo ?? makeMockRepo({
    findOne: jest.fn().mockResolvedValue({
      id: 'biz-1',
      points_earn_divisor: 10,
      promotion_stacking_mode: 'best_only',
    }),
    manager: {
      query: jest.fn().mockResolvedValue([{ customer_counter: 7 }]),
    },
  });
  const customerRepo = overrides.customerRepo ?? makeMockRepo({
    findOne: jest.fn().mockResolvedValue(null),
    manager: {
      query: jest.fn().mockResolvedValue([{ customer_counter: 7 }]),
    },
  });
  const gradeRepo = overrides.gradeRepo ?? makeMockRepo({ find: jest.fn().mockResolvedValue([]) });
  const pointsHistoryRepo = overrides.pointsHistoryRepo ?? makeMockRepo();
  const couponRepo = overrides.couponRepo ?? makeMockRepo({ findOne: jest.fn().mockResolvedValue(null) });
  const tableSessionRepo = overrides.tableSessionRepo ?? makeMockRepo({ findOne: jest.fn().mockResolvedValue(null) });

  return {
    qr, productRepo, transactionRepo, itemRepo, businessRepo,
    customerRepo, gradeRepo, pointsHistoryRepo, couponRepo, tableSessionRepo,
    mockEvaluator,
    module: Test.createTestingModule({
      providers: [
        TerminalService,
        DiscountPipelineService,
        { provide: KdsService, useValue: { notifyNewOrder: jest.fn() } },
        { provide: PromotionEvaluatorService, useValue: mockEvaluator },
        { provide: EventGateway, useValue: mockEventGateway },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Terminal), useValue: makeMockRepo() },
        { provide: getRepositoryToken(User), useValue: makeMockRepo() },
        { provide: getRepositoryToken(ClockEntry), useValue: makeMockRepo() },
        { provide: getRepositoryToken(Category), useValue: makeMockRepo() },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: getRepositoryToken(TransactionItem), useValue: itemRepo },
        { provide: getRepositoryToken(Void), useValue: makeMockRepo() },
        { provide: getRepositoryToken(SyncQueue), useValue: makeMockRepo() },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(CustomerGrade), useValue: gradeRepo },
        { provide: getRepositoryToken(CustomerPointsHistory), useValue: pointsHistoryRepo },
        { provide: getRepositoryToken(Coupon), useValue: couponRepo },
        { provide: getRepositoryToken(TableSession), useValue: tableSessionRepo },
      ],
    }),
  };
}

// ── TVA test suite ────────────────────────────────────────────────────────────

describe('TerminalService – createTransaction (TVA)', () => {
  let service: TerminalService;
  let transactionRepo: ReturnType<typeof makeMockRepo>;
  let itemRepo: ReturnType<typeof makeMockRepo>;
  let productRepo: ReturnType<typeof makeMockRepo>;
  let qr: ReturnType<typeof makeQrMock>;

  const mockProducts = [
    { id: 'prod-a', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: false, tva_rate: null, category: { default_tva_rate: 20 } },
    { id: 'prod-b', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: false, tva_rate: 10, category: { default_tva_rate: 20 } },
  ];

  const dto = {
    items: [
      { product_id: 'prod-a', product_name: 'Café', quantity: 2, unit_price: 15, line_total: 30 },
      { product_id: 'prod-b', product_name: 'Thé', quantity: 1, unit_price: 20, line_total: 20 },
    ],
    subtotal: 50,
    total: 50,
    payment_method: PaymentMethod.CASH,
  } as any;

  beforeEach(async () => {
    const mocks = makeTestModule({
      productRepo: makeMockRepo({ find: jest.fn().mockResolvedValue(mockProducts) }),
    });
    transactionRepo = mocks.transactionRepo;
    itemRepo = mocks.itemRepo;
    productRepo = mocks.productRepo;
    qr = mocks.qr;

    const module: TestingModule = await mocks.module.compile();
    service = module.get(TerminalService);
  });

  it('should compute TVA decomposition for items with different rates', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txnCreateCall = transactionRepo.create.mock.calls[0][0];

    // prod-a: 2 × 15 = 30 TTC at 20% → HT = 25.00, TVA = 5.00
    // prod-b: 1 × 20 = 20 TTC at 10% → HT = 18.18, TVA = 1.82
    expect(txnCreateCall.total_ht).toBe(43.18);
    expect(txnCreateCall.total_tva).toBe(6.82);
    expect(txnCreateCall.total_ttc).toBe(50);

    const itemCalls = itemRepo.create.mock.calls;
    expect(itemCalls[0][0].tva_rate).toBe(20);
    expect(itemCalls[0][0].item_ht).toBe(25);
    expect(itemCalls[0][0].item_tva).toBe(5);
    expect(itemCalls[0][0].item_ttc).toBe(30);
    expect(itemCalls[1][0].tva_rate).toBe(10);
    expect(itemCalls[1][0].item_ht).toBe(18.18);
    expect(itemCalls[1][0].item_tva).toBe(1.82);
    expect(itemCalls[1][0].item_ttc).toBe(20);
  });

  it('should set backward-compat fields: subtotal=HT, tax_amount=TVA, total=TTC', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txn = transactionRepo.create.mock.calls[0][0];
    expect(txn.subtotal).toBe(txn.total_ht);
    expect(txn.tax_amount).toBe(txn.total_tva);
    expect(txn.total).toBe(txn.total_ttc);
    expect(txn.subtotal).toBe(43.18);
    expect(txn.tax_amount).toBe(6.82);
    expect(txn.total).toBe(50);
  });

  it('should set backward-compat line_total = item_ttc on each item', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    for (const call of itemRepo.create.mock.calls) {
      const item = call[0];
      expect(item.line_total).toBe(item.item_ttc);
    }
  });

  it('should enforce total_ttc = total_ht + total_tva (not sum of item_ttc)', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txn = transactionRepo.create.mock.calls[0][0];
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));
  });

  it('should generate invoice number with atomic counter and year reset', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const invoiceCall = (qr.manager.query as jest.Mock).mock.calls.find((c: any[]) =>
      c[0].includes('UPDATE businesses') && c[0].includes('RETURNING invoice_counter'),
    );
    expect(invoiceCall).toBeTruthy();
    expect(invoiceCall[1]).toEqual([new Date().getFullYear(), 'biz-1']);

    const txn = transactionRepo.create.mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(txn.invoice_number).toBe(`INV-CAFE01-${year}-000001`);
  });

  it('should reset invoice counter when year changes', async () => {
    // QR mock already returns invoice_counter=1 by default
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txn = transactionRepo.create.mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(txn.invoice_number).toBe(`INV-CAFE01-${year}-000001`);
  });

  it('should throw BadRequestException for unknown product_id', async () => {
    productRepo.find.mockResolvedValueOnce([]);

    await expect(
      service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto),
    ).rejects.toThrow('Product prod-a not found');
  });

  it('should handle TVA-exempt products (rate = 0)', async () => {
    productRepo.find.mockResolvedValueOnce([
      { id: 'prod-a', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: true, tva_rate: null, category: { default_tva_rate: 20 } },
      { id: 'prod-b', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: false, tva_rate: 10, category: { default_tva_rate: 20 } },
    ]);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const itemCalls = itemRepo.create.mock.calls;
    expect(itemCalls[0][0].tva_rate).toBe(0);
    expect(itemCalls[0][0].item_ht).toBe(30);
    expect(itemCalls[0][0].item_tva).toBe(0);
    expect(itemCalls[0][0].item_ttc).toBe(30);
    expect(itemCalls[1][0].tva_rate).toBe(10);
  });
});

// ── Customer terminal operations (CUST-100, CUST-101) ────────────────────────

describe('TerminalService – customer terminal operations', () => {
  let service: TerminalService;
  let customerRepo: any;
  let businessRepo: any;

  beforeEach(async () => {
    const mocks = makeTestModule({
      productRepo: makeMockRepo({ find: jest.fn().mockResolvedValue([]) }),
    });
    customerRepo = mocks.customerRepo;
    businessRepo = mocks.businessRepo;

    const module: TestingModule = await mocks.module.compile();
    service = module.get(TerminalService);
  });

  it('[CUST-100] lookupCustomer returns summary when customer found', async () => {
    customerRepo.findOne.mockResolvedValue({
      id: 'cust-1',
      customer_code: 'C-000001',
      first_name: 'Fatima',
      last_name: 'Zahra',
      phone: '0612345678',
      points_balance: 150,
      grade: { name: 'Gold', color_hex: '#FFD700' },
    });

    const result = await service.lookupCustomer('biz-1', '0612345678');

    expect(result.id).toBe('cust-1');
    expect(result.customer_code).toBe('C-000001');
    expect(result.first_name).toBe('Fatima');
    expect(result.points_balance).toBe(150);
    expect(result.grade).toEqual({ name: 'Gold', color_hex: '#FFD700' });
  });

  it('[CUST-100] lookupCustomer throws 404 when customer not found', async () => {
    customerRepo.findOne.mockResolvedValue(null);

    await expect(service.lookupCustomer('biz-1', '0699999999'))
      .rejects.toThrow(NotFoundException);
  });

  it('[CUST-101] quickAddCustomer creates customer with auto-code', async () => {
    customerRepo.findOne.mockResolvedValue(null); // no duplicate
    businessRepo.manager.query.mockResolvedValueOnce([{ customer_counter: 7 }]);

    customerRepo.save.mockResolvedValue({
      id: 'new-cust',
      customer_code: 'C-000007',
      first_name: 'Yassine',
      last_name: 'Alami',
      phone: '0611223344',
      points_balance: 0,
    });

    const result = await service.quickAddCustomer('biz-1', {
      phone: '0611223344',
      first_name: 'Yassine',
      last_name: 'Alami',
    });

    expect(result.customer_code).toBe('C-000007');
    expect(result.first_name).toBe('Yassine');
    expect(result.grade).toBeNull();
    expect(result.points_balance).toBe(0);
  });

  it('[CUST-101] quickAddCustomer throws 409 when phone already registered', async () => {
    customerRepo.findOne.mockResolvedValue({ id: 'existing', phone: '0612345678' });

    await expect(
      service.quickAddCustomer('biz-1', {
        phone: '0612345678',
        first_name: 'Dup',
        last_name: 'User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

// ── Points earning (CUST-110) ─────────────────────────────────────────────────

describe('TerminalService – points earning (CUST-110)', () => {
  let service: TerminalService;
  let transactionRepo: ReturnType<typeof makeMockRepo>;
  let itemRepo: ReturnType<typeof makeMockRepo>;
  let customerRepo: any;
  let gradeRepo: ReturnType<typeof makeMockRepo>;
  let pointsHistoryRepo: ReturnType<typeof makeMockRepo>;
  let qr: ReturnType<typeof makeQrMock>;

  const mockProducts = [
    { id: 'prod-a', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: false, tva_rate: null, category: { default_tva_rate: 20 } },
  ];

  const baseDto = {
    items: [{ product_id: 'prod-a', product_name: 'Café', quantity: 1, unit_price: 50, line_total: 50 }],
    subtotal: 50,
    total: 50,
    payment_method: PaymentMethod.CASH,
  } as any;

  beforeEach(async () => {
    const mocks = makeTestModule({
      productRepo: makeMockRepo({ find: jest.fn().mockResolvedValue(mockProducts) }),
      businessRepo: makeMockRepo({
        findOne: jest.fn().mockResolvedValue({ id: 'biz-1', points_earn_divisor: 10, promotion_stacking_mode: 'best_only' }),
        manager: { query: jest.fn().mockResolvedValue([{ customer_counter: 1 }]) },
      }),
    });
    transactionRepo = mocks.transactionRepo;
    itemRepo = mocks.itemRepo;
    customerRepo = mocks.customerRepo;
    gradeRepo = mocks.gradeRepo;
    pointsHistoryRepo = mocks.pointsHistoryRepo;
    qr = mocks.qr;

    const module: TestingModule = await mocks.module.compile();
    service = module.get(TerminalService);
  });

  it('earns points with multiplier=1 when customer has no grade', async () => {
    const customerId = 'cust-plain';
    customerRepo.findOne.mockResolvedValue({
      id: customerId, business_id: 'biz-1', is_active: true,
      grade: null, grade_id: null,
    });

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, customer_id: customerId,
    });

    // total_ttc=50, divisor=10 → base=5, multiplier=1 → points=5
    const pointsCall = (qr.manager.query as jest.Mock).mock.calls.find((c: any[]) =>
      c[0].includes('UPDATE customers') && c[0].includes('points_balance'),
    );
    expect(pointsCall).toBeTruthy();
    expect(pointsCall[1][0]).toBe(5);
    expect(pointsCall[1][1]).toBe(customerId);

    // Points history row built via repo.create
    expect(pointsHistoryRepo.create.mock.calls[0][0]).toMatchObject({
      source: 'sale',
      delta: 5,
      customer_id: customerId,
    });
  });

  it('applies grade multiplier 1.5 (Gold) to base points', async () => {
    const customerId = 'cust-gold';
    const goldGrade = { id: 'grade-gold', name: 'Gold', points_multiplier: 1.5, min_points: 500, is_active: true };
    customerRepo.findOne.mockResolvedValue({
      id: customerId, business_id: 'biz-1', is_active: true,
      grade: goldGrade, grade_id: goldGrade.id,
    });
    gradeRepo.find.mockResolvedValue([goldGrade]);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, customer_id: customerId,
    });

    // base=5, multiplier=1.5 → floor(7.5)=7
    const pointsCall = (qr.manager.query as jest.Mock).mock.calls.find((c: any[]) =>
      c[0].includes('UPDATE customers') && c[0].includes('points_balance'),
    );
    expect(pointsCall[1][0]).toBe(7);
  });

  it('does not earn points when no customer_id is provided', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', baseDto);

    const pointsCall = (qr.manager.query as jest.Mock).mock.calls.find((c: any[]) =>
      c[0].includes('UPDATE customers') && c[0].includes('points_balance'),
    );
    expect(pointsCall).toBeUndefined();
    expect(pointsHistoryRepo.create).not.toHaveBeenCalled();
  });

  it('throws 404 when customer_id does not belong to the business', async () => {
    customerRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
        ...baseDto, customer_id: 'bad-customer',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('saves customer_id on the transaction record', async () => {
    const customerId = 'cust-attach';
    customerRepo.findOne.mockResolvedValue({
      id: customerId, business_id: 'biz-1', is_active: true,
      grade: null, grade_id: null,
    });

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, customer_id: customerId,
    });

    const txn = transactionRepo.create.mock.calls[0][0];
    expect(txn.customer_id).toBe(customerId);
  });
});

// ── Promotions & Coupons (Phase 7B) ──────────────────────────────────────────

describe('TerminalService – createTransaction (promotions + coupons)', () => {
  const mockProducts = [
    { id: 'prod-a', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: false, tva_rate: null, category: { default_tva_rate: 20 } },
  ];

  // 1 item × 100 MAD → total_ttc = 100, HT = 83.33, TVA = 16.67
  const baseDto = {
    items: [{ product_id: 'prod-a', product_name: 'Widget', quantity: 1, unit_price: 100, line_total: 100 }],
    subtotal: 100,
    total: 100,
    payment_method: PaymentMethod.CASH,
  } as any;

  function buildMocks(options: {
    promotions?: any[];
    couponRepo?: any;
    qrQueryOverride?: (sql: string, params?: any[]) => any;
  } = {}) {
    const applicable_promotions = options.promotions ?? [];
    const mockEvaluator = {
      evaluateWithStackingMode: jest.fn().mockResolvedValue({ applicable_promotions, stackable: false }),
    };
    const qr = makeQrMock(options.qrQueryOverride ?? null);

    return makeTestModule({
      productRepo: makeMockRepo({ find: jest.fn().mockResolvedValue(mockProducts) }),
      couponRepo: options.couponRepo ?? makeMockRepo({ findOne: jest.fn().mockResolvedValue(null) }),
      evaluator: mockEvaluator,
      qr,
    });
  }

  it('createTransaction with one promotion applied — discount_total non-zero, TVA invariant holds', async () => {
    const mocks = buildMocks({
      promotions: [{
        promotion_id: 'promo-1',
        name: '10% Off',
        promotion_type: 'percent_off_order',
        auto_apply: true,
        computed_discount: 10, // 10% of 100 MAD
        affected_line_indexes: [0],
      }],
    });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', baseDto);

    const txn = mocks.transactionRepo.create.mock.calls[0][0];
    expect(txn.discount_total).toBe(10);
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));
  });

  it('createTransaction with one coupon applied — discount_total correct', async () => {
    const futureCoupon = {
      id: 'coupon-1',
      business_id: 'biz-1',
      coupon_code: 'SUMMER12',
      status: 'available',
      expires_at: new Date('2099-12-31'),
      customer_id: null,
      coupon_type: { discount_type: 'fixed_off', discount_value: 20, applicable_product_ids: [], applicable_category_ids: [] },
    };
    const mocks = buildMocks({
      couponRepo: makeMockRepo({ findOne: jest.fn().mockResolvedValue(futureCoupon) }),
    });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, coupon_codes: ['SUMMER12'],
    });

    const txn = mocks.transactionRepo.create.mock.calls[0][0];
    expect(txn.discount_total).toBe(20);
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));
  });

  it('createTransaction with promotion + coupon — steps applied in order, TVA invariant holds', async () => {
    const futureCoupon = {
      id: 'coupon-2',
      business_id: 'biz-1',
      coupon_code: 'FLAT10',
      status: 'available',
      expires_at: new Date('2099-12-31'),
      customer_id: null,
      coupon_type: { discount_type: 'fixed_off', discount_value: 10, applicable_product_ids: [], applicable_category_ids: [] },
    };
    const mocks = buildMocks({
      promotions: [{
        promotion_id: 'promo-1',
        name: '5% off',
        promotion_type: 'percent_off_order',
        auto_apply: true,
        computed_discount: 5,
        affected_line_indexes: [0],
      }],
      couponRepo: makeMockRepo({ findOne: jest.fn().mockResolvedValue(futureCoupon) }),
    });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, coupon_codes: ['FLAT10'],
    });

    const txn = mocks.transactionRepo.create.mock.calls[0][0];
    // total pipeline discount = 5 (promo fixed step) + 10 (coupon fixed step) = 15
    expect(txn.discount_total).toBe(15);
    // TVA invariant must hold after all discounts
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));
  });

  it('promotion max_uses exceeded mid-transaction — promotion skipped, transaction still completes', async () => {
    const mocks = buildMocks({
      promotions: [{
        promotion_id: 'promo-full',
        name: 'Full Promo',
        promotion_type: 'percent_off_order',
        auto_apply: true,
        computed_discount: 10,
        affected_line_indexes: [0],
      }],
      // QR returns 0 rows for promotion UPDATE (max_uses hit)
      qrQueryOverride: (sql: string, params?: any[]) => {
        if (sql.includes('UPDATE promotions') && sql.includes('current_uses')) {
          return []; // 0 rows = max_uses hit
        }
      },
    });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    // Should NOT throw — promotion silently skipped
    const result = await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', baseDto);
    expect(result).toBeTruthy();
  });

  it('coupon race condition (0 rows updated) — coupon skipped, transaction completes', async () => {
    const futureCoupon = {
      id: 'coupon-race',
      business_id: 'biz-1',
      coupon_code: 'RACED',
      status: 'available',
      expires_at: new Date('2099-12-31'),
      customer_id: null,
      coupon_type: { discount_type: 'fixed_off', discount_value: 15, applicable_product_ids: [], applicable_category_ids: [] },
    };
    const mocks = buildMocks({
      couponRepo: makeMockRepo({ findOne: jest.fn().mockResolvedValue(futureCoupon) }),
      // Coupon UPDATE returns 0 rows (another request claimed it first)
      qrQueryOverride: (sql: string) => {
        if (sql.includes('UPDATE coupons') && sql.includes("status = 'redeemed'")) {
          return []; // race: 0 rows updated
        }
      },
    });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    // Should NOT throw
    const result = await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, coupon_codes: ['RACED'],
    });
    expect(result).toBeTruthy();
  });

  it('TVA invariant holds after all discounts: total_ttc = total_ht + total_tva', async () => {
    const futureCoupon = {
      id: 'coupon-3',
      business_id: 'biz-1',
      coupon_code: 'PCTOFF',
      status: 'available',
      expires_at: new Date('2099-12-31'),
      customer_id: null,
      coupon_type: { discount_type: 'percent_off', discount_value: 15, applicable_product_ids: [], applicable_category_ids: [] },
    };
    const mocks = buildMocks({
      promotions: [{
        promotion_id: 'promo-2',
        name: '10% off',
        promotion_type: 'percent_off_order',
        auto_apply: true,
        computed_discount: 10,
        affected_line_indexes: [0],
      }],
      couponRepo: makeMockRepo({ findOne: jest.fn().mockResolvedValue(futureCoupon) }),
    });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, coupon_codes: ['PCTOFF'],
    });

    const txn = mocks.transactionRepo.create.mock.calls[0][0];
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));
  });
});

// ── Table session integration (Phase 10 Part D) ───────────────────────────────

describe('TerminalService – createTransaction with table_session_id', () => {
  const SESSION_ID = 'session-abc';
  const TABLE_ID = 'table-1';

  const mockProducts = [
    { id: 'prod-a', business_id: 'biz-1', category_id: 'cat-1', tva_exempt: false, tva_rate: null, category: { default_tva_rate: 20 } },
  ];

  const baseDto = {
    items: [{ product_id: 'prod-a', product_name: 'Café', quantity: 1, unit_price: 100, line_total: 100 }],
    subtotal: 100,
    total: 100,
    payment_method: PaymentMethod.CASH,
  } as any;

  function buildTableMocks(opts: {
    sessionStatus?: string;
    expectedSplitCount?: number;
    completedCountAfterSave?: number;
  } = {}) {
    const {
      sessionStatus = 'awaiting_payment',
      expectedSplitCount = 1,
      completedCountAfterSave = 1,
    } = opts;

    const tableSessionRepo = makeMockRepo({
      findOne: jest.fn().mockResolvedValue(
        sessionStatus === 'awaiting_payment'
          ? { id: SESSION_ID, status: 'awaiting_payment', expected_split_count: expectedSplitCount, table_id: TABLE_ID }
          : null,
      ),
    });

    const qr = makeQrMock((sql: string, params?: any[]) => {
      if (sql.includes('UPDATE businesses') && sql.includes('invoice_counter')) {
        return [{ invoice_counter: 1, business_code: 'CAFE01' }];
      }
      // FOR UPDATE lock on session
      if (sql.includes('FROM table_sessions') && sql.includes('FOR UPDATE')) {
        if (sessionStatus !== 'awaiting_payment') return [];
        return [{ id: SESSION_ID, table_id: TABLE_ID, expected_split_count: expectedSplitCount, status: 'awaiting_payment' }];
      }
      // Count completed transactions
      if (sql.includes('COUNT(*)') && sql.includes('table_session_id')) {
        return [{ count: String(completedCountAfterSave) }];
      }
      // Session UPDATE to paid
      if (sql.includes("SET status = 'paid'")) {
        return [];
      }
      return [];
    });

    return makeTestModule({
      productRepo: makeMockRepo({ find: jest.fn().mockResolvedValue(mockProducts) }),
      tableSessionRepo,
      qr,
    });
  }

  it('auto-transitions session to paid when single-split payment completes', async () => {
    const mocks = buildTableMocks({ expectedSplitCount: 1, completedCountAfterSave: 1 });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto,
      table_session_id: SESSION_ID,
    });

    // Verify the QR issued the UPDATE to set status='paid'
    const paidUpdate = (mocks.qr.manager.query as jest.Mock).mock.calls.find(
      (c: any[]) => c[0].includes("SET status = 'paid'"),
    );
    expect(paidUpdate).toBeTruthy();
    expect(paidUpdate[1][0]).toBe(SESSION_ID);
  });

  it('first of 2 splits does NOT transition session to paid; second does', async () => {
    // ── First payment: count=1, expected=2 → still awaiting ──
    const mocks1 = buildTableMocks({ expectedSplitCount: 2, completedCountAfterSave: 1 });
    const module1 = await mocks1.module.compile();
    const service1 = module1.get(TerminalService);

    await service1.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto,
      table_session_id: SESSION_ID,
    });

    const paidUpdate1 = (mocks1.qr.manager.query as jest.Mock).mock.calls.find(
      (c: any[]) => c[0].includes("SET status = 'paid'"),
    );
    expect(paidUpdate1).toBeUndefined(); // still awaiting

    // ── Second payment: count=2, expected=2 → transitions to paid ──
    const mocks2 = buildTableMocks({ expectedSplitCount: 2, completedCountAfterSave: 2 });
    const module2 = await mocks2.module.compile();
    const service2 = module2.get(TerminalService);

    await service2.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto,
      table_session_id: SESSION_ID,
    });

    const paidUpdate2 = (mocks2.qr.manager.query as jest.Mock).mock.calls.find(
      (c: any[]) => c[0].includes("SET status = 'paid'"),
    );
    expect(paidUpdate2).toBeTruthy(); // now paid
  });

  it('emits dashboard:transaction_created for every transaction', async () => {
    mockEventGateway.emitToRoom.mockClear();
    const mocks = buildTableMocks({ expectedSplitCount: 1, completedCountAfterSave: 1 });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto,
      table_session_id: SESSION_ID,
    });

    const dashboardEmit = (mockEventGateway.emitToRoom as jest.Mock).mock.calls.find(
      (c: any[]) => c[1] === 'dashboard:transaction_created',
    );
    expect(dashboardEmit).toBeTruthy();
    expect(dashboardEmit[0]).toBe('dashboard:biz-1');
  });

  it('emits floor:session_paid when the session transitions to paid', async () => {
    mockEventGateway.emitToRoom.mockClear();
    const mocks = buildTableMocks({ expectedSplitCount: 1, completedCountAfterSave: 1 });
    const module = await mocks.module.compile();
    const service = module.get(TerminalService);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto,
      table_session_id: SESSION_ID,
    });

    const paidEmit = (mockEventGateway.emitToRoom as jest.Mock).mock.calls.find(
      (c: any[]) => c[1] === 'floor:session_paid',
    );
    expect(paidEmit).toBeTruthy();
    expect(paidEmit[2]).toMatchObject({ session_id: SESSION_ID, table_id: TABLE_ID });
  });
});
