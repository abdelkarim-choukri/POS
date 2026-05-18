import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecommendations1714014000000 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Whole-price tiers on products (REC-MOD-001)
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "whole_price_1" NUMERIC(12,2) NULL,
        ADD COLUMN "whole_price_2" NUMERIC(12,2) NULL,
        ADD COLUMN "whole_price_3" NUMERIC(12,2) NULL,
        ADD COLUMN "whole_price_4" NUMERIC(12,2) NULL
    `);

    // 2. Recommendation templates
    await queryRunner.query(`
      CREATE TABLE "recommendation_templates" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"             UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name"                    VARCHAR(200) NOT NULL,
        "template_type"           VARCHAR(40) NOT NULL DEFAULT 'manual',
        "time_window_start"       TIME NULL,
        "time_window_end"         TIME NULL,
        "applicable_days_of_week" INT[] NULL,
        "target_grade_ids"        UUID[] NULL,
        "min_recommendations"     INT NOT NULL DEFAULT 3,
        "max_recommendations"     INT NOT NULL DEFAULT 10,
        "whole_price_tier"        INT NULL,
        "applicable_location_ids" UUID[] NULL,
        "is_active"               BOOLEAN NOT NULL DEFAULT true,
        "display_order"           INT NOT NULL DEFAULT 0,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 3. Recommendation template items
    await queryRunner.query(`
      CREATE TABLE "recommendation_template_items" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" UUID NOT NULL REFERENCES "recommendation_templates"("id") ON DELETE CASCADE,
        "product_id"  UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
        "variant_id"  UUID NULL REFERENCES "product_variants"("id") ON DELETE SET NULL,
        "priority"    INT NOT NULL DEFAULT 0,
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 4. Indexes (§13.3 pattern)
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_templates_business_id"
       ON "recommendation_templates"("business_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_templates_active"
       ON "recommendation_templates"("business_id")
       WHERE "is_active" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_template_items_template_id"
       ON "recommendation_template_items"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_template_items_product_id"
       ON "recommendation_template_items"("product_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_recommendation_template_items_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_recommendation_template_items_template_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_recommendation_templates_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_recommendation_templates_business_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recommendation_template_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recommendation_templates"`);
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "whole_price_1",
        DROP COLUMN IF EXISTS "whole_price_2",
        DROP COLUMN IF EXISTS "whole_price_3",
        DROP COLUMN IF EXISTS "whole_price_4"
    `);
  }
}
