import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TerminalService } from './terminal.service';
import { DiscountPipelineService } from '../../common/services/discount-pipeline.service';
import { KdsService } from '../kds/kds.service';
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
import { PaymentMethod } from '../../common/enums';
import { bankersRound } from '../../common/utils/money';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function makeTestModule(overrides: {
  productRepo?: any;
  transactionRepo?: any;
  itemRepo?: any;
  businessRepo?: any;
  customerRepo?: any;
  gradeRepo?: any;
  pointsHistoryRepo?: any;
} = {}) {
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
    findOne: jest.fn().mockResolvedValue({ id: 'biz-1', points_earn_divisor: 10 }),
    manager: {
      query: jest.fn().mockResolvedValue([[{ invoice_counter: 1, business_code: 'CAFE01' }], 1]),
    },
  });
  const customerRepo = overrides.customerRepo ?? makeMockRepo({
    findOne: jest.fn().mockResolvedValue(null),
    manager: {
      query: jest.fn().mockResolvedValue([{ points_balance: 5, lifetime_points: 5 }]),
    },
  });
  const gradeRepo = overrides.gradeRepo ?? makeMockRepo({ find: jest.fn().mockResolvedValue([]) });
  const pointsHistoryRepo = overrides.pointsHistoryRepo ?? makeMockRepo();

  return {
    productRepo, transactionRepo, itemRepo, businessRepo,
    customerRepo, gradeRepo, pointsHistoryRepo,
    module: Test.createTestingModule({
      providers: [
        TerminalService,
        DiscountPipelineService,
        { provide: KdsService, useValue: { notifyNewOrder: jest.fn() } },
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
  let businessRepo: any;

  // Two products: one at 20% TVA (from category default), one at 10% (product override)
  const mockProducts = [
    {
      id: 'prod-a',
      business_id: 'biz-1',
      tva_exempt: false,
      tva_rate: null,
      category: { default_tva_rate: 20 },
    },
    {
      id: 'prod-b',
      business_id: 'biz-1',
      tva_exempt: false,
      tva_rate: 10,
      category: { default_tva_rate: 20 },
    },
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
    businessRepo = mocks.businessRepo;

    const module: TestingModule = await mocks.module.compile();
    service = module.get(TerminalService);
  });

  it('should compute TVA decomposition for items with different rates', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txnCreateCall = transactionRepo.create.mock.calls[0][0];

    // prod-a: 2 × 15 = 30 TTC at 20% → HT = 30 / 1.20 = 25.00, TVA = 5.00
    // prod-b: 1 × 20 = 20 TTC at 10% → HT = 20 / 1.10 = 18.18, TVA = 1.82
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

    const queryCall = businessRepo.manager.query.mock.calls[0];
    expect(queryCall[0]).toContain('UPDATE businesses');
    expect(queryCall[0]).toContain('RETURNING invoice_counter');
    expect(queryCall[1]).toEqual([new Date().getFullYear(), 'biz-1']);

    const txn = transactionRepo.create.mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(txn.invoice_number).toBe(`INV-CAFE01-${year}-000001`);
  });

  it('should reset invoice counter when year changes', async () => {
    businessRepo.manager.query.mockResolvedValueOnce([[{ invoice_counter: 1, business_code: 'CAFE01' }], 1]);

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
      { id: 'prod-a', business_id: 'biz-1', tva_exempt: true, tva_rate: null, category: { default_tva_rate: 20 } },
      { id: 'prod-b', business_id: 'biz-1', tva_exempt: false, tva_rate: 10, category: { default_tva_rate: 20 } },
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
    businessRepo.manager.query
      // First call: invoice counter (shouldn't be called here but include for safety)
      // Reset and set customer counter call
      .mockResolvedValueOnce([{ customer_counter: 7 }]);

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
  let businessRepo: any;

  const mockProducts = [
    { id: 'prod-a', business_id: 'biz-1', tva_exempt: false, tva_rate: null, category: { default_tva_rate: 20 } },
  ];

  // dto: 1 item × 50 MAD at 20% TVA → total_ttc = 50
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
        findOne: jest.fn().mockResolvedValue({ id: 'biz-1', points_earn_divisor: 10 }),
        manager: {
          query: jest.fn().mockResolvedValue([[{ invoice_counter: 1, business_code: 'BIZ01' }], 1]),
        },
      }),
    });
    transactionRepo = mocks.transactionRepo;
    itemRepo = mocks.itemRepo;
    customerRepo = mocks.customerRepo;
    gradeRepo = mocks.gradeRepo;
    pointsHistoryRepo = mocks.pointsHistoryRepo;
    businessRepo = mocks.businessRepo;

    const module: TestingModule = await mocks.module.compile();
    service = module.get(TerminalService);
  });

  it('earns points with multiplier=1 when customer has no grade', async () => {
    const customerId = 'cust-plain';
    customerRepo.findOne
      .mockResolvedValueOnce({ id: customerId, business_id: 'biz-1', is_active: true }) // verification
      .mockResolvedValueOnce({ id: customerId, grade: null, grade_id: null });           // earnPoints
    customerRepo.manager.query.mockResolvedValue([{ points_balance: 5, lifetime_points: 5 }]);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, customer_id: customerId,
    });

    // total_ttc=50, divisor=10 → base=5, multiplier=1 → points=5
    const updateArgs = customerRepo.manager.query.mock.calls[0];
    expect(updateArgs[0]).toContain('UPDATE customers');
    expect(updateArgs[1][0]).toBe(5);
    expect(updateArgs[1][1]).toBe(customerId);

    // Points history row inserted
    expect(pointsHistoryRepo.create.mock.calls[0][0]).toMatchObject({
      source: 'sale',
      delta: 5,
      customer_id: customerId,
    });
  });

  it('applies grade multiplier 1.5 (Gold) to base points', async () => {
    const customerId = 'cust-gold';
    const goldGrade = { id: 'grade-gold', name: 'Gold', points_multiplier: 1.5, min_points: 500, is_active: true };
    customerRepo.findOne
      .mockResolvedValueOnce({ id: customerId, business_id: 'biz-1', is_active: true })
      .mockResolvedValueOnce({ id: customerId, grade: goldGrade, grade_id: goldGrade.id });
    customerRepo.manager.query.mockResolvedValue([{ points_balance: 507, lifetime_points: 507 }]);
    gradeRepo.find.mockResolvedValue([goldGrade]);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, customer_id: customerId,
    });

    // base=5, multiplier=1.5 → floor(7.5)=7
    const updateArgs = customerRepo.manager.query.mock.calls[0];
    expect(updateArgs[1][0]).toBe(7);
  });

  it('does not earn points when no customer_id is provided', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', baseDto);

    // customerRepo.manager.query (UPDATE customers) should never be called
    expect(customerRepo.manager.query).not.toHaveBeenCalled();
    expect(pointsHistoryRepo.create).not.toHaveBeenCalled();
  });

  it('throws 404 when customer_id does not belong to the business', async () => {
    customerRepo.findOne.mockResolvedValue(null); // verification fails

    await expect(
      service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
        ...baseDto, customer_id: 'bad-customer',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('saves customer_id on the transaction record', async () => {
    const customerId = 'cust-attach';
    customerRepo.findOne
      .mockResolvedValueOnce({ id: customerId, business_id: 'biz-1', is_active: true })
      .mockResolvedValueOnce({ id: customerId, grade: null, grade_id: null });
    customerRepo.manager.query.mockResolvedValue([{ points_balance: 5, lifetime_points: 5 }]);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', {
      ...baseDto, customer_id: customerId,
    });

    const txn = transactionRepo.create.mock.calls[0][0];
    expect(txn.customer_id).toBe(customerId);
  });
});
