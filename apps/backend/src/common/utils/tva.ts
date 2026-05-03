/**
 * TVA rate resolution per SRS [PRD-004] / [TVA-002].
 *
 * Priority chain (enforced at every point of sale):
 *   1. tva_exempt = true → 0
 *   2. product.tva_rate is not null → product.tva_rate
 *   3. fallback → category.default_tva_rate
 */
export function resolveTvaRate(
  product: { tva_exempt: boolean; tva_rate: number | null },
  category: { default_tva_rate: number },
): number {
  if (product.tva_exempt) {
    return 0;
  }
  if (product.tva_rate !== null && product.tva_rate !== undefined) {
    return product.tva_rate;
  }
  return category.default_tva_rate;
}
