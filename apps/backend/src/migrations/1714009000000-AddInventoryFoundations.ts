import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryFoundations1714009000000 implements MigrationInterface {
  name = 'AddInventoryFoundations1714009000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. units_of_measure (business_id nullable — system units have business_id=NULL)
    await queryRunner.query(`
      CREATE TABLE "units_of_measure" (
        "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"  UUID REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name"         VARCHAR(50)  NOT NULL,
        "abbreviation" VARCHAR(10)  NOT NULL,
        "is_system"    BOOLEAN NOT NULL DEFAULT false,
        "is_active"    BOOLEAN NOT NULL DEFAULT true,
        "sort_order"   INT     NOT NULL DEFAULT 0,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Seed 5 system units (business_id = NULL, is_system = true)
    await queryRunner.query(`
      INSERT INTO "units_of_measure" ("name", "abbreviation", "is_system", "sort_order")
      VALUES
        ('Unit',       'unit', true, 1),
        ('Kilogram',   'kg',   true, 2),
        ('Gram',       'g',    true, 3),
        ('Litre',      'l',    true, 4),
        ('Millilitre', 'ml',   true, 5)
    `);

    // 2. warehouses
    await queryRunner.query(`
      CREATE TABLE "warehouses" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"         UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name"                VARCHAR(200) NOT NULL,
        "code"                VARCHAR(50)  NOT NULL,
        "address"             TEXT,
        "manager_user_id"     UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "is_central"          BOOLEAN NOT NULL DEFAULT false,
        "linked_location_id"  UUID REFERENCES "locations"("id") ON DELETE SET NULL,
        "is_active"           BOOLEAN NOT NULL DEFAULT true,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_warehouses_business_code"
        ON "warehouses"("business_id", "code")
    `);

    // 3. vendors
    await queryRunner.query(`
      CREATE TABLE "vendors" (
        "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"          UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "code"                 VARCHAR(50)  NOT NULL,
        "name"                 VARCHAR(200) NOT NULL,
        "contact_name"         VARCHAR(200),
        "contact_phone"        VARCHAR(20),
        "contact_email"        VARCHAR(255),
        "address"              TEXT,
        "ice_number"           VARCHAR(15),
        "if_number"            VARCHAR(50),
        "payment_terms_days"   INT NOT NULL DEFAULT 30,
        "notes"                TEXT,
        "is_active"            BOOLEAN NOT NULL DEFAULT true,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_vendors_business_code"
        ON "vendors"("business_id", "code")
    `);

    // 4. vendor_check_details
    await queryRunner.query(`
      CREATE TABLE "vendor_check_details" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"         UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "vendor_id"           UUID NOT NULL REFERENCES "vendors"("id") ON DELETE CASCADE,
        "check_date"          DATE NOT NULL,
        "checked_by_user_id"  UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "quality_score"       INT,
        "delivery_score"      INT,
        "price_score"         INT,
        "notes"               TEXT,
        "attachments_json"    JSONB,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_vendor_check_details_vendor_date"
        ON "vendor_check_details"("vendor_id", "check_date" DESC)
    `);

    // 5. brands
    await queryRunner.query(`
      CREATE TABLE "brands" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name"        VARCHAR(200) NOT NULL,
        "code"        VARCHAR(50),
        "logo_url"    VARCHAR(500),
        "description" TEXT,
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_brands_business_name"
        ON "brands"("business_id", "name")
    `);

    // 6. nutrition_info
    await queryRunner.query(`
      CREATE TABLE "nutrition_info" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"      UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "product_id"       UUID NOT NULL UNIQUE REFERENCES "products"("id") ON DELETE CASCADE,
        "serving_size_g"   NUMERIC(8,2),
        "calories_kcal"    NUMERIC(8,2),
        "protein_g"        NUMERIC(8,2),
        "carbs_g"          NUMERIC(8,2),
        "sugar_g"          NUMERIC(8,2),
        "fat_g"            NUMERIC(8,2),
        "saturated_fat_g"  NUMERIC(8,2),
        "fiber_g"          NUMERIC(8,2),
        "sodium_mg"        NUMERIC(8,2),
        "allergens"        VARCHAR(500),
        "is_vegetarian"    BOOLEAN NOT NULL DEFAULT false,
        "is_vegan"         BOOLEAN NOT NULL DEFAULT false,
        "is_halal"         BOOLEAN NOT NULL DEFAULT false,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Column additions to products (INV-MOD-001 + EXT-INV-001)
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "brand_id" UUID REFERENCES "brands"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "default_vendor_id" UUID REFERENCES "vendors"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "unit_of_measure" VARCHAR(20) NOT NULL DEFAULT 'unit'`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "unit_of_measure_id" UUID REFERENCES "units_of_measure"("id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "track_stock" BOOLEAN NOT NULL DEFAULT false`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove product columns
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "track_stock"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "unit_of_measure_id"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "unit_of_measure"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "default_vendor_id"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "brand_id"`);

    // Drop tables in reverse FK order
    await queryRunner.query(`DROP TABLE IF EXISTS "nutrition_info"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_check_details"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brands"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vendors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "units_of_measure"`);
  }
}
