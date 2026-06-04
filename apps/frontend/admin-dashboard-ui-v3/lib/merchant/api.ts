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
  UpdateVariantInput,
  ClockEntry,
  CreateEmployeeInput,
  Employee,
  UpdateEmployeeInput,
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
