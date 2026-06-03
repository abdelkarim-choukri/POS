/**
 * Typed API layer for the MERCHANT (business admin) dashboard.
 *
 * Thin, fully-typed wrappers over the shared `apiFetch`. Components never call
 * `apiFetch` with raw URLs — they go through these so request/response shapes
 * stay aligned with the backend (see ./types.ts for the source-of-truth shapes).
 */
import { apiFetch } from "@/lib/api"
import type {
  PaginatedResult,
  ReportPeriodType,
  Transaction,
  UniversalReportResponse,
} from "./types"

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
