import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPointsExchange1714005000000 implements MigrationInterface {
  name = 'AddPointsExchange1714005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── points_exchange_rules ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "points_exchange_rules" (
        "id"                        UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"               UUID          NOT NULL,
        "name"                      VARCHAR(200)  NOT NULL,
        "point_value"               INT           NOT NULL,
        "rule_type"                 VARCHAR(20)   NOT NULL,
        "validity_date_type"        VARCHAR(1)    NOT NULL DEFAULT 'D',
        "validity_days"             INT           NOT NULL DEFAULT 30,
        "rule_start_date"           DATE,
        "rule_end_date"             DATE,
        "applicable_location_ids"   UUID[]        NOT NULL DEFAULT '{}',
        "total_redemptions_limit"   INT           NOT NULL DEFAULT 0,
        "per_customer_limit"        INT           NOT NULL DEFAULT 0,
        "per_customer_per_day_limit" INT          NOT NULL DEFAULT 0,
        "current_redemptions"       INT           NOT NULL DEFAULT 0,
        "remark"                    TEXT,
        "is_active"                 BOOLEAN       NOT NULL DEFAULT true,
        "created_at"                TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pex_rules" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pex_rules_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pex_rules_business_id"
        ON "points_exchange_rules" ("business_id")
    `);

    // ── points_exchange_rule_details ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "points_exchange_rule_details" (
        "id"                      UUID          NOT NULL DEFAULT gen_random_uuid(),
        "rule_id"                 UUID          NOT NULL,
        "coupon_type_id"          UUID,
        "product_id"              UUID,
        "variant_id"              UUID,
        "quantity_per_redemption" INT           NOT NULL DEFAULT 1,
        "discount_amount_mad"     NUMERIC(12,2),
        CONSTRAINT "PK_pex_rule_details" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pex_rule_details_rule" FOREIGN KEY ("rule_id")
          REFERENCES "points_exchange_rules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pex_rule_details_coupon_type" FOREIGN KEY ("coupon_type_id")
          REFERENCES "coupon_types"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_pex_rule_details_product" FOREIGN KEY ("product_id")
          REFERENCES "products"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_pex_rule_details_variant" FOREIGN KEY ("variant_id")
          REFERENCES "product_variants"("id") ON DELETE SET NULL
      )
    `);

    // ── points_exchange_redemptions ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "points_exchange_redemptions" (
        "id"                        UUID        NOT NULL DEFAULT gen_random_uuid(),
        "business_id"               UUID        NOT NULL,
        "rule_id"                   UUID        NOT NULL,
        "customer_id"               UUID        NOT NULL,
        "points_spent"              INT         NOT NULL,
        "granted_coupon_id"         UUID,
        "granted_in_transaction_id" UUID,
        "redeemed_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pex_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pex_redemptions_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pex_redemptions_rule" FOREIGN KEY ("rule_id")
          REFERENCES "points_exchange_rules"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pex_redemptions_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pex_redemptions_coupon" FOREIGN KEY ("granted_coupon_id")
          REFERENCES "coupons"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_pex_redemptions_transaction" FOREIGN KEY ("granted_in_transaction_id")
          REFERENCES "transactions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pex_redemptions_rule_id"
        ON "points_exchange_redemptions" ("rule_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pex_redemptions_customer_id"
        ON "points_exchange_redemptions" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pex_redemptions_customer_rule"
        ON "points_exchange_redemptions" ("customer_id", "rule_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pex_redemptions_customer_rule"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pex_redemptions_customer_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pex_redemptions_rule_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "points_exchange_redemptions"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "points_exchange_rule_details"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pex_rules_business_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "points_exchange_rules"`);
  }
}
