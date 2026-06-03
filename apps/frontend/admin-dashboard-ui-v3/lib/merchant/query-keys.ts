/**
 * Hierarchical TanStack Query key factory for the MERCHANT dashboard.
 *
 * Always build keys through this factory so cache invalidation stays precise
 * and refactor-safe.
 */
import type { ReportPeriodType } from "./types"

export const merchantKeys = {
  all: ["merchant"] as const,

  reports: {
    all: ["merchant", "reports"] as const,
    salesSummary: (type: ReportPeriodType) =>
      ["merchant", "reports", "sales-summary", type] as const,
  },

  transactions: {
    all: ["merchant", "transactions"] as const,
    recent: () => ["merchant", "transactions", "recent"] as const,
  },
} as const
