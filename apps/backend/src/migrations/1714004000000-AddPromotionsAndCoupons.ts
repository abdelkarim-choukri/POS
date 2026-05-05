import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromotionsAndCoupons1714004000000 implements MigrationInterface {
  name = 'AddPromotionsAndCoupons1714004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── businesses: promotion_stacking_mode (PROM-MOD-002) ──────────────────
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN "promotion_stacking_mode" VARCHAR(20) NOT NULL DEFAULT 'best_only'
    `);

    // ── promotions ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "id"                        UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"               UUID          NOT NULL,
        "code"                      VARCHAR(40)   NOT NULL,
        "name"                      VARCHAR(200)  NOT NULL,
        "description"               TEXT,
        "promotion_type"            VARCHAR(40)   NOT NULL,
        "value"                     NUMERIC(12,2) NOT NULL DEFAULT 0,
        "target_category_id"        UUID,
        "target_product_id"         UUID,
        "min_order_total_ttc"       NUMERIC(12,2) NOT NULL DEFAULT 0,
        "start_date"                DATE          NOT NULL,
        "end_date"                  DATE          NOT NULL,
        "valid_date_type"           VARCHAR(1)    NOT NULL DEFAULT 'D',
        "valid_dates"               VARCHAR(100),
        "day_type"                  VARCHAR(1)    NOT NULL DEFAULT 'A',
        "time_periods"              JSONB,
        "adjust_for_holidays"       BOOLEAN       NOT NULL DEFAULT false,
        "invalid_date_periods"      JSONB,
        "target_audience"           VARCHAR(20)   NOT NULL DEFAULT 'all',
        "target_grade_ids"          UUID[]        NOT NULL DEFAULT '{}',
        "target_label_ids"          UUID[]        NOT NULL DEFAULT '{}',
        "target_customer_ids"       UUID[]        NOT NULL DEFAULT '{}',
        "applicable_location_ids"   UUID[]        NOT NULL DEFAULT '{}',
        "max_total_uses"            INT           NOT NULL DEFAULT 0,
        "max_uses_per_day"          INT           NOT NULL DEFAULT 0,
        "max_uses_per_customer"     INT           NOT NULL DEFAULT 0,
        "max_uses_per_customer_day" INT           NOT NULL DEFAULT 0,
        "current_uses"              INT           NOT NULL DEFAULT 0,
        "notify_sms"                BOOLEAN       NOT NULL DEFAULT false,
        "notify_email"              BOOLEAN       NOT NULL DEFAULT false,
        "notify_whatsapp"           BOOLEAN       NOT NULL DEFAULT false,
        "advance_notify_days"       INT           NOT NULL DEFAULT 0,
        "share_enabled"             BOOLEAN       NOT NULL DEFAULT false,
        "share_main_title"          VARCHAR(200),
        "share_subtitle"            VARCHAR(200),
        "share_poster_url"          VARCHAR(500),
        "share_landing_url"         VARCHAR(500),
        "status"                    VARCHAR(20)   NOT NULL DEFAULT 'draft',
        "remark"                    TEXT,
        "created_by_user_id"        UUID,
        "created_at"                TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promotions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_promotions_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_promotions_category" FOREIGN KEY ("target_category_id")
          REFERENCES "categories"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_promotions_product" FOREIGN KEY ("target_product_id")
          REFERENCES "products"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_promotions_created_by" FOREIGN KEY ("created_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_promotions_business_code"
        ON "promotions" ("business_id", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promotions_business_status_dates"
        ON "promotions" ("business_id", "status", "start_date", "end_date")
    `);

    // ── promotion_redemptions ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "promotion_redemptions" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"      UUID          NOT NULL,
        "promotion_id"     UUID          NOT NULL,
        "transaction_id"   UUID          NOT NULL,
        "customer_id"      UUID,
        "discount_applied" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "redeemed_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promotion_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_promo_redemptions_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_promo_redemptions_promotion" FOREIGN KEY ("promotion_id")
          REFERENCES "promotions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_promo_redemptions_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_promo_redemptions_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_redemptions_promotion_date"
        ON "promotion_redemptions" ("promotion_id", "redeemed_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_redemptions_transaction"
        ON "promotion_redemptions" ("transaction_id")
    `);

    // ── coupon_types ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "coupon_types" (
        "id"                       UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"              UUID          NOT NULL,
        "code"                     VARCHAR(40)   NOT NULL,
        "name"                     VARCHAR(200)  NOT NULL,
        "description"              TEXT,
        "discount_type"            VARCHAR(20)   NOT NULL,
        "discount_value"           NUMERIC(12,2) NOT NULL DEFAULT 0,
        "free_item_product_id"     UUID,
        "free_item_variant_id"     UUID,
        "min_order_total_ttc"      NUMERIC(12,2) NOT NULL DEFAULT 0,
        "applicable_category_ids"  UUID[]        NOT NULL DEFAULT '{}',
        "applicable_product_ids"   UUID[]        NOT NULL DEFAULT '{}',
        "validity_days_from_issue" INT           NOT NULL DEFAULT 30,
        "share_case"               VARCHAR(1)    NOT NULL DEFAULT 'N',
        "is_active"                BOOLEAN       NOT NULL DEFAULT true,
        "created_at"               TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupon_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_coupon_types_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_types_product" FOREIGN KEY ("free_item_product_id")
          REFERENCES "products"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_coupon_types_variant" FOREIGN KEY ("free_item_variant_id")
          REFERENCES "product_variants"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_coupon_types_business_code"
        ON "coupon_types" ("business_id", "code")
    `);

    // ── coupons ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "coupons" (
        "id"                          UUID        NOT NULL DEFAULT gen_random_uuid(),
        "business_id"                 UUID        NOT NULL,
        "coupon_type_id"              UUID        NOT NULL,
        "coupon_code"                 VARCHAR(50) NOT NULL,
        "customer_id"                 UUID,
        "issued_at"                   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "issued_by_user_id"           UUID,
        "issue_source"                VARCHAR(40) NOT NULL DEFAULT 'manual',
        "expires_at"                  TIMESTAMPTZ NOT NULL,
        "redeemed_at"                 TIMESTAMPTZ,
        "redeemed_in_transaction_id"  UUID,
        "redeemed_by_terminal_id"     UUID,
        "status"                      VARCHAR(20) NOT NULL DEFAULT 'available',
        CONSTRAINT "PK_coupons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_coupons_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupons_coupon_type" FOREIGN KEY ("coupon_type_id")
          REFERENCES "coupon_types"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupons_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_coupons_issued_by" FOREIGN KEY ("issued_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_coupons_transaction" FOREIGN KEY ("redeemed_in_transaction_id")
          REFERENCES "transactions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_coupons_terminal" FOREIGN KEY ("redeemed_by_terminal_id")
          REFERENCES "terminals"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_coupons_business_code"
        ON "coupons" ("business_id", "coupon_code")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_coupons_customer_status"
        ON "coupons" ("customer_id", "status")
    `);

    // ── coupon_redemptions ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "coupon_redemptions" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"      UUID          NOT NULL,
        "coupon_id"        UUID          NOT NULL,
        "transaction_id"   UUID          NOT NULL,
        "customer_id"      UUID,
        "discount_applied" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "redeemed_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupon_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_coupon_redemptions_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_redemptions_coupon" FOREIGN KEY ("coupon_id")
          REFERENCES "coupons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_redemptions_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_redemptions_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL
      )
    `);
    // DB-level enforcement: one redemption record per coupon
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_coupon_redemptions_coupon"
        ON "coupon_redemptions" ("coupon_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_coupon_redemptions_transaction"
        ON "coupon_redemptions" ("transaction_id")
    `);

    // ── discount_write_offs (migration 7 combined here) ──────────────────────
    await queryRunner.query(`
      CREATE TABLE "discount_write_offs" (
        "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"       UUID          NOT NULL,
        "transaction_id"    UUID          NOT NULL,
        "terminal_id"       UUID,
        "coupon_id"         UUID,
        "written_off_amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
        "reason"            TEXT,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_discount_write_offs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_write_offs_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_write_offs_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_write_offs_terminal" FOREIGN KEY ("terminal_id")
          REFERENCES "terminals"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_write_offs_coupon" FOREIGN KEY ("coupon_id")
          REFERENCES "coupons"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_write_offs_business_created"
        ON "discount_write_offs" ("business_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_write_offs_terminal_created"
        ON "discount_write_offs" ("terminal_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_write_offs_terminal_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_write_offs_business_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "discount_write_offs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_coupon_redemptions_transaction"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_coupon_redemptions_coupon"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_redemptions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_coupons_customer_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_coupons_business_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_coupon_types_business_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_types"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_redemptions_transaction"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_redemptions_promotion_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_redemptions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promotions_business_status_dates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_promotions_business_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions"`);

    await queryRunner.query(`
      ALTER TABLE "businesses" DROP COLUMN IF EXISTS "promotion_stacking_mode"
    `);
  }
}
