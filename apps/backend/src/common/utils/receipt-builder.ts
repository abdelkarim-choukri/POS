import { bankersRound } from './money';

/**
 * Input types — only the fields receipt-builder needs from each entity.
 * Using explicit interfaces rather than importing full entities keeps this
 * utility free of TypeORM/NestJS dependencies and trivially unit-testable.
 */
export interface ReceiptItem {
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;   // TTC per unit
  tva_rate: number;
  item_ht: number;
  item_tva: number;
  item_ttc: number;
}

export interface ReceiptBusiness {
  name: string;
  legal_name?: string | null;
  address?: string | null;
  ice_number?: string | null;
  if_number?: string | null;
}

export interface ReceiptTransaction {
  invoice_number?: string | null;
  transaction_number: string;
  created_at: Date;
  payment_method: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  items: ReceiptItem[];
  customer_phone?: string | null;
  points_earned?: number | null;
  points_balance_after?: number | null;
}

// ── Output types ────────────────────────────────────────────────────────────

export interface ReceiptTvaSummaryLine {
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
}

export interface ReceiptData {
  // Business identity (SRS §3.6.2 — mandatory for DGI validity)
  business_name: string;
  legal_name: string | null;
  address: string | null;
  ice_number: string | null;
  if_number: string | null;

  // Transaction identity
  invoice_number: string | null;
  transaction_number: string;
  date: string;         // ISO 8601 UTC

  // Line items
  items: Array<{
    product_name: string;
    variant_name: string | null;
    quantity: number;
    unit_price: number;   // TTC per unit
    tva_rate: number;
    item_ht: number;
    item_tva: number;
    item_ttc: number;
  }>;

  // TVA grouped by rate (SRS §3.6.2 — "TVA amount grouped by rate")
  tva_summary: ReceiptTvaSummaryLine[];

  // Totals
  total_ht: number;
  total_tva: number;
  total_ttc: number;

  payment_method: string;

  // Customer & loyalty (§2.8 — present only when a customer was attached)
  customer_phone: string | null;
  points_earned: number | null;
  points_balance: number | null;
}

/**
 * Builds a structured receipt object from a transaction and its business.
 *
 * Per SRS §3.6.2 — every field marked "Mandatory" must be present for the
 * receipt to be valid for the customer's TVA deduction claim.
 */
export function buildReceipt(
  transaction: ReceiptTransaction,
  business: ReceiptBusiness,
): ReceiptData {
  // Group items by TVA rate for the summary section
  const rateMap = new Map<number, { ht: number; tva: number; ttc: number }>();
  for (const item of transaction.items) {
    const rate = bankersRound(item.tva_rate);
    const existing = rateMap.get(rate) ?? { ht: 0, tva: 0, ttc: 0 };
    rateMap.set(rate, {
      ht: existing.ht + item.item_ht,
      tva: existing.tva + item.item_tva,
      ttc: existing.ttc + item.item_ttc,
    });
  }

  const tva_summary: ReceiptTvaSummaryLine[] = Array.from(rateMap.entries())
    .sort(([a], [b]) => b - a)   // descending by rate (20% first)
    .map(([tva_rate, sums]) => ({
      tva_rate,
      total_ht: bankersRound(sums.ht),
      total_tva: bankersRound(sums.tva),
      total_ttc: bankersRound(sums.ttc),
    }));

  return {
    business_name: business.name,
    legal_name: business.legal_name ?? null,
    address: business.address ?? null,
    ice_number: business.ice_number ?? null,
    if_number: business.if_number ?? null,

    invoice_number: transaction.invoice_number ?? null,
    transaction_number: transaction.transaction_number,
    date: transaction.created_at.toISOString(),

    items: transaction.items.map((item) => ({
      product_name: item.product_name,
      variant_name: item.variant_name ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tva_rate: bankersRound(item.tva_rate),
      item_ht: item.item_ht,
      item_tva: item.item_tva,
      item_ttc: item.item_ttc,
    })),

    tva_summary,

    total_ht: bankersRound(Number(transaction.total_ht)),
    total_tva: bankersRound(Number(transaction.total_tva)),
    total_ttc: bankersRound(Number(transaction.total_ttc)),

    payment_method: transaction.payment_method,

    customer_phone: transaction.customer_phone ?? null,
    points_earned: transaction.points_earned ?? null,
    points_balance: transaction.points_balance_after ?? null,
  };
}
