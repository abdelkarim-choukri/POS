# POS System — Master Consolidated Specification

**Version:** 1.0
**Date:** May 2026
**Purpose:** Single source of truth for the complete POS platform. Consolidates the existing implemented system (Phases 0–10 + Reports), the planned extension spec (Phases 11–15), and new additions extracted from external system analysis.
**Audience:** Claude Code / developer building the system.

---

## How to Read This Document

- **Part A** = what exists today (built, tested, running) + what is already spec'd but not yet built.
- **Part B** = new additions discovered from external system analysis, rewritten to integrate with Part A's architecture. These use NEW requirement IDs prefixed with `EXT-` to distinguish them from existing spec IDs.
- **Part C** = overlap/conflict resolution table.

Requirement ID prefixes:
- `XCC-` = Cross-cutting concerns (existing)
- `CUST-`, `PROM-`, `CPN-`, `PEX-`, `RST-`, `INV-`, `CHN-`, `REC-`, `COM-`, `ADM-` = Existing module requirements
- `EXT-INV-` = New additions to the Inventory & Stock module
- `EXT-RPT-` = New report additions

---

# PART A — EXISTING SYSTEM

This part catalogs everything that exists in the codebase and extension spec. Developers should reference this before building anything to avoid duplication.

---

## A.1 Architecture & Infrastructure

### A.1.1 Monorepo Structure

```
apps/
  backend/         — NestJS API server (TypeORM + PostgreSQL 16 + Redis 7)
  terminal-app/    — Electron POS terminal (Ubuntu kiosk, Vite)
  dashboard-web/   — React admin dashboard (Business + Super Admin, Vite)
packages/
  shared/          — Shared types, constants, utilities (@pos/shared)
```

### A.1.2 Backend Modules (Registered in `app.module.ts`)

| Module | Path | Purpose | Phase |
|---|---|---|---|
| `CommonModule` | `src/common/` | Shared entities, guards, decorators, utils | 0 |
| `AuthModule` | `src/modules/auth/` | JWT auth (email/password + PIN), RBAC | 1 |
| `SuperAdminModule` | `src/modules/super-admin/` | Platform admin operations | 1 |
| `BusinessModule` | `src/modules/business/` | Business admin: categories, products, employees, locations | 1 |
| `TerminalModule` | `src/modules/terminal/` | POS terminal: sales, payments, receipts, sync | 1 |
| `KdsModule` | `src/modules/kds/` | Kitchen Display System (WebSocket) | 1+10 |
| `HealthModule` | `src/modules/health/` | `/api/health` — pings DB + Redis | 0 |
| `JobModule` | `src/modules/jobs/` | BullMQ + Redis background jobs (@Global) | 7 |
| `CustomerModule` | `src/modules/customer/` | Customer CRUD, grades, labels, attributes, points | 6 |
| `PromotionModule` | `src/modules/promotion/` | Promotions, coupons, coupon extensions, PEX | 7+8 |
| `CommunicationsModule` | `src/modules/communications/` | Announcements, notifications, templates, campaigns | 9 |
| `RestaurantModule` | `src/modules/restaurant/` | Dining areas, tables, table sessions, floor plan | 10 |
| `ReportsModule` | `src/modules/reports/` | 26 report definitions across 4 generators | 10.5 |

### A.1.3 API Surfaces

| Prefix | Auth | Audience |
|---|---|---|
| `/api/auth/*` | Public (login), JWT (profile) | All users |
| `/api/super/*` | JWT, role=`super_admin` | Platform admin |
| `/api/business/*` | JWT, role=`owner`/`manager`/`employee`, scoped by `business_id` | Business dashboard |
| `/api/terminal/*` | JWT (PIN login), includes `terminal_id` + `location_id` | POS terminal |
| `/api/public/*` | No auth | Customer-facing (opt-out) |
| `/api/webhooks/*` | Provider signature verification | External providers |

### A.1.4 Multi-Tenancy (NON-NEGOTIABLE)

- Every table has `business_id UUID NOT NULL` FK → `businesses(id)` [XCC-001]
- Every `/api/business/` and `/api/terminal/` endpoint scopes by JWT's `business_id` [XCC-002]
- Cross-tenant access returns **404**, never 403 (avoids leaking existence)
- Every test suite must include a cross-tenant access test

### A.1.5 TVA Compliance (NON-NEGOTIABLE)

- Morocco Finance Law 50-25: rates 0% / 7% / 10% / 20%
- Per-line TTC stored is POST-discount [XCC-010]
- Order-level discounts distributed proportionally with banker's rounding [XCC-011]
- Discount pipeline: grade → promotion → coupon (fixed order) [XCC-017]
- Points are NEVER a payment method, only a discount [XCC-014]
- TVA reports use calendar date; ops reports use settlement cutoff [XCC-018]

### A.1.6 Background Jobs

- BullMQ + Redis, routed through `JobModule` [XCC-050]
- `background_jobs` table with concurrency locks via `unique_lock_key` [XCC-051/052]
- Job status: `GET /api/business/jobs/:id` [XCC-055]
- Dead-letter: `GET /api/super/jobs/dead-letter` [XCC-056]
- Retry: `POST /api/super/jobs/:id/retry` [XCC-057]

### A.1.7 Permissions

- `users.permissions` JSONB column [XCC-060]
- `userHasPermission(user, key)` helper — never read the column directly
- New permission keys do not require migrations

### A.1.8 Feature Flags

- `business_type_features` table: per-business-type toggles
- `business_custom_authority`: per-business overrides by Super Admin
- Effective resolution: type defaults + custom overlay, cached 5 min [ADM-022]

### A.1.9 WebSocket Events

`EventGateway` with rooms:
- `kds:{business_id}` — KDS screen
- `floor:{business_id}` — Floor plan / terminal
- `oss:{location_id}` — Order Status Screen (public)
- `dashboard:{business_id}` — Dashboard real-time

---

## A.2 Core Data Models (Built & Running)

### A.2.1 Platform Entities

| Entity | Table | Module | Status |
|---|---|---|---|
| `SuperAdmin` | `super_admins` | Auth | ✅ Built |
| `BusinessType` | `business_types` | SuperAdmin | ✅ Built |
| `BusinessTypeFeature` | `business_type_features` | SuperAdmin | ✅ Built |
| `Business` | `businesses` | SuperAdmin/Business | ✅ Built |
| `Location` | `locations` | Business | ✅ Built |
| `Terminal` | `terminals` | SuperAdmin | ✅ Built |
| `User` | `users` | Auth/Business | ✅ Built |
| `Subscription` | `subscriptions` | SuperAdmin | ✅ Built |
| `AuditLog` | `audit_logs` | Common | ✅ Built |
| `BackgroundJob` | `background_jobs` | Jobs | ✅ Built |

### A.2.2 Catalogue Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `Category` | `categories` | `business_id`, `name`, `sort_order`, `is_active`, `default_tva_rate` | ✅ Built |
| `Product` | `products` | `business_id`, `category_id`, `name`, `price`, `cost_price`, `sku`, `image_url`, `tva_rate`, `tva_exempt`, `is_sold_out`, `is_active`, `sort_order` | ✅ Built |
| `ProductVariant` | `product_variants` | `product_id`, `name`, `price_override`, `sku`, `is_sold_out`, `is_active` | ✅ Built |
| `ModifierGroup` | `modifier_groups` | `business_id`, `name`, `is_required`, `max_selections`, `sort_order` | ✅ Built |
| `Modifier` | `modifiers` | `modifier_group_id`, `name`, `price`, `is_active` | ✅ Built |
| `ProductModifierGroup` | `product_modifier_groups` | `product_id`, `modifier_group_id` (join) | ✅ Built |

### A.2.3 Transaction Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `Transaction` | `transactions` | `business_id`, `location_id`, `terminal_id`, `user_id`, `transaction_number`, `invoice_number`, `subtotal`, `tax_amount`, `total`, `total_ht`, `total_tva`, `total_ttc`, `discount_total`, `status`, `order_status`, `payment_method`, `customer_id`, `points_earned`, `points_redeemed`, `table_session_id` | ✅ Built |
| `TransactionItem` | `transaction_items` | `transaction_id`, `product_id`, `variant_id`, `product_name`, `quantity`, `unit_price`, `line_total`, `tva_rate`, `item_ht`, `item_tva`, `item_ttc`, `discount_amount`, `modifiers_json` | ✅ Built |
| `Void` | `voids` | `transaction_id`, `user_id`, `reason` | ✅ Built |
| `Refund` | `refunds` | `transaction_id`, `amount`, `reason` | ✅ Built |
| `SyncQueue` | `sync_queue` | `terminal_id`, `operation`, `payload`, `status` | ✅ Built |
| `ClockEntry` | `clock_entries` | `user_id`, `terminal_id`, `clock_in`, `clock_out` | ✅ Built |

### A.2.4 Customer & Loyalty Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `Customer` | `customers` | `business_id`, `customer_code`, `phone`, `email`, `first_name`, `last_name`, `birthday`, `gender`, `address`, `grade_id`, `points_balance`, `lifetime_points`, `is_active`, `consent_marketing`, `notes` | ✅ Built |
| `CustomerGrade` | `customer_grades` | `business_id`, `name`, `min_points`, `discount_percent`, `points_multiplier`, `color_hex`, `sort_order`, `is_active` | ✅ Built |
| `CustomerLabel` | `customer_labels` | `business_id`, `name`, `color_hex`, `is_active` | ✅ Built |
| `CustomerLabelAssignment` | `customer_label_assignments` | `customer_id`, `label_id` (composite PK) | ✅ Built |
| `CustomerAttribute` | `customer_attributes` | `business_id`, `key`, `label`, `data_type`, `enum_options`, `is_required` | ✅ Built |
| `CustomerAttributeValue` | `customer_attribute_values` | `customer_id`, `attribute_id` (composite PK), `value` | ✅ Built |
| `CustomerPointsHistory` | `customer_points_history` | `business_id`, `customer_id`, `delta`, `balance_after`, `source`, `transaction_id`, `adjusted_by_user_id`, `reason` | ✅ Built |

### A.2.5 Promotion & Coupon Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `Promotion` | `promotions` | `business_id`, `code`, `name`, `promotion_type`, `value`, `target_category_id`, `target_product_id`, `start_date`, `end_date`, `valid_date_type`, `valid_dates`, `day_type`, `time_periods`, `target_audience`, `target_grade_ids`, `target_label_ids`, `max_total_uses`, `max_uses_per_customer`, `current_uses`, `status` | ✅ Built |
| `PromotionRedemption` | `promotion_redemptions` | `business_id`, `promotion_id`, `transaction_id`, `customer_id`, `discount_applied` | ✅ Built |
| `CouponType` | `coupon_types` | `business_id`, `code`, `name`, `discount_type`, `discount_value`, `free_item_product_id`, `min_order_total_ttc`, `applicable_category_ids`, `applicable_product_ids`, `validity_days_from_issue`, `share_case` | ✅ Built |
| `Coupon` | `coupons` | `business_id`, `coupon_type_id`, `coupon_code`, `customer_id`, `issued_at`, `issue_source`, `expires_at`, `redeemed_at`, `redeemed_in_transaction_id`, `status` | ✅ Built |
| `CouponRedemption` | `coupon_redemptions` | `business_id`, `coupon_id`, `transaction_id`, `customer_id`, `discount_applied` | ✅ Built |
| `DiscountWriteOff` | `discount_write_offs` | `business_id`, `transaction_id`, `terminal_id`, `coupon_id`, `written_off_amount`, `reason` | ✅ Built |

### A.2.6 Points Exchange Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `PointsExchangeRule` | `points_exchange_rules` | `business_id`, `name`, `point_value`, `rule_type`, `rule_start_date`, `rule_end_date`, `total_redemptions_limit`, `per_customer_limit`, `current_redemptions`, `is_active` | ✅ Built |
| `PointsExchangeRuleDetail` | `points_exchange_rule_details` | `rule_id`, `coupon_type_id`, `product_id`, `variant_id`, `quantity_per_redemption`, `discount_amount_mad` | ✅ Built |
| `PointsExchangeRedemption` | `points_exchange_redemptions` | `business_id`, `rule_id`, `customer_id`, `points_spent`, `granted_coupon_id`, `granted_in_transaction_id` | ✅ Built |

### A.2.7 Communications Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `PlatformAnnouncement` | `platform_announcements` | `title`, `body`, `severity`, `target_business_type_ids`, `target_business_ids`, `display_on_homepage`, `display_until` | ✅ Built |
| `UserAnnouncementDismissal` | `user_announcement_dismissals` | `user_id`, `announcement_id` (composite PK) | ✅ Built |
| `BusinessAnnouncement` | `business_announcements` | `business_id`, `title`, `body`, `severity`, `target_role`, `target_location_ids`, `is_active`, `display_until` | ✅ Built |
| `NotificationChannel` | `notification_channels` | `business_id`, `channel` (composite PK), `provider`, `api_key_encrypted`, `sender_id`, `balance_cached` | ✅ Built |
| `NotificationTemplate` | `notification_templates` | `business_id`, `name`, `channel`, `subject`, `body_template`, `is_transactional`, `placeholders` | ✅ Built |
| `NotificationSend` | `notification_sends` | `business_id`, `template_id`, `channel`, `customer_id`, `recipient_address`, `status`, `opt_out_token`, `provider_message_id` | ✅ Built |

### A.2.8 Restaurant Entities

| Entity | Table | Key Columns | Status |
|---|---|---|---|
| `DiningArea` | `dining_areas` | `business_id`, `location_id`, `name`, `description`, `sort_order`, `is_active` | ✅ Built |
| `TableType` | `table_types` | `business_id`, `name`, `default_capacity`, `is_active` | ✅ Built |
| `RestaurantTable` | `tables` | `business_id`, `location_id`, `area_id`, `table_type_id`, `table_number`, `capacity`, `position_x`, `position_y`, `qr_code`, `is_active` | ✅ Built |
| `TableSession` | `table_sessions` | `business_id`, `location_id`, `table_id`, `opened_at`, `opened_by_user_id`, `closed_at`, `closed_in_transaction_id`, `customer_id`, `guest_count`, `expected_split_count`, `partial_payment`, `notes`, `status` | ✅ Built |
| `TableSessionItem` | `table_session_items` | `business_id`, `table_session_id`, `product_id`, `variant_id`, `customer_id`, `quantity`, `unit_price_ttc`, `modifiers_json`, `notes`, `added_by_user_id`, `kds_status` | ✅ Built |

---

## A.3 Core Data Models (Spec'd, Not Yet Built)

These are defined in Extension Spec v1.1 §8–§12, §13. They have full column definitions and endpoint contracts but no code yet.

### A.3.1 Inventory & Stock Entities (Phase 11–12)

| Entity | Table | Key Columns | Spec Ref |
|---|---|---|---|
| `Warehouse` | `warehouses` | `business_id`, `name`, `code`, `address`, `manager_user_id`, `is_central`, `linked_location_id`, `is_active` | §8.2.1 |
| `Vendor` | `vendors` | `business_id`, `code`, `name`, `contact_name`, `contact_phone`, `contact_email`, `address`, `ice_number`, `if_number`, `payment_terms_days`, `notes`, `is_active` | §8.2.2 |
| `VendorCheckDetail` | `vendor_check_details` | `business_id`, `vendor_id`, `check_date`, `checked_by_user_id`, `quality_score`, `delivery_score`, `price_score`, `notes`, `attachments_json` | §8.2.3 |
| `Brand` | `brands` | `business_id`, `name`, `code`, `logo_url`, `description`, `is_active` | §8.2.4 |
| `NutritionInfo` | `nutrition_info` | `business_id`, `product_id` (UNIQUE), `serving_size_g`, `calories_kcal`, `protein_g`, `carbs_g`, `sugar_g`, `fat_g`, `saturated_fat_g`, `fiber_g`, `sodium_mg`, `allergens`, `is_vegetarian`, `is_vegan`, `is_halal` | §8.2.5 |
| `StockBatch` | `stock_batches` | `business_id`, `warehouse_id`, `product_id`, `variant_id`, `batch_code`, `quantity_initial`, `quantity_remaining`, `unit_cost`, `unit_cost_tva_rate`, `unit_of_measure`, `received_at`, `expires_at`, `vendor_id`, `purchase_order_id`, `is_active` | §8.2.6 |
| `StockMovement` | `stock_movements` | `business_id`, `batch_id`, `movement_type`, `quantity`, `reference_type`, `reference_id`, `source_origin`, `performed_by_user_id`, `notes` | §8.2.7 |
| `PurchaseOrder` | `purchase_orders` | `business_id`, `po_number`, `vendor_id`, `warehouse_id`, `parent_business_id`, `status`, `order_date`, `expected_delivery_date`, `subtotal_ht`, `total_tva`, `total_ttc`, `created_by_user_id`, `approved_by_user_id`, `notes` | §8.2.8 |
| `PurchaseOrderItem` | `purchase_order_items` | `purchase_order_id`, `product_id`, `variant_id`, `quantity_ordered`, `quantity_received`, `unit_of_measure`, `unit_cost_ht`, `tva_rate`, `line_total_ht`, `line_total_tva`, `line_total_ttc` | §8.2.9 |
| `StockTemplate` | `stock_templates` | `business_id`, `name`, `default_vendor_id`, `default_warehouse_id`, `is_active` | §8.2.10 |
| `StockTemplateItem` | `stock_template_items` | `template_id`, `product_id`, `variant_id`, `default_quantity` | §8.2.11 |
| `StockDiscrepancyAlert` | `stock_discrepancy_alerts` | `business_id`, `batch_id`, `warehouse_id`, `product_id`, `expected_remaining`, `actual_remaining`, `discrepancy_quantity`, `source`, `resolved_at`, `resolved_by_user_id`, `resolution_notes` | §8.2.12 |

**Column additions to existing tables (Phase 11–12):**

| Table | New Column | Type | Notes | Spec Ref |
|---|---|---|---|---|
| `products` | `brand_id` | UUID NULL | FK → brands | INV-MOD-001 |
| `products` | `default_vendor_id` | UUID NULL | FK → vendors | INV-MOD-001 |
| `products` | `unit_of_measure` | VARCHAR(20) DEFAULT 'unit' | | INV-MOD-001 |
| `products` | `track_stock` | BOOLEAN DEFAULT false | When true, sales decrement batches | INV-MOD-001 |

### A.3.2 Chain & Franchise Entities (Phase 13)

| Entity | Table | Key Columns | Spec Ref |
|---|---|---|---|
| `UserBusinessRole` | `user_business_roles` | `user_id`, `business_id` (composite PK), `role`, `granted_by_user_id`, `granted_at` | CHN-MOD-004 |
| `ChainSyncConfig` | `chain_sync_configs` | `parent_business_id`, `sync_categories`, `sync_products`, `sync_variants`, `sync_modifiers`, `sync_prices`, `auto_sync_on_change`, `child_business_ids` | CHN-020 |

**Column additions (Phase 13):**

| Table | New Column | Type | Notes |
|---|---|---|---|
| `businesses` | `parent_business_id` | UUID NULL | Self-FK, 2-level only |
| `businesses` | `chain_role` | VARCHAR(20) DEFAULT 'standalone' | `standalone`/`parent`/`child` |
| `users` | `accessible_business_ids` | UUID[] | Multi-business access |
| `categories`, `products`, `product_variants`, `modifier_groups`, `modifiers` | `synced_from_parent_id` | UUID NULL | Chain sync tracking |

### A.3.3 Recommendation Entities (Phase 14)

| Entity | Table | Key Columns | Spec Ref |
|---|---|---|---|
| `RecommendationTemplate` | `recommendation_templates` | `business_id`, `name`, `template_type`, `time_window_start`, `time_window_end`, `applicable_days_of_week`, `target_grade_ids`, `min_recommendations`, `max_recommendations`, `whole_price_tier`, `applicable_location_ids`, `is_active`, `display_order` | §10.2.1 |
| `RecommendationTemplateItem` | `recommendation_template_items` | `template_id`, `product_id`, `variant_id`, `priority`, `is_active` | §10.2.2 |

**Column additions (Phase 14):**

| Table | New Column | Type | Notes |
|---|---|---|---|
| `products` | `whole_price_1` through `whole_price_4` | NUMERIC(12,2) NULL | Alternative price tiers |

### A.3.4 Platform Admin Entities (Phase 15)

| Entity | Table | Key Columns | Spec Ref |
|---|---|---|---|
| `TradeCategory` | `trade_categories` | `parent_id` (self-FK), `name`, `code`, `default_business_type_id`, `default_settings_json`, `is_active`, `sort_order` | §12.2.1 |
| `Courier` | `couriers` | `name`, `code`, `logo_url`, `api_endpoint`, `tracking_url_template`, `supports_cash_on_delivery`, `is_active` | §12.2.2 |
| `BusinessCourierLink` | `business_courier_links` | `business_id`, `courier_id` (composite PK), `account_credentials_json`, `is_default` | §12.2.3 |
| `BusinessCustomAuthority` | `business_custom_authority` | `business_id` (PK), `feature_overrides_json`, `permission_overrides_json`, `set_by_super_admin_id`, `notes` | §12.2.4 |
| `VersionLogMenu` | `version_log_menus` | `name`, `sort_order` | §12.2.5 |
| `VersionLogEntry` | `version_log_entries` | `menu_id`, `version`, `description`, `published_at`, `expires_at` | §12.2.6 |
| `SystemParameter` | `system_parameters` | `key` (UNIQUE), `param_type`, `value`, `description`, `is_overridable_per_business` | §12.2.7 |

**Column additions (Phase 15):**

| Table | New Column | Type | Notes |
|---|---|---|---|
| `businesses` | `trade_category_id` | UUID NULL | FK → trade_categories |
| `businesses` | `daily_settlement_cutoff_time` | TIME DEFAULT '02:00' | When "today" rolls over for ops reports |

---

## A.4 Existing API Endpoints (Built)

### A.4.1 Auth (`/api/auth/*`)

| Method | Path | Purpose | Spec |
|---|---|---|---|
| POST | `/auth/login` | Email/password login | SRS |
| POST | `/auth/super-admin/login` | Super Admin login | SRS |
| POST | `/auth/pin-login` | Terminal PIN login | SRS |
| POST | `/auth/refresh` | Refresh JWT | SRS |
| GET | `/auth/me` | Get profile | SRS |
| PUT | `/auth/change-password` | Change password | SRS |
| POST | `/auth/logout` | Logout | SRS |

### A.4.2 Super Admin (`/api/super/*`)

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/super/businesses` | List businesses (paginated) | SRS |
| POST | `/super/businesses` | Create business + owner + subscription + location | SRS |
| GET | `/super/businesses/:id` | Get business detail | SRS |
| PUT | `/super/businesses/:id` | Update business | SRS |
| PATCH | `/super/businesses/:id/status` | Toggle active status | SRS |
| GET | `/super/business-types` | List business types | SRS |
| POST | `/super/business-types` | Create business type | SRS |
| PUT | `/super/business-types/:id/features` | Update feature flags | SRS |
| GET | `/super/terminals` | List all terminals | SRS |
| POST | `/super/terminals` | Create terminal | SRS |
| PATCH | `/super/terminals/:id/assign` | Assign terminal to location | SRS |
| GET | `/super/terminals/health` | Terminal health status | SRS |
| GET | `/super/subscriptions` | List subscriptions | SRS |
| POST | `/super/subscriptions` | Create subscription | SRS |
| PUT | `/super/subscriptions/:id` | Update subscription | SRS |
| GET | `/super/dashboard/stats` | Dashboard aggregate stats | SRS |
| GET | `/super/audit-logs` | Audit log list (paginated) | SRS |
| GET/POST/PATCH/DELETE | `/super/announcements[/:id]` | Platform announcements CRUD | COM-001–004 |
| GET | `/super/jobs/dead-letter` | Dead-letter job list | XCC-056 |
| POST | `/super/jobs/:id/retry` | Retry dead-letter job | XCC-057 |

### A.4.3 Business Admin (`/api/business/*`) — Catalogue

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/business/categories` | List categories | SRS |
| POST | `/business/categories` | Create category | SRS |
| PATCH | `/business/categories/:id` | Update category | SRS |
| DELETE | `/business/categories/:id` | Delete category | SRS |
| GET | `/business/products` | List products | SRS |
| POST | `/business/products` | Create product | SRS |
| GET | `/business/products/:id` | Get product detail | SRS |
| PATCH | `/business/products/:id` | Update product | SRS |
| DELETE | `/business/products/:id` | Delete product | SRS |
| GET | `/business/employees` | List employees | SRS |
| GET | `/business/locations` | List locations | SRS |

### A.4.4 Business Admin — Customers & Loyalty

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/business/customers` | List (paginated, filterable) | CUST-001 |
| GET | `/business/customers/:id` | Detail + stats | CUST-002 |
| POST | `/business/customers` | Create (auto-code) | CUST-003 |
| PATCH | `/business/customers/:id` | Update | CUST-004 |
| DELETE | `/business/customers/:id` | Soft-delete | CUST-005 |
| POST | `/business/customers/:id/anonymise` | GDPR anonymise | CUST-006 |
| GET | `/business/customers/dashboard-summary` | Loyalty dashboard | CUST-010 |
| GET | `/business/customer-grades` | List grades | CUST-020 |
| POST | `/business/customer-grades` | Create grade | CUST-021 |
| PATCH | `/business/customer-grades/:id` | Update grade | CUST-022 |
| DELETE | `/business/customer-grades/:id` | Delete (demote) | CUST-023 |
| GET | `/business/customer-labels` | List labels | CUST-030 |
| POST | `/business/customer-labels` | Create label | CUST-031 |
| PATCH | `/business/customer-labels/:id` | Update label | CUST-032 |
| DELETE | `/business/customer-labels/:id` | Delete (cascade) | CUST-033 |
| PUT | `/business/customers/:id/labels` | Assign labels (replace set) | CUST-034 |
| GET | `/business/customer-attributes` | List attribute definitions | CUST-040 |
| POST | `/business/customer-attributes` | Create attribute | CUST-041 |
| PATCH | `/business/customer-attributes/:id` | Update attribute | CUST-042 |
| DELETE | `/business/customer-attributes/:id` | Delete (cascade) | CUST-043 |
| GET | `/business/customers/:id/attributes` | Get customer's values | CUST-044 |
| PUT | `/business/customers/:id/attributes` | Set customer's values | CUST-045 |
| GET | `/business/customers/:id/points-history` | Points history | CUST-050 |
| POST | `/business/customers/:id/points-adjustment` | Manual adjustment | CUST-051 |
| POST | `/business/customers/import-grades` | Batch CSV import | CUST-052 |
| GET | `/business/jobs/:id` | Job status polling | XCC-055 |
| GET | `/business/reports/discount-write-offs` | Write-off report | XCC-040 |

### A.4.5 Business Admin — Promotions & Coupons

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/business/promotions` | List promotions | PROM-001 |
| GET | `/business/promotions/:id` | Detail + stats | PROM-002 |
| POST | `/business/promotions` | Create | PROM-003 |
| PATCH | `/business/promotions/:id` | Update (locked fields) | PROM-004 |
| POST | `/business/promotions/:id/activate` | Activate | PROM-005 |
| POST | `/business/promotions/:id/pause` | Pause | PROM-006 |
| POST | `/business/promotions/:id/archive` | Archive | PROM-007 |
| GET | `/business/reports/promotions` | Promotion report | PROM-050 |
| GET | `/business/coupon-types` | List coupon types | CPN-001 |
| POST | `/business/coupon-types` | Create coupon type | CPN-002 |
| PATCH | `/business/coupon-types/:id` | Update (locked fields) | CPN-003 |
| POST | `/business/coupon-types/:id/clone` | Clone | CPN-004 |
| DELETE | `/business/coupon-types/:id` | Deactivate | CPN-005 |
| POST | `/business/coupons/issue` | Issue coupon(s) | CPN-020 |
| POST | `/business/coupons/bulk-issue` | Bulk issue (BullMQ) | CPN-021 |
| POST | `/business/coupons/issue-to-segment` | Segment issue | CPN-022 |
| POST | `/business/coupons/:id/void` | Void coupon | CPN-033 |
| GET | `/business/reports/coupons` | Coupon report | CPN-040 |

### A.4.6 Business Admin — Points Exchange

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/business/points-exchange-rules` | List rules | PEX-001 |
| GET | `/business/points-exchange-rules/:id` | Rule detail | PEX-002 |
| GET | `/business/points-exchange-rules/check-point-value` | Duplicate check | PEX-003 |
| POST | `/business/points-exchange-rules` | Create rule | PEX-004 |
| PATCH | `/business/points-exchange-rules/:id` | Update rule | PEX-005 |
| DELETE | `/business/points-exchange-rules/:id` | Deactivate | PEX-006 |
| GET | `/business/points-exchange-rules/redeemable-for-customer` | List redeemable | PEX-010 |
| POST | `/business/points-exchange-rules/:id/redeem` | Redeem (atomic) | PEX-011 |
| GET | `/business/reports/points-exchange` | Exchange report | PEX-020 |

### A.4.7 Business Admin — Communications

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/business/platform-announcements` | Active announcements | COM-005 |
| POST | `/business/platform-announcements/:id/dismiss` | Dismiss | COM-006 |
| GET/POST/PATCH/DELETE | `/business/announcements[/:id]` | Business announcements CRUD | COM-010 |
| GET | `/business/announcements/for-me` | My announcements | COM-011 |
| GET | `/business/notifications/channels` | Channel config (redacted) | COM-020 |
| PUT | `/business/notifications/channels` | Update channel config | COM-021 |
| POST | `/business/notifications/channels/test` | Test channel | COM-022 |
| POST | `/business/notifications/sms/refresh-balance` | Refresh SMS balance | COM-030 |
| GET | `/business/notifications/sms/balance` | Cached balance | COM-031 |
| GET/POST/PATCH/DELETE | `/business/notifications/templates[/:id]` | Template CRUD | COM-040–043 |
| POST | `/business/notifications/templates/:id/preview` | Render preview | COM-044 |
| POST | `/business/notifications/send` | Send single | COM-050 |
| POST | `/business/notifications/send-to-segment` | Bulk campaign | COM-051 |
| GET | `/business/notifications/sends` | Send history | COM-052 |

### A.4.8 Business Admin — Restaurant

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET/POST/PATCH/DELETE | `/business/dining-areas[/:id]` | Dining area CRUD | RST-001–004 |
| GET/POST/PATCH/DELETE | `/business/table-types[/:id]` | Table type CRUD | RST-010–013 |
| GET/POST/PATCH/DELETE | `/business/tables[/:id]` | Table CRUD | RST-020–023 |

### A.4.9 Business Admin — Reports (26 reports)

| Method | Path | Report | Spec |
|---|---|---|---|
| GET | `/business/reports/daily-summary` | Daily sales summary | Reports |
| GET | `/business/reports/hourly-heatmap` | Hourly heatmap | Reports |
| GET | `/business/reports/payment-method` | Payment method breakdown | Reports |
| GET | `/business/reports/product-mix` | Product mix | Reports |
| GET | `/business/reports/category-mix` | Category mix | Reports |
| GET | `/business/reports/employee-performance` | Employee performance | Reports |
| GET | `/business/reports/location-comparison` | Location comparison | Reports |
| GET | `/business/reports/top-customers` | Top customers | Reports |
| GET | `/business/reports/customer-growth` | Customer growth | Reports |
| GET | `/business/reports/grade-distribution` | Grade distribution | Reports |
| GET | `/business/reports/points-summary` | Points summary | Reports |
| GET | `/business/reports/retention-cohort` | Retention cohort | Reports |
| GET | `/business/reports/customer-spend-detail` | Customer spend detail | Reports |
| GET | `/business/reports/void-report` | Void report | Reports |
| GET | `/business/reports/refund-report` | Refund report | Reports |
| GET | `/business/reports/kds-performance` | KDS performance | Reports |
| GET | `/business/reports/table-utilization` | Table utilization | Reports |
| GET | `/business/reports/tva-declaration` | TVA declaration | TVA-030 |
| GET | `/business/reports/daily-close` | Daily close | Reports |
| GET | `/business/reports/invoice-register` | Invoice register | Reports |
| GET | `/business/reports/tva-by-rate` | TVA by rate band | Reports |
| GET | `/business/reports/promotions` | Promotion report | PROM-050 |
| GET | `/business/reports/coupons` | Coupon report | CPN-040 |
| GET | `/business/reports/discount-write-offs` | Write-off report | XCC-040 |
| GET | `/business/reports/points-exchange` | Points exchange | PEX-020 |

### A.4.10 Terminal (`/api/terminal/*`)

| Method | Path | Purpose | Spec |
|---|---|---|---|
| GET | `/terminal/customers/lookup` | Customer lookup by phone | CUST-100 |
| POST | `/terminal/customers/quick-add` | Quick-add customer | CUST-101 |
| POST | `/terminal/promotions/evaluate` | Evaluate cart promotions | PROM-020 |
| GET | `/terminal/coupons/validate` | Validate coupon code | CPN-030 |
| GET | `/terminal/tables/floor-plan` | Floor plan with live status | RST-030 |
| POST | `/terminal/tables/:id/open` | Open table session | RST-031 |
| POST | `/terminal/table-sessions/:id/items` | Add items to table | RST-032 |
| PATCH | `/terminal/table-session-items/:id` | Modify table item | RST-033 |
| DELETE | `/terminal/table-session-items/:id` | Remove table item | RST-034 |
| POST | `/terminal/table-sessions/:id/close` | Close → checkout payload | RST-035 |
| POST | `/terminal/table-sessions/:id/split` | Split bill | RST-036 |
| POST | `/terminal/table-session-items/transfer` | Transfer items between tables | RST-037 |
| POST | `/terminal/table-sessions/:id/cancel` | Cancel/partial close | RST-038 |
| POST | `/terminal/kds/items/:id/status` | KDS status update | RST-MOD-001 |
| GET | `/terminal/kds/items` | KDS items (table + direct) | RST-MOD-001 |
| GET | `/terminal/oss/items` | OSS public items | OSS |

### A.4.11 Public & Webhooks

| Method | Path | Purpose | Spec |
|---|---|---|---|
| POST | `/public/notifications/opt-out` | Customer opt-out | COM-060 |
| POST | `/webhooks/notifications/:provider` | Provider status webhook | COM-053 |
| GET | `/health` | Health check | Phase 0 |

---

## A.5 Existing Utility Services

| Service | Path | Purpose |
|---|---|---|
| `bankersRound(value, decimals)` | `common/utils/money.ts` | Banker's rounding to N decimals |
| `distributeDiscount(items, totalDiscount)` | `common/utils/money.ts` | XCC-011 proportional distribution |
| `resolveTvaRate(product, category)` | `common/utils/tva.ts` | Product override → category default |
| `DiscountPipelineService` | `common/services/discount-pipeline.service.ts` | Grade→promo→coupon pipeline |
| `PromotionEvaluatorService` | `modules/promotion/` | 11-step promotion filter chain |
| `SimplTvaService` | `common/services/simpl-tva.service.ts` | DGI SIMPL-TVA stub |
| `JobService` | `modules/jobs/job.service.ts` | BullMQ job creation + status |
| `RedisLockService` | `modules/jobs/redis-lock.service.ts` | Distributed locking |
| `NotificationProviderService` | `modules/communications/` | Stub for SMS/email/WhatsApp send |
| `buildReceipt(transaction, options)` | `common/utils/receipt-builder.ts` | Structured receipt with TVA fields |
| `userHasPermission(user, key)` | `common/utils/permissions.ts` | JSONB permission check |
| `EventGateway` | `modules/kds/event.gateway.ts` | WebSocket room-based event emitter |

---

## A.6 Existing Spec'd Endpoints (Not Yet Built)

The full endpoint catalogue for Phases 11–15 is in Extension Spec §18. There are ~160 new endpoints covering INV, CHN, REC, COM extensions, and ADM. They follow the same patterns as the built endpoints above. Developers should reference Extension Spec §18 directly for these.

---

# PART B — NEW ADDITIONS

These are genuinely new features extracted from external system analysis. Each is adapted to fit the existing architecture: naming follows existing conventions, all tables include `business_id`, all endpoints scope by JWT, all new permission keys use the `users.permissions` JSONB pattern.

---

## B.1 Units of Measure Reference Table

**Requirement ID:** `[EXT-INV-001]`
**Priority:** Low
**Target:** Phase 11 migration
**Rationale:** The existing spec hardcodes unit values as VARCHAR strings (`unit`, `kg`, `g`, `l`, `ml`). A reference table allows businesses to define custom units (tablets, capsules, portions, servings, bunches) without schema changes.

### B.1.1 New Entity: `units_of_measure`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK → businesses |
| `name` | varchar(50) | Display name, e.g. "Kilogram", "Tablet", "Portion" |
| `abbreviation` | varchar(10) | Short form, e.g. "kg", "tab", "ptn" |
| `is_system` | boolean | Default false. True = seeded by migration, cannot be deleted |
| `is_active` | boolean | Default true |
| `sort_order` | int | Display order |

**Seed data (inserted by migration, `is_system = true`):**

| name | abbreviation |
|---|---|
| Unit | unit |
| Kilogram | kg |
| Gram | g |
| Litre | l |
| Millilitre | ml |

### B.1.2 Column Modifications

| Table | Column | Change |
|---|---|---|
| `stock_batches` | `unit_of_measure` | Keep as VARCHAR(20) for backward compat. Add nullable `unit_of_measure_id UUID` FK → `units_of_measure`. When `unit_of_measure_id` is set, it takes precedence; when null, fall back to the VARCHAR value. |
| `products` | `unit_of_measure` | Same pattern: add nullable `unit_of_measure_id UUID` FK. |
| `purchase_order_items` | `unit_of_measure` | Same pattern. |

### B.1.3 Endpoints

| Method | Path | Roles | Purpose | Spec |
|---|---|---|---|---|
| GET | `/api/business/units-of-measure` | owner, manager, employee | List units (for dropdowns) | EXT-INV-001 |
| POST | `/api/business/units-of-measure` | owner, manager | Create custom unit | EXT-INV-001 |
| PATCH | `/api/business/units-of-measure/:id` | owner, manager | Update | EXT-INV-001 |
| DELETE | `/api/business/units-of-measure/:id` | owner, manager | Delete (422 if `is_system=true`; 422 if in use by any batch/product) | EXT-INV-001 |

### B.1.4 Feature Flag

Uses existing `warehouses` feature flag — if a business has warehouse/stock features enabled, units-of-measure are available.

---

## B.2 Stock Adjustment Approval Workflow

**Requirement ID:** `[EXT-INV-010]` through `[EXT-INV-016]`
**Priority:** Medium
**Target:** Phase 12
**Rationale:** The existing INV-042 (`stock_batches/:id/adjust`) is a direct, immediate quantity correction. An approval workflow adds governance: the warehouse worker proposes an adjustment, the manager reviews and approves before inventory is affected. Gated by feature flag so businesses choosing the simpler flow are unaffected.

### B.2.1 New Feature Flag

| `feature_key` | Description | Default |
|---|---|---|
| `stock_adjustment_approval` | When enabled, stock adjustments require approval before posting. When disabled, INV-042 remains a direct adjustment. | disabled (all types) |

### B.2.2 New Entity: `stock_adjustments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK → businesses |
| `adjustment_number` | varchar(50) | Auto-generated, unique per business: `ADJ-YYYY-NNNNN` |
| `warehouse_id` | UUID | FK → warehouses |
| `status` | varchar(20) | `draft`, `pending_approval`, `approved`, `posted`, `rejected` |
| `reason` | text | Mandatory, min 10 chars |
| `proposed_by_user_id` | UUID | FK → users |
| `approved_by_user_id` | UUID | FK → users, nullable |
| `approved_at` | timestamptz | Nullable |
| `posted_at` | timestamptz | Nullable — when inventory was actually affected |
| `rejected_reason` | text | Nullable, set on rejection |
| `notes` | text | Optional |
| `created_at` | timestamptz | |

### B.2.3 New Entity: `stock_adjustment_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `adjustment_id` | UUID | FK → stock_adjustments |
| `product_id` | UUID | FK → products |
| `variant_id` | UUID | FK → product_variants, nullable |
| `batch_id` | UUID | FK → stock_batches |
| `proposed_delta` | numeric(12,3) | Positive (add) or negative (remove) |
| `current_quantity` | numeric(12,3) | Snapshot of `batch.quantity_remaining` at proposal time |
| `notes` | varchar(500) | Per-item notes |

### B.2.4 Endpoints

| Method | Path | Roles | Purpose | Spec |
|---|---|---|---|---|
| GET | `/api/business/stock-adjustments` | owner, manager, employee | List adjustments (paginated, filterable by status/warehouse/date) | EXT-INV-010 |
| GET | `/api/business/stock-adjustments/:id` | owner, manager, employee | Detail with items | EXT-INV-011 |
| POST | `/api/business/stock-adjustments` | owner, manager, employee (with `can_propose_stock_adjustment`) | Create draft with items | EXT-INV-012 |
| POST | `/api/business/stock-adjustments/:id/submit` | proposer or manager | Transition draft → pending_approval | EXT-INV-013 |
| POST | `/api/business/stock-adjustments/:id/approve` | owner, manager (with `can_approve_stock_adjustment`) | Transition pending_approval → approved | EXT-INV-014 |
| POST | `/api/business/stock-adjustments/:id/post` | owner, manager | Transition approved → posted. Atomically applies each item's delta to `stock_batches.quantity_remaining` and creates `stock_movements` rows with `movement_type = adjustment`, `reference_type = stock_adjustment`, `reference_id = adjustment.id` | EXT-INV-015 |
| POST | `/api/business/stock-adjustments/:id/reject` | owner, manager (with `can_approve_stock_adjustment`) | Transition pending_approval → rejected. Input: `{ "reason": "string" }` | EXT-INV-016 |

### B.2.5 Interaction with Existing INV-042

When `stock_adjustment_approval` feature is **disabled**: INV-042 (`POST /api/business/stock-batches/:id/adjust`) continues to work as-is — direct, immediate adjustment.

When `stock_adjustment_approval` feature is **enabled**: INV-042 returns `422 { error: "ADJUSTMENT_APPROVAL_REQUIRED", message: "Stock adjustments require approval when stock_adjustment_approval is enabled. Use POST /api/business/stock-adjustments to create a proposal." }`.

### B.2.6 New Permission Keys

| Key | Description | Default Roles |
|---|---|---|
| `can_propose_stock_adjustment` | Can create adjustment proposals | owner, manager, employee |
| `can_approve_stock_adjustment` | Can approve or reject proposals | owner, manager |

---

## B.3 Stock Transfer Documents

**Requirement ID:** `[EXT-INV-020]` through `[EXT-INV-025]`
**Priority:** Medium
**Target:** Phase 12
**Rationale:** The existing INV-044 handles single-batch transfers. A transfer document groups multiple items into one auditable, immutable record. The existing INV-044 mechanism becomes the internal engine that a transfer document calls when posted.

### B.3.1 New Entity: `stock_transfers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK → businesses |
| `transfer_number` | varchar(50) | Auto-generated: `TRF-YYYY-NNNNN`, unique per business |
| `source_warehouse_id` | UUID | FK → warehouses |
| `target_warehouse_id` | UUID | FK → warehouses |
| `status` | varchar(20) | `draft`, `posted`, `cancelled` |
| `notes` | text | Optional |
| `created_by_user_id` | UUID | FK → users |
| `posted_at` | timestamptz | Nullable |
| `posted_by_user_id` | UUID | FK → users, nullable |
| `created_at` | timestamptz | |

### B.3.2 New Entity: `stock_transfer_items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `transfer_id` | UUID | FK → stock_transfers |
| `product_id` | UUID | FK → products |
| `variant_id` | UUID | FK → product_variants, nullable |
| `batch_id` | UUID | FK → stock_batches |
| `quantity` | numeric(12,3) | Must be > 0 and ≤ batch's `quantity_remaining` at post time |
| `notes` | varchar(500) | Per-item notes |

### B.3.3 Endpoints

| Method | Path | Roles | Purpose | Spec |
|---|---|---|---|---|
| GET | `/api/business/stock-transfers` | owner, manager | List (paginated, filterable by status, warehouse, date) | EXT-INV-020 |
| GET | `/api/business/stock-transfers/:id` | owner, manager | Detail with items | EXT-INV-021 |
| POST | `/api/business/stock-transfers` | owner, manager | Create draft with items. Validates source ≠ target warehouse, all batches belong to source warehouse. | EXT-INV-022 |
| POST | `/api/business/stock-transfers/:id/post` | owner, manager | Post the transfer. Atomically: for each item, calls the existing INV-044 batch-transfer logic (decrement source, create batch at target, two `stock_movements` rows). Sets `status = posted`, `posted_at = NOW()`. Immutable after posting. | EXT-INV-023 |
| POST | `/api/business/stock-transfers/:id/cancel` | owner, manager | Cancel a draft. Only allowed when `status = draft`. Sets `status = cancelled`. | EXT-INV-024 |
| DELETE | `/api/business/stock-transfers/:id` | owner, manager | Delete a draft. Only allowed when `status = draft`. Hard delete. | EXT-INV-025 |

### B.3.4 Interaction with Existing INV-044

INV-044 (`POST /api/business/stock-batches/:id/transfer`) continues to work for single-batch ad-hoc transfers. The stock transfer document is a higher-level abstraction that uses INV-044's internal logic for each line item.

When a transfer document is posted, the resulting `stock_movements` rows have `reference_type = 'stock_transfer'` and `reference_id = transfer.id` (instead of `reference_type = 'transfer'` used by ad-hoc INV-044 calls).

### B.3.5 Feature Flag

Uses existing `warehouses` feature flag — transfers are only meaningful when warehouses are enabled.

---

## B.4 Vendor Payment Tracking

**Requirement ID:** `[EXT-INV-030]` through `[EXT-INV-037]`
**Priority:** High
**Target:** Phase 11 or 12
**Rationale:** The existing PO lifecycle tracks what was ordered and received but not what was paid. Without payment tracking, businesses reconcile vendor invoices manually. The `vendors.payment_terms_days` field implies this was always intended.

### B.4.1 New Entity: `vendor_payments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `business_id` | UUID | FK → businesses |
| `vendor_id` | UUID | FK → vendors |
| `purchase_order_id` | UUID | FK → purchase_orders, nullable (payment can be on-account without a PO) |
| `payment_number` | varchar(50) | Auto-generated: `VP-YYYY-NNNNN`, unique per business |
| `amount_paid` | numeric(12,2) | MAD |
| `payment_date` | date | When payment was made |
| `payment_method` | varchar(30) | `bank_transfer`, `cheque`, `cash`, `other` |
| `reference_number` | varchar(100) | Cheque number, wire reference, etc. |
| `notes` | text | Optional |
| `status` | varchar(20) | `pending`, `confirmed`, `voided` |
| `created_by_user_id` | UUID | FK → users |
| `confirmed_by_user_id` | UUID | FK → users, nullable |
| `confirmed_at` | timestamptz | Nullable |
| `created_at` | timestamptz | |

### B.4.2 Computed Fields on Purchase Orders

When a PO is queried via INV-071 (`GET /api/business/purchase-orders/:id`), the response **shall** include two additional computed fields:

| Field | Computation |
|---|---|
| `amount_paid` | `SUM(vendor_payments.amount_paid) WHERE purchase_order_id = :id AND status IN ('pending', 'confirmed')` |
| `balance_due` | `total_ttc - amount_paid` |

These are **not** stored columns — they are computed at query time via a LEFT JOIN aggregate.

### B.4.3 Endpoints

| Method | Path | Roles | Purpose | Spec |
|---|---|---|---|---|
| GET | `/api/business/vendor-payments` | owner, manager | List all payments (paginated, filterable by vendor, PO, status, date range) | EXT-INV-030 |
| GET | `/api/business/vendor-payments/:id` | owner, manager | Payment detail | EXT-INV-031 |
| POST | `/api/business/vendor-payments` | owner, manager | Create payment. Validates vendor exists, PO (if provided) belongs to vendor. | EXT-INV-032 |
| POST | `/api/business/vendor-payments/:id/confirm` | owner | Confirm payment. Sets `status = confirmed`, `confirmed_by_user_id`, `confirmed_at`. | EXT-INV-033 |
| POST | `/api/business/vendor-payments/:id/void` | owner | Void payment. Only allowed when `status != voided`. Sets `status = voided`. Input: `{ "reason": "string" }`. Logs to audit. | EXT-INV-034 |
| GET | `/api/business/vendors/:id/outstanding` | owner, manager | List POs for this vendor where `balance_due > 0`, ordered by `expected_delivery_date ASC` (oldest debt first) | EXT-INV-035 |
| GET | `/api/business/vendors/:id/payment-summary` | owner, manager | Total paid, total outstanding, payment count, average days-to-pay | EXT-INV-036 |

### B.4.4 Feature Flag

Uses existing `vendors` feature flag — if vendors are enabled, payments are available.

### B.4.5 New Permission Key

| Key | Description | Default Roles |
|---|---|---|
| `can_manage_vendor_payments` | Can create, confirm, and void vendor payments | owner, manager |

---

## B.5 New Reports

### B.5.1 COGS Report (Cost of Goods Sold)

**Requirement ID:** `[EXT-RPT-001]`
**Priority:** High
**Target:** Phase 12 (requires stock_batches and stock_movements to exist)

| Method | Path | Roles | Spec |
|---|---|---|---|
| GET | `/api/business/reports/cogs` | owner, manager | EXT-RPT-001 |

**Query params:** `from_date`, `to_date`, `warehouse_id` (optional), `category_id` (optional)

**Data source:** `stock_movements WHERE movement_type = 'sale'` joined with `stock_batches` (for `unit_cost`) and `transactions` (for `total_ttc` as revenue).

**Output:**

```json
{
  "from_date": "2026-04-01",
  "to_date": "2026-04-30",
  "summary": {
    "total_revenue_ttc": 125000.00,
    "total_cogs": 78500.00,
    "gross_margin": 46500.00,
    "gross_margin_percent": 37.20
  },
  "by_product": [
    {
      "product_id": "uuid",
      "product_name": "...",
      "category_name": "...",
      "quantity_sold": 350,
      "revenue_ttc": 17500.00,
      "cost": 10500.00,
      "margin": 7000.00,
      "margin_percent": 40.00
    }
  ],
  "by_category": [
    {
      "category_id": "uuid",
      "category_name": "...",
      "revenue_ttc": 45000.00,
      "cost": 28000.00,
      "margin": 17000.00,
      "margin_percent": 37.78
    }
  ]
}
```

**Integration:** Add as a new method in `ReportsModule` using the existing generator pattern. Register `'cogs'` as a new report ID in the dispatcher.

### B.5.2 Vendor Balance Report

**Requirement ID:** `[EXT-RPT-002]`
**Priority:** High
**Target:** Phase 11/12 (requires vendor_payments)

| Method | Path | Roles | Spec |
|---|---|---|---|
| GET | `/api/business/reports/vendor-balance` | owner, manager | EXT-RPT-002 |

**Query params:** `as_of_date` (optional, defaults to today)

**Output:**

```json
{
  "as_of_date": "2026-04-30",
  "vendors": [
    {
      "vendor_id": "uuid",
      "vendor_name": "...",
      "total_invoiced": 50000.00,
      "total_paid": 35000.00,
      "balance_due": 15000.00,
      "oldest_unpaid_date": "2026-03-15"
    }
  ],
  "totals": {
    "total_invoiced": 200000.00,
    "total_paid": 155000.00,
    "total_outstanding": 45000.00
  }
}
```

### B.5.3 Bill Aging Report

**Requirement ID:** `[EXT-RPT-003]`
**Priority:** High
**Target:** Phase 11/12 (requires vendor_payments)

| Method | Path | Roles | Spec |
|---|---|---|---|
| GET | `/api/business/reports/bill-aging` | owner, manager | EXT-RPT-003 |

**Query params:** `as_of_date` (optional, defaults to today)

**Output:**

```json
{
  "as_of_date": "2026-04-30",
  "aging_buckets": {
    "current_0_30": 12000.00,
    "overdue_31_60": 8500.00,
    "overdue_61_90": 3200.00,
    "overdue_90_plus": 1500.00
  },
  "by_vendor": [
    {
      "vendor_id": "uuid",
      "vendor_name": "...",
      "current_0_30": 5000.00,
      "overdue_31_60": 3000.00,
      "overdue_61_90": 0.00,
      "overdue_90_plus": 0.00,
      "total_outstanding": 8000.00
    }
  ]
}
```

**Aging calculation:** Based on `purchase_orders.order_date` + `vendors.payment_terms_days`. A PO is "current" if `order_date + payment_terms_days >= as_of_date`. Each bucket counts the `balance_due` for POs whose due date falls within that range.

---

# PART C — CONFLICT & OVERLAP RESOLUTION

This section addresses every case where a Part B addition touches something that already exists in Part A.

| # | Part B Item | Part A Overlap | Resolution | Rationale |
|---|---|---|---|---|
| C-1 | `EXT-INV-001` Units of measure table | `stock_batches.unit_of_measure` VARCHAR, `products.unit_of_measure` VARCHAR (spec'd INV-MOD-001) | **MERGE** — keep the VARCHAR columns for backward compat; add nullable `unit_of_measure_id` FK alongside. When FK is set, it takes precedence. Migration seeds the reference table from existing VARCHAR values. | Avoids breaking existing code that reads the VARCHAR; new code can use the FK for richer data. |
| C-2 | `EXT-INV-012` Create stock adjustment (with approval) | `INV-042` direct batch adjust | **COEXIST with feature flag** — when `stock_adjustment_approval` is disabled, INV-042 works as-is. When enabled, INV-042 returns 422 directing user to the approval flow. | Businesses that want the simple flow keep it. Pharmacies and retail chains that need governance can opt in. |
| C-3 | `EXT-INV-015` Post stock adjustment | `INV-042` internal logic (atomic update + stock_movements insert) | **REUSE** — EXT-INV-015's "post" step calls the same atomic batch-update logic that INV-042 uses internally. Extract it into a shared private method if not already factored out. | Single source of truth for batch quantity modification. |
| C-4 | `EXT-INV-023` Post stock transfer document | `INV-044` single-batch transfer | **REUSE** — each line item in a transfer document calls INV-044's internal transfer logic. INV-044 endpoint remains available for ad-hoc single-batch transfers. | Transfer documents are a grouping layer, not a replacement. Both coexist. |
| C-5 | `EXT-INV-030` Vendor payments | `INV-072` Purchase order with `total_ttc` | **EXTEND** — vendor payments add a `purchase_order_id` FK linking back to POs. PO detail response gains computed `amount_paid` and `balance_due` fields. No PO schema changes. | POs track what was ordered/received; payments track what was paid. Complementary, not overlapping. |
| C-6 | `EXT-RPT-001` COGS report | `INV-090` stock position report, `INV-091` stock movement report | **ADD (no overlap)** — COGS is a distinct analytical view. Stock position = current state. Stock movements = event log. COGS = cost attribution to sales for margin analysis. All three coexist. | Different questions: "what do we have?" vs "what moved?" vs "what did it cost us to sell?" |
| C-7 | `EXT-RPT-002` Vendor balance report | `INV-092` vendor purchase report | **ADD (no overlap)** — INV-092 reports spend/delivery/quality. Vendor balance reports outstanding debt. Different questions. | "How much did we spend with vendor X?" vs "How much do we still owe vendor X?" |
| C-8 | `EXT-RPT-003` Bill aging report | No existing equivalent | **ADD (new)** — entirely new report. | Standard accounts-payable report for financial management. |
| C-9 | Generic tax entity (from WorkDo) | TVA compliance stack (XCC-010–018, resolveTvaRate, discount pipeline, receipt builder, declaration report) | **SKIP** — do NOT implement. Morocco's 4-rate TVA model is deeply integrated into the discount pipeline, receipt format, TVA declaration, and input TVA reclaim. A generic tax entity would require refactoring all of these. | Architectural risk far exceeds benefit for a single-country deployment. Revisit only if multi-country expansion becomes a business goal. |
| C-10 | Product/service CRUD (from WorkDo) | Existing `products`, `categories`, `product_variants` with full CRUD | **SKIP** — complete duplicate. Our model is richer (variants, modifiers, TVA, sold-out flag, image, SKU). | Nothing to gain. |
| C-11 | Stock view/update (from WorkDo) | `stock_batches` with FIFO, `stock_movements`, `stock_position` report | **SKIP** — our batch-level tracking is significantly more granular. | WorkDo has a simple stock counter; we have lot-tracked, expiry-aware, FIFO-consumed batches. |
| C-12 | Vendor CRUD (from WorkDo) | `vendors` entity with ICE/IF, payment terms, quality scoring | **SKIP** — our model is Morocco-specific and more feature-rich. | Nothing to gain. |
| C-13 | Inventory items (from WorkDo) | `stock_batches` with product linkage | **SKIP** — different abstraction level but same domain. | Our batches ARE inventory items, with more metadata. |
| C-14 | Vendor onboarding pipeline (from WorkDo) | No equivalent | **DEFER** — only relevant for chain businesses (Phase 13). No architectural prep needed. | Low demand for current users. If chain HQs need to vet vendors before sub-stores use them, add as a CHN extension. |
| C-15 | Warehouse zones/bins/racks (from WorkDo asset locations) | Flat warehouse model | **DEFER** — overkill for POS-scale businesses. | Could add `parent_warehouse_id` self-FK later with zero impact if needed. |

---

## Summary of New Schema Objects

### New Tables (Part B additions)

| # | Table | Module | Depends On |
|---|---|---|---|
| 1 | `units_of_measure` | INV | businesses |
| 2 | `stock_adjustments` | INV | businesses, warehouses, users |
| 3 | `stock_adjustment_items` | INV | stock_adjustments, products, product_variants, stock_batches |
| 4 | `stock_transfers` | INV | businesses, warehouses, users |
| 5 | `stock_transfer_items` | INV | stock_transfers, products, product_variants, stock_batches |
| 6 | `vendor_payments` | INV | businesses, vendors, purchase_orders, users |

### New Column Additions (Part B)

| Table | Column | Type | Notes |
|---|---|---|---|
| `stock_batches` | `unit_of_measure_id` | UUID NULL | FK → units_of_measure |
| `products` | `unit_of_measure_id` | UUID NULL | FK → units_of_measure |
| `purchase_order_items` | `unit_of_measure_id` | UUID NULL | FK → units_of_measure |

### New Permission Keys (Part B)

| Key | Description | Spec |
|---|---|---|
| `can_propose_stock_adjustment` | Can create stock adjustment proposals | EXT-INV-012 |
| `can_approve_stock_adjustment` | Can approve/reject stock adjustment proposals | EXT-INV-014/016 |
| `can_manage_vendor_payments` | Can create, confirm, void vendor payments | EXT-INV-032 |

### New Feature Flags (Part B)

| `feature_key` | Description | Default |
|---|---|---|
| `stock_adjustment_approval` | Enables approval workflow for stock adjustments | disabled (all types) |

### New Report IDs (Part B)

| Report ID | Endpoint | Depends On |
|---|---|---|
| `cogs` | `/api/business/reports/cogs` | stock_movements, stock_batches |
| `vendor-balance` | `/api/business/reports/vendor-balance` | vendor_payments, purchase_orders |
| `bill-aging` | `/api/business/reports/bill-aging` | vendor_payments, purchase_orders, vendors |

### Total New Endpoints (Part B)

| Category | Count |
|---|---|
| Units of measure CRUD | 4 |
| Stock adjustments (with approval workflow) | 7 |
| Stock transfers (document-based) | 6 |
| Vendor payments | 7 |
| New reports | 3 |
| **Total** | **27** |

---

**— END OF MASTER CONSOLIDATED SPECIFICATION —**
