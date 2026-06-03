"use client"

import { useRouter } from "next/navigation"
import SuperAdminPage from "@/components/super-admin/super-admin-page"

/**
 * Entry page for the isolated Super Admin console.
 * "Back" returns the operator to the merchant app root.
 */
export default function SuperAdminRoute() {
  const router = useRouter()
  return <SuperAdminPage onBack={() => router.push("/")} />
}
