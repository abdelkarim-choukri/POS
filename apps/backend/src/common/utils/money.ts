/**
 * Money utilities for MAD currency calculations.
 *
 * Banker's rounding (round half to even) and proportional discount
 * distribution per XCC-011.
 */

/**
 * Banker's rounding (round half to even) to the specified number of
 * decimal places. Default: 2 (for MAD amounts).
 *
 * Standard rounding always rounds 0.5 up, which introduces a systematic
 * positive bias. Banker's rounding rounds 0.5 to the nearest even digit,
 * eliminating that bias — required by XCC-011 for TVA-correct totals.
 */
export function bankersRound(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  const truncated = Math.trunc(shifted);
  const remainder = Math.abs(shifted - truncated);

  // Not at the 0.5 boundary → normal rounding
  if (Math.abs(remainder - 0.5) > 1e-9) {
    return Math.round(shifted) / factor;
  }

  // Exactly 0.5 → round to even
  if (truncated % 2 === 0) {
    return truncated / factor;
  }
  // Odd → round away from zero toward the even neighbour
  return (truncated + (shifted > 0 ? 1 : -1)) / factor;
}

/**
 * Distributes a fixed discount amount proportionally across lines
 * based on each line's TTC weight. Per XCC-011:
 *
 * - Each line gets: discountAmount × (line.ttc / sumOfAllTtc)
 * - Banker's rounding applied per line to 2 decimals
 * - Rounding remainder (max 0.01 MAD) assigned to the largest line
 * - Discount is capped at total TTC (lines can't go negative)
 *
 * Returns a Map from line id to the discount amount for that line.
 */
export function distributeDiscount(
  lines: { id: string; ttc: number }[],
  discountAmount: number,
): Map<string, number> {
  const result = new Map<string, number>();

  if (lines.length === 0 || discountAmount <= 0) {
    for (const line of lines) {
      result.set(line.id, 0);
    }
    return result;
  }

  const totalTtc = lines.reduce((sum, l) => sum + l.ttc, 0);

  // Cap discount at total TTC
  const effectiveDiscount = Math.min(discountAmount, totalTtc);

  if (totalTtc <= 0) {
    for (const line of lines) {
      result.set(line.id, 0);
    }
    return result;
  }

  // Find the largest line (by TTC) for remainder assignment
  let largestLineId = lines[0].id;
  let largestTtc = lines[0].ttc;
  for (const line of lines) {
    if (line.ttc > largestTtc) {
      largestTtc = line.ttc;
      largestLineId = line.id;
    }
  }

  // Proportional distribution with banker's rounding
  let distributed = 0;
  for (const line of lines) {
    const proportion = line.ttc / totalTtc;
    const lineDiscount = bankersRound(effectiveDiscount * proportion);
    result.set(line.id, lineDiscount);
    distributed += lineDiscount;
  }

  // Assign rounding remainder to the largest line
  const remainder = bankersRound(effectiveDiscount - distributed);
  if (Math.abs(remainder) > 1e-9) {
    const current = result.get(largestLineId)!;
    result.set(largestLineId, bankersRound(current + remainder));
  }

  return result;
}
