/**
 * Hierarchical TanStack Query key factory for the MERCHANT dashboard.
 *
 * Always build keys through this factory so cache invalidation stays precise
 * and refactor-safe.
 */
import type { ReportPeriodType } from "./types"

export const merchantKeys = {
  all: ["merchant"] as const,

  auth: {
    me: () => ["merchant", "auth", "me"] as const,
  },

  locations: {
    all: ["merchant", "locations"] as const,
    list: () => ["merchant", "locations", "list"] as const,
  },

  settings: {
    all: ["merchant", "settings"] as const,
    cutoff: () => ["merchant", "settings", "cutoff"] as const,
    channels: () => ["merchant", "settings", "channels"] as const,
    smsBalance: () => ["merchant", "settings", "sms-balance"] as const,
  },

  modifierGroups: {
    all: ["merchant", "modifier-groups"] as const,
    list: () => ["merchant", "modifier-groups", "list"] as const,
  },

  tableTypes: {
    all: ["merchant", "table-types"] as const,
    list: () => ["merchant", "table-types", "list"] as const,
  },

  diningAreas: {
    all: ["merchant", "dining-areas"] as const,
    list: (key: string) => ["merchant", "dining-areas", "list", key] as const,
  },

  tables: {
    all: ["merchant", "tables"] as const,
    list: () => ["merchant", "tables", "list"] as const,
  },

  kds: {
    all: ["merchant", "kds"] as const,
    items: () => ["merchant", "kds", "items"] as const,
  },

  announcements: {
    all: ["merchant", "announcements"] as const,
    list: () => ["merchant", "announcements", "list"] as const,
    forMe: () => ["merchant", "announcements", "for-me"] as const,
  },

  notifTemplates: {
    all: ["merchant", "notif-templates"] as const,
    list: () => ["merchant", "notif-templates", "list"] as const,
  },

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
  vendors: {
    all: ["merchant", "vendors"] as const,
    list: () => ["merchant", "vendors", "list"] as const,
    detail: (id: string) => ["merchant", "vendors", "detail", id] as const,
    checks: (id: string) => ["merchant", "vendors", id, "checks"] as const,
    purchaseOrders: (id: string) => ["merchant", "vendors", id, "purchase-orders"] as const,
  },

  adjustments: {
    all: ["merchant", "adjustments"] as const,
    list: (status: string) => ["merchant", "adjustments", "list", status] as const,
    detail: (id: string) => ["merchant", "adjustments", "detail", id] as const,
  },

  vendorPayments: {
    all: ["merchant", "vendor-payments"] as const,
    list: (key: string) => ["merchant", "vendor-payments", "list", key] as const,
    outstanding: (vendorId: string) => ["merchant", "vendor-payments", "outstanding", vendorId] as const,
    summary: (vendorId: string) => ["merchant", "vendor-payments", "summary", vendorId] as const,
  },

  purchaseOrders: {
    all: ["merchant", "purchase-orders"] as const,
    list: (status: string) => ["merchant", "purchase-orders", "list", status] as const,
    detail: (id: string) => ["merchant", "purchase-orders", "detail", id] as const,
  },

  transfers: {
    all: ["merchant", "transfers"] as const,
    list: (status: string) => ["merchant", "transfers", "list", status] as const,
    detail: (id: string) => ["merchant", "transfers", "detail", id] as const,
  },

  inventory: {
    all: ["merchant", "inventory"] as const,
    warehouses: () => ["merchant", "inventory", "warehouses"] as const,
    units: () => ["merchant", "inventory", "units"] as const,
    brands: () => ["merchant", "inventory", "brands"] as const,
    batches: (key: string) => ["merchant", "inventory", "batches", key] as const,
    products: () => ["merchant", "inventory", "products-map"] as const,
    stockPosition: (key: string) => ["merchant", "inventory", "stock-position", key] as const,
    movements: (key: string) => ["merchant", "inventory", "movements", key] as const,
    templates: () => ["merchant", "inventory", "templates"] as const,
    templateDetail: (id: string) => ["merchant", "inventory", "templates", id] as const,
    locations: () => ["merchant", "inventory", "locations"] as const,
    expirationAlerts: (key: string) => ["merchant", "inventory", "expiration-alerts", key] as const,
    discrepancyAlerts: (key: string) => ["merchant", "inventory", "discrepancy-alerts", key] as const,
  },
} as const
