"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { authKeys } from "./query-keys"
import { type Me, isPlatformOperator } from "./types"

/**
 * Single source of truth for the authenticated identity.
 *
 * Fetches GET /api/auth/me and caches it under the shared auth key. Because the
 * identity is derived from the token on every mount (and cached by TanStack
 * Query), a browser refresh re-derives the real role from the backend instead
 * of losing it — fixing the cosmetic `isSuperAdmin` state (audit gaps G1/G2).
 */
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => apiFetch<Me>("/api/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export { isPlatformOperator }
export type { Me }
