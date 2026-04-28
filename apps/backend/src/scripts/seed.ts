// apps/backend/src/scripts/seed.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { dataSourceOptions } from '../config/data-source';

async function seed() {
  const ds = new DataSource({ ...dataSourceOptions, entities: ['src/**/*.entity.ts'] });
  await ds.initialize();
  console.log('Connected to database');

  const qr = ds.createQueryRunner();

  // ── Idempotency guard ────────────────────────────────────────────────────
  // If T-001 already exists the seed has already run — skip everything
  // so running seed twice never crashes on the unique terminal_code constraint.
  const existing = await qr.query(
    `SELECT id FROM terminals WHERE terminal_code = 'T-001'`
  );
  if (existing.length > 0) {
    console.log('Seed data already present (T-001 found) — skipping.');
    await ds.destroy();
    return;
  }
  // ────────────────────────────────────────────────────────────────────────

  // 1. Super Admin
  const passwordHash = await bcrypt.hash('admin123', 10);
  await qr.query(`
    INSERT INTO super_admins (id, email, password_hash, name, phone, is_active)
    VALUES (uuid_generate_v4(), 'admin@pos.com', $1, 'Super Admin', '+212600000000', true)
    ON CONFLICT DO NOTHING
  `, [passwordHash]);
  console.log('Super Admin created: admin@pos.com / admin123');

  // 2. Business Types
  const retailId = await qr.query(`
    INSERT INTO business_types (id, name, label, description, is_active)
    VALUES (uuid_generate_v4(), 'retail', 'Retail Store', 'General retail business', true)
    RETURNING id
  `);
  const retailTypeId = retailId[0].id;

  const restaurantId = await qr.query(`
    INSERT INTO business_types (id, name, label, description, is_active)
    VALUES (uuid_generate_v4(), 'restaurant', 'Restaurant / Café', 'Food and beverage business', true)
    RETURNING id
  `);
  const restaurantTypeId = restaurantId[0].id;

  await qr.query(`INSERT INTO business_types (id, name, label, description) VALUES (uuid_generate_v4(), 'pharmacy', 'Pharmacy', 'Pharmaceutical retail')`);
  await qr.query(`INSERT INTO business_types (id, name, label, description) VALUES (uuid_generate_v4(), 'salon', 'Salon / Spa', 'Beauty and wellness services')`);
  await qr.query(`INSERT INTO business_types (id, name, label, description) VALUES (uuid_generate_v4(), 'hotel', 'Hotel', 'Hospitality business')`);
  console.log('Business types created');

  // 3. Features
  const features = [
    { type: retailTypeId,     key: 'variants',  enabled: true },
    { type: retailTypeId,     key: 'sold_out',  enabled: true },
    { type: retailTypeId,     key: 'clock_in',  enabled: true },
    { type: restaurantTypeId, key: 'modifiers', enabled: true },
    { type: restaurantTypeId, key: 'variants',  enabled: true },
    { type: restaurantTypeId, key: 'sold_out',  enabled: true },
    { type: restaurantTypeId, key: 'clock_in',  enabled: true },
  ];
  for (const f of features) {
    await qr.query(`
      INSERT INTO business_type_features (id, business_type_id, feature_key, is_enabled)
      VALUES (uuid_generate_v4(), $1, $2, $3)
    `, [f.type, f.key, f.enabled]);
  }
  console.log('Features configured');

  // 4. Demo business
  const bizResult = await qr.query(`
    INSERT INTO businesses
      (id, business_type_id, name, legal_name, email, phone, currency, timezone, is_active)
    VALUES
      (uuid_generate_v4(), $1, 'Demo Retail Store', 'Demo SARL',
       'demo@store.com', '+212611111111', 'MAD', 'Africa/Casablanca', true)
    RETURNING id
  `, [retailTypeId]);
  const bizId = bizResult[0].id;

  await qr.query(`
    INSERT INTO subscriptions (id, business_id, plan_name, status, start_date, price_mad)
    VALUES (uuid_generate_v4(), $1, 'premium', 'active', CURRENT_DATE, 299.00)
  `, [bizId]);

  const locResult = await qr.query(`
    INSERT INTO locations (id, business_id, name, address, city)
    VALUES (uuid_generate_v4(), $1, 'Main Store', '123 Mohammed V Blvd', 'Casablanca')
    RETURNING id
  `, [bizId]);
  const locId = locResult[0].id;

  // Terminal — uses ON CONFLICT so safe if somehow T-001 slipped in
  await qr.query(`
    INSERT INTO terminals (id, location_id, terminal_code, device_name, is_active)
    VALUES (uuid_generate_v4(), $1, 'T-001', 'Front Counter', true)
    ON CONFLICT (terminal_code) DO NOTHING
  `, [locId]);

  // Owner — PIN 1234 (what the e2e test uses)
  const ownerHash = await bcrypt.hash('owner123', 10);
  await qr.query(`
    INSERT INTO users
      (id, business_id, email, password_hash, pin, first_name, last_name,
       role, dashboard_access, can_void, can_refund, is_active)
    VALUES
      (uuid_generate_v4(), $1, 'owner@demo.com', $2, '1234',
       'Ahmed', 'Choukri', 'owner', true, true, true, true)
  `, [bizId, ownerHash]);

  // Employee — PIN 5678
  const empHash = await bcrypt.hash('emp123', 10);
  await qr.query(`
    INSERT INTO users
      (id, business_id, email, password_hash, pin, first_name, last_name,
       role, dashboard_access, can_void, can_refund, is_active)
    VALUES
      (uuid_generate_v4(), $1, 'emp@demo.com', $2, '5678',
       'Fatima', 'Benali', 'employee', false, false, false, true)
  `, [bizId, empHash]);

  // Categories
  const catElec  = await qr.query(`INSERT INTO categories (id, business_id, name, sort_order) VALUES (uuid_generate_v4(), $1, 'Electronics', 1) RETURNING id`, [bizId]);
  const catCloth = await qr.query(`INSERT INTO categories (id, business_id, name, sort_order) VALUES (uuid_generate_v4(), $1, 'Clothing',    2) RETURNING id`, [bizId]);
  const catAcc   = await qr.query(`INSERT INTO categories (id, business_id, name, sort_order) VALUES (uuid_generate_v4(), $1, 'Accessories', 3) RETURNING id`, [bizId]);

  // Products
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'Wireless Earbuds', 299.00, 150.00, 'ELEC-001', 1)`, [bizId, catElec[0].id]);
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'Phone Case',       79.00,  25.00,  'ELEC-002', 2)`, [bizId, catElec[0].id]);
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'USB-C Cable',      49.00,  15.00,  'ELEC-003', 3)`, [bizId, catElec[0].id]);
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'T-Shirt',         149.00,  60.00,  'CLO-001',  1)`, [bizId, catCloth[0].id]);
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'Jeans',           349.00, 140.00,  'CLO-002',  2)`, [bizId, catCloth[0].id]);
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'Leather Belt',    199.00,  80.00,  'ACC-001',  1)`, [bizId, catAcc[0].id]);
  await qr.query(`INSERT INTO products (id, business_id, category_id, name, price, cost_price, sku, sort_order) VALUES (uuid_generate_v4(), $1, $2, 'Sunglasses',      249.00,  90.00,  'ACC-002',  2)`, [bizId, catAcc[0].id]);

  console.log('Demo business + products seeded');
  console.log('\n=== SEED COMPLETE ===');
  console.log('Super Admin:  admin@pos.com / admin123');
  console.log('Owner:        owner@demo.com / owner123 (PIN: 1234)');
  console.log('Employee:     emp@demo.com / emp123 (PIN: 5678)');
  console.log('Terminal:     T-001');

  await ds.destroy();
}

seed().catch((e) => { console.error(e); process.exit(1); });