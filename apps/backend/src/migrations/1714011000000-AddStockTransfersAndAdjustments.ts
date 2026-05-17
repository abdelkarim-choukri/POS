import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockTransfersAndAdjustments1714011000000 implements MigrationInterface {
  name = 'AddStockTransfersAndAdjustments1714011000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. stock_adjustments
    await queryRunner.query(`
      CREATE TABLE "stock_adjustments" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "adjustment_number"     VARCHAR(50) NOT NULL,
        "warehouse_id"          UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "status"                VARCHAR(20) NOT NULL DEFAULT 'draft',
        "reason"                TEXT NOT NULL,
        "proposed_by_user_id"   UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "approved_by_user_id"   UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at"           TIMESTAMPTZ,
        "posted_at"             TIMESTAMPTZ,
        "rejected_reason"       TEXT,
        "notes"                 TEXT,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_adjustments_number"
        ON "stock_adjustments"("business_id", "adjustment_number")
    `);

    // 2. stock_adjustment_items
    await queryRunner.query(`
      CREATE TABLE "stock_adjustment_items" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "adjustment_id"     UUID NOT NULL REFERENCES "stock_adjustments"("id") ON DELETE CASCADE,
        "product_id"        UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"        UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "batch_id"          UUID NOT NULL REFERENCES "stock_batches"("id") ON DELETE RESTRICT,
        "proposed_delta"    NUMERIC(12,4) NOT NULL,
        "current_quantity"  NUMERIC(12,4) NOT NULL,
        "notes"             VARCHAR(500)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_adjustment_items_adjustment"
        ON "stock_adjustment_items"("adjustment_id")
    `);

    // 3. stock_transfers
    await queryRunner.query(`
      CREATE TABLE "stock_transfers" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "transfer_number"       VARCHAR(50) NOT NULL,
        "source_warehouse_id"   UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "target_warehouse_id"   UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "status"                VARCHAR(20) NOT NULL DEFAULT 'draft',
        "notes"                 TEXT,
        "created_by_user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "posted_at"             TIMESTAMPTZ,
        "posted_by_user_id"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_stock_transfers_number"
        ON "stock_transfers"("business_id", "transfer_number")
    `);

    // 4. stock_transfer_items
    await queryRunner.query(`
      CREATE TABLE "stock_transfer_items" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transfer_id"   UUID NOT NULL REFERENCES "stock_transfers"("id") ON DELETE CASCADE,
        "product_id"    UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"    UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "batch_id"      UUID NOT NULL REFERENCES "stock_batches"("id") ON DELETE RESTRICT,
        "quantity"      NUMERIC(12,4) NOT NULL,
        "notes"         VARCHAR(500)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_transfer_items_transfer"
        ON "stock_transfer_items"("transfer_id")
    `);

    // 5. Feature flag: stock_adjustment_approval (disabled by default)
    await queryRunner.query(`
      INSERT INTO "business_type_features" ("id", "business_type_id", "feature_key", "is_enabled")
      SELECT gen_random_uuid(), "id", 'stock_adjustment_approval', false FROM "business_types"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove feature flag
    await queryRunner.query(`
      DELETE FROM business_type_features WHERE feature_key = 'stock_adjustment_approval'
    `);

    // Drop indexes explicitly before tables
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_transfer_items_transfer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_stock_transfers_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_adjustment_items_adjustment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_stock_adjustments_number"`);

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_transfer_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_transfers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_adjustment_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_adjustments"`);
  }
}
