import { Injectable } from '@nestjs/common';
import { bankersRound, distributeDiscount } from '../utils/money';

/**
 * A single line item entering the discount pipeline.
 */
export interface PipelineLineInput {
  id: string;
  quantity: number;
  unit_price: number; // TTC per unit
  tva_rate: number;   // e.g. 20.00
}

/**
 * One step in the discount pipeline per XCC-017.
 * Steps are applied in strict order: grade → promotion → coupon.
 */
export interface DiscountStep {
  type: 'grade' | 'promotion' | 'coupon' | 'points';
  /** Percentage discount (e.g. 5 for 5%). Mutually exclusive with fixed_amount. */
  percent?: number;
  /** Only apply to these line IDs. null/undefined = all lines. */
  applicable_line_ids?: string[] | null;
  /** Fixed MAD amount to distribute proportionally per XCC-011. Mutually exclusive with percent. */
  fixed_amount?: number;
}

/**
 * Per-line result after all discount steps and TVA decomposition.
 */
export interface LineResult {
  id: string;
  quantity: number;
  unit_price: number;
  pre_discount_ttc: number;
  discount_amount: number;
  item_ttc: number;
  item_ht: number;
  item_tva: number;
  tva_rate: number;
}

/**
 * Full pipeline result.
 */
export interface PipelineResult {
  lines: LineResult[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  total_discount: number;
}

/**
 * Decomposes a TTC amount into HT and TVA using the SRS §3.7.2 formula:
 *   item_ht  = bankersRound(item_ttc / (1 + tva_rate / 100), 2)
 *   item_tva = bankersRound(item_ttc - item_ht, 2)
 */
function decomposeTva(ttc: number, tvaRate: number): { ht: number; tva: number } {
  if (tvaRate === 0) {
    return { ht: ttc, tva: 0 };
  }
  const ht = bankersRound(ttc / (1 + tvaRate / 100));
  const tva = bankersRound(ttc - ht);
  return { ht, tva };
}

@Injectable()
export class DiscountPipelineService {
  /**
   * Runs the full discount pipeline per XCC-017.
   *
   * 1. Compute pre-discount TTC per line (quantity × unit_price).
   * 2. Apply each discount step in order. Each step operates on the
   *    running TTC from the previous step.
   * 3. Decompose final TTC into HT/TVA per SRS §3.7.2.
   * 4. Sum totals: total_ttc = total_ht + total_tva (per SRS formula).
   */
  calculate(lines: PipelineLineInput[], steps: DiscountStep[]): PipelineResult {
    // Running TTC per line — mutated through each step
    const runningTtc = new Map<string, number>();
    const totalDiscountPerLine = new Map<string, number>();

    for (const line of lines) {
      const ttc = bankersRound(line.quantity * line.unit_price);
      runningTtc.set(line.id, ttc);
      totalDiscountPerLine.set(line.id, 0);
    }

    // Apply each discount step sequentially
    for (const step of steps) {
      if (step.percent !== undefined && step.percent > 0) {
        this.applyPercentStep(lines, runningTtc, totalDiscountPerLine, step);
      } else if (step.fixed_amount !== undefined && step.fixed_amount > 0) {
        this.applyFixedStep(lines, runningTtc, totalDiscountPerLine, step);
      }
    }

    // Build results with TVA decomposition
    const results: LineResult[] = [];
    let totalHt = 0;
    let totalTva = 0;
    let totalDiscount = 0;

    for (const line of lines) {
      const preDiscountTtc = bankersRound(line.quantity * line.unit_price);
      const itemTtc = runningTtc.get(line.id)!;
      const discountAmount = totalDiscountPerLine.get(line.id)!;
      const { ht, tva } = decomposeTva(itemTtc, line.tva_rate);

      results.push({
        id: line.id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        pre_discount_ttc: preDiscountTtc,
        discount_amount: bankersRound(discountAmount),
        item_ttc: itemTtc,
        item_ht: ht,
        item_tva: tva,
        tva_rate: line.tva_rate,
      });

      totalHt += ht;
      totalTva += tva;
      totalDiscount += discountAmount;
    }

    // SRS §3.7.2: total_ttc = total_ht + total_tva (not sum of item_ttc)
    const totalTtc = bankersRound(totalHt + totalTva);

    return {
      lines: results,
      total_ht: bankersRound(totalHt),
      total_tva: bankersRound(totalTva),
      total_ttc: totalTtc,
      total_discount: bankersRound(totalDiscount),
    };
  }

  private applyPercentStep(
    lines: PipelineLineInput[],
    runningTtc: Map<string, number>,
    totalDiscountPerLine: Map<string, number>,
    step: DiscountStep,
  ): void {
    const applicableIds = step.applicable_line_ids
      ? new Set(step.applicable_line_ids)
      : null;

    for (const line of lines) {
      if (applicableIds && !applicableIds.has(line.id)) continue;

      const currentTtc = runningTtc.get(line.id)!;
      const reduction = bankersRound(currentTtc * step.percent! / 100);
      const newTtc = bankersRound(currentTtc - reduction);

      runningTtc.set(line.id, newTtc);
      totalDiscountPerLine.set(
        line.id,
        totalDiscountPerLine.get(line.id)! + reduction,
      );
    }
  }

  private applyFixedStep(
    lines: PipelineLineInput[],
    runningTtc: Map<string, number>,
    totalDiscountPerLine: Map<string, number>,
    step: DiscountStep,
  ): void {
    // Build the set of applicable lines with their current TTC
    const applicableIds = step.applicable_line_ids
      ? new Set(step.applicable_line_ids)
      : null;

    const applicableLines: { id: string; ttc: number }[] = [];
    for (const line of lines) {
      if (applicableIds && !applicableIds.has(line.id)) continue;
      applicableLines.push({ id: line.id, ttc: runningTtc.get(line.id)! });
    }

    // Distribute proportionally per XCC-011
    const distribution = distributeDiscount(applicableLines, step.fixed_amount!);

    for (const [id, discount] of distribution) {
      const currentTtc = runningTtc.get(id)!;
      const newTtc = bankersRound(currentTtc - discount);
      runningTtc.set(id, newTtc);
      totalDiscountPerLine.set(id, totalDiscountPerLine.get(id)! + discount);
    }
  }
}
