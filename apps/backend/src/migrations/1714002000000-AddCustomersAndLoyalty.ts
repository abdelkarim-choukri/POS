import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomersAndLoyalty1714002000000 implements MigrationInterface {
  name = 'AddCustomersAndLoyalty1714002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── customer_grades ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_grades" (
        "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
        "business_id"       UUID        NOT NULL,
        "name"              VARCHAR(100) NOT NULL,
        "min_points"        INT         NOT NULL DEFAULT 0,
        "discount_percent"  NUMERIC(5,2) NOT NULL DEFAULT 0,
        "points_multiplier" NUMERIC(4,2) NOT NULL DEFAULT 1,
        "color_hex"         VARCHAR(7),
        "sort_order"        INT         NOT NULL DEFAULT 0,
        "is_active"         BOOLEAN     NOT NULL DEFAULT true,
        CONSTRAINT "PK_customer_grades" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_grades_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customer_grades_business_name"
        ON "customer_grades" ("business_id", "name")
    `);

    // ── customers ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id"                 UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"        UUID          NOT NULL,
        "customer_code"      VARCHAR(50)   NOT NULL,
        "phone"              VARCHAR(20),
        "email"              VARCHAR(255),
        "first_name"         VARCHAR(100)  NOT NULL,
        "last_name"          VARCHAR(100)  NOT NULL,
        "birthday"           DATE,
        "gender"             VARCHAR(10),
        "address"            TEXT,
        "grade_id"           UUID,
        "points_balance"     INT           NOT NULL DEFAULT 0,
        "lifetime_points"    INT           NOT NULL DEFAULT 0,
        "is_active"          BOOLEAN       NOT NULL DEFAULT true,
        "consent_marketing"  BOOLEAN       NOT NULL DEFAULT false,
        "notes"              TEXT,
        "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customers_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customers_grade" FOREIGN KEY ("grade_id")
          REFERENCES "customer_grades"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customers_business_code"
        ON "customers" ("business_id", "customer_code")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customers_business_phone"
        ON "customers" ("business_id", "phone")
        WHERE "phone" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_customers_business_is_active"
        ON "customers" ("business_id", "is_active")
    `);

    // ── customer_labels ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_labels" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "business_id" UUID         NOT NULL,
        "name"        VARCHAR(100) NOT NULL,
        "color_hex"   VARCHAR(7),
        "is_active"   BOOLEAN      NOT NULL DEFAULT true,
        CONSTRAINT "PK_customer_labels" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_labels_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customer_labels_business_name"
        ON "customer_labels" ("business_id", "name")
    `);

    // ── customer_label_assignments ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_label_assignments" (
        "customer_id"  UUID        NOT NULL,
        "label_id"     UUID        NOT NULL,
        "assigned_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_label_assignments" PRIMARY KEY ("customer_id", "label_id"),
        CONSTRAINT "FK_cla_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cla_label" FOREIGN KEY ("label_id")
          REFERENCES "customer_labels"("id") ON DELETE CASCADE
      )
    `);

    // ── customer_attributes ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_attributes" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "business_id"  UUID         NOT NULL,
        "key"          VARCHAR(100) NOT NULL,
        "label"        VARCHAR(200) NOT NULL,
        "data_type"    VARCHAR(20)  NOT NULL DEFAULT 'string',
        "enum_options" JSONB,
        "is_required"  BOOLEAN      NOT NULL DEFAULT false,
        CONSTRAINT "PK_customer_attributes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_attributes_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_customer_attributes_business_key"
        ON "customer_attributes" ("business_id", "key")
    `);

    // ── customer_attribute_values ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_attribute_values" (
        "customer_id"   UUID  NOT NULL,
        "attribute_id"  UUID  NOT NULL,
        "value"         TEXT  NOT NULL,
        CONSTRAINT "PK_customer_attribute_values" PRIMARY KEY ("customer_id", "attribute_id"),
        CONSTRAINT "FK_cav_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cav_attribute" FOREIGN KEY ("attribute_id")
          REFERENCES "customer_attributes"("id") ON DELETE CASCADE
      )
    `);

    // ── customer_points_history ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "customer_points_history" (
        "id"                    UUID        NOT NULL DEFAULT gen_random_uuid(),
        "business_id"           UUID        NOT NULL,
        "customer_id"           UUID        NOT NULL,
        "delta"                 INT         NOT NULL,
        "balance_after"         INT         NOT NULL,
        "source"                VARCHAR(40) NOT NULL,
        "transaction_id"        UUID,
        "adjusted_by_user_id"   UUID,
        "reason"                TEXT,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_points_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cph_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cph_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cph_transaction" FOREIGN KEY ("transaction_id")
          REFERENCES "transactions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_cph_user" FOREIGN KEY ("adjusted_by_user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cph_customer_created_at"
        ON "customer_points_history" ("customer_id", "created_at" DESC)
    `);

    // ── Modify existing tables ───────────────────────────────────────────────

    // transactions [CUST-MOD-001]
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "customer_id"      UUID           REFERENCES "customers"("id") ON DELETE SET NULL,
        ADD COLUMN "points_earned"    INT            NOT NULL DEFAULT 0,
        ADD COLUMN "points_redeemed"  INT            NOT NULL DEFAULT 0,
        ADD COLUMN "discount_total"   NUMERIC(12,2)  NOT NULL DEFAULT 0
    `);

    // transaction_items [CUST-MOD-002]
    await queryRunner.query(`
      ALTER TABLE "transaction_items"
        ADD COLUMN "discount_amount" NUMERIC(12,2) NOT NULL DEFAULT 0
    `);

    // businesses — points config + customer sequence counter
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN "points_earn_divisor"   NUMERIC(10,2) NOT NULL DEFAULT 10,
        ADD COLUMN "points_redeem_value"   NUMERIC(8,4)  NOT NULL DEFAULT 0.05,
        ADD COLUMN "customer_counter"      INT           NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse businesses columns
    await queryRunner.query(`
      ALTER TABLE "businesses"
        DROP COLUMN IF EXISTS "customer_counter",
        DROP COLUMN IF EXISTS "points_redeem_value",
        DROP COLUMN IF EXISTS "points_earn_divisor"
    `);

    // Reverse transaction_items columns
    await queryRunner.query(`
      ALTER TABLE "transaction_items"
        DROP COLUMN IF EXISTS "discount_amount"
    `);

    // Reverse transactions columns
    await queryRunner.query(`
      ALTER TABLE "transactions"
        DROP COLUMN IF EXISTS "discount_total",
        DROP COLUMN IF EXISTS "points_redeemed",
        DROP COLUMN IF EXISTS "points_earned",
        DROP COLUMN IF EXISTS "customer_id"
    `);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_points_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_attribute_values"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_attributes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_label_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_labels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_grades"`);
  }
}
