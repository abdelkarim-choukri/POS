/**
 * Maps backend structured error codes to human-readable strings for the
 * MERCHANT dashboard. `apiFetch` surfaces the structured `{ error: 'CODE' }`
 * body as `ApiError.message`; here we map CODE → friendly text, falling back to
 * the raw message when there's no mapping.
 */
import { ApiError } from "@/lib/api"

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  BIZ_PRODUCT_NOT_FOUND: "Product not found — it may have just been deleted.",
  BIZ_CATEGORY_NOT_FOUND: "Category not found — it may have just been deleted.",
  BIZ_VARIANT_NOT_FOUND: "Variant not found — it may have just been deleted.",
  BIZ_MODIFIER_GROUP_NOT_FOUND: "Modifier group not found.",
  CUST_NOT_FOUND: "Customer not found — it may have just been deleted.",
  CUST_PHONE_CONFLICT: "That phone number is already registered for another customer.",
  CUST_GRADE_NOT_FOUND: "Grade not found.",
  CUST_LABEL_NOT_FOUND: "Label not found.",
  CUST_ATTRIBUTE_NOT_FOUND: "Attribute not found.",
  CUST_PERMISSION_DENIED: "You don't have permission to adjust points.",
  CUST_INSUFFICIENT_POINTS: "Adjustment would make the points balance negative.",
  BIZ_EMPLOYEE_NOT_FOUND: "Employee not found — it may have just been removed.",
  PROM_NOT_FOUND: "Promotion not found — it may have just been deleted.",
  PROM_INVALID_STATE: "That action isn't allowed in the promotion's current state.",
  CHN_NOT_PARENT: "This business is not a chain parent.",
  CHN_NOT_IN_CHAIN: "One or more selected stores are not children of this chain.",
  CHN_NO_PARENT: "This business has no parent.",
  CPN_TYPE_NOT_FOUND: "Coupon type not found or inactive.",
  CPN_NOT_FOUND: "Coupon not found.",
  CPN_ALREADY_REDEEMED: "That coupon has already been redeemed.",
  CPN_TYPE_LOCKED: "Discount fields can't be changed once coupons have been issued.",
}

export function humanizeError(e: unknown, fallback = "Something went wrong."): string {
  if (e instanceof ApiError) {
    return ERROR_MESSAGES[e.message] ?? e.message ?? fallback
  }
  if (e instanceof Error) return e.message || fallback
  return fallback
}
