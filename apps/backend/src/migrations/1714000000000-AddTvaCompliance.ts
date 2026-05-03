import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTvaCompliance1714000000000 implements MigrationInterface {
  name = 'AddTvaCompliance1714000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── businesses ──────────────────────────────────────────────────
    // [TVA-043], [SAD-001]: ICE (15-digit tax ID), IF (fiscal ID)
    // §3.6.2: address required on legal receipts
    // [TVA-043]: invoice_counter is atomic source of truth for invoice numbering
    // [TVA-020]: business_code used in invoice format INV-{code}-{YYYY}-{NNNNNN}
    // last_invoice_year supports annual counter reset
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN "ice_number" VARCHAR(30),
        ADD COLUMN "if_number" VARCHAR(30),
        ADD COLUMN "address" TEXT,
        ADD COLUMN "invoice_counter" INT NOT NULL DEFAULT 0,
        ADD COLUMN "business_code" VARCHAR(10) NOT NULL DEFAULT '',
        ADD COLUMN "last_invoice_year" SMALLINT
    `);

    // Backfill business_code from first 6 hex chars of UUID (uppercased)
    // with collision handling: append numeric suffix if needed
    await queryRunner.query(`
      WITH codes AS (
        SELECT id, UPPER(LEFT(REPLACE(id::text, '-', ''), 6)) AS base_code,
               ROW_NUMBER() OVER (PARTITION BY UPPER(LEFT(REPLACE(id::text, '-', ''), 6)) ORDER BY created_at) AS rn
        FROM businesses
      )
      UPDATE businesses b
      SET business_code = CASE
        WHEN c.rn = 1 THEN c.base_code
        ELSE c.base_code || (c.rn - 1)::text
      END
      FROM codes c
      WHERE b.id = c.id
    `);

    // Now enforce uniqueness
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_businesses_code" ON "businesses"("business_code")
    `);

    // ── categories ──────────────────────────────────────────────────
    // [CAT-002]: default TVA rate per category (0/7/10/20)
    await queryRunner.query(`
      ALTER TABLE "categories"
        ADD COLUMN "default_tva_rate" NUMERIC(5,2) NOT NULL DEFAULT 20.00
    `);

    // ── products ────────────────────────────────────────────────────
    // [PRD-002]: optional TVA rate override (NULL = inherit from category per [PRD-004])
    // [PRD-003]: tva_exempt forces 0% regardless of other settings
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "tva_rate" NUMERIC(5,2),
        ADD COLUMN "tva_exempt" BOOLEAN NOT NULL DEFAULT false
    `);

    // ── transactions ────────────────────────────────────────────────
    // [TVA-020]: gap-free invoice number
    // [TVA-011]: total HT/TVA/TTC
    // [TVA-040]: SIMPL-TVA e-invoicing preparation fields
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN "invoice_number" VARCHAR(30),
        ADD COLUMN "total_ht" NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN "total_tva" NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN "total_ttc" NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN "simpl_tva_status" VARCHAR(20),
        ADD COLUMN "simpl_tva_reference" VARCHAR(100),
        ADD COLUMN "simpl_tva_sent_at" TIMESTAMPTZ
    `);

    // Gap-free invoice number uniqueness per business [TVA-021]
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_transactions_business_invoice"
        ON "transactions"("business_id", "invoice_number")
        WHERE "invoice_number" IS NOT NULL
    `);

    // TVA declaration report queries by business + calendar date [XCC-018]
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_business_created"
        ON "transactions"("business_id", "created_at")
    `);

    // ── transaction_items ───────────────────────────────────────────
    // [TVA-003]: locked TVA rate at time of sale
    // [TVA-010]: per-line HT/TVA/TTC decomposition
    await queryRunner.query(`
      ALTER TABLE "transaction_items"
        ADD COLUMN "tva_rate" NUMERIC(5,2) NOT NULL DEFAULT 20.00,
        ADD COLUMN "item_ht" NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN "item_tva" NUMERIC(12,2) NOT NULL DEFAULT 0,
        ADD COLUMN "item_ttc" NUMERIC(12,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── transaction_items ───────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "transaction_items"
        DROP COLUMN "item_ttc",
        DROP COLUMN "item_tva",
        DROP COLUMN "item_ht",
        DROP COLUMN "tva_rate"
    `);

    // ── transactions ────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_business_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_transactions_business_invoice"`);
    await queryRunner.query(`
      ALTER TABLE "transactions"
        DROP COLUMN "simpl_tva_sent_at",
        DROP COLUMN "simpl_tva_reference",
        DROP COLUMN "simpl_tva_status",
        DROP COLUMN "total_ttc",
        DROP COLUMN "total_tva",
        DROP COLUMN "total_ht",
        DROP COLUMN "invoice_number"
    `);

    // ── products ────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN "tva_exempt",
        DROP COLUMN "tva_rate"
    `);

    // ── categories ──────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "categories"
        DROP COLUMN "default_tva_rate"
    `);

    // ── businesses ──────────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_businesses_code"`);
    await queryRunner.query(`
      ALTER TABLE "businesses"
        DROP COLUMN "last_invoice_year",
        DROP COLUMN "business_code",
        DROP COLUMN "invoice_counter",
        DROP COLUMN "address",
        DROP COLUMN "if_number",
        DROP COLUMN "ice_number"
    `);
  }
}
