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

// ── Categories (apps/backend/src/common/entities/category.entity.ts) ──
// Columns: id, business_id, name, sort_order, is_active (+ default tva_rate).
// NO `description` column — do not send/expect it.
export interface Category {
  id: string
  name: string
  sort_order: number
  is_active: boolean
  // enrichment the list endpoint may add:
  product_count?: number
}

export interface CreateCategoryInput {
  name: string
  sort_order?: number
}
export interface UpdateCategoryInput {
  name?: string
  sort_order?: number
  is_active?: boolean
}

// ── Variants (apps/backend/src/common/entities/product-variant.entity.ts) ──
// Columns: id, product_id, name, price_override, sku, is_sold_out, is_active.
// NO `is_default` / `is_available` columns.
export interface ProductVariant {
  id: string
  product_id: string
  name: string
  price_override: string | null
  sku: string | null
  is_sold_out: boolean
  is_active: boolean
}

export interface CreateVariantInput {
  name: string
  price_override?: number
  sku?: string
}
export interface UpdateVariantInput {
  name?: string
  price_override?: number
  sku?: string
  is_active?: boolean
}

// ── Products (apps/backend/src/common/entities/product.entity.ts) ──
// NUMERIC columns serialize as STRINGS — coerce before math. The list endpoint
// (GET /business/products) eager-loads category + variants relations and
// returns a plain ARRAY (not paginated); it reads only `category_id` from the
// query string (page/limit/search are ignored server-side).
export interface Product {
  id: string
  business_id: string
  category_id: string
  name: string
  description: string | null
  price: string
  cost_price: string | null
  sku: string | null
  image_url: string | null
  is_sold_out: boolean
  is_active: boolean
  sort_order: number
  tva_rate: string | null
  tva_exempt: boolean
  whole_price_1: string | null
  whole_price_2: string | null
  whole_price_3: string | null
  whole_price_4: string | null
  brand_id: string | null
  unit_of_measure: string | null
  track_stock: boolean
  reorder_point: number
  category?: { id: string; name: string } | null
  brand?: { id: string; name: string } | null
  variants?: ProductVariant[]
}

// ── Promotions (apps/backend/src/modules/promotion) ──
// list returns { data, total, page, limit }. NUMERIC columns serialize as strings.
export type PromotionType =
  | "percent_off_order" | "percent_off_category" | "percent_off_product"
  | "fixed_off_order" | "fixed_off_product" | "bogo" | "bundle" | "points_multiplier"
export type PromotionStatus = "draft" | "active" | "paused" | "archived"

export interface Promotion {
  id: string
  code: string
  name: string
  description: string | null
  promotion_type: PromotionType
  value: string
  target_category_id: string | null
  target_product_id: string | null
  min_order_total_ttc: string | null
  start_date: string
  end_date: string
  max_total_uses: number | null
  max_uses_per_customer: number | null
  current_uses: number
  status: PromotionStatus
  is_currently_running?: boolean
}
export interface PromotionListResponse {
  data: Promotion[]
  total: number
  page: number
  limit: number
}
export interface CreatePromotionInput {
  name: string
  promotion_type: PromotionType
  value: number
  start_date: string
  end_date: string
  description?: string
  min_order_total_ttc?: number
  target_category_id?: string
  target_product_id?: string
  max_total_uses?: number
  max_uses_per_customer?: number
}
export type UpdatePromotionInput = Partial<CreatePromotionInput>

// ── Chain (rollout) ──
export interface ChainChild {
  business_id: string
  name: string
  revenue?: string
  transaction_count?: number
  customer_count?: number
}
export interface SubStoreValidation {
  child_business_id: string
  is_linked_child: boolean
  tva_warnings: { id: string; name: string; synced_from_parent_id: string }[]
  can_rollout: boolean
}
export interface RolloutResult {
  child_business_id: string
  promotion_id: string
  tva_warnings: unknown[]
}

// ── Coupons (apps/backend/src/modules/promotion/coupon) ──
// coupon-types list returns a plain ARRAY. Discount fields are LOCKED once any
// coupon is issued (UpdateCouponTypeDto omits them). No "max_uses" column.
export type CouponDiscountType = "percent_off" | "fixed_off" | "free_item" | "bogo"
export type CouponShareCase = "N" | "S" | "M"

export interface CouponType {
  id: string
  code: string
  name: string
  description: string | null
  discount_type: CouponDiscountType
  discount_value: string
  free_item_product_id: string | null
  min_order_total_ttc: string | null
  applicable_category_ids: string[] | null
  applicable_product_ids: string[] | null
  validity_days_from_issue: number
  share_case: string
  is_active: boolean
  created_at: string
  issued_count?: number
}
export interface IssuedCoupon {
  id: string
  coupon_code: string
  status: string // available | redeemed | voided | expired
  discount_type?: CouponDiscountType
  discount_value?: string
  expires_at: string
  customer_id: string | null
}
export interface CreateCouponTypeInput {
  name: string
  discount_type: CouponDiscountType
  discount_value: number
  description?: string
  validity_days_from_issue?: number
  min_order_total_ttc?: number
  free_item_product_id?: string
  share_case?: CouponShareCase
}
export interface UpdateCouponTypeInput {
  name?: string
  description?: string
  min_order_total_ttc?: number
  validity_days_from_issue?: number
  share_case?: CouponShareCase
  is_active?: boolean
}
export interface IssueToSegmentInput {
  coupon_type_id: string
  target_audience: "all" | "grade" | "label"
  target_grade_ids?: string[]
  target_label_ids?: string[]
  note?: string
}

// ── Employees (apps/backend/src/modules/business, users table) ──
// GET /business/employees returns a plain ARRAY. Permissions live in the
// `permissions` JSONB; the canonical keys the backend actually enforces via
// userHasPermission are listed in EMPLOYEE_PERMISSION_GROUPS below.
export type EmployeeRole = "owner" | "manager" | "employee"

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  role: EmployeeRole
  phone: string | null
  is_active: boolean
  permissions: Record<string, boolean> | null
  dashboard_access: boolean
  created_at: string
}

export interface CreateEmployeeInput {
  first_name: string
  last_name: string
  email?: string
  password: string // required, min 6
  pin?: string // 4-6 digits
  role: EmployeeRole
  permissions?: Record<string, boolean>
  dashboard_access?: boolean
}
export interface UpdateEmployeeInput {
  first_name?: string
  last_name?: string
  email?: string
  pin?: string
  role?: EmployeeRole
  permissions?: Record<string, boolean>
  dashboard_access?: boolean
}

export interface ClockEntry {
  id: string
  user_id: string
  clock_in: string
  clock_out: string | null
  total_hours: string | null
}

// Canonical permission keys the backend enforces (userHasPermission call sites).
export const EMPLOYEE_PERMISSION_GROUPS: { title: string; permissions: { key: string; label: string }[] }[] = [
  { title: "Sales", permissions: [
    { key: "can_void", label: "Void transactions / items" },
    { key: "can_refund", label: "Issue refunds" },
  ] },
  { title: "Loyalty", permissions: [
    { key: "can_adjust_points", label: "Adjust customer points" },
    { key: "can_redeem_points", label: "Redeem customer points" },
  ] },
  { title: "Tables", permissions: [
    { key: "can_open_table_session", label: "Open table sessions" },
    { key: "can_transfer_table_items", label: "Transfer table items" },
    { key: "can_close_table_session", label: "Close table sessions" },
    { key: "can_close_table_session_partial", label: "Partially close table sessions" },
  ] },
  { title: "Inventory", permissions: [
    { key: "can_propose_stock_adjustment", label: "Propose stock adjustments" },
    { key: "can_approve_stock_adjustment", label: "Approve stock adjustments" },
  ] },
]

// ── Customers (apps/backend/src/modules/customer) ──
// list() and points-history return { records, total, page, limit } (NOT { data }).
// NUMERIC columns (grade multipliers/percent) serialize as strings.
export interface CustomerGrade {
  id: string
  name: string
  min_points: number | string
  points_multiplier: number | string
  discount_percent: number | string
  color_hex: string | null
  sort_order: number
  is_active: boolean
}
export interface CustomerLabel {
  id: string
  name: string
  color_hex: string | null
}
export interface CustomerAttribute {
  id: string
  key: string
  label: string
  data_type: "string" | "number" | "date" | "boolean" | "enum"
  enum_options: string[] | null
  is_required: boolean
}
export interface CustomerLabelAssignment {
  label: CustomerLabel
}
export interface Customer {
  id: string
  customer_code: string | null
  phone: string | null
  email: string | null
  first_name: string
  last_name: string
  points_balance: number
  is_active: boolean
  notes: string | null
  grade_id: string | null
  grade?: CustomerGrade | null
  created_at: string
  label_assignments?: CustomerLabelAssignment[]
}
export interface CustomerAttributeValue {
  attribute_id: string
  value: string
  attribute?: CustomerAttribute
}
export interface CustomerDetail extends Customer {
  attribute_values?: CustomerAttributeValue[]
  stats?: { visit_count: number; total_spend: number; last_visit: string | null }
}
export interface CustomerListResponse {
  records: Customer[]
  total: number
  page: number
  limit: number
}
export interface PointsHistoryEntry {
  id: string
  delta: number
  balance_after: number
  source: string
  reason: string | null
  created_at: string
}
export interface PointsHistoryResponse {
  records: PointsHistoryEntry[]
  total: number
  page: number
  limit: number
}

export interface CreateCustomerInput {
  phone: string // required + unique per business
  first_name: string
  last_name: string
  email?: string
  notes?: string
  grade_id?: string
  label_ids?: string[]
}
export interface UpdateCustomerInput {
  phone?: string
  first_name?: string
  last_name?: string
  email?: string
  notes?: string
  grade_id?: string
}
export interface GradeInput {
  name: string
  min_points?: number
  points_multiplier?: number
  discount_percent?: number
  color_hex?: string
}
export interface LabelInput {
  name: string
  color_hex?: string
}
export interface CreateAttributeInput {
  key: string
  label: string
  data_type: CustomerAttribute["data_type"]
  enum_options?: string[]
  is_required?: boolean
}
export interface UpdateAttributeInput {
  label?: string
  data_type?: CustomerAttribute["data_type"]
  enum_options?: string[]
  is_required?: boolean
}

export interface CreateProductInput {
  name: string
  price: number
  category_id: string
  description?: string
  sku?: string
  cost_price?: number
  image_url?: string
  tva_rate?: number
  track_stock?: boolean
  brand_id?: string
  reorder_point?: number
}
export interface UpdateProductInput extends Partial<CreateProductInput> {
  is_active?: boolean
}

// ── Inventory: warehouses + stock position report ──
export interface Warehouse {
  id: string
  name: string
  is_active: boolean
}
export interface StockPositionRow {
  product_name: string
  category_name: string
  total_quantity: number
  total_value: number
  oldest_expiry: string | null
  batch_count: number
  reorder_point: number
  low_stock: boolean
}
