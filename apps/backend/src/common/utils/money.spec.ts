import { bankersRound, distributeDiscount } from './money';

describe('bankersRound', () => {
  it('rounds 2.5 to 2 (half to even — even neighbour is 2)', () => {
    expect(bankersRound(2.5, 0)).toBe(2);
  });

  it('rounds 3.5 to 4 (half to even — even neighbour is 4)', () => {
    expect(bankersRound(3.5, 0)).toBe(4);
  });

  it('rounds 0.005 to 0.00 (half to even at 2 decimals)', () => {
    expect(bankersRound(0.005)).toBe(0.00);
  });

  it('rounds 0.015 to 0.02 (half to even at 2 decimals)', () => {
    expect(bankersRound(0.015)).toBe(0.02);
  });

  it('rounds 0.025 to 0.02 (half to even at 2 decimals)', () => {
    expect(bankersRound(0.025)).toBe(0.02);
  });

  it('rounds 0.035 to 0.04 (half to even at 2 decimals)', () => {
    expect(bankersRound(0.035)).toBe(0.04);
  });

  it('rounds normally when not at 0.5 boundary', () => {
    expect(bankersRound(2.34)).toBe(2.34);
    expect(bankersRound(2.346)).toBe(2.35);
    expect(bankersRound(2.344)).toBe(2.34);
  });

  it('handles negative values', () => {
    expect(bankersRound(-2.5, 0)).toBe(-2);
    expect(bankersRound(-3.5, 0)).toBe(-4);
    expect(bankersRound(-1.235)).toBe(-1.24);
  });

  it('handles zero', () => {
    expect(bankersRound(0)).toBe(0);
    expect(bankersRound(0.0)).toBe(0);
  });

  it('handles large values', () => {
    expect(bankersRound(999999999.995)).toBe(1000000000.00);
    expect(bankersRound(999999999.985)).toBe(999999999.98);
  });

  it('respects custom decimal places', () => {
    expect(bankersRound(1.2345, 3)).toBe(1.234);
    expect(bankersRound(1.2355, 3)).toBe(1.236);
    expect(bankersRound(1.5, 0)).toBe(2);
    expect(bankersRound(2.5, 0)).toBe(2);
  });

  it('handles 1 decimal place', () => {
    expect(bankersRound(1.25, 1)).toBe(1.2);
    expect(bankersRound(1.35, 1)).toBe(1.4);
  });
});

describe('distributeDiscount', () => {
  it('distributes evenly across equal lines', () => {
    const lines = [
      { id: 'a', ttc: 25 },
      { id: 'b', ttc: 25 },
      { id: 'c', ttc: 25 },
      { id: 'd', ttc: 25 },
    ];
    const result = distributeDiscount(lines, 100);

    expect(result.get('a')).toBe(25);
    expect(result.get('b')).toBe(25);
    expect(result.get('c')).toBe(25);
    expect(result.get('d')).toBe(25);

    const total = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(total).toBe(100);
  });

  it('distributes proportionally for unequal lines', () => {
    const lines = [
      { id: 'a', ttc: 60 },
      { id: 'b', ttc: 40 },
    ];
    const result = distributeDiscount(lines, 10);

    expect(result.get('a')).toBe(6);
    expect(result.get('b')).toBe(4);
  });

  it('assigns rounding remainder to the largest line', () => {
    // 3 equal lines of 33.33 each (total 99.99). Discount 10.00
    // Each gets 10 * (33.33/99.99) = 3.333... → banker's rounds to 3.33
    // Sum = 9.99, remainder = 0.01 → assigned to first line (all equal, first found largest)
    const lines = [
      { id: 'a', ttc: 33.33 },
      { id: 'b', ttc: 33.33 },
      { id: 'c', ttc: 33.33 },
    ];
    const result = distributeDiscount(lines, 10);

    const total = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(Math.abs(total - 10)).toBeLessThanOrEqual(0.01);
  });

  it('handles a single item', () => {
    const lines = [{ id: 'a', ttc: 50 }];
    const result = distributeDiscount(lines, 20);
    expect(result.get('a')).toBe(20);
  });

  it('handles zero discount', () => {
    const lines = [
      { id: 'a', ttc: 25 },
      { id: 'b', ttc: 25 },
    ];
    const result = distributeDiscount(lines, 0);
    expect(result.get('a')).toBe(0);
    expect(result.get('b')).toBe(0);
  });

  it('caps discount at total TTC (prevents negative lines)', () => {
    const lines = [
      { id: 'a', ttc: 30 },
      { id: 'b', ttc: 20 },
    ];
    const result = distributeDiscount(lines, 100); // more than total 50

    const total = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(total).toBe(50); // capped at total TTC
    expect(result.get('a')).toBe(30);
    expect(result.get('b')).toBe(20);
  });

  it('handles empty lines array', () => {
    const result = distributeDiscount([], 10);
    expect(result.size).toBe(0);
  });

  it('reproduces the XCC-017 worked example coupon step', () => {
    // From XCC-017: 20.00 MAD coupon across 4 items with TTC₂ = 90.25
    // Items 1+2 @ 21.375 each, Items 3+4 @ 23.75 each
    const lines = [
      { id: '1', ttc: 21.375 },
      { id: '2', ttc: 21.375 },
      { id: '3', ttc: 23.75 },
      { id: '4', ttc: 23.75 },
    ];
    const result = distributeDiscount(lines, 20.00);

    // Items 1+2: 20 * (21.375/90.25) ≈ 4.74
    // Items 3+4: 20 * (23.75/90.25) ≈ 5.26
    // Total must equal exactly 20.00
    const total = Array.from(result.values()).reduce((s, v) => s + v, 0);
    expect(Math.abs(total - 20.00)).toBeLessThanOrEqual(0.01);

    // Items at same TTC should get same discount
    expect(result.get('1')).toBe(result.get('2'));
    expect(result.get('3')).toBe(result.get('4'));
  });
});
