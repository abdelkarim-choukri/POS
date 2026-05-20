# Error Codes Reference

This document lists every structured error key returned by the POS backend API.

---

## Error Response Format

All errors use a consistent JSON body:

```json
{
  "error": "ERROR_KEY",
  "message": "Human-readable description",
  "statusCode": 404
}
```

**Important rules:**

- **Cross-tenant access always returns 404** (not 403). Returning 403 would confirm that the resource exists; 404 prevents existence leaking across business boundaries.
- **HTTP 410 Gone** is used specifically for already-redeemed coupons, distinguishing "never existed" (404) from "existed but was consumed" (410).
- The `error` field contains the machine-readable key documented in this file. Clients should branch on `error`, not on `message` (which may change).

---

## Auth

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `AUTH_INVALID_CREDENTIALS` | 401 Unauthorized | Wrong email/password |
| `AUTH_NO_DASHBOARD_ACCESS` | 401 Unauthorized | User has no dashboard access |
| `AUTH_TERMINAL_NOT_FOUND` | 401 Unauthorized | Terminal code not found |
| `AUTH_INVALID_PIN` | 401 Unauthorized | Wrong PIN for terminal login |
| `AUTH_INVALID_REFRESH` | 401 Unauthorized | Refresh token invalid or expired |
| `AUTH_USER_NOT_FOUND` | 400 Bad Request | User not found during password change |
| `AUTH_PASSWORD_INCORRECT` | 400 Bad Request | Current password mismatch |

---

## Business

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `BIZ_CATEGORY_NOT_FOUND` | 404 Not Found | Category does not exist or belongs to another business |
| `BIZ_PRODUCT_NOT_FOUND` | 404 Not Found | Product does not exist or belongs to another business |

---

## Terminal

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `TERM_TERMINAL_NOT_FOUND` | 404 Not Found | Terminal not found |
| `TERM_CUSTOMER_NOT_FOUND` | 404 Not Found | Customer not found |
| `TERM_COUPON_NOT_FOUND` | 404 Not Found | Coupon not found |
| `TERM_PHONE_CONFLICT` | 409 Conflict | Phone number already registered |
| `TERM_VOID_INVALID_STATUS` | 400 Bad Request | Transaction cannot be voided in its current status |
| `TERM_VOID_MANAGER_REQUIRED` | 401 Unauthorized | Manager PIN required to void |
| `TERM_VOID_MANAGER_INVALID` | 401 Unauthorized | Manager PIN incorrect |

---

## Customers

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `CUST_NOT_FOUND` | 404 Not Found | Customer not found |
| `CUST_PHONE_CONFLICT` | 409 Conflict | Phone number already in use |
| `CUST_GRADE_NOT_FOUND` | 404 Not Found | Customer grade not found |
| `CUST_LABEL_NOT_FOUND` | 404 Not Found | Customer label not found |
| `CUST_ATTR_NOT_FOUND` | 404 Not Found | Custom attribute not found |
| `CUST_ATTR_TYPE_IMMUTABLE` | 422 Unprocessable Entity | Cannot change `data_type` once the attribute has values |
| `CUST_ATTR_VALIDATION_FAILED` | 400 Bad Request | Attribute value fails type or enum validation |
| `CUST_POINTS_INSUFFICIENT` | 422 Unprocessable Entity | Customer has fewer points than requested |
| `CUST_PERMISSION_DENIED` | 403 Forbidden | Insufficient permission for this operation |

---

## Promotions

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `PROM_NOT_FOUND` | 404 Not Found | Promotion not found |
| `PROM_CODE_CONFLICT` | 409 Conflict | Promotion code already exists |
| `PROM_PERCENTAGE_INVALID` | 400 Bad Request | Percentage discount must be between 0 and 100 |
| `PROM_DATE_INVALID` | 400 Bad Request | `end_date` must be after `start_date` |
| `PROM_LOCKED_FIELD` | 422 Unprocessable Entity | Cannot change locked fields once a promotion is active |
| `PROM_ALREADY_ARCHIVED` | 422 Unprocessable Entity | Promotion is already archived |
| `PROM_ARCHIVE_AGAIN` | 422 Unprocessable Entity | Cannot archive an already-archived promotion |
| `PROM_CATEGORY_NOT_FOUND` | 400 Bad Request | Target category not found |
| `PROM_PRODUCT_NOT_FOUND` | 400 Bad Request | Target product not found |
| `PROM_GRADE_CROSS_TENANT` | 400 Bad Request | Grade belongs to another business |
| `PROM_LABEL_CROSS_TENANT` | 400 Bad Request | Label belongs to another business |
| `PROM_CUSTOMER_CROSS_TENANT` | 400 Bad Request | Customer belongs to another business |
| `PROM_LOCATION_CROSS_TENANT` | 400 Bad Request | Location belongs to another business |

---

## Coupons

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `CPN_TYPE_NOT_FOUND` | 404 Not Found | Coupon type not found |
| `CPN_NOT_FOUND` | 404 Not Found | Coupon not found |
| `CPN_NOT_AVAILABLE` | 422 Unprocessable Entity | Coupon is not in `available` status |
| `CPN_ALREADY_REDEEMED` | 410 Gone | Coupon has already been redeemed |

Note: `410 Gone` is intentional — it distinguishes a coupon that was consumed from one that never existed (404).

---

## Points Exchange

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `PEX_RULE_NOT_FOUND` | 404 Not Found | Points exchange rule not found |
| `PEX_POINT_VALUE_IMMUTABLE` | 422 Unprocessable Entity | Cannot change `point_value` once the rule has redemptions |
| `PEX_CUSTOMER_NOT_FOUND` | 404 Not Found | Customer not found |
| `PEX_POINTS_INSUFFICIENT` | 422 Unprocessable Entity | Customer has insufficient points |
| `PEX_DAILY_LIMIT_EXCEEDED` | 422 Unprocessable Entity | Customer daily redemption limit reached |
| `PEX_TOTAL_LIMIT_EXCEEDED` | 422 Unprocessable Entity | Rule total redemption limit reached |
| `PEX_RULE_INACTIVE` | 422 Unprocessable Entity | Rule is not active |
| `PEX_RULE_DEACTIVATED` | 422 Unprocessable Entity | Cannot re-activate a deactivated rule with changed settings |

---

## Inventory

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `INV_UOM_NOT_FOUND` | 404 Not Found | Unit of measure not found |
| `INV_WAREHOUSE_NOT_FOUND` | 404 Not Found | Warehouse not found |
| `INV_VENDOR_NOT_FOUND` | 404 Not Found | Vendor not found |
| `INV_BRAND_NOT_FOUND` | 404 Not Found | Brand not found |
| `INV_NUTRITION_NOT_FOUND` | 404 Not Found | Nutrition info not found |
| `INV_PRODUCT_NOT_FOUND` | 404 Not Found | Product not found |
| `INV_BATCH_NOT_FOUND` | 404 Not Found | Stock batch not found |
| `INV_BATCH_DISPOSED` | 422 Unprocessable Entity | Batch has been fully disposed |
| `INV_BATCH_NO_STOCK` | 422 Unprocessable Entity | Batch has no remaining stock |
| `INV_TEMPLATE_NOT_FOUND` | 404 Not Found | Stock template not found |
| `INV_PO_NOT_FOUND` | 404 Not Found | Purchase order not found |
| `INV_PO_NOT_DRAFT` | 422 Unprocessable Entity | Operation only allowed on draft purchase orders |
| `INV_PO_NOT_CONFIRMED` | 422 Unprocessable Entity | Operation only allowed on confirmed purchase orders |
| `INV_PO_HAS_RECEIVED` | 422 Unprocessable Entity | Cannot cancel a purchase order that has received items |
| `INV_ALERT_NOT_FOUND` | 404 Not Found | Alert not found |
| `INV_ALERT_RESOLVED` | 422 Unprocessable Entity | Alert is already resolved |
| `INV_DISCREPANCY_ALERT_NOT_FOUND` | 404 Not Found | Discrepancy alert not found |
| `INV_ADJ_NOT_FOUND` | 404 Not Found | Stock adjustment not found |
| `INV_TRANSFER_NOT_FOUND` | 404 Not Found | Stock transfer not found |
| `INV_VENDOR_PAYMENT_NOT_FOUND` | 404 Not Found | Vendor payment not found |
| `INV_VENDOR_PAYMENT_VOIDED` | 422 Unprocessable Entity | Payment is already voided |
| `INV_FEATURE_DISABLED` | 422 Unprocessable Entity | Feature flag disabled for this business type |

---

## Restaurant

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `RST_AREA_NOT_FOUND` | 404 Not Found | Dining area not found |
| `RST_AREA_NAME_CONFLICT` | 409 Conflict | Dining area name already exists in this business |
| `RST_AREA_HAS_TABLES` | 422 Unprocessable Entity | Cannot delete a dining area that has active tables |
| `RST_TABLE_TYPE_NOT_FOUND` | 404 Not Found | Table type not found |
| `RST_TABLE_NOT_FOUND` | 404 Not Found | Table not found |
| `RST_TABLE_NUMBER_CONFLICT` | 409 Conflict | Table number already exists in this business |
| `RST_TABLE_HAS_SESSION` | 422 Unprocessable Entity | Cannot delete a table with an open session |
| `RST_SESSION_NOT_FOUND` | 404 Not Found | Table session not found |
| `RST_SESSION_NOT_OPEN` | 422 Unprocessable Entity | Session is not in `open` status |
| `RST_ORPHAN_ITEM_IN_SPLIT` | 422 Unprocessable Entity | Custom split leaves one or more items unassigned |
| `RST_DUPLICATE_ITEM_IN_SPLIT` | 422 Unprocessable Entity | An item is assigned to multiple splits |
| `RST_PERM_CLOSE` | 403 Forbidden | Insufficient permission to close the table |
| `RST_PERM_CLOSE_PARTIAL` | 403 Forbidden | Insufficient permission to force-close with partial payment |
| `RST_PERM_TRANSFER` | 403 Forbidden | Insufficient permission to transfer table items |

---

## Chain

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `CHN_ALREADY_PARENT` | 422 Unprocessable Entity | Business is already a parent in a chain |
| `CHN_BUSINESS_NOT_FOUND` | 404 Not Found | Business not found |
| `CHN_ALREADY_IN_CHAIN` | 422 Unprocessable Entity | Business is already in a chain |
| `CHN_DEPTH_EXCEEDED` | 422 Unprocessable Entity | Maximum chain depth (2 levels) exceeded |
| `CHN_CHILD_NOT_FOUND` | 404 Not Found | Child business not found |
| `CHN_SYNC_CONFIG_NOT_FOUND` | 404 Not Found | Sync configuration not found |
| `CHN_PO_NOT_FOUND` | 404 Not Found | Purchase order not found |
| `CHN_WAREHOUSE_NOT_FOUND` | 404 Not Found | Warehouse not found |
| `CHN_PROMOTION_NOT_FOUND` | 404 Not Found | Promotion not found |
| `CHN_ACCESS_DENIED` | 403 Forbidden | User does not have access to this business |

---

## Communications

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `COM_CHANNEL_NOT_FOUND` | 404 Not Found | Notification channel not configured |
| `COM_TEMPLATE_NOT_FOUND` | 404 Not Found | Notification template not found |
| `COM_TEMPLATE_HAS_SENDS` | 422 Unprocessable Entity | Cannot delete a template that has send history |
| `COM_CUSTOMER_NOT_FOUND` | 404 Not Found | Customer not found |
| `COM_INSUFFICIENT_BALANCE` | 422 Unprocessable Entity | Insufficient SMS balance for this operation |
| `COM_OPT_OUT_TOKEN_INVALID` | 404 Not Found | Opt-out token not found or already used |
| `COM_ANNOUNCEMENT_NOT_FOUND` | 404 Not Found | Announcement not found |

---

## Reports

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `REPORT_NOT_FOUND` | 404 Not Found | Report ID not recognized |
| `REPORT_NOT_IMPLEMENTED` | 501 Not Implemented | Report exists in spec but is not yet implemented |

---

## Recommendations

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `REC_TEMPLATE_NOT_FOUND` | 404 Not Found | Recommendation template not found |

---

## Platform Admin

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `ADM_TRADE_CATEGORY_NOT_FOUND` | 404 Not Found | Trade category not found |
| `ADM_COURIER_NOT_FOUND` | 404 Not Found | Courier not found |
| `ADM_COURIER_LINK_NOT_FOUND` | 404 Not Found | Courier not linked to this business |
| `ADM_VERSION_ENTRY_NOT_FOUND` | 404 Not Found | Version log entry not found |
| `ADM_SYSTEM_PARAM_NOT_FOUND` | 404 Not Found | System parameter not found |

---

## Super Admin

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `SA_BUSINESS_NOT_FOUND` | 404 Not Found | Business not found |
| `SA_BUSINESS_TYPE_NOT_FOUND` | 404 Not Found | Business type not found |
| `SA_TERMINAL_NOT_FOUND` | 404 Not Found | Terminal not found |
| `SA_TERMINAL_CODE_CONFLICT` | 409 Conflict | Terminal code already in use |
| `SA_LOCATION_NOT_FOUND` | 404 Not Found | Location not found |
| `SA_SUBSCRIPTION_NOT_FOUND` | 404 Not Found | Subscription not found |
| `SA_ANNOUNCEMENT_NOT_FOUND` | 404 Not Found | Announcement not found |

---

## Jobs

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `JOB_NOT_FOUND` | 404 Not Found | Background job not found |

---

## KDS

| Error Key | HTTP Status | Meaning |
|-----------|-------------|---------|
| `KDS_ORDER_NOT_FOUND` | 404 Not Found | KDS order not found |
| `KDS_ITEM_NOT_FOUND` | 404 Not Found | KDS item not found |

---

## Error Key Prefixes Quick Reference

| Prefix | Module |
|--------|--------|
| `AUTH_*` | Authentication (`/api/auth/*`) |
| `BIZ_*` | Business management (`/api/business/*`) |
| `TERM_*` | Terminal (`/api/terminal/*`) |
| `CUST_*` | Customers & loyalty |
| `PROM_*` | Promotions |
| `CPN_*` | Coupons |
| `PEX_*` | Points exchange |
| `INV_*` | Inventory (stock, warehouses, vendors, POs, adjustments) |
| `RST_*` | Restaurant operations (tables, sessions, KDS) |
| `CHN_*` | Chain & franchise |
| `COM_*` | Communications (notifications, announcements) |
| `REC_*` | Recommendations |
| `ADM_*` | Platform admin |
| `SA_*` | Super admin |
| `JOB_*` | Background jobs |
| `KDS_*` | Kitchen Display System (legacy non-restaurant path) |
| `REPORT_*` | Reports module |
