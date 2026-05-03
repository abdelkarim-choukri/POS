import { resolveTvaRate } from './tva';

describe('resolveTvaRate', () => {
  it('returns 0 when tva_exempt is true, regardless of other fields', () => {
    expect(resolveTvaRate(
      { tva_exempt: true, tva_rate: 20 },
      { default_tva_rate: 20 },
    )).toBe(0);
  });

  it('returns 0 when tva_exempt is true and tva_rate is null', () => {
    expect(resolveTvaRate(
      { tva_exempt: true, tva_rate: null },
      { default_tva_rate: 10 },
    )).toBe(0);
  });

  it('returns product.tva_rate when set and not exempt', () => {
    expect(resolveTvaRate(
      { tva_exempt: false, tva_rate: 10 },
      { default_tva_rate: 20 },
    )).toBe(10);
  });

  it('returns product.tva_rate of 7 (reduced rate)', () => {
    expect(resolveTvaRate(
      { tva_exempt: false, tva_rate: 7 },
      { default_tva_rate: 20 },
    )).toBe(7);
  });

  it('returns product.tva_rate of 0 (explicitly zero, not exempt)', () => {
    // A product can have tva_rate=0 without being tva_exempt.
    // The distinction matters for reporting: exempt items are categorised
    // differently than zero-rated items in some DGI filings.
    expect(resolveTvaRate(
      { tva_exempt: false, tva_rate: 0 },
      { default_tva_rate: 20 },
    )).toBe(0);
  });

  it('falls back to category default when tva_rate is null', () => {
    expect(resolveTvaRate(
      { tva_exempt: false, tva_rate: null },
      { default_tva_rate: 7 },
    )).toBe(7);
  });

  it('falls back to category default of 20', () => {
    expect(resolveTvaRate(
      { tva_exempt: false, tva_rate: null },
      { default_tva_rate: 20 },
    )).toBe(20);
  });

  it('falls back to category default of 10 (restaurant)', () => {
    expect(resolveTvaRate(
      { tva_exempt: false, tva_rate: null },
      { default_tva_rate: 10 },
    )).toBe(10);
  });
});
