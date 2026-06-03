/**
 * Backend-accurate types for the MERCHANT (business admin) dashboard.
 *
 * Shapes are verified against the NestJS backend — entities in
 * apps/backend/src/common/entities and report generators in
 * apps/backend/src/modules/reports/generators — NOT invented. When the backend
 * changes, update here first; components consume only these types.
 */

// ── Reports: universal response (apps/backend/.../dto/report-query.dto.ts) ──
export type ReportPeriodType =
  | "today"
  | "yesterday"
  | "last_7days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom"

export interface ReportSummaryItem {
  label: string
  value: number | string
  type: "money" | "number" | "text" | "percentage"
}

export interface ReportColumn {
  key: string
  label: string
  type: "money" | "number" | "date" | "datetime" | "text" | "percentage" | "quantity"
}

export interface ReportTable {
  title: string
  columns: ReportColumn[]
  rows: Record<string, unknown>[]
}

export interface UniversalReportResponse {
  title: string
  currency: string
  language: string
  business_type: string
  generated_at: string
  period: { type: string; from: string; to: string }
  summary: ReportSummaryItem[]
  tables: ReportTable[]
  meta: { total_rows: number; page: number; limit: number } | null
}

/**
 * sales-summary's `summary` array is a FIXED-ORDER list with LOCALIZED labels
 * (fr/ar/en), so index by position — never by label text.
 * Source: SalesGenerator.salesSummary() summary[].
 */
export const SALES_SUMMARY_INDEX = {
  totalTtc: 0,
  totalHt: 1,
  totalTva: 2,
  orders: 3,
  avgOrderValue: 4,
  customers: 5,
  discountTotal: 6,
} as const

/** A row of the "Sales by Day" table (tables[0]) in sales-summary. */
export interface SalesByDayRow {
  date: string // already display-formatted by the generator (e.g. "Sun May 03")
  orders: number
  total_ttc: number
  total_ht: number
  total_tva: number
  avg_order_value: number
  discount_total: number
}

/** A row of the "Top Products" table (tables[1]) in sales-summary. */
export interface TopProductRow {
  product_name: string
  category_name: string
  quantity_sold: number
  total_ttc: number
}

// ── Transactions (apps/backend/src/common/entities/transaction.entity.ts) ──
// NUMERIC columns serialize as STRINGS over JSON — Number() before any math.
export interface TransactionItem {
  id: string
  product_name: string
  variant_name: string | null
  quantity: number
  unit_price: string
}

export interface Transaction {
  id: string
  transaction_number: string
  total: string
  total_ttc: string
  status: string
  payment_method: string
  created_at: string
  items: TransactionItem[]
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
