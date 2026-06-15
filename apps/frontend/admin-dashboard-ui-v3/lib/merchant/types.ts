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
// Shape verified against warehouse.entity.ts (GET business/warehouses returns
// { records: Warehouse[] }). NUMERIC-free entity, so no string-number columns.
export interface Warehouse {
  id: string
  business_id: string
  name: string
  code: string
  address: string | null
  manager_user_id: string | null
  is_central: boolean
  linked_location_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
// CreateWarehouseDto: name, code, is_central required; rest optional.
export interface CreateWarehouseInput {
  name: string
  code: string
  is_central: boolean
  address?: string
  manager_user_id?: string
  linked_location_id?: string
}
// UpdateWarehouseDto: every field optional (incl. is_active). Verb is PATCH.
export interface UpdateWarehouseInput {
  name?: string
  code?: string
  address?: string
  manager_user_id?: string
  is_central?: boolean
  linked_location_id?: string
  is_active?: boolean
}

// ── Locations (business module) — GET business/locations returns Location[] ──
// ── Locations & terminals (business.controller LOCATIONS) ──
// GET business/locations returns a plain Location[] with eager `terminals`.
// No terminal_count/active_terminal_count/status aggregates exist — derive from
// `terminals`. CreateLocationDto: name (required), address?/city?/phone?.
export interface BusinessTerminal {
  id: string
  location_id: string
  terminal_code: string
  device_name: string | null
  hardware_id: string | null
  os_version: string | null
  app_version: string | null
  is_online: boolean
  last_seen_at: string | null
  is_active: boolean
}
export interface BusinessLocation {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  is_active: boolean
  terminals?: BusinessTerminal[]
}
export interface CreateLocationInput {
  name: string
  address?: string
  city?: string
  phone?: string
}
export type UpdateLocationInput = Partial<CreateLocationInput>

// ── Inventory alerts (alert.controller) ──
// Both list endpoints return { records, total, page, limit }. The query does NOT
// join product/warehouse, so only the *_id FKs are present (no names).
export interface AlertListResponse<T> {
  records: T[]
  total: number
  page: number
  limit: number
}
export interface ExpirationAlert {
  id: string
  batch_id: string
  warehouse_id: string
  product_id: string
  severity: "expired" | "expires_soon"
  resolved_at: string | null
  resolved_by_user_id: string | null
  action: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
export interface DiscrepancyAlert {
  id: string
  batch_id: string | null
  warehouse_id: string | null
  product_id: string | null
  // NUMERIC(12,4) → serialized as strings; Number() before math.
  expected_remaining: string
  actual_remaining: string
  discrepancy_quantity: string
  source: "offline_sync" | "manual_count" | "system_detected"
  resolved_at: string | null
  resolved_by_user_id: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}
export interface ResolveExpirationInput {
  action: "disposed" | "sold" | "extended" | "other"
  notes?: string
}
export interface ResolveDiscrepancyInput {
  action: "manual_recount" | "accept_loss" | "adjust_batch"
  adjustment_quantity?: number
  notes?: string
}

// ── Vendors (CreateVendorDto: name + code required; contact_* not email/phone) ──
export interface Vendor {
  id: string
  business_id: string
  code: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  address: string | null
  ice_number: string | null
  if_number: string | null
  payment_terms_days: number
  notes: string | null
  is_active: boolean
  created_at?: string
}
export interface CreateVendorInput {
  name: string
  code: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  ice_number?: string
  if_number?: string
  payment_terms_days?: number
  notes?: string
}
export interface UpdateVendorInput extends Partial<CreateVendorInput> {
  is_active?: boolean
}
// CreateVendorCheckDetailDto: check_date + checked_by_user_id (UUID) required;
// quality/delivery/price scores are optional ints 1–10.
export interface VendorCheckDetail {
  id: string
  vendor_id: string
  check_date: string
  checked_by_user_id: string
  quality_score: number | null
  delivery_score: number | null
  price_score: number | null
  notes: string | null
  attachments_json: unknown
  created_at?: string
}
export interface CreateCheckDetailInput {
  check_date: string
  checked_by_user_id: string
  quality_score?: number
  delivery_score?: number
  price_score?: number
  notes?: string
}
// Minimal current-user shape from GET /api/auth/me.
export interface CurrentUser {
  id: string
  business_id: string
  first_name: string
  last_name: string
  // /api/auth/me returns the merchant user's role; used to gate owner-only
  // actions client-side (e.g. vendor-payment confirm/void are @Roles('owner')).
  role?: "owner" | "manager" | "employee" | "cashier" | string
  email?: string
  // /api/auth/me eager-loads the business relation; name lives at business.name
  // (there is NO flat business_name field).
  business?: { id: string; name: string } | null
}

// ── Settings (the only backend-persisted bits of the settings page) ──
// GET/PUT business/settings/settlement-cutoff (PUT owner-only). HH:MM 24h.
export interface SettlementCutoff {
  cutoff_time: string
}
// GET/PUT business/notifications/channels — BOTH owner-only. The toggle column is
// `is_active` (NOT is_enabled). PUT is an upsert keyed by channel; send ONLY
// { channel, is_active } — provider_config_json comes back MASKED ('***') and must
// never be echoed back. channel ∈ sms|email|whatsapp.
export type NotificationChannelKey = "sms" | "email" | "whatsapp"
// NOTE: notification_channels has a COMPOSITE PK (business_id, channel) — there is
// no `id` column. Key UI rows by `channel`.
export interface NotificationChannel {
  business_id: string
  channel: NotificationChannelKey
  provider: string | null
  default_sender_id: string | null
  default_sender_name: string | null
  is_active: boolean
}
export interface UpsertNotificationChannelInput {
  channel: NotificationChannelKey
  is_active?: boolean
  provider?: string
  provider_config_json?: Record<string, unknown>
  default_sender_id?: string
  default_sender_name?: string
}
// TestChannelDto = { channel, to (required), test_message? }.
export interface TestChannelInput {
  channel: NotificationChannelKey
  to: string
  test_message?: string
}
export interface SmsBalance {
  balance: number | null
  last_refreshed_at?: string | null
  message?: string
}
export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

// ── Modifier groups & modifiers (business.controller modifier-groups) ──
// GET business/modifier-groups returns bare entities with eager `modifiers`.
// Group cols: name, is_required (bool), max_selections (int; 0 = unlimited),
// sort_order. There is NO `type`(single/multiple), `min_selections`, `is_active`,
// or `product_count`. Modifier cols: name, price (NUMERIC→string), is_active.
// DTOs: CreateModifierGroupDto{ name, is_required?, max_selections?, sort_order? };
// CreateModifierDto{ name, price? }; LinkModifierGroupDto{ modifier_group_id }.
// No DELETE and no modifier-update endpoints exist.
export interface Modifier {
  id: string
  modifier_group_id: string
  name: string
  price: string
  is_active: boolean
}
export interface ModifierGroup {
  id: string
  business_id: string
  name: string
  is_required: boolean
  max_selections: number
  sort_order: number
  modifiers: Modifier[]
}
export interface CreateModifierGroupInput {
  name: string
  is_required?: boolean
  max_selections?: number
  sort_order?: number
}
export type UpdateModifierGroupInput = Partial<CreateModifierGroupInput>
export interface CreateModifierInput {
  name: string
  price?: number
}

// ── Table types (restaurant.controller table-types, RST-010..013) ──
// Entity/DTO cols are ONLY: name, default_capacity (int, Min 1), is_active.
// There is NO `shape` or `location` — the old UI invented both. GET → plain array.
// POST/PATCH/DELETE all owner/manager. PATCH supports is_active.
export interface TableType {
  id: string
  business_id: string
  name: string
  default_capacity: number
  is_active: boolean
}
export interface CreateTableTypeInput {
  name: string
  default_capacity?: number
}
export interface UpdateTableTypeInput {
  name?: string
  default_capacity?: number
  is_active?: boolean
}

// ── Dining areas (restaurant.controller dining-areas) ──
// GET returns { records: [...] } where each row is { id, location_id, name,
// description, sort_order, is_active, table_count } — `table_count` is a COUNT(string), there is NO
// `capacity`. The list DEFAULTS to is_active=true (pass is_active=false to see
// inactive). CreateDiningAreaDto REQUIRES location_id (+ name, description?,
// sort_order?). UpdateDiningAreaDto = name?/description?/sort_order?/is_active?
// (NO location_id). Names are unique per business (409 on conflict).
export interface DiningArea {
  id: string
  location_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  table_count: string
}
export interface CreateDiningAreaInput {
  location_id: string
  name: string
  description?: string
  sort_order?: number
}
export interface UpdateDiningAreaInput {
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

// ── Tables (restaurant.controller tables, RST-020..023) ──
// GET → { records: [...] } where each row nests `area` and `table_type` objects
// (NOT flat area_id/area_name/table_type_name). position_x/position_y are INT
// (nullable) — PATCH rejects fractional values (@IsInt) so round before sending.
// session_status only present when ?with_session_status=true.
export interface BusinessTable {
  id: string
  table_number: string
  capacity: number
  area: { id: string; name: string } | null
  table_type: { id: string; name: string } | null
  position_x: number | null
  position_y: number | null
  is_active: boolean
  session_status?: "available" | "occupied" | "awaiting_payment"
}
// ── Business announcements (communications.controller COM-010/011) ──
// Both GET /announcements and /announcements/for-me return a PLAIN array of the
// entity: { id, title, body, target_role∈all|manager|employee, display_until,
// is_active, created_at }. The old UI invented type/status/views_count/
// target_audience(plural target_roles[]). Create/Update DTO = { title, body,
// target_role?, display_until?, is_active? }. Write routes are owner/manager.
export type AnnouncementRole = "all" | "manager" | "employee"
export interface BusinessAnnouncement {
  id: string
  title: string
  body: string
  target_role: AnnouncementRole
  display_until: string | null
  is_active: boolean
  created_at: string
}
export interface CreateAnnouncementInput {
  title: string
  body: string
  target_role?: AnnouncementRole
  display_until?: string
  is_active?: boolean
}
export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>

// ── Notification templates (notifications.controller COM-040..044) ──
// GET returns a PLAIN array. Cols: channel, name, subject?, body, whatsapp_template_id?,
// is_transactional, is_active. There is NO `placeholders` or `send_count` (the old UI
// sent `placeholders` → 400, and `channel` on UPDATE is rejected — channel is immutable).
// Preview → { subject, body, channel, is_transactional }.
export interface NotificationTemplate {
  id: string
  business_id: string
  channel: NotificationChannelKey
  name: string
  subject: string | null
  body: string
  whatsapp_template_id: string | null
  is_transactional: boolean
  is_active: boolean
  created_at?: string
}
export interface CreateNotificationTemplateInput {
  channel: NotificationChannelKey
  name: string
  body: string
  subject?: string
  whatsapp_template_id?: string
  is_transactional?: boolean
  is_active?: boolean
}
export interface UpdateNotificationTemplateInput {
  name?: string
  subject?: string
  body?: string
  whatsapp_template_id?: string
  is_transactional?: boolean
  is_active?: boolean
}
export interface TemplatePreview {
  subject: string | null
  body: string
  channel: NotificationChannelKey
  is_transactional: boolean
}
// ── Notification send (notifications.controller COM-050/051) ──
// SendSingleDto requires `to_customer_id` (NOT customer_id). SendToSegmentDto uses
// `target_audience∈all|grade|label|specific_customers` + UUID arrays
// target_grade_ids/target_label_ids/target_customer_ids (NOT segment/grade_id/...).
export type SendAudience = "all" | "grade" | "label" | "specific_customers"
export interface SendSingleInput {
  channel: NotificationChannelKey
  to_customer_id: string
  template_id?: string
  to_address?: string
  subject?: string
  body?: string
}
export interface SendToSegmentInput {
  channel: NotificationChannelKey
  template_id: string
  target_audience: SendAudience
  target_grade_ids?: string[]
  target_label_ids?: string[]
  target_customer_ids?: string[]
  schedule_at?: string
}
export interface SendSingleResult { id: string; status: string; provider_message_id?: string | null }
export interface SendSegmentResult { job_id: string; estimated_recipients: number; estimated_cost?: string }

// ── KDS (terminal/kds — reachable with a merchant token: RolesGuard, no @Roles) ──
// GET terminal/kds/items → { items: [...] } (NOT { data }). Item fields: added_at
// (NOT created_at), modifiers_json (object, NOT a string[] `modifiers`), added_by
// (NOT employee_name). kds_status ∈ new|preparing|ready (served drops off the board).
// POST items/:id/status enforces fixed transitions new→preparing→ready→served (no recall).
export type KdsStatus = "new" | "preparing" | "ready"
export interface KdsItem {
  id: string
  table_number: string | null
  table_session_id: string | null
  product_name: string | null
  variant_name: string | null
  quantity: number
  notes: string | null
  modifiers_json: Record<string, unknown> | unknown[] | null
  kds_status: KdsStatus
  added_at: string
  added_by: string | null
  order_source: string
}

export interface UpdateTableInput {
  table_number?: string
  capacity?: number
  area_id?: string
  table_type_id?: string
  position_x?: number | null
  position_y?: number | null
  is_active?: boolean
}
// ── Purchase orders (draft→sent→confirmed→partially_received/received | cancelled) ──
// CreatePurchaseOrderDto: warehouse_id required, vendor_id optional, items[] with
// quantity_ordered + unit_cost_ht. Receive needs received_items[] with po_item_id +
// batch_code. getById joins items.product and adds amount_paid/balance_due.
export type POStatus = "draft" | "sent" | "confirmed" | "partially_received" | "received" | "cancelled"
export interface PurchaseOrderItem {
  id: string
  product_id: string
  product?: { id: string; name: string } | null
  variant_id: string | null
  quantity_ordered: string
  quantity_received: string
  unit_of_measure: string
  unit_cost_ht: string
  tva_rate: string
  line_total_ht?: string
  line_total_tva?: string
  line_total_ttc?: string
}
export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string | null
  warehouse_id: string
  status: POStatus
  order_date: string
  expected_delivery_date: string | null
  subtotal_ht: string
  total_tva: string
  total_ttc: string
  notes: string | null
  items?: PurchaseOrderItem[]
  amount_paid?: number
  balance_due?: number
}
export interface CreatePOItemInput {
  product_id: string
  quantity_ordered: number
  unit_cost_ht: number
  tva_rate?: number
  unit_of_measure?: string
  variant_id?: string
}
export interface CreatePOInput {
  warehouse_id: string
  vendor_id?: string
  expected_delivery_date?: string
  notes?: string
  items: CreatePOItemInput[]
}
export interface UpdatePOInput {
  vendor_id?: string
  warehouse_id?: string
  expected_delivery_date?: string
  notes?: string
  items?: CreatePOItemInput[]
}
export interface ReceivePOItemInput {
  po_item_id: string
  quantity_received: number
  batch_code: string
  expires_at?: string
}
export interface ReceivePOInput { received_items: ReceivePOItemInput[] }
export interface POListResponse {
  records: PurchaseOrder[]
  total: number
  page: number
  limit: number
}

// Minimal purchase-order row for the vendor profile PO tab. GET
// business/purchase-orders?vendor_id= returns { records, total, page, limit }.
// NUMERIC totals serialize as strings.
export interface PurchaseOrderSummary {
  id: string
  po_number: string
  vendor_id: string | null
  status: string
  order_date: string
  expected_delivery_date: string | null
  total_ttc: string
}

// ── Vendor payments ──
// CreateVendorPaymentDto: vendor_id, amount_paid (NOT amount), payment_date,
// payment_method ∈ bank_transfer|cheque|cash|other. confirm/void are owner-only.
export type VendorPaymentMethod = "bank_transfer" | "cheque" | "cash" | "other"
export type VendorPaymentStatus = "pending" | "confirmed" | "voided"
export interface VendorPayment {
  id: string
  payment_number: string
  vendor_id: string
  purchase_order_id: string | null
  amount_paid: string
  payment_date: string
  payment_method: VendorPaymentMethod
  reference_number: string | null
  notes: string | null
  status: VendorPaymentStatus
  confirmed_by_user_id: string | null
  confirmed_at: string | null
}
export interface CreateVendorPaymentInput {
  vendor_id: string
  amount_paid: number
  payment_date: string
  payment_method: VendorPaymentMethod
  purchase_order_id?: string
  reference_number?: string
  notes?: string
}
// GET vendors/:id/outstanding returns this array DIRECTLY (not wrapped).
export interface VendorOutstandingPO {
  id: string
  po_number: string
  status: string
  order_date: string
  expected_delivery_date: string | null
  total_ttc: string
  amount_paid: string
  balance_due: string
}
export interface VendorPaymentSummary {
  total_paid: number
  total_outstanding: number
  payment_count: number
  avg_days_to_pay: number | null
}
export interface VendorPaymentListResponse {
  records: VendorPayment[]
  total: number
  page: number
  limit: number
}

// ── Brands (CreateBrandDto: name, code?, logo_url?, description?). No `website`
// column and no product_count aggregate are returned by the service. ──
export interface Brand {
  id: string
  business_id: string
  name: string
  code: string | null
  logo_url: string | null
  description: string | null
  is_active: boolean
}
export interface CreateBrandInput {
  name: string
  code?: string
  logo_url?: string
  description?: string
}
export interface UpdateBrandInput {
  name?: string
  code?: string
  logo_url?: string
  description?: string
  is_active?: boolean
}

// ── Units of measure (CreateUnitOfMeasureDto: name, abbreviation, sort_order?) ──
// System units have business_id=null & is_system=true; they cannot be edited or
// deleted (backend rejects). No `description` column exists.
export interface UnitOfMeasure {
  id: string
  business_id: string | null
  name: string
  abbreviation: string
  is_system: boolean
  is_active: boolean
  sort_order: number
}
export interface CreateUnitInput {
  name: string
  abbreviation: string
  sort_order?: number
}
export interface UpdateUnitInput {
  name?: string
  abbreviation?: string
  is_active?: boolean
  sort_order?: number
}

// ── Stock batches (entity uses batch_code/quantity_initial/quantity_remaining/
// unit_cost; there is NO status column). List returns { records, total, ... }.
// NUMERIC columns serialize as strings. ──
export interface StockBatch {
  id: string
  warehouse_id: string
  product_id: string
  variant_id: string | null
  batch_code: string
  quantity_initial: string
  quantity_remaining: string
  unit_cost: string
  unit_cost_tva_rate: string
  unit_of_measure: string
  received_at: string
  expires_at: string | null
  vendor_id: string | null
  purchase_order_id: string | null
  is_active: boolean
}
export interface BatchListResponse {
  records: StockBatch[]
  total: number
  page: number
  limit: number
}
// CreateBatchDto: warehouse_id, product_id, batch_code, quantity_initial,
// unit_cost required; rest optional.
export interface CreateBatchInput {
  warehouse_id: string
  product_id: string
  batch_code: string
  quantity_initial: number
  unit_cost: number
  variant_id?: string
  unit_cost_tva_rate?: number
  unit_of_measure?: string
  expires_at?: string
  vendor_id?: string
  purchase_order_id?: string
}
export interface AdjustBatchInput { delta: number; reason: string }

// ── Stock adjustments (batch-level approval workflow) ──
// CreateAdjustmentDto: warehouse_id, reason (MIN 10 chars), items[] each with
// product_id + batch_id + proposed_delta (non-zero). Status enum below.
export type AdjustmentStatus = "draft" | "pending_approval" | "approved" | "posted" | "rejected"
export interface StockAdjustmentItem {
  id: string
  product_id: string
  variant_id: string | null
  batch_id: string
  proposed_delta: string
  current_quantity: string
  notes: string | null
}
export interface StockAdjustment {
  id: string
  adjustment_number: string
  warehouse_id: string
  status: AdjustmentStatus
  reason: string
  rejected_reason: string | null
  notes: string | null
  created_at: string
  items?: StockAdjustmentItem[]
}
export interface AdjustmentItemInput {
  product_id: string
  batch_id: string
  proposed_delta: number
  variant_id?: string
  notes?: string
}
export interface CreateAdjustmentInput {
  warehouse_id: string
  reason: string
  notes?: string
  items: AdjustmentItemInput[]
}
export interface AdjustmentListResponse {
  records: StockAdjustment[]
  total: number
  page: number
  limit: number
}

// ── Stock transfers (draft → post → posted / cancelled) ──
// CreateTransferDto: source_warehouse_id, target_warehouse_id, items[] each with
// product_id + batch_id + quantity (≥0.001).
export type TransferStatus = "draft" | "posted" | "cancelled"
export interface StockTransferItem {
  id: string
  product_id: string
  variant_id: string | null
  batch_id: string
  quantity: string
  notes: string | null
}
export interface StockTransfer {
  id: string
  transfer_number: string
  source_warehouse_id: string
  target_warehouse_id: string
  status: TransferStatus
  notes: string | null
  created_at: string
  posted_at?: string | null
  items?: StockTransferItem[]
}
export interface TransferItemInput {
  product_id: string
  batch_id: string
  quantity: number
  variant_id?: string
  notes?: string
}
export interface CreateTransferInput {
  source_warehouse_id: string
  target_warehouse_id: string
  notes?: string
  items: TransferItemInput[]
}
export interface TransferListResponse {
  records: StockTransfer[]
  total: number
  page: number
  limit: number
}

// ── Stock templates (reorder templates → generate PO) ──
// Entity has NO description column. Items use default_quantity. List/get include
// items (no product join). CreateStockTemplateDto: name + items[] required.
export interface StockTemplateItem {
  id: string
  product_id: string
  variant_id: string | null
  default_quantity: string
}
export interface StockTemplate {
  id: string
  name: string
  default_vendor_id: string | null
  default_warehouse_id: string | null
  is_active: boolean
  items?: StockTemplateItem[]
}
export interface TemplateItemInput {
  product_id: string
  default_quantity: number
  variant_id?: string
}
export interface CreateTemplateInput {
  name: string
  default_vendor_id?: string
  default_warehouse_id?: string
  items: TemplateItemInput[]
}
export interface UpdateTemplateInput {
  name?: string
  default_vendor_id?: string
  default_warehouse_id?: string
  is_active?: boolean
  items?: TemplateItemInput[]
}
// GeneratePurchaseOrderDto: all optional (but a vendor is needed — template
// default_vendor_id or body vendor_id).
export interface GeneratePoInput {
  vendor_id?: string
  warehouse_id?: string
  expected_delivery_date?: string
}
export interface DisposeBatchInput { quantity: number; reason: "expired" | "damaged" | "other"; notes?: string }
export interface TransferBatchInput { target_warehouse_id: string; quantity: number; notes?: string }

// Row shape of the stock-movements report (tables[0].rows). The report joins
// product + batch but NOT warehouse; quantity is always positive, direction is
// implied by movement_type.
export interface StockMovementRow {
  created_at: string
  product_name: string
  batch_code: string
  movement_type: string
  quantity: number
  source_origin: string | null
  notes: string | null
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
