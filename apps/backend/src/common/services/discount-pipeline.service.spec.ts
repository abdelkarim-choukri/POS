import { DiscountPipelineService, PipelineLineInput, DiscountStep } from './discount-pipeline.service';
import { bankersRound } from '../utils/money';

describe('DiscountPipelineService', () => {
  let service: DiscountPipelineService;

  beforeEach(() => {
    service = new DiscountPipelineService();
  });

  // ── TVA decomposition (no discounts) ──────────────────────────────

  describe('TVA decomposition with no discount steps', () => {
    it('decomposes 20% TVA correctly (SRS §3.7.2 example adapted)', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 120.00, tva_rate: 20 },
      ];
      const result = service.calculate(lines, []);

      expect(result.lines[0].item_ttc).toBe(120.00);
      // HT = 120 / 1.20 = 100.00
      expect(result.lines[0].item_ht).toBe(100.00);
      expect(result.lines[0].item_tva).toBe(20.00);
      expect(result.lines[0].discount_amount).toBe(0);
    });

    it('decomposes 10% TVA correctly (SRS §3.7.2 example: 20.00 TTC)', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 20.00, tva_rate: 10 },
      ];
      const result = service.calculate(lines, []);

      // HT = 20.00 / 1.10 = 18.18 (rounded)
      expect(result.lines[0].item_ht).toBe(18.18);
      expect(result.lines[0].item_tva).toBe(1.82);
      expect(result.lines[0].item_ttc).toBe(20.00);
    });

    it('decomposes 7% TVA correctly', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 107.00, tva_rate: 7 },
      ];
      const result = service.calculate(lines, []);

      expect(result.lines[0].item_ht).toBe(100.00);
      expect(result.lines[0].item_tva).toBe(7.00);
    });

    it('decomposes 0% TVA correctly', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 100.00, tva_rate: 0 },
      ];
      const result = service.calculate(lines, []);

      expect(result.lines[0].item_ht).toBe(100.00);
      expect(result.lines[0].item_tva).toBe(0);
      expect(result.lines[0].item_ttc).toBe(100.00);
    });

    it('handles rounding edge case: 1.01 TTC at 20%', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 1.01, tva_rate: 20 },
      ];
      const result = service.calculate(lines, []);

      // HT = 1.01 / 1.20 = 0.841666... → banker's round → 0.84
      expect(result.lines[0].item_ht).toBe(0.84);
      // TVA = 1.01 - 0.84 = 0.17
      expect(result.lines[0].item_tva).toBe(0.17);
    });

    it('handles quantity > 1', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 3, unit_price: 25.00, tva_rate: 20 },
      ];
      const result = service.calculate(lines, []);

      // item_ttc = 3 * 25.00 = 75.00
      expect(result.lines[0].item_ttc).toBe(75.00);
      // HT = 75.00 / 1.20 = 62.50
      expect(result.lines[0].item_ht).toBe(62.50);
      expect(result.lines[0].item_tva).toBe(12.50);
    });

    it('mixed TVA rates in same transaction', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 24.00, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 10.70, tva_rate: 7 },
        { id: '3', quantity: 1, unit_price: 50.00, tva_rate: 0 },
      ];
      const result = service.calculate(lines, []);

      // Line 1: HT = 24.00/1.20 = 20.00, TVA = 4.00
      expect(result.lines[0].item_ht).toBe(20.00);
      expect(result.lines[0].item_tva).toBe(4.00);

      // Line 2: HT = 10.70/1.07 = 10.00, TVA = 0.70
      expect(result.lines[1].item_ht).toBe(10.00);
      expect(result.lines[1].item_tva).toBe(0.70);

      // Line 3: HT = 50.00, TVA = 0
      expect(result.lines[2].item_ht).toBe(50.00);
      expect(result.lines[2].item_tva).toBe(0);

      expect(result.total_ht).toBe(80.00);
      expect(result.total_tva).toBe(4.70);
      // SRS §3.7.2: total_ttc = total_ht + total_tva
      expect(result.total_ttc).toBe(84.70);
    });

    it('total_ttc = total_ht + total_tva invariant', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 2, unit_price: 33.33, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 15.99, tva_rate: 10 },
        { id: '3', quantity: 3, unit_price: 7.50, tva_rate: 7 },
      ];
      const result = service.calculate(lines, []);

      expect(result.total_ttc).toBe(
        bankersRound(result.total_ht + result.total_tva),
      );
    });
  });

  // ── Percentage discount ───────────────────────────────────────────

  describe('percentage discount', () => {
    it('applies to all lines when no applicable_line_ids', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 100.00, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 50.00, tva_rate: 20 },
      ];
      const steps: DiscountStep[] = [
        { type: 'grade', percent: 10 },
      ];
      const result = service.calculate(lines, steps);

      // 10% off 100 = 10 → TTC 90
      expect(result.lines[0].item_ttc).toBe(90.00);
      expect(result.lines[0].discount_amount).toBe(10.00);

      // 10% off 50 = 5 → TTC 45
      expect(result.lines[1].item_ttc).toBe(45.00);
      expect(result.lines[1].discount_amount).toBe(5.00);

      expect(result.total_discount).toBe(15.00);
    });

    it('applies only to specified lines', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 100.00, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 50.00, tva_rate: 20 },
      ];
      const steps: DiscountStep[] = [
        { type: 'promotion', percent: 10, applicable_line_ids: ['1'] },
      ];
      const result = service.calculate(lines, steps);

      expect(result.lines[0].item_ttc).toBe(90.00);
      expect(result.lines[1].item_ttc).toBe(50.00); // unchanged
      expect(result.total_discount).toBe(10.00);
    });
  });

  // ── Fixed amount discount ─────────────────────────────────────────

  describe('fixed amount discount', () => {
    it('distributes proportionally per XCC-011', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 60.00, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 40.00, tva_rate: 20 },
      ];
      const steps: DiscountStep[] = [
        { type: 'coupon', fixed_amount: 10 },
      ];
      const result = service.calculate(lines, steps);

      // 60% of 10 = 6.00 → TTC 54.00
      expect(result.lines[0].item_ttc).toBe(54.00);
      // 40% of 10 = 4.00 → TTC 36.00
      expect(result.lines[1].item_ttc).toBe(36.00);
      expect(result.total_discount).toBe(10.00);
    });
  });

  // ── Multi-step pipeline (XCC-017 worked example) ──────────────────

  describe('XCC-017 worked example', () => {
    it('applies grade → promotion → coupon in correct order', () => {
      // Cart: 4 items at 25.00 each. Gold grade = 5%.
      // Promotion: 10% off items 1+2 (bakery). Coupon: 20 MAD off order.
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 25.00, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 25.00, tva_rate: 20 },
        { id: '3', quantity: 1, unit_price: 25.00, tva_rate: 20 },
        { id: '4', quantity: 1, unit_price: 25.00, tva_rate: 20 },
      ];
      const steps: DiscountStep[] = [
        { type: 'grade', percent: 5 },
        { type: 'promotion', percent: 10, applicable_line_ids: ['1', '2'] },
        { type: 'coupon', fixed_amount: 20.00 },
      ];
      const result = service.calculate(lines, steps);

      // Step 0: all 4 items @ 25.00 = TTC₀ 100.00
      // Step 1 (grade −5%): all → 23.75 each = TTC₁ 95.00
      // Step 2 (promo −10% on 1+2): 23.75 → 21.375 each; 3+4 stay 23.75 = TTC₂ 90.25
      // Step 3 (coupon −20.00 proportional across all 4):
      //   Items 1+2: 20 × (21.375/90.25) ≈ 4.74 off each
      //   Items 3+4: 20 × (23.75/90.25)  ≈ 5.26 off each
      //   Final TTC ≈ 70.25

      const totalTtc = result.lines.reduce((s, l) => s + l.item_ttc, 0);
      expect(Math.abs(totalTtc - 70.25)).toBeLessThanOrEqual(0.02);

      expect(Math.abs(result.total_discount - 29.75)).toBeLessThanOrEqual(0.02);

      // Items at same position should have symmetrical discounts
      expect(result.lines[0].item_ttc).toBe(result.lines[1].item_ttc);
      expect(result.lines[2].item_ttc).toBe(result.lines[3].item_ttc);

      // HT + TVA = TTC invariant still holds
      expect(result.total_ttc).toBe(
        bankersRound(result.total_ht + result.total_tva),
      );
    });
  });

  // ── Invariants ────────────────────────────────────────────────────

  describe('invariants', () => {
    it('HT + TVA = TTC holds after discount steps', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 2, unit_price: 33.33, tva_rate: 20 },
        { id: '2', quantity: 1, unit_price: 15.99, tva_rate: 10 },
        { id: '3', quantity: 3, unit_price: 7.50, tva_rate: 7 },
      ];
      const steps: DiscountStep[] = [
        { type: 'grade', percent: 5 },
        { type: 'coupon', fixed_amount: 8.00 },
      ];
      const result = service.calculate(lines, steps);

      // Per-line: item_ht + item_tva should be close to item_ttc
      for (const line of result.lines) {
        expect(Math.abs(line.item_ht + line.item_tva - line.item_ttc))
          .toBeLessThanOrEqual(0.01);
      }

      // Grand total invariant
      expect(result.total_ttc).toBe(
        bankersRound(result.total_ht + result.total_tva),
      );
    });

    it('empty lines produces zero totals', () => {
      const result = service.calculate([], []);
      expect(result.total_ht).toBe(0);
      expect(result.total_tva).toBe(0);
      expect(result.total_ttc).toBe(0);
      expect(result.total_discount).toBe(0);
      expect(result.lines).toHaveLength(0);
    });

    it('discount steps with no applicable effect are no-ops', () => {
      const lines: PipelineLineInput[] = [
        { id: '1', quantity: 1, unit_price: 50.00, tva_rate: 20 },
      ];
      // Percent = 0 and fixed_amount = 0 should be no-ops
      const steps: DiscountStep[] = [
        { type: 'grade', percent: 0 },
        { type: 'coupon', fixed_amount: 0 },
      ];
      const result = service.calculate(lines, steps);

      expect(result.lines[0].item_ttc).toBe(50.00);
      expect(result.total_discount).toBe(0);
    });
  });
});
