/**
 * Backend-accurate types for the Super Admin (platform) console.
 *
 * SOURCE OF TRUTH (verified 2026-06-01 against the backend, not guessed):
 * - apps/backend/src/common/entities/courier.entity.ts
 * - apps/backend/src/common/entities/trade-category.entity.ts
 * - apps/backend/src/common/entities/subscription.entity.ts
 * - apps/backend/src/modules/platform-admin/dto/platform-admin.dto.ts
 * - apps/backend/src/modules/auth/auth.service.ts (getProfile)
 *
 * NOTE — these intentionally REPLACE the older ad-hoc interfaces that had
 * drifted (couriers had phone/email/website/vehicle_type; trade categories had
 * name_fr/name_ar/icon_name). None of those fields exist on the backend.
 */

// ── Couriers (ADM-010–013) ──────────────────────────────────────────────────
// GET /api/super/couriers → Courier[]  (raw array, ordered by name ASC)
export interface Courier {
  id: string
  name: string
  code: string
  logo_url: string | null
  api_endpoint: string | null
  tracking_url_template: string | null
  supports_cash_on_delivery: boolean
  is_active: boolean
}

// POST /api/super/couriers
export interface CreateCourierInput {
  name: string
  code: string
  logo_url?: string
  api_endpoint?: string
  tracking_url_template?: string
  supports_cash_on_delivery?: boolean
}

// PATCH /api/super/couriers/:id
// IMPORTANT: `code` is IMMUTABLE after creation (absent from UpdateCourierDto).
export interface UpdateCourierInput {
  name?: string
  logo_url?: string
  api_endpoint?: string
  tracking_url_template?: string
  supports_cash_on_delivery?: boolean
  is_active?: boolean
}

// ── Trade Categories (ADM-001–005) ──────────────────────────────────────────
// GET /api/super/trade-categories/tree → TradeCategory[] (nested via children)
// (there is NO plain GET /api/super/trade-categories — only /tree and /options)
export interface TradeCategory {
  id: string
  parent_id: string | null
  name: string
  code: string
  default_business_type_id: string | null
  default_settings_json: Record<string, unknown> | null
  is_active: boolean
  sort_order: number
  children?: TradeCategory[]
}

export interface CreateTradeCategoryInput {
  name: string
  code: string
  parent_id?: string
  default_business_type_id?: string
  default_settings_json?: Record<string, unknown>
  is_active?: boolean
  sort_order?: number
}

export interface UpdateTradeCategoryInput {
  name?: string
  code?: string
  parent_id?: string
  is_active?: boolean
  sort_order?: number
}

// ── Subscriptions ───────────────────────────────────────────────────────────
// CONFIRMED to exist: GET/POST /api/super/subscriptions, PUT /:id
// (mounted by modules/super-admin/super-admin.controller.ts)
// Note: `price_mad` is a NUMERIC column → serialized by TypeORM as a string.
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "expired"
  | "cancelled"
  | "suspended"

export interface Subscription {
  id: string
  business_id: string
  plan_name: string
  status: SubscriptionStatus
  start_date: string
  end_date: string | null
  price_mad: string
  created_at: string
  updated_at: string
}

// ── Auth profile (GET /api/auth/me) ─────────────────────────────────────────
// The backend discriminates identity by `type`. RolesGuard authorizes when
// user.type === 'super_admin' (or user.role === 'super_admin').
export interface MeSuperAdmin {
  type: "super_admin"
  id: string
  email: string
  name: string
  is_active: boolean
  last_login_at: string | null
}

export interface MeUser {
  type: "user"
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  phone: string | null
  is_active: boolean
  permissions: Record<string, unknown>
  dashboard_access: boolean
  language_preference: string
  business_id: string
  business?: unknown
}

export type Me = MeSuperAdmin | MeUser

/** True when the authenticated identity may use the platform console. */
export function isPlatformOperator(me: Me | undefined | null): boolean {
  if (!me) return false
  if (me.type === "super_admin") return true
  return (me as MeUser).role === "super_admin"
}
