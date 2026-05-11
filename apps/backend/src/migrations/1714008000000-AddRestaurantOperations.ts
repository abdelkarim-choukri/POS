import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRestaurantOperations1714008000000 implements MigrationInterface {
  name = 'AddRestaurantOperations1714008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── dining_areas ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "dining_areas" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "business_id" UUID         NOT NULL,
        "location_id" UUID         NOT NULL,
        "name"        VARCHAR(100) NOT NULL,
        "description" TEXT,
        "sort_order"  INT          NOT NULL DEFAULT 0,
        "is_active"   BOOLEAN      NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dining_areas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dining_areas_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
        CONSTRAINT "FK_dining_areas_location"
          FOREIGN KEY ("location_id") REFERENCES "locations"("id")
      )
    `);

    // ── table_types ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "table_types" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "business_id"      UUID         NOT NULL,
        "name"             VARCHAR(100) NOT NULL,
        "default_capacity" INT          NOT NULL DEFAULT 4,
        "is_active"        BOOLEAN      NOT NULL DEFAULT true,
        CONSTRAINT "PK_table_types" PRIMARY KEY ("id"),
        CONSTRAINT "FK_table_types_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
      )
    `);

    // ── tables ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tables" (
        "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
        "business_id"   UUID         NOT NULL,
        "location_id"   UUID         NOT NULL,
        "area_id"       UUID         NOT NULL,
        "table_type_id" UUID,
        "table_number"  VARCHAR(20)  NOT NULL,
        "capacity"      INT          NOT NULL DEFAULT 4,
        "position_x"    INT,
        "position_y"    INT,
        "qr_code"       VARCHAR(100),
        "is_active"     BOOLEAN      NOT NULL DEFAULT true,
        CONSTRAINT "PK_tables" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tables_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
        CONSTRAINT "FK_tables_location"
          FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_tables_area"
          FOREIGN KEY ("area_id") REFERENCES "dining_areas"("id"),
        CONSTRAINT "FK_tables_table_type"
          FOREIGN KEY ("table_type_id") REFERENCES "table_types"("id")
      )
    `);

    // ── table_sessions ────────────────────────────────────────────────────────
    // closed_in_transaction_id FK added after transactions column is created below
    await queryRunner.query(`
      CREATE TABLE "table_sessions" (
        "id"                       UUID        NOT NULL DEFAULT gen_random_uuid(),
        "business_id"              UUID        NOT NULL,
        "location_id"              UUID        NOT NULL,
        "table_id"                 UUID        NOT NULL,
        "opened_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
        "opened_by_user_id"        UUID        NOT NULL,
        "closed_at"                TIMESTAMPTZ,
        "closed_in_transaction_id" UUID,
        "customer_id"              UUID,
        "guest_count"              INT,
        "expected_split_count"     INT         NOT NULL DEFAULT 1,
        "partial_payment"          BOOLEAN     NOT NULL DEFAULT false,
        "notes"                    TEXT,
        "status"                   VARCHAR(20) NOT NULL DEFAULT 'open',
        CONSTRAINT "PK_table_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_table_sessions_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
        CONSTRAINT "FK_table_sessions_location"
          FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_table_sessions_table"
          FOREIGN KEY ("table_id") REFERENCES "tables"("id"),
        CONSTRAINT "FK_table_sessions_user"
          FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_table_sessions_customer"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
      )
    `);

    // ── table_session_items ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "table_session_items" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"      UUID          NOT NULL,
        "table_session_id" UUID          NOT NULL,
        "product_id"       UUID          NOT NULL,
        "variant_id"       UUID,
        "customer_id"      UUID,
        "quantity"         INT           NOT NULL DEFAULT 1,
        "unit_price_ttc"   NUMERIC(12,2) NOT NULL,
        "modifiers_json"   JSONB         NOT NULL DEFAULT '{}',
        "notes"            VARCHAR(500),
        "added_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "added_by_user_id" UUID          NOT NULL,
        "kds_status"       VARCHAR(20)   NOT NULL DEFAULT 'new',
        CONSTRAINT "PK_table_session_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tsi_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
        CONSTRAINT "FK_tsi_session"
          FOREIGN KEY ("table_session_id") REFERENCES "table_sessions"("id"),
        CONSTRAINT "FK_tsi_product"
          FOREIGN KEY ("product_id") REFERENCES "products"("id"),
        CONSTRAINT "FK_tsi_variant"
          FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id"),
        CONSTRAINT "FK_tsi_customer"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id"),
        CONSTRAINT "FK_tsi_user"
          FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id")
      )
    `);

    // ── Column additions to existing tables ───────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "table_session_id" UUID REFERENCES "table_sessions"("id")
    `);

    // i18n foundation (§9 — part of Part A scope)
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "language_preference" VARCHAR(5) NOT NULL DEFAULT 'fr'
    `);

    // Now safe to add the circular FK: table_sessions → transactions
    await queryRunner.query(`
      ALTER TABLE "table_sessions"
        ADD CONSTRAINT "FK_table_sessions_transaction"
          FOREIGN KEY ("closed_in_transaction_id") REFERENCES "transactions"("id")
    `);

    // ── Indexes (§13.3) ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tables_business_number"
        ON "tables" ("business_id", "table_number")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tables_location_area"
        ON "tables" ("location_id", "area_id", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_table_status"
        ON "table_sessions" ("table_id", "status")
        WHERE status IN ('open', 'awaiting_payment')
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_business_status"
        ON "table_sessions" ("business_id", "status", "opened_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_session_items_session"
        ON "table_session_items" ("table_session_id", "kds_status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_session_items_business"
        ON "table_session_items" ("business_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_items_business"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_items_session"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_business_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_table_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tables_location_area"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tables_business_number"`);

    // Drop circular FK before dropping table_sessions
    await queryRunner.query(`
      ALTER TABLE "table_sessions"
        DROP CONSTRAINT IF EXISTS "FK_table_sessions_transaction"
    `);

    // Drop column additions on existing tables
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "language_preference"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "table_session_id"`);

    // Drop new tables in reverse FK order
    await queryRunner.query(`DROP TABLE IF EXISTS "table_session_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "table_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tables"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "table_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dining_areas"`);
  }
}
