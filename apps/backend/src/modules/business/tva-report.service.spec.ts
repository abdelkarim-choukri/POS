import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessService } from './business.service';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { ModifierGroup } from '../../common/entities/modifier-group.entity';
import { Modifier } from '../../common/entities/modifier.entity';
import { ProductModifierGroup } from '../../common/entities/product-modifier-group.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Location } from '../../common/entities/location.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { Refund } from '../../common/entities/refund.entity';
import { Void } from '../../common/entities/void.entity';

// Minimal stub repo — only what BusinessService constructor needs
function stubRepo() {
  return { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn(), count: jest.fn(), manager: { query: jest.fn() } };
}

describe('BusinessService – getTvaDeclaration [TVA-030/031, XCC-018]', () => {
  let service: BusinessService;
  let managerQuery: jest.Mock;

  beforeEach(async () => {
    const txnRepo = stubRepo();
    managerQuery = txnRepo.manager.query;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: getRepositoryToken(Category),             useValue: stubRepo() },
        { provide: getRepositoryToken(Product),              useValue: stubRepo() },
        { provide: getRepositoryToken(ProductVariant),       useValue: stubRepo() },
        { provide: getRepositoryToken(ModifierGroup),        useValue: stubRepo() },
        { provide: getRepositoryToken(Modifier),             useValue: stubRepo() },
        { provide: getRepositoryToken(ProductModifierGroup), useValue: stubRepo() },
        { provide: getRepositoryToken(User),                 useValue: stubRepo() },
        { provide: getRepositoryToken(ClockEntry),           useValue: stubRepo() },
        { provide: getRepositoryToken(Location),             useValue: stubRepo() },
        { provide: getRepositoryToken(Terminal),             useValue: stubRepo() },
        { provide: getRepositoryToken(Transaction),          useValue: txnRepo },
        { provide: getRepositoryToken(Refund),               useValue: stubRepo() },
        { provide: getRepositoryToken(Void),                 useValue: stubRepo() },
      ],
    }).compile();

    service = module.get(BusinessService);
  });

  it('groups completed transactions by TVA rate band and sums correctly', async () => {
    // Simulated DB result: 3 transactions across 2 rate bands
    // Band 20%: 2 txns — item_ht=100+50=150, item_tva=20+10=30, item_ttc=120+60=180
    // Band 10%: 1 txn  — item_ht=200,         item_tva=20,       item_ttc=220
    managerQuery.mockResolvedValueOnce([
      { tva_rate: '20.00', total_ht: '150.00', total_tva: '30.00', total_ttc: '180.00', transaction_count: '2' },
      { tva_rate: '10.00', total_ht: '200.00', total_tva: '20.00', total_ttc: '220.00', transaction_count: '1' },
    ]);

    const result = await service.getTvaDeclaration('biz-1', {
      from_date: '2026-04-01',
      to_date: '2026-04-30',
    });

    expect(result.from_date).toBe('2026-04-01');
    expect(result.to_date).toBe('2026-04-30');
    expect(result.by_rate).toHaveLength(2);

    // 20% band
    expect(result.by_rate[0].tva_rate).toBe(20);
    expect(result.by_rate[0].total_ht).toBe(150);
    expect(result.by_rate[0].total_tva).toBe(30);
    expect(result.by_rate[0].total_ttc).toBe(180);
    expect(result.by_rate[0].transaction_count).toBe(2);

    // 10% band
    expect(result.by_rate[1].tva_rate).toBe(10);
    expect(result.by_rate[1].total_ht).toBe(200);
    expect(result.by_rate[1].total_tva).toBe(20);
    expect(result.by_rate[1].total_ttc).toBe(220);
    expect(result.by_rate[1].transaction_count).toBe(1);

    // Grand totals
    expect(result.totals.total_ht).toBe(350);
    expect(result.totals.total_tva).toBe(50);
    expect(result.totals.total_ttc).toBe(400);
    expect(result.totals.transaction_count).toBe(3);
  });

  it('uses calendar-date query (XCC-018) — SQL must reference created_at AT TIME ZONE', async () => {
    managerQuery.mockResolvedValueOnce([]);

    await service.getTvaDeclaration('biz-1', { from_date: '2026-04-01', to_date: '2026-04-30' });

    const [sql, params] = managerQuery.mock.calls[0];
    expect(sql).toContain('AT TIME ZONE');
    expect(sql).toContain('Africa/Casablanca');
    expect(params).toEqual(['biz-1', '2026-04-01', '2026-04-30']);
  });

  it('passes business_id as filter (multi-tenancy — XCC-001)', async () => {
    managerQuery.mockResolvedValueOnce([]);

    await service.getTvaDeclaration('biz-xyz', { from_date: '2026-01-01', to_date: '2026-01-31' });

    const [, params] = managerQuery.mock.calls[0];
    expect(params[0]).toBe('biz-xyz');
  });

  it('returns empty by_rate and zero totals when no transactions exist', async () => {
    managerQuery.mockResolvedValueOnce([]);

    const result = await service.getTvaDeclaration('biz-1', {
      from_date: '2026-01-01',
      to_date: '2026-01-31',
    });

    expect(result.by_rate).toHaveLength(0);
    expect(result.totals.total_ht).toBe(0);
    expect(result.totals.total_tva).toBe(0);
    expect(result.totals.total_ttc).toBe(0);
    expect(result.totals.transaction_count).toBe(0);
  });

  it('applies bankersRound to sums (rounding edge case)', async () => {
    // .005 at 2 decimals rounds to .00 (banker's: even neighbour)
    managerQuery.mockResolvedValueOnce([
      { tva_rate: '20.00', total_ht: '100.005', total_tva: '20.005', total_ttc: '120.005', transaction_count: '1' },
    ]);

    const result = await service.getTvaDeclaration('biz-1', {
      from_date: '2026-04-01',
      to_date: '2026-04-30',
    });

    // bankersRound(100.005) = 100.00 (round half to even)
    expect(result.by_rate[0].total_ht).toBe(100);
    expect(result.by_rate[0].total_tva).toBe(20);
    expect(result.by_rate[0].total_ttc).toBe(120);
  });
});
