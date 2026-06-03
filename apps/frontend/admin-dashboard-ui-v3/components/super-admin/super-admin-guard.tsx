"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useMe, isPlatformOperator } from "@/lib/super-admin/use-me"
import { clearToken } from "@/lib/api"

/**
 * Strict auth-guard boundary for the platform console.
 *
 * Must render INSIDE the QueryProvider (it uses useMe → useQuery). Resolves the
 * authoritative identity from GET /api/auth/me and:
 *   - no/invalid session  → clear token, redirect to "/" (login lives there)
 *   - merchant identity    → redirect to "/" (never expose the platform shell)
 *   - platform operator    → render the console
 *
 * Fixes audit gaps G1 (role from identity, not a button), G2 (survives refresh),
 * G3 (merchant token can no longer reach the super shell). See
 * docs/SUPER_ADMIN_FRONTEND_AUDIT.md §3.
 */
export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: me, isLoading, isError } = useMe()
  const allowed = isPlatformOperator(me)

  useEffect(() => {
    if (isLoading) return
    if (isError) {
      clearToken()
      router.replace("/")
      return
    }
    if (!allowed) {
      router.replace("/")
    }
  }, [isLoading, isError, allowed, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#09090f]">
        <span className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isError || !allowed) return null

  return <>{children}</>
}
