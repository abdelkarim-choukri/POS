// apps/backend/src/scripts/seed-test.ts
//
// PURPOSE: Creates the exact fixtures the e2e test suite needs.
// Safe to run multiple times — uses ON CONFLICT DO NOTHING / upserts.
//
// Usage:
//   npx ts-node src/scripts/seed-test.ts
//
// Or from package.json:
//   "test:seed": "ts-node src/scripts/seed-test.ts"

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const FIXED_IDS = {
  businessType : 'aaaaaaaa-0000-0000-0000-000000000001',
  business     : 'bbbbbbbb-0000-0000-0000-000000000001',
  location     : 'cccccccc-0000-0000-0000-000000000001',
  terminal     : 'dddddddd-0000-0000-0000-000000000001',
  owner        : 'eeeeeeee-0000-0000-0000-000000000001',
  employee     : 'ffffffff-0000-0000-0000-000000000001',
  category     : '11111111-0000-0000-0000-000000000001',
  product      : '22222222-0000-0000-0000-000000000001',
};

async function seedTest() {
  const ds = new DataSource({
    type    : 'postgres',
    host    : process.env.DATABASE_HOST     || 'localhost',
    port    : parseInt(process.env.DATABASE_PORT || '5433'),
    username: process.env.DATABASE_USER || 'pos_user',
    password: process.env.DATABASE_PASSWORD || 'pos_password',
    database: process.env.DATABASE_NAME     || 'pos_db',
  });

  await ds.initialize();
  const qr = ds.createQueryRunner();
  await qr.startTransaction();

  try {
    console.log('🌱  Seeding test fixtures...');

    // ── 1. Business type ────────────────────────────────────────────────────
    await qr.query(`
      INSERT INTO business_types (id, name, label, description, is_active)
      VALUES ($1, 'retail_test', 'Retail (Test)', 'Test business type', true)
      ON CONFLICT (id) DO NOTHING
    `, [FIXED_IDS.businessType]);

    // ── 2. Business ─────────────────────────────────────────────────────────
    await qr.query(`
      INSERT INTO businesses
        (id, business_type_id, name, legal_name, email, phone, currency, timezone, is_active)
      VALUES
        ($1, $2, 'Test Business', 'Test Business SARL', 'test@pos.local',
         '+212600000000', 'MAD', 'Africa/Casablanca', true)
      ON CONFLICT (id) DO NOTHING
    `, [FIXED_IDS.business, FIXED_IDS.businessType]);

    // ── 3. Location ─────────────────────────────────────────────────────────
    await qr.query(`
      INSERT INTO locations (id, business_id, name, address, city, is_active)
      VALUES ($1, $2, 'Test Location', '1 Test Street', 'Casablanca', true)
      ON CONFLICT (id) DO NOTHING
    `, [FIXED_IDS.location, FIXED_IDS.business]);

    // ── 4. Terminal — code MUST be T-001 ────────────────────────────────────
    await qr.query(`
      INSERT INTO terminals
        (id, location_id, terminal_code, device_name, is_online, is_active)
      VALUES ($1, $2, 'T-001', 'Test Terminal', true, true)
      ON CONFLICT (id) DO UPDATE SET
        location_id   = EXCLUDED.location_id,
        terminal_code = EXCLUDED.terminal_code,
        is_active     = true
    `, [FIXED_IDS.terminal, FIXED_IDS.location]);

    // Also handle duplicate terminal_code from earlier seeds
    await qr.query(`
      UPDATE terminals
      SET terminal_code = 'T-001-OLD-' || id::text
      WHERE terminal_code = 'T-001'
        AND id != $1
    `, [FIXED_IDS.terminal]);

    // ── 5. Owner (dashboard login) ───────────────────────────────────────────
    const ownerHash = await bcrypt.hash('owner123', 10);
    await qr.query(`
      INSERT INTO users
        (id, business_id, email, password_hash, pin, first_name, last_name,
         role, is_active, can_void, can_refund, dashboard_access)
      VALUES
        ($1, $2, 'testowner@pos.local', $3, '1234',
         'Test', 'Owner', 'owner', true, true, true, true)
      ON CONFLICT (id) DO UPDATE SET
        pin          = '1234',
        business_id  = EXCLUDED.business_id,
        is_active    = true
    `, [FIXED_IDS.owner, FIXED_IDS.business, ownerHash]);

    // ── 6. Employee (PIN-only login) ─────────────────────────────────────────
    const empHash = await bcrypt.hash('emp123', 10);
    await qr.query(`
      INSERT INTO users
        (id, business_id, email, password_hash, pin, first_name, last_name,
         role, is_active, can_void, can_refund, dashboard_access)
      VALUES
        ($1, $2, 'testemployee@pos.local', $3, '9999',
         'Test', 'Employee', 'employee', true, false, false, false)
      ON CONFLICT (id) DO UPDATE SET
        business_id = EXCLUDED.business_id,
        is_active   = true
    `, [FIXED_IDS.employee, FIXED_IDS.business, empHash]);

    // ── 7. Category ──────────────────────────────────────────────────────────
    await qr.query(`
      INSERT INTO categories (id, business_id, name, sort_order, is_active)
      VALUES ($1, $2, 'Test Category', 1, true)
      ON CONFLICT (id) DO NOTHING
    `, [FIXED_IDS.category, FIXED_IDS.business]);

    // ── 8. Product ───────────────────────────────────────────────────────────
    await qr.query(`
      INSERT INTO products
        (id, business_id, category_id, name, price, is_sold_out, is_active, sort_order)
      VALUES ($1, $2, $3, 'Test Product', 25.00, false, true, 1)
      ON CONFLICT (id) DO NOTHING
    `, [FIXED_IDS.product, FIXED_IDS.business, FIXED_IDS.category]);

    await qr.commitTransaction();

    console.log('');
    console.log('✅  Test fixtures ready');
    console.log('');
    console.log('   Terminal code : T-001');
    console.log('   Owner PIN     : 1234  (user: testowner@pos.local)');
    console.log('   Employee PIN  : 9999  (no dashboard access)');
    console.log('');
    console.log('   Fixed IDs (use in tests):');
    Object.entries(FIXED_IDS).forEach(([k, v]) =>
      console.log(`     ${k.padEnd(14)}: ${v}`)
    );
    console.log('');

  } catch (err) {
    await qr.rollbackTransaction();
    console.error('❌  Seed failed:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

seedTest();

// ── Export fixed IDs so test files can import them ──────────────────────────
export { FIXED_IDS };