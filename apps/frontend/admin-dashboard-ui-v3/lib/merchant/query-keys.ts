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

  categories: {
    all: ["merchant", "categories"] as const,
    list: () => ["merchant", "categories", "list"] as const,
  },

  products: {
    all: ["merchant", "products"] as const,
    list: (categoryId: string | null) =>
      ["merchant", "products", "list", categoryId ?? "_all"] as const,
    variants: (productId: string) =>
      ["merchant", "products", productId, "variants"] as const,
  },

  customers: {
    all: ["merchant", "customers"] as const,
    list: (search: string) => ["merchant", "customers", "list", search] as const,
    detail: (id: string) => ["merchant", "customers", "detail", id] as const,
    pointsHistory: (id: string) => ["merchant", "customers", id, "points-history"] as const,
    newThisMonth: (from: string) => ["merchant", "customers", "new-this-month", from] as const,
  },
  grades: {
    all: ["merchant", "grades"] as const,
    list: () => ["merchant", "grades", "list"] as const,
  },
  labels: {
    all: ["merchant", "labels"] as const,
    list: () => ["merchant", "labels", "list"] as const,
  },
  attributes: {
    all: ["merchant", "attributes"] as const,
    list: () => ["merchant", "attributes", "list"] as const,
  },

  employees: {
    all: ["merchant", "employees"] as const,
    list: () => ["merchant", "employees", "list"] as const,
    clockHistory: (id: string) => ["merchant", "employees", id, "clock-history"] as const,
  },

  promotions: {
    all: ["merchant", "promotions"] as const,
    list: (status: string) => ["merchant", "promotions", "list", status] as const,
  },
  chain: {
    all: ["merchant", "chain"] as const,
    children: () => ["merchant", "chain", "children"] as const,
  },
  coupons: {
    all: ["merchant", "coupons"] as const,
    types: () => ["merchant", "coupons", "types"] as const,
  },
  inventory: {
    all: ["merchant", "inventory"] as const,
    warehouses: () => ["merchant", "inventory", "warehouses"] as const,
    stockPosition: (key: string) => ["merchant", "inventory", "stock-position", key] as const,
  },
} as const
