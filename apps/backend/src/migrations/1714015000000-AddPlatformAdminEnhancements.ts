import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformAdminEnhancements1714015000000 implements MigrationInterface {
  name = 'AddPlatformAdminEnhancements1714015000000';

  async up(qr: QueryRunner): Promise<void> {
    // ── trade_categories ──────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "trade_categories" (
        "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
        "parent_id"               UUID NULL,
        "name"                    VARCHAR(200) NOT NULL,
        "code"                    VARCHAR(50)  NOT NULL,
        "default_business_type_id" UUID NULL,
        "default_settings_json"   JSONB NULL,
        "is_active"               BOOLEAN NOT NULL DEFAULT TRUE,
        "sort_order"              INT NOT NULL DEFAULT 0,
        CONSTRAINT "PK_trade_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trade_categories_parent"
          FOREIGN KEY ("parent_id") REFERENCES "trade_categories"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_trade_categories_code" UNIQUE ("code")
      )
    `);

    // ── couriers ──────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "couriers" (
        "id"                      UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"                    VARCHAR(200) NOT NULL,
        "code"                    VARCHAR(50)  NOT NULL,
        "logo_url"                VARCHAR(500) NULL,
        "api_endpoint"            VARCHAR(500) NULL,
        "tracking_url_template"   VARCHAR(500) NULL,
        "supports_cash_on_delivery" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_active"               BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT "PK_couriers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_couriers_code" UNIQUE ("code")
      )
    `);

    // ── business_courier_links ────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "business_courier_links" (
        "business_id"               UUID NOT NULL,
        "courier_id"                UUID NOT NULL,
        "account_credentials_json"  JSONB NULL,
        "is_default"                BOOLEAN NOT NULL DEFAULT FALSE,
        CONSTRAINT "PK_business_courier_links" PRIMARY KEY ("business_id", "courier_id"),
        CONSTRAINT "FK_bcl_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_bcl_courier"  FOREIGN KEY ("courier_id")  REFERENCES "couriers"("id")  ON DELETE CASCADE
      )
    `);

    // ── business_custom_authority ─────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "business_custom_authority" (
        "business_id"              UUID NOT NULL,
        "feature_overrides_json"   JSONB NOT NULL DEFAULT '{}'::jsonb,
        "permission_overrides_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "set_by_super_admin_id"    UUID NULL,
        "notes"                    TEXT NULL,
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_custom_authority" PRIMARY KEY ("business_id"),
        CONSTRAINT "FK_bca_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // ── version_log_menus ─────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "version_log_menus" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(100) NOT NULL,
        "sort_order" INT NOT NULL DEFAULT 0,
        CONSTRAINT "PK_version_log_menus" PRIMARY KEY ("id")
      )
    `);

    // ── version_log_entries ───────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "version_log_entries" (
        "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
        "menu_id"      UUID NOT NULL,
        "version"      VARCHAR(20)  NOT NULL,
        "description"  TEXT         NOT NULL,
        "published_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "expires_at"   TIMESTAMPTZ  NULL,
        CONSTRAINT "PK_version_log_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vle_menu" FOREIGN KEY ("menu_id") REFERENCES "version_log_menus"("id") ON DELETE CASCADE
      )
    `);

    // ── system_parameters ─────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE "system_parameters" (
        "id"                       UUID NOT NULL DEFAULT gen_random_uuid(),
        "key"                      VARCHAR(100) NOT NULL,
        "param_type"               VARCHAR(40)  NOT NULL,
        "value"                    TEXT         NOT NULL,
        "description"              TEXT         NULL,
        "is_overridable_per_business" BOOLEAN NOT NULL DEFAULT FALSE,
        CONSTRAINT "PK_system_parameters" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_system_parameters_key" UNIQUE ("key")
      )
    `);

    // ── morocco_regions (self-referencing tree: region > prefecture > commune) ──
    await qr.query(`
      CREATE TABLE "morocco_regions" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "parent_id"  UUID NULL,
        "name"       VARCHAR(200) NOT NULL,
        "code"       VARCHAR(50)  NOT NULL,
        "level"      VARCHAR(20)  NOT NULL,
        "sort_order" INT NOT NULL DEFAULT 0,
        CONSTRAINT "PK_morocco_regions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_morocco_regions_code" UNIQUE ("code"),
        CONSTRAINT "FK_morocco_regions_parent" FOREIGN KEY ("parent_id") REFERENCES "morocco_regions"("id") ON DELETE SET NULL
      )
    `);

    // ── Column additions to businesses ────────────────────────────────────
    await qr.query(`
      ALTER TABLE "businesses"
        ADD COLUMN IF NOT EXISTS "trade_category_id"          UUID NULL,
        ADD COLUMN IF NOT EXISTS "daily_settlement_cutoff_time" TIME NOT NULL DEFAULT '02:00'
    `);

    await qr.query(`
      ALTER TABLE "businesses"
        ADD CONSTRAINT "FK_businesses_trade_category"
          FOREIGN KEY ("trade_category_id") REFERENCES "trade_categories"("id") ON DELETE SET NULL
    `);

    // ── §13.3 indexes ─────────────────────────────────────────────────────
    await qr.query(`CREATE INDEX "IDX_trade_categories_parent" ON "trade_categories"("parent_id")`);
    await qr.query(`CREATE INDEX "IDX_trade_categories_active" ON "trade_categories"("is_active")`);
    await qr.query(`CREATE INDEX "IDX_version_log_entries_menu" ON "version_log_entries"("menu_id")`);
    await qr.query(`CREATE INDEX "IDX_version_log_entries_expires" ON "version_log_entries"("expires_at")`);
    await qr.query(`CREATE INDEX "IDX_morocco_regions_parent" ON "morocco_regions"("parent_id")`);

    // ── Seed: default version-log menus ──────────────────────────────────
    await qr.query(`
      INSERT INTO "version_log_menus" ("id", "name", "sort_order") VALUES
        (gen_random_uuid(), 'Backend',   1),
        (gen_random_uuid(), 'Terminal',  2),
        (gen_random_uuid(), 'Dashboard', 3)
    `);

    // ── Seed: system parameters ───────────────────────────────────────────
    await qr.query(`
      INSERT INTO "system_parameters" ("key", "param_type", "value", "description", "is_overridable_per_business") VALUES
        ('default_tva_rate',              'tva',     '20',    'Default TVA rate applied when no category/product rate is set', FALSE),
        ('max_invoice_counter_per_year',  'billing', '999999','Maximum invoice counter before year reset',                     FALSE),
        ('points_earn_divisor_default',   'loyalty', '10',    'Default MAD amount per loyalty point earned',                   TRUE),
        ('points_redeem_value_default',   'loyalty', '0.05',  'Default MAD value per loyalty point redeemed',                  TRUE),
        ('sms_cost_per_unit_mad',         'comms',   '0.30',  'Cost in MAD per SMS message sent',                              FALSE),
        ('max_bulk_coupon_sync_count',    'billing', '100',   'Maximum coupons issued synchronously before background job',    FALSE)
    `);

    // ── Seed: Morocco regions (12 régions + prefectures + key communes) ───
    // Level 1: Régions
    await qr.query(`
      INSERT INTO "morocco_regions" ("id","parent_id","name","code","level","sort_order") VALUES
        ('mr-r-01', NULL, 'Tanger-Tétouan-Al Hoceïma', 'TTA', 'region', 1),
        ('mr-r-02', NULL, 'Oriental',                   'ORI', 'region', 2),
        ('mr-r-03', NULL, 'Fès-Meknès',                 'FMK', 'region', 3),
        ('mr-r-04', NULL, 'Rabat-Salé-Kénitra',         'RSK', 'region', 4),
        ('mr-r-05', NULL, 'Béni Mellal-Khénifra',       'BMK', 'region', 5),
        ('mr-r-06', NULL, 'Casablanca-Settat',          'CST', 'region', 6),
        ('mr-r-07', NULL, 'Marrakech-Safi',             'MRS', 'region', 7),
        ('mr-r-08', NULL, 'Drâa-Tafilalet',             'DRT', 'region', 8),
        ('mr-r-09', NULL, 'Souss-Massa',                'SOM', 'region', 9),
        ('mr-r-10', NULL, 'Guelmim-Oued Noun',          'GON', 'region', 10),
        ('mr-r-11', NULL, 'Laâyoune-Sakia El Hamra',    'LSE', 'region', 11),
        ('mr-r-12', NULL, 'Dakhla-Oued Ed-Dahab',       'DOD', 'region', 12)
    `);

    // Level 2: Préfectures / Provinces (key ones per region)
    await qr.query(`
      INSERT INTO "morocco_regions" ("id","parent_id","name","code","level","sort_order") VALUES
        ('mr-p-001','mr-r-01','Tanger-Assilah',      'TAN','prefecture',1),
        ('mr-p-002','mr-r-01','Tétouan',              'TET','prefecture',2),
        ('mr-p-003','mr-r-01','Al Hoceïma',           'ALH','prefecture',3),
        ('mr-p-004','mr-r-01','Chefchaouen',          'CHF','prefecture',4),
        ('mr-p-005','mr-r-01','Larache',              'LAR','prefecture',5),
        ('mr-p-006','mr-r-01','M''diq-Fnideq',        'MDF','prefecture',6),
        ('mr-p-007','mr-r-01','Fahs-Anjra',           'FAH','prefecture',7),
        ('mr-p-008','mr-r-01','Ouezzane',             'OUE','prefecture',8),
        ('mr-p-011','mr-r-02','Oujda-Angad',          'OUJ','prefecture',1),
        ('mr-p-012','mr-r-02','Nador',                'NAD','prefecture',2),
        ('mr-p-013','mr-r-02','Berkane',              'BRK','prefecture',3),
        ('mr-p-014','mr-r-02','Driouch',              'DRI','prefecture',4),
        ('mr-p-015','mr-r-02','Taourirt',             'TAO','prefecture',5),
        ('mr-p-016','mr-r-02','Jerada',               'JER','prefecture',6),
        ('mr-p-017','mr-r-02','Guercif',              'GUE','prefecture',7),
        ('mr-p-018','mr-r-02','Figuig',               'FIG','prefecture',8),
        ('mr-p-021','mr-r-03','Fès',                  'FES','prefecture',1),
        ('mr-p-022','mr-r-03','Meknès',               'MEK','prefecture',2),
        ('mr-p-023','mr-r-03','Taza',                 'TAZ','prefecture',3),
        ('mr-p-024','mr-r-03','Taounate',             'TAU','prefecture',4),
        ('mr-p-025','mr-r-03','Sefrou',               'SEF','prefecture',5),
        ('mr-p-026','mr-r-03','Boulemane',            'BOU','prefecture',6),
        ('mr-p-027','mr-r-03','Moulay Yacoub',        'MYA','prefecture',7),
        ('mr-p-028','mr-r-03','El Hajeb',             'ELH','prefecture',8),
        ('mr-p-029','mr-r-03','Ifrane',               'IFR','prefecture',9),
        ('mr-p-031','mr-r-04','Rabat',                'RAB','prefecture',1),
        ('mr-p-032','mr-r-04','Salé',                 'SAL','prefecture',2),
        ('mr-p-033','mr-r-04','Skhirate-Témara',      'SKH','prefecture',3),
        ('mr-p-034','mr-r-04','Kénitra',              'KEN','prefecture',4),
        ('mr-p-035','mr-r-04','Khémisset',            'KHE','prefecture',5),
        ('mr-p-036','mr-r-04','Sidi Kacem',           'SKC','prefecture',6),
        ('mr-p-037','mr-r-04','Sidi Slimane',         'SSL','prefecture',7),
        ('mr-p-041','mr-r-05','Béni Mellal',          'BML','prefecture',1),
        ('mr-p-042','mr-r-05','Khouribga',            'KHO','prefecture',2),
        ('mr-p-043','mr-r-05','Khénifra',             'KHN','prefecture',3),
        ('mr-p-044','mr-r-05','Azilal',               'AZI','prefecture',4),
        ('mr-p-045','mr-r-05','Fquih Ben Salah',      'FBS','prefecture',5),
        ('mr-p-051','mr-r-06','Casablanca',           'CAS','prefecture',1),
        ('mr-p-052','mr-r-06','Mohammedia',           'MOH','prefecture',2),
        ('mr-p-053','mr-r-06','El Jadida',            'ELJ','prefecture',3),
        ('mr-p-054','mr-r-06','Settat',               'SET','prefecture',4),
        ('mr-p-055','mr-r-06','Berrechid',            'BRC','prefecture',5),
        ('mr-p-056','mr-r-06','Médiouna',             'MED','prefecture',6),
        ('mr-p-057','mr-r-06','Nouaceur',             'NOU','prefecture',7),
        ('mr-p-058','mr-r-06','Benslimane',           'BNS','prefecture',8),
        ('mr-p-061','mr-r-07','Marrakech',            'MAR','prefecture',1),
        ('mr-p-062','mr-r-07','Safi',                 'SAF','prefecture',2),
        ('mr-p-063','mr-r-07','Essaouira',            'ESS','prefecture',3),
        ('mr-p-064','mr-r-07','Al Haouz',             'AHO','prefecture',4),
        ('mr-p-065','mr-r-07','Chichaoua',            'CHI','prefecture',5),
        ('mr-p-066','mr-r-07','El Kelâa des Sraghna', 'EKS','prefecture',6),
        ('mr-p-067','mr-r-07','Rehamna',              'REH','prefecture',7),
        ('mr-p-068','mr-r-07','Youssoufia',           'YOU','prefecture',8),
        ('mr-p-071','mr-r-08','Errachidia',           'ERR','prefecture',1),
        ('mr-p-072','mr-r-08','Ouarzazate',           'OUA','prefecture',2),
        ('mr-p-073','mr-r-08','Zagora',               'ZAG','prefecture',3),
        ('mr-p-074','mr-r-08','Tinghir',              'TIN','prefecture',4),
        ('mr-p-075','mr-r-08','Midelt',               'MID','prefecture',5),
        ('mr-p-081','mr-r-09','Agadir-Ida Ou Tanane', 'AGD','prefecture',1),
        ('mr-p-082','mr-r-09','Inezgane-Aït Melloul', 'IAM','prefecture',2),
        ('mr-p-083','mr-r-09','Taroudannt',           'TAR','prefecture',3),
        ('mr-p-084','mr-r-09','Tiznit',               'TIZ','prefecture',4),
        ('mr-p-085','mr-r-09','Tata',                 'TAT','prefecture',5),
        ('mr-p-086','mr-r-09','Chtouka Aït Baha',     'CAB','prefecture',6),
        ('mr-p-091','mr-r-10','Guelmim',              'GUL','prefecture',1),
        ('mr-p-092','mr-r-10','Tan-Tan',              'TNT','prefecture',2),
        ('mr-p-093','mr-r-10','Sidi Ifni',            'SII','prefecture',3),
        ('mr-p-094','mr-r-10','Assa-Zag',             'AZG','prefecture',4),
        ('mr-p-101','mr-r-11','Laâyoune',             'LAA','prefecture',1),
        ('mr-p-102','mr-r-11','Boujdour',             'BJD','prefecture',2),
        ('mr-p-103','mr-r-11','Es Semara',            'ESM','prefecture',3),
        ('mr-p-104','mr-r-11','Tarfaya',              'TRF','prefecture',4),
        ('mr-p-111','mr-r-12','Oued Ed-Dahab',        'OED','prefecture',1),
        ('mr-p-112','mr-r-12','Aousserd',             'AOU','prefecture',2)
    `);

    // Level 3: Key communes (Casablanca + Rabat + Marrakech + Fès + Agadir + Tanger)
    await qr.query(`
      INSERT INTO "morocco_regions" ("id","parent_id","name","code","level","sort_order") VALUES
        ('mr-c-0001','mr-p-051','Ain Chock',        'CAS-ANC','commune',1),
        ('mr-c-0002','mr-p-051','Ain Sebaa',         'CAS-ANS','commune',2),
        ('mr-c-0003','mr-p-051','Anfa',              'CAS-ANF','commune',3),
        ('mr-c-0004','mr-p-051','Ben M''sik',         'CAS-BMS','commune',4),
        ('mr-c-0005','mr-p-051','Derb Sultan',       'CAS-DES','commune',5),
        ('mr-c-0006','mr-p-051','Hay Hassani',       'CAS-HHN','commune',6),
        ('mr-c-0007','mr-p-051','Hay Mohammadi',     'CAS-HMD','commune',7),
        ('mr-c-0008','mr-p-051','Maârif',            'CAS-MAR','commune',8),
        ('mr-c-0009','mr-p-051','Moulay Rachid',     'CAS-MLR','commune',9),
        ('mr-c-0010','mr-p-051','Sidi Bernoussi',    'CAS-SBR','commune',10),
        ('mr-c-0011','mr-p-051','Sidi Moumen',       'CAS-SMO','commune',11),
        ('mr-c-0012','mr-p-051','Sbata',             'CAS-SBT','commune',12),
        ('mr-c-0021','mr-p-031','Agdal-Riyad',       'RAB-AGD','commune',1),
        ('mr-c-0022','mr-p-031','Hassan',            'RAB-HAS','commune',2),
        ('mr-c-0023','mr-p-031','Souissi',           'RAB-SOU','commune',3),
        ('mr-c-0024','mr-p-031','Yacoub El Mansour', 'RAB-YEM','commune',4),
        ('mr-c-0025','mr-p-031','Akkari',            'RAB-AKK','commune',5),
        ('mr-c-0026','mr-p-031','Médina',            'RAB-MED','commune',6),
        ('mr-c-0031','mr-p-061','Médina',            'MAR-MED','commune',1),
        ('mr-c-0032','mr-p-061','Guéliz',            'MAR-GUE','commune',2),
        ('mr-c-0033','mr-p-061','Hivernage',         'MAR-HIV','commune',3),
        ('mr-c-0034','mr-p-061','Syba',              'MAR-SYB','commune',4),
        ('mr-c-0035','mr-p-061','Annakhil',          'MAR-ANN','commune',5),
        ('mr-c-0041','mr-p-021','Fès El-Bali',       'FES-BAL','commune',1),
        ('mr-c-0042','mr-p-021','Fès El-Jdid',       'FES-JDI','commune',2),
        ('mr-c-0043','mr-p-021','Zouagha',           'FES-ZOU','commune',3),
        ('mr-c-0044','mr-p-021','Agdal',             'FES-AGD','commune',4),
        ('mr-c-0051','mr-p-081','Agadir',            'AGD-AGD','commune',1),
        ('mr-c-0052','mr-p-081','Bensergao',         'AGD-BEN','commune',2),
        ('mr-c-0053','mr-p-081','Anza',              'AGD-ANZ','commune',3),
        ('mr-c-0061','mr-p-001','Beni Makada',       'TAN-BMK','commune',1),
        ('mr-c-0062','mr-p-001','Charf',             'TAN-CHR','commune',2),
        ('mr-c-0063','mr-p-001','Médina',            'TAN-MED','commune',3),
        ('mr-c-0064','mr-p-001','Tanger-Assilah',    'TAN-ASS','commune',4)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "businesses" DROP CONSTRAINT IF EXISTS "FK_businesses_trade_category"`);
    await qr.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "daily_settlement_cutoff_time"`);
    await qr.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "trade_category_id"`);
    await qr.query(`DROP INDEX IF EXISTS "IDX_morocco_regions_parent"`);
    await qr.query(`DROP INDEX IF EXISTS "IDX_version_log_entries_expires"`);
    await qr.query(`DROP INDEX IF EXISTS "IDX_version_log_entries_menu"`);
    await qr.query(`DROP INDEX IF EXISTS "IDX_trade_categories_active"`);
    await qr.query(`DROP INDEX IF EXISTS "IDX_trade_categories_parent"`);
    await qr.query(`DROP TABLE IF EXISTS "morocco_regions"`);
    await qr.query(`DROP TABLE IF EXISTS "system_parameters"`);
    await qr.query(`DROP TABLE IF EXISTS "version_log_entries"`);
    await qr.query(`DROP TABLE IF EXISTS "version_log_menus"`);
    await qr.query(`DROP TABLE IF EXISTS "business_custom_authority"`);
    await qr.query(`DROP TABLE IF EXISTS "business_courier_links"`);
    await qr.query(`DROP TABLE IF EXISTS "couriers"`);
    await qr.query(`DROP TABLE IF EXISTS "trade_categories"`);
  }
}
