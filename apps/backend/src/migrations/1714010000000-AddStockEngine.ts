import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockEngine1714010000000 implements MigrationInterface {
  name = 'AddStockEngine1714010000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add expiration_alert_lead_days to businesses
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN "expiration_alert_lead_days" INT NOT NULL DEFAULT 7
    `);

    // 2. stock_batches (purchase_order_id FK deferred — added after purchase_orders is created)
    await queryRunner.query(`
      CREATE TABLE "stock_batches" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"         UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "warehouse_id"        UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "product_id"          UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"          UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "batch_code"          VARCHAR(100) NOT NULL,
        "quantity_initial"    NUMERIC(12,4) NOT NULL,
        "quantity_remaining"  NUMERIC(12,4) NOT NULL,
        "unit_cost"           NUMERIC(12,4) NOT NULL,
        "unit_cost_tva_rate"  NUMERIC(5,2) NOT NULL DEFAULT 0,
        "unit_of_measure"     VARCHAR(20) NOT NULL DEFAULT 'unit',
        "received_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expires_at"          TIMESTAMPTZ,
        "vendor_id"           UUID REFERENCES "vendors"("id") ON DELETE SET NULL,
        "purchase_order_id"   UUID,
        "is_active"           BOOLEAN NOT NULL DEFAULT true,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Index: FIFO workhorse (§13.3)
    await queryRunner.query(`
      CREATE INDEX "IDX_stock_batches_fifo"
        ON "stock_batches"("warehouse_id", "product_id", "expires_at", "received_at")
        WHERE "is_active" = true
    `);

    // 3. stock_movements
    await queryRunner.query(`
      CREATE TABLE "stock_movements" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "batch_id"              UUID NOT NULL REFERENCES "stock_batches"("id") ON DELETE RESTRICT,
        "movement_type"         VARCHAR(30) NOT NULL,
        "quantity"              NUMERIC(12,4) NOT NULL,
        "reference_type"        VARCHAR(50),
        "reference_id"          UUID,
        "source_origin"         VARCHAR(20) NOT NULL DEFAULT 'realtime',
        "performed_by_user_id"  UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "notes"                 TEXT,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_movements_batch_history"
        ON "stock_movements"("batch_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_movements_offline_sync"
        ON "stock_movements"("business_id", "source_origin", "created_at" DESC)
        WHERE "source_origin" = 'offline_sync'
    `);

    // 4. purchase_orders
    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"            UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "po_number"              VARCHAR(100) NOT NULL,
        "vendor_id"              UUID REFERENCES "vendors"("id") ON DELETE RESTRICT,
        "warehouse_id"           UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "parent_business_id"     UUID REFERENCES "businesses"("id") ON DELETE SET NULL,
        "status"                 VARCHAR(30) NOT NULL DEFAULT 'draft',
        "order_date"             DATE NOT NULL DEFAULT CURRENT_DATE,
        "expected_delivery_date" DATE,
        "subtotal_ht"            NUMERIC(12,2) NOT NULL DEFAULT 0,
        "total_tva"              NUMERIC(12,2) NOT NULL DEFAULT 0,
        "total_ttc"              NUMERIC(12,2) NOT NULL DEFAULT 0,
        "created_by_user_id"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_by_user_id"    UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "notes"                  TEXT,
        "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_purchase_orders_business_po_number"
        ON "purchase_orders"("business_id", "po_number")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_purchase_orders_status"
        ON "purchase_orders"("business_id", "status", "order_date" DESC)
    `);

    // Deferred FK: stock_batches.purchase_order_id → purchase_orders
    await queryRunner.query(`
      ALTER TABLE "stock_batches"
        ADD CONSTRAINT "FK_stock_batches_purchase_order"
        FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL
    `);

    // 5. purchase_order_items
    await queryRunner.query(`
      CREATE TABLE "purchase_order_items" (
        "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "purchase_order_id" UUID NOT NULL REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        "product_id"        UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"        UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "quantity_ordered"  NUMERIC(12,4) NOT NULL,
        "quantity_received" NUMERIC(12,4) NOT NULL DEFAULT 0,
        "unit_of_measure"   VARCHAR(20) NOT NULL DEFAULT 'unit',
        "unit_cost_ht"      NUMERIC(12,4) NOT NULL,
        "tva_rate"          NUMERIC(5,2) NOT NULL DEFAULT 0,
        "line_total_ht"     NUMERIC(12,2) NOT NULL,
        "line_total_tva"    NUMERIC(12,2) NOT NULL,
        "line_total_ttc"    NUMERIC(12,2) NOT NULL,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 6. stock_templates
    await queryRunner.query(`
      CREATE TABLE "stock_templates" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name"                  VARCHAR(200) NOT NULL,
        "default_vendor_id"     UUID REFERENCES "vendors"("id") ON DELETE SET NULL,
        "default_warehouse_id"  UUID REFERENCES "warehouses"("id") ON DELETE SET NULL,
        "is_active"             BOOLEAN NOT NULL DEFAULT true,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 7. stock_template_items
    await queryRunner.query(`
      CREATE TABLE "stock_template_items" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id"      UUID NOT NULL REFERENCES "stock_templates"("id") ON DELETE CASCADE,
        "product_id"       UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "variant_id"       UUID REFERENCES "product_variants"("id") ON DELETE RESTRICT,
        "default_quantity" NUMERIC(12,4) NOT NULL DEFAULT 1,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 8. expiration_alerts
    await queryRunner.query(`
      CREATE TABLE "expiration_alerts" (
        "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"           UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "batch_id"              UUID NOT NULL REFERENCES "stock_batches"("id") ON DELETE CASCADE,
        "warehouse_id"          UUID NOT NULL REFERENCES "warehouses"("id") ON DELETE RESTRICT,
        "product_id"            UUID NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
        "severity"              VARCHAR(20) NOT NULL,
        "resolved_at"           TIMESTAMPTZ,
        "resolved_by_user_id"   UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "action"                VARCHAR(30),
        "notes"                 TEXT,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_expiration_alerts_batch"
        ON "expiration_alerts"("batch_id")
    `);

    // 9. stock_discrepancy_alerts
    await queryRunner.query(`
      CREATE TABLE "stock_discrepancy_alerts" (
        "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"          UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "batch_id"             UUID REFERENCES "stock_batches"("id") ON DELETE SET NULL,
        "warehouse_id"         UUID REFERENCES "warehouses"("id") ON DELETE SET NULL,
        "product_id"           UUID REFERENCES "products"("id") ON DELETE SET NULL,
        "expected_remaining"   NUMERIC(12,4) NOT NULL DEFAULT 0,
        "actual_remaining"     NUMERIC(12,4) NOT NULL,
        "discrepancy_quantity" NUMERIC(12,4) NOT NULL,
        "source"               VARCHAR(30) NOT NULL,
        "resolved_at"          TIMESTAMPTZ,
        "resolved_by_user_id"  UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "resolution_notes"     TEXT,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_stock_discrepancy_alerts_open"
        ON "stock_discrepancy_alerts"("business_id", "resolved_at")
        WHERE "resolved_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_discrepancy_alerts_open"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_discrepancy_alerts"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expiration_alerts_batch"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expiration_alerts"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "stock_template_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_templates"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_items"`);

    // Remove deferred FK before dropping purchase_orders
    await queryRunner.query(`
      ALTER TABLE "stock_batches"
        DROP CONSTRAINT IF EXISTS "FK_stock_batches_purchase_order"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchase_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_purchase_orders_business_po_number"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_movements_offline_sync"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_movements_batch_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stock_batches_fifo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_batches"`);

    await queryRunner.query(`
      ALTER TABLE "businesses"
        DROP COLUMN IF EXISTS "expiration_alert_lead_days"
    `);
  }
}
