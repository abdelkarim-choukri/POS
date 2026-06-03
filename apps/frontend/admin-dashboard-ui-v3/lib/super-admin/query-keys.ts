/**
 * Hierarchical TanStack Query key factory for the Super Admin console.
 *
 * Always build keys through this factory so cache invalidation stays precise
 * and refactor-safe. Example:
 *   queryClient.invalidateQueries({ queryKey: superKeys.couriers.list() })
 */
export const superKeys = {
  all: ["super"] as const,

  couriers: {
    all: ["super", "couriers"] as const,
    list: () => ["super", "couriers", "list"] as const,
  },

  tradeCategories: {
    all: ["super", "trade-categories"] as const,
    tree: () => ["super", "trade-categories", "tree"] as const,
    options: () => ["super", "trade-categories", "options"] as const,
  },

  subscriptions: {
    all: ["super", "subscriptions"] as const,
    list: () => ["super", "subscriptions", "list"] as const,
  },
} as const

/** Auth identity key (shared across merchant + super segments). */
export const authKeys = {
  me: ["auth", "me"] as const,
}
