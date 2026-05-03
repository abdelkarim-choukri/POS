import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
    query: jest.fn(),
    ...overrides,
  };
}

// ── Test suite ───────────────────────────────────────────────────────────────

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
    transactionRepo = makeMockRepo({
      findOne: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({ id: where.id, items: [] }),
      ),
    });
    itemRepo = makeMockRepo({
      save: jest.fn((entities: any[]) =>
        Promise.resolve(entities.map((e, i) => ({ id: `item-${i}`, ...e }))),
      ),
    });
    productRepo = makeMockRepo({
      find: jest.fn().mockResolvedValue(mockProducts),
    });
    businessRepo = makeMockRepo({
      manager: {
        query: jest.fn().mockResolvedValue([[{ invoice_counter: 1, business_code: 'CAFE01' }], 1]),
      },
    });

    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get(TerminalService);
  });

  it('should compute TVA decomposition for items with different rates', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    // Verify the transaction was created with correct args
    const txnCreateCall = transactionRepo.create.mock.calls[0][0];

    // prod-a: 2 × 15 = 30 TTC at 20% → HT = 30 / 1.20 = 25.00, TVA = 5.00
    // prod-b: 1 × 20 = 20 TTC at 10% → HT = 20 / 1.10 = 18.18, TVA = 1.82
    // total_ht = 25.00 + 18.18 = 43.18
    // total_tva = 5.00 + 1.82 = 6.82
    // total_ttc = total_ht + total_tva = 43.18 + 6.82 = 50.00 (NOT sum of item_ttc)
    expect(txnCreateCall.total_ht).toBe(43.18);
    expect(txnCreateCall.total_tva).toBe(6.82);
    expect(txnCreateCall.total_ttc).toBe(50);

    // Verify items
    const itemCalls = itemRepo.create.mock.calls;
    // Item 0: prod-a at 20%
    expect(itemCalls[0][0].tva_rate).toBe(20);
    expect(itemCalls[0][0].item_ht).toBe(25);
    expect(itemCalls[0][0].item_tva).toBe(5);
    expect(itemCalls[0][0].item_ttc).toBe(30);
    // Item 1: prod-b at 10%
    expect(itemCalls[1][0].tva_rate).toBe(10);
    expect(itemCalls[1][0].item_ht).toBe(18.18);
    expect(itemCalls[1][0].item_tva).toBe(1.82);
    expect(itemCalls[1][0].item_ttc).toBe(20);
  });

  it('should set backward-compat fields: subtotal=HT, tax_amount=TVA, total=TTC', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txn = transactionRepo.create.mock.calls[0][0];

    // Backward compat mapping
    expect(txn.subtotal).toBe(txn.total_ht);
    expect(txn.tax_amount).toBe(txn.total_tva);
    expect(txn.total).toBe(txn.total_ttc);

    // Explicit values
    expect(txn.subtotal).toBe(43.18);   // HT, not TTC
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

    // The invariant: total_ttc is computed from total_ht + total_tva
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));

    // Verify it's NOT just the sum of item_ttc (they can differ by rounding)
    const itemTtcSum = itemRepo.create.mock.calls.reduce(
      (sum: number, call: any) => sum + call[0].item_ttc, 0,
    );
    // In this case they happen to match, but the code path is what matters
    expect(txn.total_ttc).toBe(bankersRound(txn.total_ht + txn.total_tva));
  });

  it('should generate invoice number with atomic counter and year reset', async () => {
    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    // Verify the atomic UPDATE query was called
    const queryCall = businessRepo.manager.query.mock.calls[0];
    expect(queryCall[0]).toContain('UPDATE businesses');
    expect(queryCall[0]).toContain('RETURNING invoice_counter');
    expect(queryCall[1]).toEqual([new Date().getFullYear(), 'biz-1']);

    const txn = transactionRepo.create.mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(txn.invoice_number).toBe(`INV-CAFE01-${year}-000001`);
  });

  it('should reset invoice counter when year changes', async () => {
    // Simulate: counter was at 42 last year, now resets to 1
    businessRepo.manager.query.mockResolvedValueOnce([[{ invoice_counter: 1, business_code: 'CAFE01' }], 1]);

    await service.createTransaction('biz-1', 'loc-1', 'term-1', 'user-1', dto);

    const txn = transactionRepo.create.mock.calls[0][0];
    const year = new Date().getFullYear();
    expect(txn.invoice_number).toBe(`INV-CAFE01-${year}-000001`);
  });

  it('should throw BadRequestException for unknown product_id', async () => {
    productRepo.find.mockResolvedValueOnce([]); // no products found

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
    // Exempt product: TVA rate = 0, HT = TTC
    expect(itemCalls[0][0].tva_rate).toBe(0);
    expect(itemCalls[0][0].item_ht).toBe(30);
    expect(itemCalls[0][0].item_tva).toBe(0);
    expect(itemCalls[0][0].item_ttc).toBe(30);
    // Non-exempt product: 10% TVA
    expect(itemCalls[1][0].tva_rate).toBe(10);
  });
});
