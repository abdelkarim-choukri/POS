"use client"

import { type ReactNode } from "react"
import { QueryProvider } from "@/components/providers/query-provider"
import { SuperAdminGuard } from "@/components/super-admin/super-admin-guard"

/**
 * Isolated Super Admin (platform operator) route segment.
 *
 * - Owns its own TanStack Query client (QueryProvider).
 * - Enforces the platform-operator auth boundary (SuperAdminGuard), which runs
 *   inside the provider so it can resolve identity via GET /api/auth/me.
 */
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SuperAdminGuard>{children}</SuperAdminGuard>
    </QueryProvider>
  )
}
