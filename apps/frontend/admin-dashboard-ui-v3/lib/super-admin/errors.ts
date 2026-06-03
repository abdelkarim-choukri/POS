/**
 * Maps backend structured error codes (docs/ERROR_CODES.md) to human-readable
 * strings for the Super Admin console.
 *
 * `apiFetch` already prefers the structured `{ error: 'CODE' }` body and surfaces
 * it as `ApiError.message`, so here we map the CODE → friendly text, falling
 * back to the raw message when there's no mapping.
 */
import { ApiError } from "@/lib/api"

const ERROR_MESSAGES: Record<string, string> = {
  // ── Platform Admin (ADM-*) ──
  ADM_COURIER_NOT_FOUND: "Courier not found — it may have just been deleted.",
  ADM_COURIER_LINK_NOT_FOUND: "That courier is not linked to this business.",
  ADM_TRADE_CATEGORY_NOT_FOUND: "Trade category not found.",
  // ── Generic ──
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export function humanizeError(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof ApiError) {
    return ERROR_MESSAGES[e.message] ?? e.message ?? fallback
  }
  if (e instanceof Error) return e.message || fallback
  return fallback
}
