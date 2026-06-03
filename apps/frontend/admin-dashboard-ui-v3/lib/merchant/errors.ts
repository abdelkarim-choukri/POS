/**
 * Maps backend structured error codes to human-readable strings for the
 * MERCHANT dashboard. `apiFetch` surfaces the structured `{ error: 'CODE' }`
 * body as `ApiError.message`; here we map CODE → friendly text, falling back to
 * the raw message when there's no mapping.
 */
import { ApiError } from "@/lib/api"

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export function humanizeError(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof ApiError) {
    return ERROR_MESSAGES[e.message] ?? e.message ?? fallback
  }
  if (e instanceof Error) return e.message || fallback
  return fallback
}
