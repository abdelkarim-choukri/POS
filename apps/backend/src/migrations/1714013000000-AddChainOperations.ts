import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChainOperations1714013000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    // ── New tables ────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE user_business_roles (
        user_id     UUID NOT NULL,
        business_id UUID NOT NULL,
        role        VARCHAR(20) NOT NULL,
        granted_by_user_id UUID,
        granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, business_id)
      )
    `);
    await qr.query(`CREATE INDEX idx_ubr_business_id ON user_business_roles(business_id)`);

    await qr.query(`
      CREATE TABLE chain_sync_configs (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_business_id  UUID NOT NULL UNIQUE,
        child_business_ids  UUID[] NOT NULL DEFAULT '{}',
        sync_categories     BOOLEAN NOT NULL DEFAULT true,
        sync_products       BOOLEAN NOT NULL DEFAULT true,
        sync_variants       BOOLEAN NOT NULL DEFAULT true,
        sync_modifiers      BOOLEAN NOT NULL DEFAULT true,
        sync_prices         BOOLEAN NOT NULL DEFAULT false,
        auto_sync_on_change BOOLEAN NOT NULL DEFAULT false,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── businesses ────────────────────────────────────────────────────────
    await qr.query(`ALTER TABLE businesses ADD COLUMN parent_business_id UUID NULL`);
    await qr.query(`ALTER TABLE businesses ADD CONSTRAINT fk_businesses_parent FOREIGN KEY (parent_business_id) REFERENCES businesses(id) ON DELETE SET NULL`);
    await qr.query(`ALTER TABLE businesses ADD COLUMN chain_role VARCHAR(20) NOT NULL DEFAULT 'standalone'`);
    await qr.query(`CREATE INDEX idx_businesses_parent ON businesses(parent_business_id) WHERE parent_business_id IS NOT NULL`);

    // ── users ─────────────────────────────────────────────────────────────
    await qr.query(`ALTER TABLE users ADD COLUMN accessible_business_ids UUID[] NOT NULL DEFAULT '{}'`);

    // ── catalogue tables ──────────────────────────────────────────────────
    await qr.query(`ALTER TABLE categories ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE products ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE product_variants ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE modifier_groups ADD COLUMN synced_from_parent_id UUID NULL`);
    await qr.query(`ALTER TABLE modifiers ADD COLUMN synced_from_parent_id UUID NULL`);

    // ── promotions (CHN-030 tracking) ─────────────────────────────────────
    await qr.query(`ALTER TABLE promotions ADD COLUMN synced_from_parent_id UUID NULL`);

    // ── partial unique indexes for ON CONFLICT upserts ────────────────────
    await qr.query(`CREATE UNIQUE INDEX idx_products_biz_synced ON products(business_id, synced_from_parent_id) WHERE synced_from_parent_id IS NOT NULL`);
    await qr.query(`CREATE UNIQUE INDEX idx_categories_biz_synced ON categories(business_id, synced_from_parent_id) WHERE synced_from_parent_id IS NOT NULL`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_products_biz_synced`);
    await qr.query(`DROP INDEX IF EXISTS idx_categories_biz_synced`);
    await qr.query(`ALTER TABLE promotions DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE modifiers DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE modifier_groups DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE product_variants DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE products DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE categories DROP COLUMN IF EXISTS synced_from_parent_id`);
    await qr.query(`ALTER TABLE users DROP COLUMN IF EXISTS accessible_business_ids`);
    await qr.query(`DROP INDEX IF EXISTS idx_businesses_parent`);
    await qr.query(`ALTER TABLE businesses DROP CONSTRAINT IF EXISTS fk_businesses_parent`);
    await qr.query(`ALTER TABLE businesses DROP COLUMN IF EXISTS chain_role`);
    await qr.query(`ALTER TABLE businesses DROP COLUMN IF EXISTS parent_business_id`);
    await qr.query(`DROP TABLE IF EXISTS chain_sync_configs`);
    await qr.query(`DROP INDEX IF EXISTS idx_ubr_business_id`);
    await qr.query(`DROP TABLE IF EXISTS user_business_roles`);
  }
}
