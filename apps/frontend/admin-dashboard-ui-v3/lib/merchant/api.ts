/**
 * Typed API layer for the MERCHANT (business admin) dashboard.
 *
 * Thin, fully-typed wrappers over the shared `apiFetch`. Components never call
 * `apiFetch` with raw URLs — they go through these so request/response shapes
 * stay aligned with the backend (see ./types.ts for the source-of-truth shapes).
 */
import { apiFetch } from "@/lib/api"
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateVariantInput,
  PaginatedResult,
  Product,
  ProductVariant,
  ReportPeriodType,
  Transaction,
  UniversalReportResponse,
  UpdateCategoryInput,
  UpdateProductInput,
  ModifierGroup,
  Modifier,
  CreateModifierGroupInput,
  UpdateModifierGroupInput,
  CreateModifierInput,
  TableType,
  CreateTableTypeInput,
  UpdateTableTypeInput,
  DiningArea,
  CreateDiningAreaInput,
  UpdateDiningAreaInput,
  BusinessTable,
  UpdateTableInput,
  KdsItem,
  BusinessAnnouncement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  NotificationTemplate,
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
  TemplatePreview,
  SendSingleInput,
  SendToSegmentInput,
  SendSingleResult,
  SendSegmentResult,
  UpdateVariantInput,
  ClockEntry,
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
  Warehouse,
  StockBatch,
  BatchListResponse,
  CreateBatchInput,
  AdjustBatchInput,
  DisposeBatchInput,
  TransferBatchInput,
  StockAdjustment,
  CreateAdjustmentInput,
  AdjustmentListResponse,
  StockTransfer,
  CreateTransferInput,
  TransferListResponse,
  StockTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  GeneratePoInput,
  Vendor,
  CreateVendorInput,
  UpdateVendorInput,
  VendorCheckDetail,
  CreateCheckDetailInput,
  CurrentUser,
  ChangePasswordInput,
  SettlementCutoff,
  NotificationChannel,
  UpsertNotificationChannelInput,
  TestChannelInput,
  SmsBalance,
  PurchaseOrderSummary,
  PurchaseOrder,
  CreatePOInput,
  UpdatePOInput,
  ReceivePOInput,
  POListResponse,
  VendorPayment,
  CreateVendorPaymentInput,
  VendorOutstandingPO,
  VendorPaymentSummary,
  VendorPaymentListResponse,
  Brand,
  CreateBrandInput,
  UpdateBrandInput,
  UnitOfMeasure,
  CreateUnitInput,
  UpdateUnitInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
  BusinessLocation,
  CreateLocationInput,
  UpdateLocationInput,
  AlertListResponse,
  ExpirationAlert,
  DiscrepancyAlert,
  ResolveExpirationInput,
  ResolveDiscrepancyInput,
  CouponType,
  CreateCouponTypeInput,
  IssuedCoupon,
  IssueToSegmentInput,
  UpdateCouponTypeInput,
  ChainChild,
  CreatePromotionInput,
  Promotion,
  PromotionListResponse,
  RolloutResult,
  SubStoreValidation,
  UpdatePromotionInput,
  Customer,
  CustomerAttribute,
  CustomerDetail,
  CustomerGrade,
  CustomerLabel,
  CustomerListResponse,
  CreateAttributeInput,
  CreateCustomerInput,
  GradeInput,
  LabelInput,
  PointsHistoryResponse,
  UpdateAttributeInput,
  UpdateCustomerInput,
} from "./types"

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ""
}

export const promotionsApi = {
  list: (params: { status?: string; search?: string; page?: number; limit?: number } = {}) =>
    apiFetch<PromotionListResponse>(`/api/business/promotions${qs({ limit: 100, ...params })}`),
  detail: (id: string) => apiFetch<Promotion>(`/api/business/promotions/${id}`),
  create: (input: CreatePromotionInput) =>
    apiFetch<Promotion>("/api/business/promotions", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdatePromotionInput) =>
    apiFetch<Promotion>(`/api/business/promotions/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  activate: (id: string) => apiFetch<Promotion>(`/api/business/promotions/${id}/activate`, { method: "POST" }),
  pause: (id: string) => apiFetch<Promotion>(`/api/business/promotions/${id}/pause`, { method: "POST" }),
  archive: (id: string) => apiFetch<Promotion>(`/api/business/promotions/${id}/archive`, { method: "POST" }),
}

export const chainApi = {
  // children present ⇒ this business is a chain parent. Requires a date range.
  dashboard: (from_date: string, to_date: string) =>
    apiFetch<{ children: ChainChild[]; totals: unknown }>(`/api/business/chain/dashboard${qs({ from_date, to_date })}`),
  validateSubStores: (promotionId: string, child_business_ids: string[]) =>
    apiFetch<SubStoreValidation[]>(`/api/business/promotions/${promotionId}/validate-sub-stores`, {
      method: "POST", body: JSON.stringify({ child_business_ids }),
    }),
  rollout: (promotionId: string, child_business_ids: string[], skip_validation = false) =>
    apiFetch<RolloutResult[]>(`/api/business/promotions/${promotionId}/rollout-to-children`, {
      method: "POST", body: JSON.stringify({ child_business_ids, skip_validation }),
    }),
}

export const couponsApi = {
  listTypes: () => apiFetch<CouponType[]>("/api/business/coupon-types"),
  getType: (id: string) => apiFetch<CouponType>(`/api/business/coupon-types/${id}`),
  createType: (input: CreateCouponTypeInput) =>
    apiFetch<CouponType>("/api/business/coupon-types", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  updateType: (id: string, input: UpdateCouponTypeInput) =>
    apiFetch<CouponType>(`/api/business/coupon-types/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deactivateType: (id: string) => apiFetch<CouponType>(`/api/business/coupon-types/${id}/deactivate`, { method: "POST" }),
  cloneType: (id: string) => apiFetch<CouponType>(`/api/business/coupon-types/${id}/clone`, { method: "POST" }),
  issue: (typeId: string, customer_id?: string) =>
    apiFetch<IssuedCoupon>(`/api/business/coupon-types/${typeId}/issue`, {
      method: "POST", body: JSON.stringify(customer_id ? { customer_id } : {}),
    }),
  issueToSegment: (input: IssueToSegmentInput) =>
    apiFetch<{ issued_count?: number } | unknown>("/api/business/coupons/issue-to-segment", { method: "POST", body: JSON.stringify(input) }),
  lookup: (code: string) => apiFetch<IssuedCoupon>(`/api/business/coupons/lookup?code=${encodeURIComponent(code)}`),
  void: (id: string, reason: string) =>
    apiFetch<unknown>(`/api/business/coupons/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
}

export const employeesApi = {
  list: () => apiFetch<Employee[]>("/api/business/employees"),
  create: (input: CreateEmployeeInput) =>
    apiFetch<Employee>("/api/business/employees", { method: "POST", body: JSON.stringify(input) }),
  // verb is PUT
  update: (id: string, input: UpdateEmployeeInput) =>
    apiFetch<Employee>(`/api/business/employees/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  setStatus: (id: string, is_active: boolean) =>
    apiFetch<Employee>(`/api/business/employees/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active }) }),
  // backend ignores date params; returns the latest 50 entries
  clockHistory: (id: string) =>
    apiFetch<ClockEntry[]>(`/api/business/employees/${id}/clock-history`),
}

export const customersApi = {
  list: (params: { search?: string; grade_id?: string; created_from?: string; page?: number; limit?: number } = {}) =>
    apiFetch<CustomerListResponse>(`/api/business/customers${qs({ limit: 100, ...params })}`),
  detail: (id: string) => apiFetch<CustomerDetail>(`/api/business/customers/${id}`),
  create: (input: CreateCustomerInput) =>
    apiFetch<Customer>("/api/business/customers", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateCustomerInput) =>
    apiFetch<Customer>(`/api/business/customers/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<unknown>(`/api/business/customers/${id}`, { method: "DELETE" }),
  assignLabels: (id: string, label_ids: string[]) =>
    apiFetch<unknown>(`/api/business/customers/${id}/labels`, { method: "PUT", body: JSON.stringify({ label_ids }) }),
  pointsHistory: (id: string) =>
    apiFetch<PointsHistoryResponse>(`/api/business/customers/${id}/points-history?page=1&limit=50`),
  // reason must be >= 10 chars (backend MinLength(10))
  adjustPoints: (id: string, delta: number, reason: string) =>
    apiFetch<{ points_balance: number }>(`/api/business/customers/${id}/points-adjustment`, {
      method: "POST",
      body: JSON.stringify({ delta, reason }),
    }),
  getAttributeValues: (id: string) =>
    apiFetch<{ attribute_id: string; value: string }[]>(`/api/business/customers/${id}/attributes`),
  setAttributeValues: (id: string, values: Record<string, string>) =>
    apiFetch<unknown>(`/api/business/customers/${id}/attributes`, { method: "PUT", body: JSON.stringify({ values }) }),
}

export const gradesApi = {
  list: () => apiFetch<CustomerGrade[]>("/api/business/customer-grades"),
  create: (input: GradeInput) => apiFetch<CustomerGrade>("/api/business/customer-grades", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: Partial<GradeInput>) => apiFetch<CustomerGrade>(`/api/business/customer-grades/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<unknown>(`/api/business/customer-grades/${id}`, { method: "DELETE" }),
}

export const labelsApi = {
  list: () => apiFetch<CustomerLabel[]>("/api/business/customer-labels"),
  create: (input: LabelInput) => apiFetch<CustomerLabel>("/api/business/customer-labels", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: Partial<LabelInput>) => apiFetch<CustomerLabel>(`/api/business/customer-labels/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<unknown>(`/api/business/customer-labels/${id}`, { method: "DELETE" }),
}

export const attributesApi = {
  list: () => apiFetch<CustomerAttribute[]>("/api/business/customer-attributes"),
  create: (input: CreateAttributeInput) => apiFetch<CustomerAttribute>("/api/business/customer-attributes", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateAttributeInput) => apiFetch<CustomerAttribute>(`/api/business/customer-attributes/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<unknown>(`/api/business/customer-attributes/${id}`, { method: "DELETE" }),
}

export const reportsApi = {
  /**
   * Sales summary for a period. One call powers KPIs, the revenue-by-day trend
   * (tables[0]) and top products (tables[1]). Backend: GET business/reports/:reportId.
   */
  salesSummary: (type: ReportPeriodType) =>
    apiFetch<UniversalReportResponse>(
      `/api/business/reports/sales-summary?type=${encodeURIComponent(type)}`,
    ),
}

export const templatesApi = {
  // GET returns a plain NotificationTemplate[]. Roles owner/manager.
  list: () => apiFetch<NotificationTemplate[]>("/api/business/notifications/templates"),
  create: (input: CreateNotificationTemplateInput) =>
    apiFetch<NotificationTemplate>("/api/business/notifications/templates", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH; channel is immutable (not accepted on update).
  update: (id: string, input: UpdateNotificationTemplateInput) =>
    apiFetch<NotificationTemplate>(`/api/business/notifications/templates/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiFetch<unknown>(`/api/business/notifications/templates/${id}`, { method: "DELETE" }),
  // POST .../:id/preview — body { customer_id? } (optional).
  preview: (id: string, customer_id?: string) =>
    apiFetch<TemplatePreview>(`/api/business/notifications/templates/${id}/preview`, { method: "POST", body: JSON.stringify(customer_id ? { customer_id } : {}) }),
}

export const notificationsSendApi = {
  // POST /notifications/send — requires to_customer_id. Roles owner/manager.
  sendSingle: (input: SendSingleInput) =>
    apiFetch<SendSingleResult>("/api/business/notifications/send", { method: "POST", body: JSON.stringify(input) }),
  // POST /notifications/send-to-segment → { job_id, estimated_recipients, estimated_cost }.
  sendToSegment: (input: SendToSegmentInput) =>
    apiFetch<SendSegmentResult>("/api/business/notifications/send-to-segment", { method: "POST", body: JSON.stringify(input) }),
}

export const announcementsApi = {
  // Both endpoints return a plain BusinessAnnouncement[].
  list: () => apiFetch<BusinessAnnouncement[]>("/api/business/announcements"),
  forMe: () => apiFetch<BusinessAnnouncement[]>("/api/business/announcements/for-me"),
  create: (input: CreateAnnouncementInput) =>
    apiFetch<BusinessAnnouncement>("/api/business/announcements", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateAnnouncementInput) =>
    apiFetch<BusinessAnnouncement>(`/api/business/announcements/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiFetch<unknown>(`/api/business/announcements/${id}`, { method: "DELETE" }),
}

export const kdsApi = {
  // GET → { items: KdsItem[] }; unwrap. Reachable with a merchant token.
  listItems: () => apiFetch<{ items: KdsItem[] }>("/api/terminal/kds/items").then(r => r.items ?? []),
  // POST items/:id/status — transitions are fixed (new→preparing→ready→served).
  bumpItem: (id: string, status: string) =>
    apiFetch<unknown>(`/api/terminal/kds/items/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
}

export const tablesApi = {
  // GET → { records: BusinessTable[] }; unwrap. with_session_status colours bubbles.
  // list DEFAULTS to is_active=true; pass is_active:false for inactive tables.
  list: (params: { area_id?: string; is_active?: boolean; with_session_status?: boolean } = {}) =>
    apiFetch<{ records: BusinessTable[] }>(`/api/business/tables${qs({ area_id: params.area_id, is_active: params.is_active === undefined ? undefined : String(params.is_active), with_session_status: params.with_session_status ? "true" : undefined })}`).then(r => r.records ?? []),
  create: (input: { location_id: string; area_id: string; table_number: string; capacity?: number; table_type_id?: string; position_x?: number; position_y?: number }) =>
    apiFetch<BusinessTable>("/api/business/tables", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH. position_x/position_y must be INT (round before calling).
  update: (id: string, input: UpdateTableInput) =>
    apiFetch<BusinessTable>(`/api/business/tables/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/business/tables/${id}`, { method: "DELETE" }),
}

export const diningAreasApi = {
  // GET returns { records: DiningArea[] }; list DEFAULTS to is_active=true. Unwrap.
  list: (params: { location_id?: string; is_active?: boolean } = {}) =>
    apiFetch<{ records: DiningArea[] }>(`/api/business/dining-areas${qs({ location_id: params.location_id, is_active: params.is_active === undefined ? undefined : String(params.is_active) })}`).then(r => r.records ?? []),
  create: (input: CreateDiningAreaInput) =>
    apiFetch<DiningArea>("/api/business/dining-areas", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH (no location_id on update)
  update: (id: string, input: UpdateDiningAreaInput) =>
    apiFetch<DiningArea>(`/api/business/dining-areas/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/business/dining-areas/${id}`, { method: "DELETE" }),
}

export const tableTypesApi = {
  // GET returns a plain TableType[] (NOT { data }).
  list: () => apiFetch<TableType[]>("/api/business/table-types"),
  create: (input: CreateTableTypeInput) =>
    apiFetch<TableType>("/api/business/table-types", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateTableTypeInput) =>
    apiFetch<TableType>(`/api/business/table-types/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/business/table-types/${id}`, { method: "DELETE" }),
}

export const modifierGroupsApi = {
  // GET returns bare entities with eager `modifiers`.
  list: () => apiFetch<ModifierGroup[]>("/api/business/modifier-groups"),
  create: (input: CreateModifierGroupInput) =>
    apiFetch<ModifierGroup>("/api/business/modifier-groups", { method: "POST", body: JSON.stringify(input) }),
  // verb is PUT
  update: (id: string, input: UpdateModifierGroupInput) =>
    apiFetch<ModifierGroup>(`/api/business/modifier-groups/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  addModifier: (groupId: string, input: CreateModifierInput) =>
    apiFetch<Modifier>(`/api/business/modifier-groups/${groupId}/modifiers`, { method: "POST", body: JSON.stringify(input) }),
  // Link a group to a product: POST products/:id/modifier-groups { modifier_group_id }.
  linkToProduct: (productId: string, modifier_group_id: string) =>
    apiFetch<unknown>(`/api/business/products/${productId}/modifier-groups`, { method: "POST", body: JSON.stringify({ modifier_group_id }) }),
}

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/api/business/categories"),
  create: (input: CreateCategoryInput) =>
    apiFetch<Category>("/api/business/categories", { method: "POST", body: JSON.stringify(input) }),
  // Backend verb is PUT (not PATCH).
  update: (id: string, input: UpdateCategoryInput) =>
    apiFetch<Category>(`/api/business/categories/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  remove: (id: string) =>
    apiFetch<Category>(`/api/business/categories/${id}`, { method: "DELETE" }),
}

export const productsApi = {
  // GET /business/products only reads category_id; returns a plain array.
  list: (categoryId?: string) => {
    const qs = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : ""
    return apiFetch<Product[]>(`/api/business/products${qs}`)
  },
  create: (input: CreateProductInput) =>
    apiFetch<Product>("/api/business/products", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateProductInput) =>
    apiFetch<Product>(`/api/business/products/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  // Toggle endpoint takes NO body — it flips is_sold_out server-side.
  toggleSoldOut: (id: string) =>
    apiFetch<Product>(`/api/business/products/${id}/sold-out`, { method: "PATCH" }),
  remove: (id: string) =>
    apiFetch<Product>(`/api/business/products/${id}`, { method: "DELETE" }),
}

export const variantsApi = {
  list: (productId: string) =>
    apiFetch<ProductVariant[]>(`/api/business/products/${productId}/variants`),
  create: (productId: string, input: CreateVariantInput) =>
    apiFetch<ProductVariant>(`/api/business/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (variantId: string, input: UpdateVariantInput) =>
    apiFetch<ProductVariant>(`/api/business/variants/${variantId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
}

export const warehousesApi = {
  // Backend returns { records: Warehouse[] }; unwrap so callers get a plain array.
  list: () => apiFetch<{ records: Warehouse[] }>("/api/business/warehouses").then(r => r.records ?? []),
  create: (input: CreateWarehouseInput) =>
    apiFetch<Warehouse>("/api/business/warehouses", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateWarehouseInput) =>
    apiFetch<Warehouse>(`/api/business/warehouses/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  // DELETE is a soft-deactivate server-side (sets is_active=false).
  remove: (id: string) =>
    apiFetch<Warehouse>(`/api/business/warehouses/${id}`, { method: "DELETE" }),
}

export const authApi = {
  // Used to attribute vendor check-details to the logged-in user.
  me: () => apiFetch<CurrentUser>("/api/auth/me"),
  // verb is PUT; DTO = { current_password, new_password } (both MinLength 6).
  changePassword: (input: ChangePasswordInput) =>
    apiFetch<{ message?: string }>("/api/auth/change-password", { method: "PUT", body: JSON.stringify(input) }),
}

export const settingsApi = {
  // GET owner/manager, PUT owner-only. Returns { cutoff_time }.
  getCutoff: () => apiFetch<SettlementCutoff>("/api/business/settings/settlement-cutoff"),
  updateCutoff: (cutoff_time: string) =>
    apiFetch<SettlementCutoff>("/api/business/settings/settlement-cutoff", { method: "PUT", body: JSON.stringify({ cutoff_time }) }),
  // BOTH owner-only. PUT is an upsert keyed by channel — send ONLY { channel, is_active }.
  listChannels: () => apiFetch<NotificationChannel[]>("/api/business/notifications/channels"),
  upsertChannel: (input: UpsertNotificationChannelInput) =>
    apiFetch<NotificationChannel>("/api/business/notifications/channels", { method: "PUT", body: JSON.stringify(input) }),
  // POST .../channels/test — body { channel, to (required), test_message? }. Owner-only.
  testChannel: (input: TestChannelInput) =>
    apiFetch<unknown>("/api/business/notifications/channels/test", { method: "POST", body: JSON.stringify(input) }),
  // GET .../sms/balance → { balance, last_refreshed_at } or { balance:null, message }.
  getSmsBalance: () => apiFetch<SmsBalance>("/api/business/notifications/sms/balance"),
  refreshSmsBalance: () => apiFetch<SmsBalance>("/api/business/notifications/sms/refresh-balance", { method: "POST" }),
}

export const vendorsApi = {
  // Backend returns { records: Vendor[] } (ignores page/limit; returns all). Unwrap.
  list: () => apiFetch<{ records: Vendor[] }>("/api/business/vendors").then(r => r.records ?? []),
  detail: (id: string) => apiFetch<Vendor>(`/api/business/vendors/${id}`),
  create: (input: CreateVendorInput) =>
    apiFetch<Vendor>("/api/business/vendors", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateVendorInput) =>
    apiFetch<Vendor>(`/api/business/vendors/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  // DELETE is a soft-deactivate (sets is_active=false).
  remove: (id: string) =>
    apiFetch<Vendor>(`/api/business/vendors/${id}`, { method: "DELETE" }),
  // Check-details sub-resource also returns { records }.
  listChecks: (id: string) =>
    apiFetch<{ records: VendorCheckDetail[] }>(`/api/business/vendors/${id}/check-details`).then(r => r.records ?? []),
  createCheck: (id: string, input: CreateCheckDetailInput) =>
    apiFetch<VendorCheckDetail>(`/api/business/vendors/${id}/check-details`, { method: "POST", body: JSON.stringify(input) }),
}

export const vendorPaymentsApi = {
  list: (params: { vendor_id?: string; status?: string } = {}) =>
    apiFetch<VendorPaymentListResponse>(`/api/business/vendor-payments${qs({ limit: 100, ...params })}`).then(r => r.records ?? []),
  detail: (id: string) => apiFetch<VendorPayment>(`/api/business/vendor-payments/${id}`),
  create: (input: CreateVendorPaymentInput) =>
    apiFetch<VendorPayment>("/api/business/vendor-payments", { method: "POST", body: JSON.stringify(input) }),
  confirm: (id: string) => apiFetch<VendorPayment>(`/api/business/vendor-payments/${id}/confirm`, { method: "POST" }),
  void: (id: string, reason: string) =>
    apiFetch<VendorPayment>(`/api/business/vendor-payments/${id}/void`, { method: "POST", body: JSON.stringify({ reason }) }),
  // GET vendors/:id/outstanding returns the PO array directly.
  outstanding: (vendorId: string) => apiFetch<VendorOutstandingPO[]>(`/api/business/vendors/${vendorId}/outstanding`),
  summary: (vendorId: string) => apiFetch<VendorPaymentSummary>(`/api/business/vendors/${vendorId}/payment-summary`),
}

export const purchaseOrdersApi = {
  // Backend returns { records, total, page, limit }; vendor_id filters server-side.
  listByVendor: (vendorId: string) =>
    apiFetch<{ records: PurchaseOrderSummary[] }>(`/api/business/purchase-orders${qs({ vendor_id: vendorId, limit: 100 })}`).then(r => r.records ?? []),
  list: (params: { status?: string; vendor_id?: string } = {}) =>
    apiFetch<POListResponse>(`/api/business/purchase-orders${qs({ limit: 100, ...params })}`).then(r => r.records ?? []),
  detail: (id: string) => apiFetch<PurchaseOrder>(`/api/business/purchase-orders/${id}`),
  create: (input: CreatePOInput) =>
    apiFetch<PurchaseOrder>("/api/business/purchase-orders", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH (draft only)
  update: (id: string, input: UpdatePOInput) =>
    apiFetch<PurchaseOrder>(`/api/business/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  send: (id: string) => apiFetch<PurchaseOrder>(`/api/business/purchase-orders/${id}/send`, { method: "POST" }),
  confirm: (id: string) => apiFetch<PurchaseOrder>(`/api/business/purchase-orders/${id}/confirm`, { method: "POST" }),
  receive: (id: string, input: ReceivePOInput) =>
    apiFetch<PurchaseOrder>(`/api/business/purchase-orders/${id}/receive`, { method: "POST", body: JSON.stringify(input) }),
  cancel: (id: string) => apiFetch<PurchaseOrder>(`/api/business/purchase-orders/${id}/cancel`, { method: "POST" }),
}

export const brandsApi = {
  // Backend returns { records: Brand[] }; unwrap to an array.
  list: () => apiFetch<{ records: Brand[] }>("/api/business/brands").then(r => r.records ?? []),
  create: (input: CreateBrandInput) =>
    apiFetch<Brand>("/api/business/brands", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateBrandInput) =>
    apiFetch<Brand>(`/api/business/brands/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  // DELETE is a soft-deactivate (sets is_active=false).
  remove: (id: string) =>
    apiFetch<Brand>(`/api/business/brands/${id}`, { method: "DELETE" }),
}

export const unitsApi = {
  // Backend returns { records: UnitOfMeasure[] } (incl. shared system units); unwrap.
  list: () => apiFetch<{ records: UnitOfMeasure[] }>("/api/business/units-of-measure").then(r => r.records ?? []),
  create: (input: CreateUnitInput) =>
    apiFetch<UnitOfMeasure>("/api/business/units-of-measure", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH
  update: (id: string, input: UpdateUnitInput) =>
    apiFetch<UnitOfMeasure>(`/api/business/units-of-measure/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  // DELETE is a soft-deactivate; rejects system units (422) and in-use units (422).
  remove: (id: string) =>
    apiFetch<UnitOfMeasure>(`/api/business/units-of-measure/${id}`, { method: "DELETE" }),
}

export const locationsApi = {
  // GET business/locations returns a plain Location[] (with eager terminals).
  list: () => apiFetch<BusinessLocation[]>("/api/business/locations"),
  create: (input: CreateLocationInput) =>
    apiFetch<BusinessLocation>("/api/business/locations", { method: "POST", body: JSON.stringify(input) }),
  // verb is PUT
  update: (id: string, input: UpdateLocationInput) =>
    apiFetch<BusinessLocation>(`/api/business/locations/${id}`, { method: "PUT", body: JSON.stringify(input) }),
}

export const inventoryAlertsApi = {
  listExpiration: (params: { is_resolved?: boolean; severity?: string } = {}) =>
    apiFetch<AlertListResponse<ExpirationAlert>>(
      `/api/business/expiration-alerts${qs({ limit: 100, is_resolved: params.is_resolved ? "true" : undefined, severity: params.severity })}`,
    ),
  resolveExpiration: (id: string, input: ResolveExpirationInput) =>
    apiFetch<ExpirationAlert>(`/api/business/expiration-alerts/${id}/resolve`, {
      method: "POST", body: JSON.stringify(input),
    }),
  listDiscrepancy: (params: { is_resolved?: boolean; source?: string; warehouse_id?: string } = {}) =>
    apiFetch<AlertListResponse<DiscrepancyAlert>>(
      `/api/business/stock-discrepancy-alerts${qs({ limit: 100, is_resolved: params.is_resolved ? "true" : undefined, source: params.source, warehouse_id: params.warehouse_id })}`,
    ),
  resolveDiscrepancy: (id: string, input: ResolveDiscrepancyInput) =>
    apiFetch<DiscrepancyAlert>(`/api/business/stock-discrepancy-alerts/${id}/resolve`, {
      method: "POST", body: JSON.stringify(input),
    }),
}

export const stockBatchesApi = {
  // Backend returns { records, total, page, limit }; list does NOT join product/
  // warehouse, so resolve names client-side from products/warehouses lists.
  list: (params: { warehouse_id?: string; product_id?: string } = {}) =>
    apiFetch<BatchListResponse>(`/api/business/stock-batches${qs({ limit: 100, ...params })}`).then(r => r.records ?? []),
  receive: (input: CreateBatchInput) =>
    apiFetch<StockBatch>("/api/business/stock-batches", { method: "POST", body: JSON.stringify(input) }),
  adjust: (id: string, input: AdjustBatchInput) =>
    apiFetch<StockBatch>(`/api/business/stock-batches/${id}/adjust`, { method: "POST", body: JSON.stringify(input) }),
  dispose: (id: string, input: DisposeBatchInput) =>
    apiFetch<StockBatch>(`/api/business/stock-batches/${id}/dispose`, { method: "POST", body: JSON.stringify(input) }),
  transfer: (id: string, input: TransferBatchInput) =>
    apiFetch<StockBatch>(`/api/business/stock-batches/${id}/transfer`, { method: "POST", body: JSON.stringify(input) }),
}

export const stockAdjustmentsApi = {
  // Backend returns { records, total, page, limit }.
  list: (params: { status?: string } = {}) =>
    apiFetch<AdjustmentListResponse>(`/api/business/stock-adjustments${qs({ limit: 100, ...params })}`).then(r => r.records ?? []),
  detail: (id: string) => apiFetch<StockAdjustment>(`/api/business/stock-adjustments/${id}`),
  create: (input: CreateAdjustmentInput) =>
    apiFetch<StockAdjustment>("/api/business/stock-adjustments", { method: "POST", body: JSON.stringify(input) }),
  submit: (id: string) => apiFetch<StockAdjustment>(`/api/business/stock-adjustments/${id}/submit`, { method: "POST" }),
  approve: (id: string) => apiFetch<StockAdjustment>(`/api/business/stock-adjustments/${id}/approve`, { method: "POST" }),
  post: (id: string) => apiFetch<StockAdjustment>(`/api/business/stock-adjustments/${id}/post`, { method: "POST" }),
  reject: (id: string, reason: string) =>
    apiFetch<StockAdjustment>(`/api/business/stock-adjustments/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
}

export const stockTemplatesApi = {
  // Backend returns { records }; list includes items.
  list: () => apiFetch<{ records: StockTemplate[] }>("/api/business/stock-templates").then(r => r.records ?? []),
  detail: (id: string) => apiFetch<StockTemplate>(`/api/business/stock-templates/${id}`),
  create: (input: CreateTemplateInput) =>
    apiFetch<StockTemplate>("/api/business/stock-templates", { method: "POST", body: JSON.stringify(input) }),
  // verb is PATCH; can replace items.
  update: (id: string, input: UpdateTemplateInput) =>
    apiFetch<StockTemplate>(`/api/business/stock-templates/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<unknown>(`/api/business/stock-templates/${id}`, { method: "DELETE" }),
  generatePo: (id: string, input: GeneratePoInput) =>
    apiFetch<{ id: string; po_number: string }>(`/api/business/stock-templates/${id}/create-purchase-order`, { method: "POST", body: JSON.stringify(input) }),
}

export const stockTransfersApi = {
  list: (params: { status?: string } = {}) =>
    apiFetch<TransferListResponse>(`/api/business/stock-transfers${qs({ limit: 100, ...params })}`).then(r => r.records ?? []),
  detail: (id: string) => apiFetch<StockTransfer>(`/api/business/stock-transfers/${id}`),
  create: (input: CreateTransferInput) =>
    apiFetch<StockTransfer>("/api/business/stock-transfers", { method: "POST", body: JSON.stringify(input) }),
  post: (id: string) => apiFetch<StockTransfer>(`/api/business/stock-transfers/${id}/post`, { method: "POST" }),
  cancel: (id: string) => apiFetch<StockTransfer>(`/api/business/stock-transfers/${id}/cancel`, { method: "POST" }),
  remove: (id: string) => apiFetch<{ deleted: boolean }>(`/api/business/stock-transfers/${id}`, { method: "DELETE" }),
}

export const inventoryReportsApi = {
  // stock-position is a snapshot; `type` is required by the DTO but ignored by the SQL.
  stockPosition: (params: { warehouse_id?: string; category_id?: string; low_stock_only?: boolean } = {}) =>
    apiFetch<UniversalReportResponse>(`/api/business/reports/stock-position${qs({ type: "today", ...params, low_stock_only: params.low_stock_only ? "true" : undefined })}`),
  // stock-movements report — DTO requires `type` (period), NOT `date_range`.
  stockMovements: (params: { type: ReportPeriodType; movement_type?: string; warehouse_id?: string }) =>
    apiFetch<UniversalReportResponse>(`/api/business/reports/stock-movements${qs({ type: params.type, movement_type: params.movement_type, warehouse_id: params.warehouse_id, limit: 100 })}`),
}

export const transactionsApi = {
  /**
   * Most recent transactions (defaults to page 1 / 20 on the backend).
   * NOTE: do NOT pass page/limit query params here — business/reports/transactions
   * uses dual @Query DTOs with forbidNonWhitelisted, so ReportFilterDto rejects
   * `page`/`limit` with a 400. The bare call returns the newest 20, which is all
   * the dashboard's "recent" widget needs.
   */
  recent: () =>
    apiFetch<PaginatedResult<Transaction>>("/api/business/reports/transactions"),
}
