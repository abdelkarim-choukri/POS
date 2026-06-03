/**
 * Typed API layer for the Super Admin console.
 *
 * Thin, fully-typed wrappers over the shared `apiFetch`. Components never call
 * `apiFetch` with raw URLs — they go through these so request/response shapes
 * stay aligned with the backend (see ./types.ts for the source-of-truth shapes).
 */
import { apiFetch } from "@/lib/api"
import type {
  Courier,
  CreateCourierInput,
  UpdateCourierInput,
  TradeCategory,
  Subscription,
} from "./types"

export const couriersApi = {
  list: () => apiFetch<Courier[]>("/api/super/couriers"),

  create: (input: CreateCourierInput) =>
    apiFetch<Courier>("/api/super/couriers", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateCourierInput) =>
    apiFetch<Courier>(`/api/super/couriers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    apiFetch<{ deleted: true }>(`/api/super/couriers/${id}`, {
      method: "DELETE",
    }),
}

export const tradeCategoriesApi = {
  tree: () => apiFetch<TradeCategory[]>("/api/super/trade-categories/tree"),
}

export const subscriptionsApi = {
  list: () => apiFetch<Subscription[]>("/api/super/subscriptions"),
}
