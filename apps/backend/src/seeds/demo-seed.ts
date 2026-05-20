import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// DataSource — mirrors apps/backend/src/config/data-source.ts connection cfg
// ---------------------------------------------------------------------------
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433'),
  username: process.env.DATABASE_USER || 'pos_user',
  password: process.env.DATABASE_PASSWORD || 'pos_password',
  database: process.env.DATABASE_NAME || 'pos_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const q = AppDataSource.query.bind(AppDataSource);

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  try {
    // ── Idempotency guard ─────────────────────────────────────────────────
    const existing = await q(
      `SELECT id FROM super_admins WHERE email = 'admin@pos.ma' LIMIT 1`,
    );
    if (existing.length > 0) {
      console.log('Database already seeded. Skipping.');
      return;
    }

    // ── 1. Super Admin ────────────────────────────────────────────────────
    console.log('Seeding super admin...');
    const superAdminPwHash = await bcrypt.hash('admin123', 10);
    const superAdminId = uuid();
    await q(
      `INSERT INTO super_admins (id, email, password_hash, name, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [superAdminId, 'admin@pos.ma', superAdminPwHash, 'Admin Principal', '+212522000000', true, now(), now()],
    );

    // ── 2. Business Types ─────────────────────────────────────────────────
    console.log('Seeding business types...');
    let restaurantTypeId: string;
    let retailTypeId: string;

    const existingRestaurant = await q(
      `SELECT id FROM business_types WHERE name = 'restaurant' LIMIT 1`,
    );
    if (existingRestaurant.length > 0) {
      restaurantTypeId = existingRestaurant[0].id;
    } else {
      restaurantTypeId = uuid();
      await q(
        `INSERT INTO business_types (id, name, label, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [restaurantTypeId, 'restaurant', 'Restaurant / Café', 'Restaurants, cafés and food service', true, now(), now()],
      );
    }

    const existingRetail = await q(
      `SELECT id FROM business_types WHERE name = 'retail' LIMIT 1`,
    );
    if (existingRetail.length > 0) {
      retailTypeId = existingRetail[0].id;
    } else {
      retailTypeId = uuid();
      await q(
        `INSERT INTO business_types (id, name, label, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [retailTypeId, 'retail', 'Retail', 'General retail and boutiques', true, now(), now()],
      );
    }

    // ── 3. Businesses ─────────────────────────────────────────────────────
    console.log('Seeding businesses...');
    const atlasId = uuid();
    const boutiqueId = uuid();

    await q(
      `INSERT INTO businesses
         (id, business_type_id, name, legal_name, email, phone, currency, timezone,
          is_active, settings_json, ice_number, if_number, address, business_code,
          invoice_counter, points_earn_divisor, points_redeem_value, customer_counter,
          promotion_stacking_mode, chain_role, created_at, updated_at)
       VALUES
         ($1,  $2,  $3,  $4,  $5,  $6,  $7,  $8,
          $9,  $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22)`,
      [
        atlasId, restaurantTypeId, 'Café Atlas', 'Café Atlas SARL',
        'atlas@pos.ma', '+212522112233', 'MAD', 'Africa/Casablanca',
        true, '{}', '001234567000010', '12345678',
        '12 Avenue Hassan II, Casablanca', 'ATLAS',
        0, 10, 1, 0,
        'best_only', 'standalone', now(), now(),
      ],
    );

    await q(
      `INSERT INTO businesses
         (id, business_type_id, name, legal_name, email, phone, currency, timezone,
          is_active, settings_json, ice_number, if_number, address, business_code,
          invoice_counter, points_earn_divisor, points_redeem_value, customer_counter,
          promotion_stacking_mode, chain_role, created_at, updated_at)
       VALUES
         ($1,  $2,  $3,  $4,  $5,  $6,  $7,  $8,
          $9,  $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22)`,
      [
        boutiqueId, retailTypeId, 'Boutique Marrakech', 'Boutique Marrakech SARL',
        'boutique@pos.ma', '+212524334455', 'MAD', 'Africa/Casablanca',
        true, '{}', '009876543000022', '87654321',
        '45 Rue Moulay Ismail, Marrakech', 'BT-MRK',
        0, 20, 1, 0,
        'best_only', 'standalone', now(), now(),
      ],
    );

    // ── 4. Locations ──────────────────────────────────────────────────────
    console.log('Seeding locations...');
    const atlasCentreLocId = uuid();
    const atlasMaarifLocId = uuid();
    const boutiqueLocId    = uuid();

    await q(
      `INSERT INTO locations (id, business_id, name, address, is_active, created_at, updated_at) VALUES
         ($1, $2, $3, $4, true, $5, $6),
         ($7, $8, $9, $10, true, $11, $12),
         ($13, $14, $15, $16, true, $17, $18)`,
      [
        atlasCentreLocId, atlasId, 'Café Atlas - Centre', '12 Avenue Hassan II, Casablanca', now(), now(),
        atlasMaarifLocId, atlasId, 'Café Atlas - Maarif', '88 Rue Abdelkader, Casablanca',    now(), now(),
        boutiqueLocId,    boutiqueId, 'Boutique Marrakech - Médina', '45 Rue Moulay Ismail, Marrakech', now(), now(),
      ],
    );

    // ── 5. Users ──────────────────────────────────────────────────────────
    console.log('Seeding users...');
    const ownerPwHash = await bcrypt.hash('owner123', 10);
    const empPwHash   = await bcrypt.hash('emp123',   10);

    const atlasOwnerId    = uuid();
    const atlasSarahId    = uuid();
    const atlasHassanId   = uuid();
    const boutiqueOwnerId = uuid();
    const boutiqueKarimId = uuid();

    // Café Atlas owner
    await q(
      `INSERT INTO users
         (id, business_id, email, password_hash, first_name, last_name, role,
          is_active, dashboard_access, permissions, language_preference, accessible_business_ids, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [atlasOwnerId, atlasId, 'owner.atlas@pos.ma', ownerPwHash, 'Youssef', 'Benali', 'owner',
       true, true, '{}', 'fr', '{}', now(), now()],
    );

    // Café Atlas employees
    await q(
      `INSERT INTO users
         (id, business_id, email, password_hash, first_name, last_name, role,
          is_active, dashboard_access, permissions, language_preference, accessible_business_ids, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [atlasSarahId, atlasId, 'sarah@pos.ma', empPwHash, 'Sarah', 'Idrissi', 'employee',
       true, false, '{}', 'fr', '{}', now(), now()],
    );
    await q(
      `INSERT INTO users
         (id, business_id, email, password_hash, first_name, last_name, role,
          is_active, dashboard_access, permissions, language_preference, accessible_business_ids, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [atlasHassanId, atlasId, 'hassan@pos.ma', empPwHash, 'Hassan', 'Moukrim', 'employee',
       true, false, '{}', 'fr', '{}', now(), now()],
    );

    // Boutique Marrakech owner
    await q(
      `INSERT INTO users
         (id, business_id, email, password_hash, first_name, last_name, role,
          is_active, dashboard_access, permissions, language_preference, accessible_business_ids, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [boutiqueOwnerId, boutiqueId, 'owner.boutique@pos.ma', ownerPwHash, 'Fatima', 'Zahra', 'owner',
       true, true, '{}', 'fr', '{}', now(), now()],
    );

    // Boutique Marrakech employee
    await q(
      `INSERT INTO users
         (id, business_id, email, password_hash, first_name, last_name, role,
          is_active, dashboard_access, permissions, language_preference, accessible_business_ids, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [boutiqueKarimId, boutiqueId, 'karim@pos.ma', empPwHash, 'Karim', 'Hajji', 'employee',
       true, false, '{}', 'fr', '{}', now(), now()],
    );

    // ── 6. Categories ─────────────────────────────────────────────────────
    console.log('Seeding categories...');

    // Café Atlas categories
    const catBoissonsChaudesId  = uuid();
    const catBoissonsFroidesId  = uuid();
    const catPatisseriesId      = uuid();
    const catSandwichsId        = uuid();
    const catPlatsChaudsId      = uuid();

    await q(
      `INSERT INTO categories (id, business_id, name, sort_order, is_active, default_tva_rate, created_at, updated_at) VALUES
         ($1,$2,'Boissons Chaudes',  1, true, 20, $3,$4),
         ($5,$6,'Boissons Froides',  2, true, 20, $7,$8),
         ($9,$10,'Pâtisseries',      3, true, 20, $11,$12),
         ($13,$14,'Sandwichs',       4, true, 20, $15,$16),
         ($17,$18,'Plats Chauds',    5, true, 20, $19,$20)`,
      [
        catBoissonsChaudesId, atlasId, now(), now(),
        catBoissonsFroidesId, atlasId, now(), now(),
        catPatisseriesId,     atlasId, now(), now(),
        catSandwichsId,       atlasId, now(), now(),
        catPlatsChaudsId,     atlasId, now(), now(),
      ],
    );

    // Boutique Marrakech categories
    const catVetFemmeId    = uuid();
    const catVetHommeId    = uuid();
    const catAccessoiresId = uuid();
    const catChaussuresId  = uuid();
    const catSacsId        = uuid();

    await q(
      `INSERT INTO categories (id, business_id, name, sort_order, is_active, default_tva_rate, created_at, updated_at) VALUES
         ($1,$2,'Vêtements Femme',      1, true, 20, $3,$4),
         ($5,$6,'Vêtements Homme',      2, true, 20, $7,$8),
         ($9,$10,'Accessoires',         3, true, 20, $11,$12),
         ($13,$14,'Chaussures',         4, true, 20, $15,$16),
         ($17,$18,'Sacs & Maroquinerie',5, true, 20, $19,$20)`,
      [
        catVetFemmeId,    boutiqueId, now(), now(),
        catVetHommeId,    boutiqueId, now(), now(),
        catAccessoiresId, boutiqueId, now(), now(),
        catChaussuresId,  boutiqueId, now(), now(),
        catSacsId,        boutiqueId, now(), now(),
      ],
    );

    // ── 7. Products ───────────────────────────────────────────────────────
    console.log('Seeding products...');

    // Helper: insert a product, returns its id
    async function insertProduct(
      businessId: string,
      categoryId: string,
      name: string,
      price: number,
    ): Promise<string> {
      const id = uuid();
      await q(
        `INSERT INTO products
           (id, business_id, category_id, name, price, is_active, is_sold_out,
            tva_exempt, sort_order, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,true,false,false,0,$6,$7)`,
        [id, businessId, categoryId, name, price, now(), now()],
      );
      return id;
    }

    // Café Atlas — Boissons Chaudes
    await insertProduct(atlasId, catBoissonsChaudesId, 'Café Noir',      12);
    await insertProduct(atlasId, catBoissonsChaudesId, 'Café au Lait',   15);
    await insertProduct(atlasId, catBoissonsChaudesId, 'Thé à la Menthe',10);
    await insertProduct(atlasId, catBoissonsChaudesId, 'Cappuccino',     18);

    // Café Atlas — Boissons Froides
    await insertProduct(atlasId, catBoissonsFroidesId, "Jus d'Orange",          18);
    await insertProduct(atlasId, catBoissonsFroidesId, 'Citronnade',            15);
    await insertProduct(atlasId, catBoissonsFroidesId, 'Smoothie Fruits Rouges',25);

    // Café Atlas — Pâtisseries (keep first 3 ids for recommendation template)
    const patisserie1Id = await insertProduct(atlasId, catPatisseriesId, 'Croissant',       8);
    const patisserie2Id = await insertProduct(atlasId, catPatisseriesId, 'Pain au Chocolat',10);
    const patisserie3Id = await insertProduct(atlasId, catPatisseriesId, 'Éclair au Café',  12);
    await insertProduct(atlasId, catPatisseriesId, 'Cornet', 6);

    // Café Atlas — Sandwichs
    await insertProduct(atlasId, catSandwichsId, 'Sandwich Poulet',  35);
    await insertProduct(atlasId, catSandwichsId, 'Sandwich Thon',    30);
    await insertProduct(atlasId, catSandwichsId, 'Croque Monsieur',  28);

    // Café Atlas — Plats Chauds
    await insertProduct(atlasId, catPlatsChaudsId, 'Tajine Poulet', 65);
    await insertProduct(atlasId, catPlatsChaudsId, 'Couscous',      70);
    await insertProduct(atlasId, catPlatsChaudsId, 'Pastilla',      75);

    // Boutique Marrakech — Vêtements Femme (keep first 3 ids for recommendation template)
    const vetFemme1Id = await insertProduct(boutiqueId, catVetFemmeId, 'Robe Caftan',   450);
    const vetFemme2Id = await insertProduct(boutiqueId, catVetFemmeId, 'Blouse Brodée', 280);
    const vetFemme3Id = await insertProduct(boutiqueId, catVetFemmeId, 'Jupe Longue',   220);

    // Boutique Marrakech — Vêtements Homme
    await insertProduct(boutiqueId, catVetHommeId, 'Djellaba Homme',        380);
    await insertProduct(boutiqueId, catVetHommeId, 'Chemise Traditionnelle',250);
    await insertProduct(boutiqueId, catVetHommeId, 'Pantalon Lin',          180);

    // Boutique Marrakech — Accessoires
    await insertProduct(boutiqueId, catAccessoiresId, 'Ceinture Cuir',  120);
    await insertProduct(boutiqueId, catAccessoiresId, 'Écharpe Laine',   85);
    await insertProduct(boutiqueId, catAccessoiresId, 'Chapeau Paille',  95);

    // Boutique Marrakech — Chaussures
    await insertProduct(boutiqueId, catChaussuresId, 'Babouches Femme', 190);
    await insertProduct(boutiqueId, catChaussuresId, 'Babouches Homme', 175);
    await insertProduct(boutiqueId, catChaussuresId, 'Sandales',        220);

    // Boutique Marrakech — Sacs & Maroquinerie
    await insertProduct(boutiqueId, catSacsId, 'Sac Cuir',        650);
    await insertProduct(boutiqueId, catSacsId, 'Pochette Brodée', 180);
    await insertProduct(boutiqueId, catSacsId, 'Porte-monnaie',    75);

    // ── 8. Customer Grades ────────────────────────────────────────────────
    console.log('Seeding customer grades...');

    const atlasSilverGradeId  = uuid();
    const atlasGoldGradeId    = uuid();
    const boutiqueSilverGradeId = uuid();
    const boutiqueGoldGradeId   = uuid();

    await q(
      `INSERT INTO customer_grades
         (id, business_id, name, min_points, discount_percent, points_multiplier, color_hex, sort_order, is_active)
       VALUES
         ($1,$2,'Silver',500, 5.00, 1.50,'#C0C0C0',1,true),
         ($3,$4,'Gold',  2000,10.00,2.00,'#FFD700',2,true)`,
      [atlasSilverGradeId, atlasId, atlasGoldGradeId, atlasId],
    );

    await q(
      `INSERT INTO customer_grades
         (id, business_id, name, min_points, discount_percent, points_multiplier, color_hex, sort_order, is_active)
       VALUES
         ($1,$2,'Silver',500, 5.00, 1.50,'#C0C0C0',1,true),
         ($3,$4,'Gold',  2000,10.00,2.00,'#FFD700',2,true)`,
      [boutiqueSilverGradeId, boutiqueId, boutiqueGoldGradeId, boutiqueId],
    );

    // ── 9. Customers ──────────────────────────────────────────────────────
    console.log('Seeding customers...');

    interface CustomerRow {
      firstName: string;
      lastName:  string;
      phone:     string;
      code:      string;
      gradeId:   string | null;
      points:    number;
    }

    async function insertCustomer(businessId: string, c: CustomerRow): Promise<void> {
      const id = uuid();
      await q(
        `INSERT INTO customers
           (id, business_id, customer_code, phone, first_name, last_name, gender,
            grade_id, points_balance, lifetime_points, is_active, consent_marketing,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true,$11,$12)`,
        [id, businessId, c.code, c.phone, c.firstName, c.lastName, 'unspecified',
         c.gradeId, c.points, c.points, now(), now()],
      );
    }

    const atlasCustomers: CustomerRow[] = [
      { firstName:'Amina',   lastName:'Cherkaoui', phone:'+212661001001', code:'CUST-ATLAS-001', gradeId:atlasSilverGradeId, points:750 },
      { firstName:'Mohamed', lastName:'Alami',     phone:'+212661001002', code:'CUST-ATLAS-002', gradeId:atlasGoldGradeId,   points:2500 },
      { firstName:'Khadija', lastName:'Tazi',      phone:'+212661001003', code:'CUST-ATLAS-003', gradeId:null,               points:120 },
      { firstName:'Omar',    lastName:'Fassi',     phone:'+212661001004', code:'CUST-ATLAS-004', gradeId:atlasSilverGradeId, points:1200 },
      { firstName:'Nadia',   lastName:'Berrada',   phone:'+212661001005', code:'CUST-ATLAS-005', gradeId:null,               points:50 },
      { firstName:'Rachid',  lastName:'Chraibi',   phone:'+212661001006', code:'CUST-ATLAS-006', gradeId:atlasGoldGradeId,   points:3100 },
      { firstName:'Samira',  lastName:'Bensouda',  phone:'+212661001007', code:'CUST-ATLAS-007', gradeId:atlasSilverGradeId, points:890 },
      { firstName:'Kamal',   lastName:'Lahlou',    phone:'+212661001008', code:'CUST-ATLAS-008', gradeId:null,               points:0 },
      { firstName:'Houda',   lastName:'Sebbahi',   phone:'+212661001009', code:'CUST-ATLAS-009', gradeId:atlasSilverGradeId, points:620 },
      { firstName:'Yassine', lastName:'Qabbaj',    phone:'+212661001010', code:'CUST-ATLAS-010', gradeId:null,               points:200 },
    ];

    for (const c of atlasCustomers) {
      await insertCustomer(atlasId, c);
    }

    const boutiqueCustomers: CustomerRow[] = [
      { firstName:'Fatima',      lastName:'Ait Benhaddou', phone:'+212662002001', code:'CUST-BT-001', gradeId:boutiqueSilverGradeId, points:600 },
      { firstName:'Abderrahim',  lastName:'Mansouri',      phone:'+212662002002', code:'CUST-BT-002', gradeId:boutiqueGoldGradeId,   points:2800 },
      { firstName:'Meriem',      lastName:'Ouazzani',      phone:'+212662002003', code:'CUST-BT-003', gradeId:null,                  points:80 },
      { firstName:'Driss',       lastName:'Benali',        phone:'+212662002004', code:'CUST-BT-004', gradeId:boutiqueSilverGradeId, points:1100 },
      { firstName:'Zineb',       lastName:'Kettani',       phone:'+212662002005', code:'CUST-BT-005', gradeId:null,                  points:30 },
      { firstName:'Hamid',       lastName:'Ghozlane',      phone:'+212662002006', code:'CUST-BT-006', gradeId:boutiqueGoldGradeId,   points:3500 },
      { firstName:'Loubna',      lastName:'Tahiri',        phone:'+212662002007', code:'CUST-BT-007', gradeId:boutiqueSilverGradeId, points:950 },
      { firstName:'Sami',        lastName:'El Fassi',      phone:'+212662002008', code:'CUST-BT-008', gradeId:null,                  points:0 },
      { firstName:'Karima',      lastName:'Rahmani',       phone:'+212662002009', code:'CUST-BT-009', gradeId:null,                  points:150 },
      { firstName:'Bilal',       lastName:'Oujdi',         phone:'+212662002010', code:'CUST-BT-010', gradeId:boutiqueSilverGradeId, points:710 },
    ];

    for (const c of boutiqueCustomers) {
      await insertCustomer(boutiqueId, c);
    }

    // ── 10. Restaurant Setup (Café Atlas only) ────────────────────────────
    console.log('Seeding restaurant setup...');

    // Table types
    const ttStandardId  = uuid();
    const ttTerrasseId  = uuid();

    await q(
      `INSERT INTO table_types (id, business_id, name, default_capacity, is_active) VALUES
         ($1,$2,'Standard', 4, true),
         ($3,$4,'Terrasse', 2, true)`,
      [ttStandardId, atlasId, ttTerrasseId, atlasId],
    );

    // Dining area — linked to atlas_centre location
    const salleAreaId = uuid();
    await q(
      `INSERT INTO dining_areas (id, business_id, location_id, name, sort_order, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,'Salle Principale',1,true,$4,$5)`,
      [salleAreaId, atlasId, atlasCentreLocId, now(), now()],
    );

    // Tables
    const tablesData = [
      { num:'T01', capacity:4, typeId:ttStandardId },
      { num:'T02', capacity:4, typeId:ttStandardId },
      { num:'T03', capacity:2, typeId:ttTerrasseId  },
      { num:'T04', capacity:4, typeId:ttStandardId },
      { num:'T05', capacity:2, typeId:ttTerrasseId  },
      { num:'T06', capacity:6, typeId:ttStandardId },
    ];

    for (const t of tablesData) {
      await q(
        `INSERT INTO tables
           (id, business_id, location_id, area_id, table_type_id, table_number, capacity, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [uuid(), atlasId, atlasCentreLocId, salleAreaId, t.typeId, t.num, t.capacity],
      );
    }

    // ── 11. Warehouses ────────────────────────────────────────────────────
    console.log('Seeding warehouses...');

    await q(
      `INSERT INTO warehouses (id, business_id, name, code, is_central, linked_location_id, is_active, created_at, updated_at)
       VALUES
         ($1,$2,'Dépôt Atlas Centre', 'WH-ATLAS-01',false,$3,true,$4,$5),
         ($6,$7,'Dépôt Atlas Maarif', 'WH-ATLAS-02',false,$8,true,$9,$10),
         ($11,$12,'Dépôt Boutique Médina','WH-BT-01',true,$13,true,$14,$15)`,
      [
        uuid(), atlasId,    atlasCentreLocId, now(), now(),
        uuid(), atlasId,    atlasMaarifLocId, now(), now(),
        uuid(), boutiqueId, boutiqueLocId,    now(), now(),
      ],
    );

    // ── 12. Vendors ───────────────────────────────────────────────────────
    console.log('Seeding vendors...');

    await q(
      `INSERT INTO vendors (id, business_id, code, name, contact_phone, payment_terms_days, is_active, created_at, updated_at)
       VALUES
         ($1,$2,'VND-ATLAS-01','Grossiste Maroc Foods','+212522001122',30,true,$3,$4),
         ($5,$6,'VND-ATLAS-02','Boulangerie Atlas',     NULL,           7, true,$7,$8)`,
      [
        uuid(), atlasId, now(), now(),
        uuid(), atlasId, now(), now(),
      ],
    );

    await q(
      `INSERT INTO vendors (id, business_id, code, name, contact_phone, payment_terms_days, is_active, created_at, updated_at)
       VALUES
         ($1,$2,'VND-BT-01','Artisanat Marrakech','+212524112233',30,true,$3,$4),
         ($5,$6,'VND-BT-02','Textile Casablanca',  NULL,           45,true,$7,$8)`,
      [
        uuid(), boutiqueId, now(), now(),
        uuid(), boutiqueId, now(), now(),
      ],
    );

    // ── 13. Promotions ────────────────────────────────────────────────────
    console.log('Seeding promotions...');

    // Café Atlas — Happy Hour Café
    // valid_date_type: 'D' = daily range (start/end date only), day_type: 'T' = time-specific
    await q(
      `INSERT INTO promotions
         (id, business_id, code, name, promotion_type, value, start_date, end_date,
          valid_date_type, day_type, time_periods, invalid_date_periods,
          target_audience, max_total_uses, max_uses_per_customer,
          min_order_total_ttc, notify_sms, notify_email, notify_whatsapp,
          applicable_location_ids, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [
        uuid(), atlasId, 'HAPPYHOUR', 'Happy Hour Café', 'percent_off_order', 15,
        '2026-01-01', '2026-12-31',
        'D', 'T',
        JSON.stringify([{ start: '14:00', end: '17:00' }]),
        JSON.stringify([]),
        'all', 0, 1,
        0, false, false, false,
        '{}', 'active', now(), now(),
      ],
    );

    // Boutique Marrakech — Soldes Été
    // valid_date_type: 'D' = date range, day_type: 'A' = all day
    await q(
      `INSERT INTO promotions
         (id, business_id, code, name, promotion_type, value, start_date, end_date,
          valid_date_type, day_type, time_periods, invalid_date_periods,
          target_audience, max_total_uses, max_uses_per_customer,
          min_order_total_ttc, notify_sms, notify_email, notify_whatsapp,
          applicable_location_ids, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [
        uuid(), boutiqueId, 'SOLDES20', 'Soldes Été', 'percent_off_order', 20,
        '2026-05-01', '2026-07-31',
        'D', 'A',
        null,
        JSON.stringify([]),
        'all', 0, 0,
        0, false, false, false,
        '{}', 'active', now(), now(),
      ],
    );

    // ── 14. Coupon Types ──────────────────────────────────────────────────
    console.log('Seeding coupon types...');

    await q(
      `INSERT INTO coupon_types
         (id, business_id, code, name, discount_type, discount_value,
          validity_days_from_issue, is_active,
          applicable_category_ids, applicable_product_ids,
          min_order_total_ttc, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}'::uuid[],'{}'::uuid[],$9,$10,$11)`,
      [uuid(), atlasId, 'CAFEOFF', 'Café Offert', 'fixed', 12, 30, true, 0, now(), now()],
    );

    await q(
      `INSERT INTO coupon_types
         (id, business_id, code, name, discount_type, discount_value,
          validity_days_from_issue, is_active,
          applicable_category_ids, applicable_product_ids,
          min_order_total_ttc, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}'::uuid[],'{}'::uuid[],$9,$10,$11)`,
      [uuid(), boutiqueId, 'FIDELITE', 'Remise Fidélité', 'percentage', 10, 60, true, 0, now(), now()],
    );

    // ── 15. Recommendation Templates ─────────────────────────────────────
    console.log('Seeding recommendation templates...');

    // Café Atlas — Suggestions du Jour (first 3 pâtisseries)
    const atlasTemplateId = uuid();
    await q(
      `INSERT INTO recommendation_templates
         (id, business_id, name, template_type, is_active, max_recommendations, display_order, created_at, updated_at)
       VALUES ($1,$2,$3,'manual',true,$4,$5,$6,$7)`,
      [atlasTemplateId, atlasId, 'Suggestions du Jour', 5, 1, now(), now()],
    );

    await q(
      `INSERT INTO recommendation_template_items
         (id, template_id, product_id, priority, is_active, created_at)
       VALUES
         ($1,$2,$3,1,true,$4),
         ($5,$6,$7,2,true,$8),
         ($9,$10,$11,3,true,$12)`,
      [
        uuid(), atlasTemplateId, patisserie1Id, now(),
        uuid(), atlasTemplateId, patisserie2Id, now(),
        uuid(), atlasTemplateId, patisserie3Id, now(),
      ],
    );

    // Boutique Marrakech — Bestsellers (first 3 vêtements femme)
    const boutiqueTemplateId = uuid();
    await q(
      `INSERT INTO recommendation_templates
         (id, business_id, name, template_type, is_active, max_recommendations, display_order, created_at, updated_at)
       VALUES ($1,$2,$3,'manual',true,$4,$5,$6,$7)`,
      [boutiqueTemplateId, boutiqueId, 'Bestsellers', 5, 1, now(), now()],
    );

    await q(
      `INSERT INTO recommendation_template_items
         (id, template_id, product_id, priority, is_active, created_at)
       VALUES
         ($1,$2,$3,1,true,$4),
         ($5,$6,$7,2,true,$8),
         ($9,$10,$11,3,true,$12)`,
      [
        uuid(), boutiqueTemplateId, vetFemme1Id, now(),
        uuid(), boutiqueTemplateId, vetFemme2Id, now(),
        uuid(), boutiqueTemplateId, vetFemme3Id, now(),
      ],
    );

    // ── Done ──────────────────────────────────────────────────────────────
    console.log('✅ Seed complete!');
    console.log('');
    console.log('Demo credentials:');
    console.log('  Super Admin:    admin@pos.ma / admin123');
    console.log('  Atlas Owner:    owner.atlas@pos.ma / owner123');
    console.log('  Boutique Owner: owner.boutique@pos.ma / owner123');
    console.log('  Employees:      sarah@pos.ma, hassan@pos.ma, karim@pos.ma / emp123');
    console.log('');
    console.log('Swagger: http://localhost:3000/api/docs');
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch(console.error);
