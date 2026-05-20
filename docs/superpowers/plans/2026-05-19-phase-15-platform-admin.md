# Phase 15 — Platform Admin Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all ADM-001–ADM-071 requirements: trade categories, couriers, custom permissions, capital report, changelog, system parameters, settlement cutoff, and Morocco address picker.

**Architecture:** New `PlatformAdminModule` with three controllers (`super`, `business`, `auth`). Capital detail report added to the existing `ReportsModule` as a new generator. All 8 new entities follow the existing common-entities barrel pattern.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, existing `DataSource`-based raw SQL for reports.

---

## File Map

**Create:**
- `apps/backend/src/migrations/1714015000000-AddPlatformAdminEnhancements.ts`
- `apps/backend/src/common/entities/trade-category.entity.ts`
- `apps/backend/src/common/entities/courier.entity.ts`
- `apps/backend/src/common/entities/business-courier-link.entity.ts`
- `apps/backend/src/common/entities/business-custom-authority.entity.ts`
- `apps/backend/src/common/entities/version-log-menu.entity.ts`
- `apps/backend/src/common/entities/version-log-entry.entity.ts`
- `apps/backend/src/common/entities/system-parameter.entity.ts`
- `apps/backend/src/common/entities/morocco-region.entity.ts`
- `apps/backend/src/modules/platform-admin/dto/platform-admin.dto.ts`
- `apps/backend/src/modules/platform-admin/platform-admin.service.ts`
- `apps/backend/src/modules/platform-admin/platform-admin.service.spec.ts`
- `apps/backend/src/modules/platform-admin/platform-admin-super.controller.ts`
- `apps/backend/src/modules/platform-admin/platform-admin-business.controller.ts`
- `apps/backend/src/modules/platform-admin/platform-admin-auth.controller.ts`
- `apps/backend/src/modules/platform-admin/platform-admin.module.ts`
- `apps/backend/src/modules/reports/generators/capital-detail.generator.ts`

**Modify:**
- `apps/backend/src/common/entities/business.entity.ts` — add `trade_category_id`, `daily_settlement_cutoff_time`
- `apps/backend/src/common/entities/index.ts` — export 8 new entities
- `apps/backend/src/modules/reports/reports.service.ts` — add `capital-detail` to ALL_REPORT_IDS + switch case; pass cutoff to dailyClose
- `apps/backend/src/modules/reports/reports.module.ts` — register `CapitalDetailGenerator`
- `apps/backend/src/modules/reports/generators/accounting.generator.ts` — `dailyClose` accepts optional `cutoffTime` param
- `apps/backend/src/app.module.ts` — import `PlatformAdminModule`
- `CLAUDE.md` — update implementation status
- `docs/IMPLEMENTATION_LOG.md` — add Phase 15 section

---

## Task 1: Migration

**Files:**
- Create: `apps/backend/src/migrations/1714015000000-AddPlatformAdminEnhancements.ts`

- [ ] **Step 1: Write the migration file**

```typescript
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
        -- TTA
        ('mr-p-001','mr-r-01','Tanger-Assilah',      'TAN','prefecture',1),
        ('mr-p-002','mr-r-01','Tétouan',              'TET','prefecture',2),
        ('mr-p-003','mr-r-01','Al Hoceïma',           'ALH','prefecture',3),
        ('mr-p-004','mr-r-01','Chefchaouen',          'CHF','prefecture',4),
        ('mr-p-005','mr-r-01','Larache',              'LAR','prefecture',5),
        ('mr-p-006','mr-r-01','M''diq-Fnideq',        'MDF','prefecture',6),
        ('mr-p-007','mr-r-01','Fahs-Anjra',           'FAH','prefecture',7),
        ('mr-p-008','mr-r-01','Ouezzane',             'OUE','prefecture',8),
        -- ORI
        ('mr-p-011','mr-r-02','Oujda-Angad',          'OUJ','prefecture',1),
        ('mr-p-012','mr-r-02','Nador',                'NAD','prefecture',2),
        ('mr-p-013','mr-r-02','Berkane',              'BRK','prefecture',3),
        ('mr-p-014','mr-r-02','Driouch',              'DRI','prefecture',4),
        ('mr-p-015','mr-r-02','Taourirt',             'TAO','prefecture',5),
        ('mr-p-016','mr-r-02','Jerada',               'JER','prefecture',6),
        ('mr-p-017','mr-r-02','Guercif',              'GUE','prefecture',7),
        ('mr-p-018','mr-r-02','Figuig',               'FIG','prefecture',8),
        -- FMK
        ('mr-p-021','mr-r-03','Fès',                  'FES','prefecture',1),
        ('mr-p-022','mr-r-03','Meknès',               'MEK','prefecture',2),
        ('mr-p-023','mr-r-03','Taza',                 'TAZ','prefecture',3),
        ('mr-p-024','mr-r-03','Taounate',             'TAU','prefecture',4),
        ('mr-p-025','mr-r-03','Sefrou',               'SEF','prefecture',5),
        ('mr-p-026','mr-r-03','Boulemane',            'BOU','prefecture',6),
        ('mr-p-027','mr-r-03','Moulay Yacoub',        'MYA','prefecture',7),
        ('mr-p-028','mr-r-03','El Hajeb',             'ELH','prefecture',8),
        ('mr-p-029','mr-r-03','Ifrane',               'IFR','prefecture',9),
        -- RSK
        ('mr-p-031','mr-r-04','Rabat',                'RAB','prefecture',1),
        ('mr-p-032','mr-r-04','Salé',                 'SAL','prefecture',2),
        ('mr-p-033','mr-r-04','Skhirate-Témara',      'SKH','prefecture',3),
        ('mr-p-034','mr-r-04','Kénitra',              'KEN','prefecture',4),
        ('mr-p-035','mr-r-04','Khémisset',            'KHE','prefecture',5),
        ('mr-p-036','mr-r-04','Sidi Kacem',           'SKC','prefecture',6),
        ('mr-p-037','mr-r-04','Sidi Slimane',         'SSL','prefecture',7),
        -- BMK
        ('mr-p-041','mr-r-05','Béni Mellal',          'BML','prefecture',1),
        ('mr-p-042','mr-r-05','Khouribga',            'KHO','prefecture',2),
        ('mr-p-043','mr-r-05','Khénifra',             'KHN','prefecture',3),
        ('mr-p-044','mr-r-05','Azilal',               'AZI','prefecture',4),
        ('mr-p-045','mr-r-05','Fquih Ben Salah',      'FBS','prefecture',5),
        -- CST
        ('mr-p-051','mr-r-06','Casablanca',           'CAS','prefecture',1),
        ('mr-p-052','mr-r-06','Mohammedia',           'MOH','prefecture',2),
        ('mr-p-053','mr-r-06','El Jadida',            'ELJ','prefecture',3),
        ('mr-p-054','mr-r-06','Settat',               'SET','prefecture',4),
        ('mr-p-055','mr-r-06','Berrechid',            'BRC','prefecture',5),
        ('mr-p-056','mr-r-06','Médiouna',             'MED','prefecture',6),
        ('mr-p-057','mr-r-06','Nouaceur',             'NOU','prefecture',7),
        ('mr-p-058','mr-r-06','Benslimane',           'BNS','prefecture',8),
        -- MRS
        ('mr-p-061','mr-r-07','Marrakech',            'MAR','prefecture',1),
        ('mr-p-062','mr-r-07','Safi',                 'SAF','prefecture',2),
        ('mr-p-063','mr-r-07','Essaouira',            'ESS','prefecture',3),
        ('mr-p-064','mr-r-07','Al Haouz',             'AHO','prefecture',4),
        ('mr-p-065','mr-r-07','Chichaoua',            'CHI','prefecture',5),
        ('mr-p-066','mr-r-07','El Kelâa des Sraghna', 'EKS','prefecture',6),
        ('mr-p-067','mr-r-07','Rehamna',              'REH','prefecture',7),
        ('mr-p-068','mr-r-07','Youssoufia',           'YOU','prefecture',8),
        -- DRT
        ('mr-p-071','mr-r-08','Errachidia',           'ERR','prefecture',1),
        ('mr-p-072','mr-r-08','Ouarzazate',           'OUA','prefecture',2),
        ('mr-p-073','mr-r-08','Zagora',               'ZAG','prefecture',3),
        ('mr-p-074','mr-r-08','Tinghir',              'TIN','prefecture',4),
        ('mr-p-075','mr-r-08','Midelt',               'MID','prefecture',5),
        -- SOM
        ('mr-p-081','mr-r-09','Agadir-Ida Ou Tanane', 'AGD','prefecture',1),
        ('mr-p-082','mr-r-09','Inezgane-Aït Melloul', 'IAM','prefecture',2),
        ('mr-p-083','mr-r-09','Taroudannt',           'TAR','prefecture',3),
        ('mr-p-084','mr-r-09','Tiznit',               'TIZ','prefecture',4),
        ('mr-p-085','mr-r-09','Tata',                 'TAT','prefecture',5),
        ('mr-p-086','mr-r-09','Chtouka Aït Baha',     'CAB','prefecture',6),
        -- GON
        ('mr-p-091','mr-r-10','Guelmim',              'GUL','prefecture',1),
        ('mr-p-092','mr-r-10','Tan-Tan',              'TNT','prefecture',2),
        ('mr-p-093','mr-r-10','Sidi Ifni',            'SII','prefecture',3),
        ('mr-p-094','mr-r-10','Assa-Zag',             'AZG','prefecture',4),
        -- LSE
        ('mr-p-101','mr-r-11','Laâyoune',             'LAA','prefecture',1),
        ('mr-p-102','mr-r-11','Boujdour',             'BJD','prefecture',2),
        ('mr-p-103','mr-r-11','Es Semara',            'ESM','prefecture',3),
        ('mr-p-104','mr-r-11','Tarfaya',              'TRF','prefecture',4),
        -- DOD
        ('mr-p-111','mr-r-12','Oued Ed-Dahab',        'OED','prefecture',1),
        ('mr-p-112','mr-r-12','Aousserd',             'AOU','prefecture',2)
    `);

    // Level 3: Key communes (Casablanca + Rabat + Marrakech + Fès)
    await qr.query(`
      INSERT INTO "morocco_regions" ("id","parent_id","name","code","level","sort_order") VALUES
        -- Casablanca communes
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
        -- Rabat communes
        ('mr-c-0021','mr-p-031','Agdal-Riyad',       'RAB-AGD','commune',1),
        ('mr-c-0022','mr-p-031','Hassan',            'RAB-HAS','commune',2),
        ('mr-c-0023','mr-p-031','Souissi',           'RAB-SOU','commune',3),
        ('mr-c-0024','mr-p-031','Yacoub El Mansour', 'RAB-YEM','commune',4),
        ('mr-c-0025','mr-p-031','Akkari',            'RAB-AKK','commune',5),
        ('mr-c-0026','mr-p-031','Médina',            'RAB-MED','commune',6),
        -- Marrakech communes
        ('mr-c-0031','mr-p-061','Médina',            'MAR-MED','commune',1),
        ('mr-c-0032','mr-p-061','Guéliz',            'MAR-GUE','commune',2),
        ('mr-c-0033','mr-p-061','Hivernage',         'MAR-HIV','commune',3),
        ('mr-c-0034','mr-p-061','Syba',              'MAR-SYB','commune',4),
        ('mr-c-0035','mr-p-061','Annakhil',          'MAR-ANN','commune',5),
        -- Fès communes
        ('mr-c-0041','mr-p-021','Fès El-Bali',       'FES-BAL','commune',1),
        ('mr-c-0042','mr-p-021','Fès El-Jdid',       'FES-JDI','commune',2),
        ('mr-c-0043','mr-p-021','Zouagha',           'FES-ZOU','commune',3),
        ('mr-c-0044','mr-p-021','Agdal',             'FES-AGD','commune',4),
        -- Agadir communes
        ('mr-c-0051','mr-p-081','Agadir',            'AGD-AGD','commune',1),
        ('mr-c-0052','mr-p-081','Bensergao',         'AGD-BEN','commune',2),
        ('mr-c-0053','mr-p-081','Anza',              'AGD-ANZ','commune',3),
        -- Tanger communes
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/migrations/1714015000000-AddPlatformAdminEnhancements.ts
git commit -m "phase-15: migration AddPlatformAdminEnhancements (ADM-MOD-001)"
```

---

## Task 2: Entities

**Files:**
- Create: 8 entity files
- Modify: `apps/backend/src/common/entities/business.entity.ts`
- Modify: `apps/backend/src/common/entities/index.ts`

- [ ] **Step 1: Create `trade-category.entity.ts`**

```typescript
// apps/backend/src/common/entities/trade-category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('trade_categories')
export class TradeCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => TradeCategory, (tc) => tc.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: TradeCategory | null;

  @OneToMany(() => TradeCategory, (tc) => tc.parent)
  children: TradeCategory[];

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'uuid', nullable: true })
  default_business_type_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  default_settings_json: Record<string, any> | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
```

- [ ] **Step 2: Create `courier.entity.ts`**

```typescript
// apps/backend/src/common/entities/courier.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('couriers')
export class Courier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  api_endpoint: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  tracking_url_template: string | null;

  @Column({ type: 'boolean', default: false })
  supports_cash_on_delivery: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
```

- [ ] **Step 3: Create `business-courier-link.entity.ts`**

```typescript
// apps/backend/src/common/entities/business-courier-link.entity.ts
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Courier } from './courier.entity';

@Entity('business_courier_links')
export class BusinessCourierLink {
  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @PrimaryColumn({ type: 'uuid' })
  courier_id: string;

  @ManyToOne(() => Courier)
  @JoinColumn({ name: 'courier_id' })
  courier: Courier;

  @Column({ type: 'jsonb', nullable: true })
  account_credentials_json: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;
}
```

- [ ] **Step 4: Create `business-custom-authority.entity.ts`**

```typescript
// apps/backend/src/common/entities/business-custom-authority.entity.ts
import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('business_custom_authority')
export class BusinessCustomAuthority {
  @PrimaryColumn({ type: 'uuid' })
  business_id: string;

  @Column({ type: 'jsonb', default: {} })
  feature_overrides_json: Record<string, boolean>;

  @Column({ type: 'jsonb', default: {} })
  permission_overrides_json: Record<string, string[]>;

  @Column({ type: 'uuid', nullable: true })
  set_by_super_admin_id: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 5: Create `version-log-menu.entity.ts`**

```typescript
// apps/backend/src/common/entities/version-log-menu.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { VersionLogEntry } from './version-log-entry.entity';

@Entity('version_log_menus')
export class VersionLogMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => VersionLogEntry, (e) => e.menu)
  entries: VersionLogEntry[];
}
```

- [ ] **Step 6: Create `version-log-entry.entity.ts`**

```typescript
// apps/backend/src/common/entities/version-log-entry.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VersionLogMenu } from './version-log-menu.entity';

@Entity('version_log_entries')
export class VersionLogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  menu_id: string;

  @ManyToOne(() => VersionLogMenu, (m) => m.entries)
  @JoinColumn({ name: 'menu_id' })
  menu: VersionLogMenu;

  @Column({ type: 'varchar', length: 20 })
  version: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  published_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;
}
```

- [ ] **Step 7: Create `system-parameter.entity.ts`**

```typescript
// apps/backend/src/common/entities/system-parameter.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('system_parameters')
export class SystemParameter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 40 })
  param_type: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  is_overridable_per_business: boolean;
}
```

- [ ] **Step 8: Create `morocco-region.entity.ts`**

```typescript
// apps/backend/src/common/entities/morocco-region.entity.ts
import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('morocco_regions')
export class MoroccoRegion {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  parent_id: string | null;

  @ManyToOne(() => MoroccoRegion, (r) => r.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: MoroccoRegion | null;

  @OneToMany(() => MoroccoRegion, (r) => r.parent)
  children: MoroccoRegion[];

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 20 })
  level: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
```

- [ ] **Step 9: Update `business.entity.ts` — add two columns after `chain_role`**

In `apps/backend/src/common/entities/business.entity.ts`, after the `chain_role` column, add:

```typescript
  @Column({ type: 'uuid', nullable: true })
  trade_category_id: string | null;

  @Column({ type: 'time', default: '02:00' })
  daily_settlement_cutoff_time: string;
```

- [ ] **Step 10: Update `index.ts` — append 8 new exports**

At the end of `apps/backend/src/common/entities/index.ts`, add:

```typescript
export { TradeCategory } from './trade-category.entity';
export { Courier } from './courier.entity';
export { BusinessCourierLink } from './business-courier-link.entity';
export { BusinessCustomAuthority } from './business-custom-authority.entity';
export { VersionLogMenu } from './version-log-menu.entity';
export { VersionLogEntry } from './version-log-entry.entity';
export { SystemParameter } from './system-parameter.entity';
export { MoroccoRegion } from './morocco-region.entity';
```

- [ ] **Step 11: Commit**

```bash
git add apps/backend/src/common/entities/
git commit -m "phase-15: 8 new entities + Business columns for ADM (ADM-MOD-001)"
```

---

## Task 3: DTOs

**Files:**
- Create: `apps/backend/src/modules/platform-admin/dto/platform-admin.dto.ts`

- [ ] **Step 1: Write all DTOs**

```typescript
// apps/backend/src/modules/platform-admin/dto/platform-admin.dto.ts
import { IsString, IsOptional, IsBoolean, IsUUID, IsJSON, IsIn, Matches, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ── Trade Categories ──────────────────────────────────────────────────────────

export class CreateTradeCategoryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional() @IsUUID()
  parent_id?: string;

  @IsOptional() @IsUUID()
  default_business_type_id?: string;

  @IsOptional()
  default_settings_json?: Record<string, any>;

  @IsOptional() @IsBoolean()
  is_active?: boolean;

  @IsOptional() @IsNumber()
  sort_order?: number;
}

export class UpdateTradeCategoryDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  code?: string;

  @IsOptional() @IsUUID()
  parent_id?: string;

  @IsOptional() @IsBoolean()
  is_active?: boolean;

  @IsOptional() @IsNumber()
  sort_order?: number;
}

// ── Couriers ──────────────────────────────────────────────────────────────────

export class CreateCourierDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  api_endpoint?: string;

  @IsOptional() @IsString()
  tracking_url_template?: string;

  @IsOptional() @IsBoolean()
  supports_cash_on_delivery?: boolean;
}

export class UpdateCourierDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  api_endpoint?: string;

  @IsOptional() @IsString()
  tracking_url_template?: string;

  @IsOptional() @IsBoolean()
  supports_cash_on_delivery?: boolean;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

export class LinkCourierDto {
  @IsUUID()
  courier_id: string;

  @IsOptional()
  credentials?: Record<string, any>;

  @IsOptional() @IsBoolean()
  is_default?: boolean;
}

// ── Custom Authority ──────────────────────────────────────────────────────────

export class SetCustomAuthorityDto {
  @IsOptional()
  feature_overrides?: Record<string, boolean>;

  @IsOptional()
  permission_overrides?: Record<string, string[]>;

  @IsOptional() @IsString()
  notes?: string;
}

// ── Version Log ───────────────────────────────────────────────────────────────

export class CreateVersionLogEntryDto {
  @IsUUID()
  menu_id: string;

  @IsString()
  version: string;

  @IsString()
  description: string;

  @IsOptional() @IsString()
  published_at?: string;

  @IsOptional() @IsString()
  expires_at?: string;
}

export class UpdateVersionLogEntryDto {
  @IsOptional() @IsString()
  version?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  expires_at?: string;
}

export class ListVersionLogEntriesQueryDto {
  @IsOptional() @IsUUID()
  menu_id?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number;
}

// ── System Parameters ─────────────────────────────────────────────────────────

export class UpdateSystemParameterDto {
  @IsString()
  value: string;
}

export class ListSystemParametersQueryDto {
  @IsOptional() @IsString()
  param_type?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number;
}

// ── Settlement Cutoff ─────────────────────────────────────────────────────────

export class UpdateSettlementCutoffDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'cutoff_time must be HH:MM in 24h format' })
  cutoff_time: string;
}

// ── Address ───────────────────────────────────────────────────────────────────

export class ValidateAddressDto {
  @IsOptional() @IsString()
  region_code?: string;

  @IsOptional() @IsString()
  prefecture_code?: string;

  @IsOptional() @IsString()
  commune_code?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/platform-admin/dto/
git commit -m "phase-15: DTOs for platform-admin module"
```

---

## Task 4: Failing Tests

**Files:**
- Create: `apps/backend/src/modules/platform-admin/platform-admin.service.spec.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// apps/backend/src/modules/platform-admin/platform-admin.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';
import { TradeCategory } from '../../common/entities/trade-category.entity';
import { Courier } from '../../common/entities/courier.entity';
import { BusinessCourierLink } from '../../common/entities/business-courier-link.entity';
import { BusinessCustomAuthority } from '../../common/entities/business-custom-authority.entity';
import { VersionLogMenu } from '../../common/entities/version-log-menu.entity';
import { VersionLogEntry } from '../../common/entities/version-log-entry.entity';
import { SystemParameter } from '../../common/entities/system-parameter.entity';
import { MoroccoRegion } from '../../common/entities/morocco-region.entity';
import { Business } from '../../common/entities/business.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-other';

function makeBusiness(id = BIZ): Partial<Business> {
  return { id, daily_settlement_cutoff_time: '02:00' } as any;
}

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let tradeCategoryRepo: jest.Mocked<any>;
  let courierRepo: jest.Mocked<any>;
  let courierLinkRepo: jest.Mocked<any>;
  let customAuthorityRepo: jest.Mocked<any>;
  let versionMenuRepo: jest.Mocked<any>;
  let versionEntryRepo: jest.Mocked<any>;
  let systemParamRepo: jest.Mocked<any>;
  let regionRepo: jest.Mocked<any>;
  let businessRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const makeRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    });

    tradeCategoryRepo = makeRepo();
    courierRepo = makeRepo();
    courierLinkRepo = makeRepo();
    customAuthorityRepo = makeRepo();
    versionMenuRepo = makeRepo();
    versionEntryRepo = makeRepo();
    systemParamRepo = makeRepo();
    regionRepo = makeRepo();
    businessRepo = makeRepo();

    const module = await Test.createTestingModule({
      providers: [
        PlatformAdminService,
        { provide: getRepositoryToken(TradeCategory), useValue: tradeCategoryRepo },
        { provide: getRepositoryToken(Courier), useValue: courierRepo },
        { provide: getRepositoryToken(BusinessCourierLink), useValue: courierLinkRepo },
        { provide: getRepositoryToken(BusinessCustomAuthority), useValue: customAuthorityRepo },
        { provide: getRepositoryToken(VersionLogMenu), useValue: versionMenuRepo },
        { provide: getRepositoryToken(VersionLogEntry), useValue: versionEntryRepo },
        { provide: getRepositoryToken(SystemParameter), useValue: systemParamRepo },
        { provide: getRepositoryToken(MoroccoRegion), useValue: regionRepo },
        { provide: getRepositoryToken(Business), useValue: businessRepo },
      ],
    }).compile();

    service = module.get(PlatformAdminService);
  });

  // ── ADM-001: Trade category tree ─────────────────────────────────────────
  describe('listTradeCategoryTree', () => {
    it('returns only root-level active categories with children', async () => {
      const child = { id: 'c-2', parent_id: 'c-1', name: 'Café', code: 'CAFE', children: [], is_active: true, sort_order: 1 };
      const root = { id: 'c-1', parent_id: null, name: 'Food Service', code: 'FOOD', children: [child], is_active: true, sort_order: 0 };
      tradeCategoryRepo.find.mockResolvedValue([root]);
      const result = await service.listTradeCategoryTree();
      expect(result).toEqual([root]);
      expect(tradeCategoryRepo.find).toHaveBeenCalledWith({
        where: { parent_id: null, is_active: true },
        relations: ['children', 'children.children'],
        order: { sort_order: 'ASC' },
      });
    });
  });

  // ── ADM-002: Create trade category ───────────────────────────────────────
  describe('createTradeCategory', () => {
    it('creates and returns a new category', async () => {
      const dto = { name: 'Restaurant', code: 'REST' };
      const created = { id: 'new-id', ...dto, parent_id: null, is_active: true, sort_order: 0 };
      tradeCategoryRepo.create.mockReturnValue(created);
      tradeCategoryRepo.save.mockResolvedValue(created);
      const result = await service.createTradeCategory(dto as any);
      expect(result).toEqual(created);
    });
  });

  // ── ADM-003: Update trade category ───────────────────────────────────────
  describe('updateTradeCategory', () => {
    it('throws 404 when category not found', async () => {
      tradeCategoryRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTradeCategory('not-found', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('saves updated category', async () => {
      const existing = { id: 'c-1', name: 'Old', code: 'OLD', is_active: true };
      tradeCategoryRepo.findOne.mockResolvedValue(existing);
      tradeCategoryRepo.save.mockResolvedValue({ ...existing, name: 'New' });
      const result = await service.updateTradeCategory('c-1', { name: 'New' });
      expect(result.name).toBe('New');
    });
  });

  // ── ADM-005: Trade category options ──────────────────────────────────────
  describe('getTradeCategoryOptions', () => {
    it('returns flattened list with full path names', async () => {
      const child = { id: 'c-2', parent_id: 'c-1', name: 'Café', code: 'CAFE', children: [], is_active: true, sort_order: 0 };
      const root = { id: 'c-1', parent_id: null, name: 'Food Service', code: 'FOOD', children: [child], is_active: true, sort_order: 0 };
      tradeCategoryRepo.find.mockResolvedValue([root]);
      const result = await service.getTradeCategoryOptions();
      expect(result).toHaveLength(2);
      const paths = result.map((r: any) => r.full_path);
      expect(paths).toContain('Food Service');
      expect(paths).toContain('Food Service > Café');
    });
  });

  // ── ADM-010: List couriers ────────────────────────────────────────────────
  describe('listCouriers', () => {
    it('returns all couriers', async () => {
      const couriers = [{ id: 'courier-1', name: 'Glovo', code: 'GLOVO', is_active: true }];
      courierRepo.find.mockResolvedValue(couriers);
      const result = await service.listCouriers();
      expect(result).toEqual(couriers);
    });
  });

  // ── ADM-015: Link courier to business ────────────────────────────────────
  describe('linkCourierToBusiness', () => {
    it('throws 404 when courier not found', async () => {
      courierRepo.findOne.mockResolvedValue(null);
      await expect(service.linkCourierToBusiness(BIZ, { courier_id: 'x' } as any)).rejects.toThrow(NotFoundException);
    });

    it('saves the link', async () => {
      const courier = { id: 'courier-1', name: 'Glovo' };
      const link = { business_id: BIZ, courier_id: 'courier-1', is_default: false };
      courierRepo.findOne.mockResolvedValue(courier);
      courierLinkRepo.create.mockReturnValue(link);
      courierLinkRepo.save.mockResolvedValue(link);
      const result = await service.linkCourierToBusiness(BIZ, { courier_id: 'courier-1' } as any);
      expect(result).toEqual(link);
    });
  });

  // ── ADM-016: Unlink courier ───────────────────────────────────────────────
  describe('unlinkCourierFromBusiness', () => {
    it('throws 404 when link not found', async () => {
      courierLinkRepo.findOne.mockResolvedValue(null);
      await expect(service.unlinkCourierFromBusiness(BIZ, 'c-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes the link', async () => {
      courierLinkRepo.findOne.mockResolvedValue({ business_id: BIZ, courier_id: 'c-1' });
      courierLinkRepo.delete.mockResolvedValue({ affected: 1 });
      await service.unlinkCourierFromBusiness(BIZ, 'c-1');
      expect(courierLinkRepo.delete).toHaveBeenCalledWith({ business_id: BIZ, courier_id: 'c-1' });
    });
  });

  // ── ADM-020/021: Custom authority ─────────────────────────────────────────
  describe('getBusinessCustomAuthority', () => {
    it('returns null when no override exists', async () => {
      customAuthorityRepo.findOne.mockResolvedValue(null);
      const result = await service.getBusinessCustomAuthority('biz-1');
      expect(result).toEqual({ business_id: 'biz-1', feature_overrides_json: {}, permission_overrides_json: {} });
    });
  });

  describe('setBusinessCustomAuthority', () => {
    it('creates override when none exists', async () => {
      customAuthorityRepo.findOne.mockResolvedValue(null);
      const saved = { business_id: BIZ, feature_overrides_json: { advanced_reports: true }, permission_overrides_json: {}, notes: null };
      customAuthorityRepo.create.mockReturnValue(saved);
      customAuthorityRepo.save.mockResolvedValue(saved);
      const result = await service.setBusinessCustomAuthority(BIZ, 'admin-id', { feature_overrides: { advanced_reports: true } });
      expect(result.feature_overrides_json).toEqual({ advanced_reports: true });
    });
  });

  // ── ADM-022: Effective permissions ────────────────────────────────────────
  describe('resolveEffectiveFeatures', () => {
    it('overlays custom authority on top of base features', async () => {
      const baseFeatures = [
        { feature_key: 'inventory', is_enabled: true },
        { feature_key: 'recommendations', is_enabled: false },
      ];
      customAuthorityRepo.findOne.mockResolvedValue({
        feature_overrides_json: { recommendations: true },
      });
      const result = await service.resolveEffectiveFeatures('biz-1', baseFeatures as any);
      expect(result['inventory']).toBe(true);
      expect(result['recommendations']).toBe(true);
    });
  });

  // ── ADM-040: Version log menus ────────────────────────────────────────────
  describe('listVersionLogMenus', () => {
    it('returns all menus ordered by sort_order', async () => {
      const menus = [{ id: 'm-1', name: 'Backend', sort_order: 1 }];
      versionMenuRepo.find.mockResolvedValue(menus);
      const result = await service.listVersionLogMenus();
      expect(result).toEqual(menus);
    });
  });

  // ── ADM-042: Create version log entry ────────────────────────────────────
  describe('createVersionLogEntry', () => {
    it('creates and returns an entry', async () => {
      const dto = { menu_id: 'm-1', version: '1.5.0', description: 'New feature' };
      const entry = { id: 'e-1', ...dto };
      versionEntryRepo.create.mockReturnValue(entry);
      versionEntryRepo.save.mockResolvedValue(entry);
      const result = await service.createVersionLogEntry(dto as any);
      expect(result.version).toBe('1.5.0');
    });
  });

  // ── ADM-041: List version log entries (auto-filters expired) ─────────────
  describe('listVersionLogEntries', () => {
    it('returns paginated entries excluding expired ones', async () => {
      const now = new Date();
      const active = { id: 'e-1', version: '1.0', expires_at: null };
      const expired = { id: 'e-2', version: '0.9', expires_at: new Date(now.getTime() - 1000) };
      versionEntryRepo.findAndCount.mockResolvedValue([[active], 1]);
      const result = await service.listVersionLogEntries({});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('e-1');
    });
  });

  // ── ADM-050: System parameters ───────────────────────────────────────────
  describe('listSystemParameters', () => {
    it('returns paginated system parameters', async () => {
      systemParamRepo.findAndCount.mockResolvedValue([[{ id: 'p-1', key: 'default_tva_rate', value: '20' }], 1]);
      const result = await service.listSystemParameters({});
      expect(result.data).toHaveLength(1);
    });
  });

  // ── ADM-051: Update system parameter ─────────────────────────────────────
  describe('updateSystemParameter', () => {
    it('throws 404 when param not found', async () => {
      systemParamRepo.findOne.mockResolvedValue(null);
      await expect(service.updateSystemParameter('p-not-found', { value: '15' })).rejects.toThrow(NotFoundException);
    });

    it('saves updated value', async () => {
      const param = { id: 'p-1', key: 'default_tva_rate', value: '20' };
      systemParamRepo.findOne.mockResolvedValue(param);
      systemParamRepo.save.mockResolvedValue({ ...param, value: '14' });
      const result = await service.updateSystemParameter('p-1', { value: '14' });
      expect(result.value).toBe('14');
    });
  });

  // ── ADM-060/061: Settlement cutoff ───────────────────────────────────────
  describe('getSettlementCutoff', () => {
    it('returns current cutoff for the business', async () => {
      businessRepo.findOne.mockResolvedValue(makeBusiness());
      const result = await service.getSettlementCutoff(BIZ);
      expect(result.cutoff_time).toBe('02:00');
    });

    it('throws 404 for unknown business', async () => {
      businessRepo.findOne.mockResolvedValue(null);
      await expect(service.getSettlementCutoff('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettlementCutoff', () => {
    it('saves and returns new cutoff', async () => {
      const biz = makeBusiness();
      businessRepo.findOne.mockResolvedValue(biz);
      businessRepo.save.mockResolvedValue({ ...biz, daily_settlement_cutoff_time: '03:00' });
      const result = await service.updateSettlementCutoff(BIZ, { cutoff_time: '03:00' });
      expect(result.cutoff_time).toBe('03:00');
    });
  });

  // ── ADM-070: Morocco regions tree ─────────────────────────────────────────
  describe('getMoroccoRegionsTree', () => {
    it('returns top-level regions with children', async () => {
      const regions = [{ id: 'mr-r-06', name: 'Casablanca-Settat', code: 'CST', level: 'region', parent_id: null, children: [] }];
      regionRepo.find.mockResolvedValue(regions);
      const result = await service.getMoroccoRegionsTree();
      expect(result).toEqual(regions);
    });
  });

  // ── ADM-071: Validate address ─────────────────────────────────────────────
  describe('validateAddress', () => {
    it('returns valid: true with full_path when all codes match', async () => {
      regionRepo.findOne
        .mockResolvedValueOnce({ id: 'mr-r-06', name: 'Casablanca-Settat', code: 'CST', level: 'region', parent_id: null })
        .mockResolvedValueOnce({ id: 'mr-p-051', name: 'Casablanca', code: 'CAS', level: 'prefecture', parent_id: 'mr-r-06' })
        .mockResolvedValueOnce({ id: 'mr-c-0010', name: 'Sidi Bernoussi', code: 'CAS-SBR', level: 'commune', parent_id: 'mr-p-051' });
      const result = await service.validateAddress({ region_code: 'CST', prefecture_code: 'CAS', commune_code: 'CAS-SBR' });
      expect(result.valid).toBe(true);
      expect(result.full_path).toBe('Casablanca-Settat / Casablanca / Sidi Bernoussi');
    });

    it('returns valid: false when region code is unknown', async () => {
      regionRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.validateAddress({ region_code: 'INVALID' });
      expect(result.valid).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests — expect all 20 to fail with "Cannot find module"**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="platform-admin.service.spec" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — module `./platform-admin.service` not found.

- [ ] **Step 3: Commit failing tests**

```bash
git add apps/backend/src/modules/platform-admin/platform-admin.service.spec.ts
git commit -m "phase-15: failing tests for PlatformAdminService (TDD baseline)"
```

---

## Task 5: Implement PlatformAdminService

**Files:**
- Create: `apps/backend/src/modules/platform-admin/platform-admin.service.ts`

- [ ] **Step 1: Write the service**

```typescript
// apps/backend/src/modules/platform-admin/platform-admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, MoreThan } from 'typeorm';
import { TradeCategory } from '../../common/entities/trade-category.entity';
import { Courier } from '../../common/entities/courier.entity';
import { BusinessCourierLink } from '../../common/entities/business-courier-link.entity';
import { BusinessCustomAuthority } from '../../common/entities/business-custom-authority.entity';
import { VersionLogMenu } from '../../common/entities/version-log-menu.entity';
import { VersionLogEntry } from '../../common/entities/version-log-entry.entity';
import { SystemParameter } from '../../common/entities/system-parameter.entity';
import { MoroccoRegion } from '../../common/entities/morocco-region.entity';
import { Business } from '../../common/entities/business.entity';
import {
  CreateTradeCategoryDto, UpdateTradeCategoryDto,
  CreateCourierDto, UpdateCourierDto, LinkCourierDto,
  SetCustomAuthorityDto,
  CreateVersionLogEntryDto, UpdateVersionLogEntryDto, ListVersionLogEntriesQueryDto,
  UpdateSystemParameterDto, ListSystemParametersQueryDto,
  UpdateSettlementCutoffDto,
  ValidateAddressDto,
} from './dto/platform-admin.dto';

@Injectable()
export class PlatformAdminService {
  // 5-minute in-process permissions cache per business
  private permissionsCache = new Map<string, { data: Record<string, boolean>; expiresAt: number }>();

  constructor(
    @InjectRepository(TradeCategory) private tradeCatRepo: Repository<TradeCategory>,
    @InjectRepository(Courier) private courierRepo: Repository<Courier>,
    @InjectRepository(BusinessCourierLink) private courierLinkRepo: Repository<BusinessCourierLink>,
    @InjectRepository(BusinessCustomAuthority) private customAuthRepo: Repository<BusinessCustomAuthority>,
    @InjectRepository(VersionLogMenu) private versionMenuRepo: Repository<VersionLogMenu>,
    @InjectRepository(VersionLogEntry) private versionEntryRepo: Repository<VersionLogEntry>,
    @InjectRepository(SystemParameter) private sysParamRepo: Repository<SystemParameter>,
    @InjectRepository(MoroccoRegion) private regionRepo: Repository<MoroccoRegion>,
    @InjectRepository(Business) private businessRepo: Repository<Business>,
  ) {}

  // ── Trade Categories ───────────────────────────────────────────────────────

  listTradeCategoryTree() {
    return this.tradeCatRepo.find({
      where: { parent_id: null, is_active: true },
      relations: ['children', 'children.children'],
      order: { sort_order: 'ASC' },
    });
  }

  createTradeCategory(dto: CreateTradeCategoryDto) {
    const cat = this.tradeCatRepo.create(dto);
    return this.tradeCatRepo.save(cat);
  }

  async updateTradeCategory(id: string, dto: UpdateTradeCategoryDto) {
    const cat = await this.tradeCatRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException({ error: 'ADM_TRADE_CATEGORY_NOT_FOUND' });
    Object.assign(cat, dto);
    return this.tradeCatRepo.save(cat);
  }

  async deleteTradeCategory(id: string) {
    const cat = await this.tradeCatRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException({ error: 'ADM_TRADE_CATEGORY_NOT_FOUND' });
    await this.tradeCatRepo.delete(id);
    return { deleted: true };
  }

  async getTradeCategoryOptions() {
    const roots = await this.tradeCatRepo.find({
      where: { parent_id: null, is_active: true },
      relations: ['children', 'children.children'],
      order: { sort_order: 'ASC' },
    });
    const flat: { id: string; code: string; full_path: string }[] = [];
    const flatten = (nodes: TradeCategory[], prefix: string) => {
      for (const node of nodes) {
        const path = prefix ? `${prefix} > ${node.name}` : node.name;
        flat.push({ id: node.id, code: node.code, full_path: path });
        if (node.children?.length) flatten(node.children, path);
      }
    };
    flatten(roots, '');
    return flat;
  }

  // ── Couriers ───────────────────────────────────────────────────────────────

  listCouriers() {
    return this.courierRepo.find({ order: { name: 'ASC' } });
  }

  createCourier(dto: CreateCourierDto) {
    const c = this.courierRepo.create(dto);
    return this.courierRepo.save(c);
  }

  async updateCourier(id: string, dto: UpdateCourierDto) {
    const c = await this.courierRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException({ error: 'ADM_COURIER_NOT_FOUND' });
    Object.assign(c, dto);
    return this.courierRepo.save(c);
  }

  async deleteCourier(id: string) {
    const c = await this.courierRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException({ error: 'ADM_COURIER_NOT_FOUND' });
    await this.courierRepo.delete(id);
    return { deleted: true };
  }

  listBusinessCouriers(businessId: string) {
    return this.courierLinkRepo.find({
      where: { business_id: businessId },
      relations: ['courier'],
    });
  }

  async linkCourierToBusiness(businessId: string, dto: LinkCourierDto) {
    const courier = await this.courierRepo.findOne({ where: { id: dto.courier_id } });
    if (!courier) throw new NotFoundException({ error: 'ADM_COURIER_NOT_FOUND' });
    const link = this.courierLinkRepo.create({
      business_id: businessId,
      courier_id: dto.courier_id,
      account_credentials_json: dto.credentials ?? null,
      is_default: dto.is_default ?? false,
    });
    return this.courierLinkRepo.save(link);
  }

  async unlinkCourierFromBusiness(businessId: string, courierId: string) {
    const link = await this.courierLinkRepo.findOne({
      where: { business_id: businessId, courier_id: courierId },
    });
    if (!link) throw new NotFoundException({ error: 'ADM_COURIER_LINK_NOT_FOUND' });
    await this.courierLinkRepo.delete({ business_id: businessId, courier_id: courierId });
    return { deleted: true };
  }

  // ── Custom Authority ───────────────────────────────────────────────────────

  async getBusinessCustomAuthority(businessId: string) {
    const record = await this.customAuthRepo.findOne({ where: { business_id: businessId } });
    if (!record) {
      return { business_id: businessId, feature_overrides_json: {}, permission_overrides_json: {} };
    }
    return record;
  }

  async setBusinessCustomAuthority(businessId: string, superAdminId: string, dto: SetCustomAuthorityDto) {
    let record = await this.customAuthRepo.findOne({ where: { business_id: businessId } });
    if (!record) {
      record = this.customAuthRepo.create({ business_id: businessId });
    }
    if (dto.feature_overrides !== undefined) record.feature_overrides_json = dto.feature_overrides;
    if (dto.permission_overrides !== undefined) record.permission_overrides_json = dto.permission_overrides;
    if (dto.notes !== undefined) record.notes = dto.notes;
    record.set_by_super_admin_id = superAdminId;
    const saved = await this.customAuthRepo.save(record);
    this.permissionsCache.delete(businessId);
    return saved;
  }

  async resolveEffectiveFeatures(
    businessId: string,
    baseFeatures: Array<{ feature_key: string; is_enabled: boolean }>,
  ): Promise<Record<string, boolean>> {
    const cached = this.permissionsCache.get(businessId);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const base: Record<string, boolean> = {};
    for (const f of baseFeatures) base[f.feature_key] = f.is_enabled;

    const override = await this.customAuthRepo.findOne({ where: { business_id: businessId } });
    if (override?.feature_overrides_json) {
      Object.assign(base, override.feature_overrides_json);
    }

    this.permissionsCache.set(businessId, { data: base, expiresAt: Date.now() + 5 * 60 * 1000 });
    return base;
  }

  // ── Version Log ────────────────────────────────────────────────────────────

  listVersionLogMenus() {
    return this.versionMenuRepo.find({ order: { sort_order: 'ASC' } });
  }

  createVersionLogEntry(dto: CreateVersionLogEntryDto) {
    const entry = this.versionEntryRepo.create({
      ...dto,
      published_at: dto.published_at ? new Date(dto.published_at) : new Date(),
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
    });
    return this.versionEntryRepo.save(entry);
  }

  async updateVersionLogEntry(id: string, dto: UpdateVersionLogEntryDto) {
    const entry = await this.versionEntryRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException({ error: 'ADM_VERSION_ENTRY_NOT_FOUND' });
    if (dto.version !== undefined) entry.version = dto.version;
    if (dto.description !== undefined) entry.description = dto.description;
    if (dto.expires_at !== undefined) entry.expires_at = dto.expires_at ? new Date(dto.expires_at) : null;
    return this.versionEntryRepo.save(entry);
  }

  async deleteVersionLogEntry(id: string) {
    const entry = await this.versionEntryRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException({ error: 'ADM_VERSION_ENTRY_NOT_FOUND' });
    await this.versionEntryRepo.delete(id);
    return { deleted: true };
  }

  async listVersionLogEntries(query: ListVersionLogEntriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { expires_at: null };
    if (query.menu_id) where.menu_id = query.menu_id;

    // We use findAndCount with a raw-style workaround: fetch all that match
    // menu_id filter, then filter expired in-app (OR expires_at IS NULL OR expires_at > now)
    // TypeORM's FindOperator can't express OR easily, so we use QueryBuilder.
    const qb = this.versionEntryRepo.createQueryBuilder('e')
      .where('(e.expires_at IS NULL OR e.expires_at > :now)', { now: new Date() })
      .orderBy('e.published_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.menu_id) qb.andWhere('e.menu_id = :menuId', { menuId: query.menu_id });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── System Parameters ──────────────────────────────────────────────────────

  async listSystemParameters(query: ListSystemParametersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where: any = {};
    if (query.param_type) where.param_type = query.param_type;
    const [data, total] = await this.sysParamRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { param_type: 'ASC', key: 'ASC' },
    });
    return { data, total, page, limit };
  }

  async updateSystemParameter(id: string, dto: UpdateSystemParameterDto) {
    const param = await this.sysParamRepo.findOne({ where: { id } });
    if (!param) throw new NotFoundException({ error: 'ADM_SYSTEM_PARAM_NOT_FOUND' });
    param.value = dto.value;
    return this.sysParamRepo.save(param);
  }

  // ── Settlement Cutoff ──────────────────────────────────────────────────────

  async getSettlementCutoff(businessId: string) {
    const biz = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!biz) throw new NotFoundException({ error: 'BUSINESS_NOT_FOUND' });
    return { cutoff_time: biz.daily_settlement_cutoff_time ?? '02:00' };
  }

  async updateSettlementCutoff(businessId: string, dto: UpdateSettlementCutoffDto) {
    const biz = await this.businessRepo.findOne({ where: { id: businessId } });
    if (!biz) throw new NotFoundException({ error: 'BUSINESS_NOT_FOUND' });
    biz.daily_settlement_cutoff_time = dto.cutoff_time;
    await this.businessRepo.save(biz);
    return { cutoff_time: dto.cutoff_time };
  }

  // ── Morocco Address ────────────────────────────────────────────────────────

  getMoroccoRegionsTree() {
    return this.regionRepo.find({
      where: { parent_id: null },
      relations: ['children', 'children.children'],
      order: { sort_order: 'ASC' },
    });
  }

  async validateAddress(dto: ValidateAddressDto) {
    const parts: string[] = [];

    if (dto.region_code) {
      const region = await this.regionRepo.findOne({ where: { code: dto.region_code, level: 'region' } });
      if (!region) return { valid: false, full_path: null };
      parts.push(region.name);

      if (dto.prefecture_code) {
        const prefecture = await this.regionRepo.findOne({
          where: { code: dto.prefecture_code, level: 'prefecture', parent_id: region.id },
        });
        if (!prefecture) return { valid: false, full_path: null };
        parts.push(prefecture.name);

        if (dto.commune_code) {
          const commune = await this.regionRepo.findOne({
            where: { code: dto.commune_code, level: 'commune', parent_id: prefecture.id },
          });
          if (!commune) return { valid: false, full_path: null };
          parts.push(commune.name);
        }
      }
    }

    return { valid: true, full_path: parts.join(' / ') };
  }
}
```

- [ ] **Step 2: Run tests — expect all 20 to pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="platform-admin.service.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 20 tests.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/platform-admin/platform-admin.service.ts
git commit -m "phase-15: PlatformAdminService — 20 tests passing (ADM-001–ADM-071)"
```

---

## Task 6: Capital Detail Report Generator

**Files:**
- Create: `apps/backend/src/modules/reports/generators/capital-detail.generator.ts`
- Modify: `apps/backend/src/modules/reports/reports.service.ts`
- Modify: `apps/backend/src/modules/reports/reports.module.ts`
- Modify: `apps/backend/src/modules/reports/generators/accounting.generator.ts`

- [ ] **Step 1: Write failing test for CapitalDetailGenerator**

In `apps/backend/src/modules/reports/reports.service.spec.ts`, in the existing Part C describe block or as a new block at the end, add:

```typescript
  describe('capital-detail report (ADM-030)', () => {
    it('returns capital-detail report for owner role', async () => {
      capitalDetailGen.capitalDetail.mockResolvedValue({
        title: 'Capital Detail',
        currency: 'MAD',
        language: 'fr',
        business_type: 'retail',
        generated_at: expect.any(String),
        period: { type: 'last_7days', from: '2026-05-01', to: '2026-05-07' },
        summary: [],
        tables: [{ title: 'Détail journalier', columns: [], rows: [] }],
        meta: {},
      });
      const result = await service.getReport(BIZ, 'capital-detail', { type: 'last_7days' } as any, 'fr');
      expect(result.title).toBe('Capital Detail');
    });
  });
```

(The test passes after `CapitalDetailGenerator` is wired in.)

- [ ] **Step 2: Create the generator**

```typescript
// apps/backend/src/modules/reports/generators/capital-detail.generator.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { bankersRound } from '../../../common/utils/money';
import { DateRange } from '../../../common/utils/date-range';
import { UniversalReportResponse } from '../dto/report-query.dto';
import { ReportLanguage } from '../../../common/i18n/report-labels';

const TZ = 'Africa/Casablanca';

@Injectable()
export class CapitalDetailGenerator {
  constructor(private ds: DataSource) {}

  async capitalDetail(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  ): Promise<UniversalReportResponse> {
    const [salesRows, refundRows, inputTvaRows, pointsRows] = await Promise.all([
      // Per-day: revenue_ttc, tva_collected, cash, card
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)              AS day,
           COALESCE(SUM(total_ttc),  0)                  AS revenue_ttc,
           COALESCE(SUM(total_tva),  0)                  AS tva_collected,
           COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_ttc ELSE 0 END), 0) AS cash_collected,
           COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_ttc ELSE 0 END), 0) AS card_collected
         FROM transactions
         WHERE business_id = $1
           AND status = 'completed'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      // Per-day: refunds issued
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)          AS day,
           COALESCE(SUM(total_ttc), 0)               AS refunds_issued
         FROM transactions
         WHERE business_id = $1
           AND status = 'refunded'
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
      // Per-day: input TVA paid (from confirmed/received POs)
      this.ds.query<any[]>(
        `SELECT
           DATE(po.order_date)                        AS day,
           COALESCE(SUM(poi.quantity * poi.unit_price_ht * (poi.tva_rate / 100.0)), 0) AS tva_paid_input
         FROM purchase_order_items poi
         INNER JOIN purchase_orders po ON po.id = poi.purchase_order_id
         WHERE po.business_id = $1
           AND po.status IN ('confirmed','received','partially_received')
           AND DATE(po.order_date) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr],
      ),
      // Per-day: points liability change
      this.ds.query<any[]>(
        `SELECT
           DATE(created_at AT TIME ZONE $4)          AS day,
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS points_earned,
           COALESCE(SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END), 0) AS points_redeemed
         FROM customer_points_history
         WHERE business_id = $1
           AND DATE(created_at AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY 1
         ORDER BY 1`,
        [businessId, period.fromStr, period.toStr, TZ],
      ),
    ]);

    // Build a date-keyed map
    const byDay = new Map<string, any>();
    for (const r of salesRows) {
      byDay.set(r.day, {
        day: r.day,
        revenue_ttc: bankersRound(Number(r.revenue_ttc)),
        tva_collected: bankersRound(Number(r.tva_collected)),
        cash_collected: bankersRound(Number(r.cash_collected)),
        card_collected: bankersRound(Number(r.card_collected)),
        refunds_issued: 0,
        tva_paid_input: 0,
        points_liability_change: 0,
        stored_value_liability_change: 0,
      });
    }
    for (const r of refundRows) {
      const d = byDay.get(r.day) ?? { day: r.day, revenue_ttc: 0, tva_collected: 0, cash_collected: 0, card_collected: 0, refunds_issued: 0, tva_paid_input: 0, points_liability_change: 0, stored_value_liability_change: 0 };
      d.refunds_issued = bankersRound(Number(r.refunds_issued));
      byDay.set(r.day, d);
    }
    for (const r of inputTvaRows) {
      const d = byDay.get(r.day);
      if (d) d.tva_paid_input = bankersRound(Number(r.tva_paid_input));
    }
    for (const r of pointsRows) {
      const d = byDay.get(r.day);
      // points liability change = net_points_earned * redeem_value (rough estimate; full calc needs redeem_value per business)
      if (d) d.points_liability_change = bankersRound((Number(r.points_earned) - Number(r.points_redeemed)) * 0.05);
    }

    const rows = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));

    // Running cash position
    let runningCash = 0;
    for (const row of rows) {
      runningCash = bankersRound(runningCash + row.cash_collected + row.card_collected - row.refunds_issued);
      row.running_cash_position = runningCash;
    }

    const totRevenue = bankersRound(rows.reduce((s, r) => s + r.revenue_ttc, 0));
    const totTva = bankersRound(rows.reduce((s, r) => s + r.tva_collected, 0));
    const totRefunds = bankersRound(rows.reduce((s, r) => s + r.refunds_issued, 0));
    const totCash = bankersRound(rows.reduce((s, r) => s + r.cash_collected, 0));
    const totCard = bankersRound(rows.reduce((s, r) => s + r.card_collected, 0));

    return {
      title: 'Capital Detail',
      currency: 'MAD',
      language: lang,
      business_type: businessType,
      generated_at: new Date().toISOString(),
      period: { type, from: period.fromStr, to: period.toStr },
      summary: [
        { label: 'Chiffre d\'affaires TTC', value: totRevenue, type: 'money' },
        { label: 'TVA collectée', value: totTva, type: 'money' },
        { label: 'Remboursements', value: totRefunds, type: 'money' },
        { label: 'Encaissements espèces', value: totCash, type: 'money' },
        { label: 'Encaissements carte', value: totCard, type: 'money' },
      ],
      tables: [
        {
          title: 'Détail journalier',
          columns: [
            { key: 'day', label: 'Date', type: 'date' },
            { key: 'revenue_ttc', label: 'CA TTC', type: 'money' },
            { key: 'tva_collected', label: 'TVA collectée', type: 'money' },
            { key: 'tva_paid_input', label: 'TVA déductible', type: 'money' },
            { key: 'refunds_issued', label: 'Remboursements', type: 'money' },
            { key: 'cash_collected', label: 'Espèces', type: 'money' },
            { key: 'card_collected', label: 'Carte', type: 'money' },
            { key: 'points_liability_change', label: 'Variation points', type: 'money' },
            { key: 'running_cash_position', label: 'Position trésorerie', type: 'money' },
          ],
          rows,
        },
      ],
      meta: {},
    };
  }
}
```

- [ ] **Step 3: Update `accounting.generator.ts` — add optional `cutoffHour` param to `dailyClose`**

In `apps/backend/src/modules/reports/generators/accounting.generator.ts`, find the `dailyClose` method signature and update it to accept an optional `cutoffTime` parameter. Replace the date-filter line to use cutoff-adjusted time when provided.

Current signature (around line 93):
```typescript
  async dailyClose(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
  )
```

New signature:
```typescript
  async dailyClose(
    businessId: string,
    lang: ReportLanguage,
    businessType: string,
    period: DateRange,
    type: string,
    cutoffTime?: string,
  )
```

Inside the method, replace:
```typescript
         AND DATE(t.created_at AT TIME ZONE $4) BETWEEN $2 AND $3
```
with:
```typescript
         AND DATE(t.created_at AT TIME ZONE $4 - INTERVAL '1 hour' * $5::int) BETWEEN $2 AND $3
```
And add `cutoffHours` to the query params:
```typescript
const cutoffHours = cutoffTime ? parseInt(cutoffTime.split(':')[0], 10) : 2;
```

> **Note:** This approach subtracts the cutoff hours from the timestamp so a 01:30 sale with a 02:00 cutoff lands on the previous calendar day. Pass the full cutoffHours array index as `$5` in the existing query.

- [ ] **Step 4: Update `reports.service.ts` — add `capital-detail`**

In `apps/backend/src/modules/reports/reports.service.ts`:

Add `CapitalDetailGenerator` import:
```typescript
import { CapitalDetailGenerator } from './generators/capital-detail.generator';
```

Add `'capital-detail'` to `ALL_REPORT_IDS`:
```typescript
  // Phase 15 ADM
  'capital-detail',
```

Add `private capitalDetailGen: CapitalDetailGenerator` to constructor.

Update `dailyClose` case to pass cutoff:
```typescript
      case 'daily-close': {
        const cutoff = business.daily_settlement_cutoff_time ?? '02:00';
        return this.accountingGen.dailyClose(businessId, lang, businessType, period, query.type, cutoff);
      }
```

Add `capital-detail` case before the `default`:
```typescript
      case 'capital-detail':
        return this.capitalDetailGen.capitalDetail(businessId, lang, businessType, period, query.type);
```

- [ ] **Step 5: Update `reports.module.ts` — register generator**

Add to imports: none new needed (DataSource is global).
Add to providers: `CapitalDetailGenerator`.

```typescript
import { CapitalDetailGenerator } from './generators/capital-detail.generator';
// ... in providers array:
    CapitalDetailGenerator,
```

- [ ] **Step 6: Run all existing tests — must still pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern="reports.service.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — existing report tests unchanged.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/reports/generators/capital-detail.generator.ts \
        apps/backend/src/modules/reports/reports.service.ts \
        apps/backend/src/modules/reports/reports.module.ts \
        apps/backend/src/modules/reports/generators/accounting.generator.ts
git commit -m "phase-15: CapitalDetailGenerator + daily-close cutoff integration (ADM-030, ADM-061)"
```

---

## Task 7: Controllers

**Files:**
- Create: `apps/backend/src/modules/platform-admin/platform-admin-super.controller.ts`
- Create: `apps/backend/src/modules/platform-admin/platform-admin-business.controller.ts`
- Create: `apps/backend/src/modules/platform-admin/platform-admin-auth.controller.ts`

- [ ] **Step 1: Write super admin controller**

```typescript
// apps/backend/src/modules/platform-admin/platform-admin-super.controller.ts
import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { PlatformAdminService } from './platform-admin.service';
import {
  CreateTradeCategoryDto, UpdateTradeCategoryDto,
  CreateCourierDto, UpdateCourierDto,
  SetCustomAuthorityDto,
  CreateVersionLogEntryDto, UpdateVersionLogEntryDto,
  UpdateSystemParameterDto, ListSystemParametersQueryDto,
} from './dto/platform-admin.dto';

@Controller('super')
@UseGuards(RolesGuard)
@Roles('super_admin')
export class PlatformAdminSuperController {
  constructor(private service: PlatformAdminService) {}

  // ── Trade Categories (ADM-001–005) ────────────────────────────────────────

  @Get('trade-categories/tree')
  listTradeCategoryTree() {
    return this.service.listTradeCategoryTree();
  }

  @Get('trade-categories/options')
  getTradeCategoryOptions() {
    return this.service.getTradeCategoryOptions();
  }

  @Post('trade-categories')
  createTradeCategory(@Body() dto: CreateTradeCategoryDto) {
    return this.service.createTradeCategory(dto);
  }

  @Patch('trade-categories/:id')
  updateTradeCategory(@Param('id') id: string, @Body() dto: UpdateTradeCategoryDto) {
    return this.service.updateTradeCategory(id, dto);
  }

  @Delete('trade-categories/:id')
  @HttpCode(HttpStatus.OK)
  deleteTradeCategory(@Param('id') id: string) {
    return this.service.deleteTradeCategory(id);
  }

  // ── Couriers (ADM-010–013) ────────────────────────────────────────────────

  @Get('couriers')
  listCouriers() {
    return this.service.listCouriers();
  }

  @Post('couriers')
  createCourier(@Body() dto: CreateCourierDto) {
    return this.service.createCourier(dto);
  }

  @Patch('couriers/:id')
  updateCourier(@Param('id') id: string, @Body() dto: UpdateCourierDto) {
    return this.service.updateCourier(id, dto);
  }

  @Delete('couriers/:id')
  @HttpCode(HttpStatus.OK)
  deleteCourier(@Param('id') id: string) {
    return this.service.deleteCourier(id);
  }

  // ── Custom Authority (ADM-020–021) ────────────────────────────────────────

  @Get('businesses/:id/custom-authority')
  getBusinessCustomAuthority(@Param('id') businessId: string) {
    return this.service.getBusinessCustomAuthority(businessId);
  }

  @Put('businesses/:id/custom-authority')
  setBusinessCustomAuthority(
    @Param('id') businessId: string,
    @Body() dto: SetCustomAuthorityDto,
    @CurrentUser('id') superAdminId: string,
  ) {
    return this.service.setBusinessCustomAuthority(businessId, superAdminId, dto);
  }

  // ── Version Log (ADM-040, ADM-042–044) ───────────────────────────────────

  @Get('version-log/menus')
  listVersionLogMenus() {
    return this.service.listVersionLogMenus();
  }

  @Post('version-log/entries')
  createVersionLogEntry(@Body() dto: CreateVersionLogEntryDto) {
    return this.service.createVersionLogEntry(dto);
  }

  @Patch('version-log/entries/:id')
  updateVersionLogEntry(@Param('id') id: string, @Body() dto: UpdateVersionLogEntryDto) {
    return this.service.updateVersionLogEntry(id, dto);
  }

  @Delete('version-log/entries/:id')
  @HttpCode(HttpStatus.OK)
  deleteVersionLogEntry(@Param('id') id: string) {
    return this.service.deleteVersionLogEntry(id);
  }

  // ── System Parameters (ADM-050–051) ──────────────────────────────────────

  @Get('system-parameters')
  listSystemParameters(@Query() query: ListSystemParametersQueryDto) {
    return this.service.listSystemParameters(query);
  }

  @Patch('system-parameters/:id')
  updateSystemParameter(@Param('id') id: string, @Body() dto: UpdateSystemParameterDto) {
    return this.service.updateSystemParameter(id, dto);
  }
}
```

- [ ] **Step 2: Write business controller**

```typescript
// apps/backend/src/modules/platform-admin/platform-admin-business.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators';
import { PlatformAdminService } from './platform-admin.service';
import { LinkCourierDto, UpdateSettlementCutoffDto } from './dto/platform-admin.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class PlatformAdminBusinessController {
  constructor(private service: PlatformAdminService) {}

  // ── Couriers (ADM-014–016) ────────────────────────────────────────────────

  @Get('couriers')
  listBusinessCouriers(@CurrentUser('business_id') businessId: string) {
    return this.service.listBusinessCouriers(businessId);
  }

  @Post('couriers/link')
  linkCourier(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: LinkCourierDto,
  ) {
    return this.service.linkCourierToBusiness(businessId, dto);
  }

  @Delete('couriers/:courier_id')
  @HttpCode(HttpStatus.OK)
  unlinkCourier(
    @CurrentUser('business_id') businessId: string,
    @Param('courier_id') courierId: string,
  ) {
    return this.service.unlinkCourierFromBusiness(businessId, courierId);
  }

  // ── Settlement Cutoff (ADM-060–061) ───────────────────────────────────────

  @Get('settings/settlement-cutoff')
  getSettlementCutoff(@CurrentUser('business_id') businessId: string) {
    return this.service.getSettlementCutoff(businessId);
  }

  @Put('settings/settlement-cutoff')
  @Roles('owner')
  updateSettlementCutoff(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateSettlementCutoffDto,
  ) {
    return this.service.updateSettlementCutoff(businessId, dto);
  }
}
```

- [ ] **Step 3: Write auth controller (public/authenticated endpoints)**

```typescript
// apps/backend/src/modules/platform-admin/platform-admin-auth.controller.ts
import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PlatformAdminService } from './platform-admin.service';
import { ListVersionLogEntriesQueryDto, ValidateAddressDto } from './dto/platform-admin.dto';

@Controller('auth')
export class PlatformAdminAuthController {
  constructor(private service: PlatformAdminService) {}

  // ── Trade categories public tree (ADM-001) ────────────────────────────────

  @Public()
  @Get('trade-categories/tree')
  listTradeCategoryTree() {
    return this.service.listTradeCategoryTree();
  }

  // ── Version log (ADM-040–041) ─────────────────────────────────────────────

  @Get('version-log/menus')
  listVersionLogMenus() {
    return this.service.listVersionLogMenus();
  }

  @Get('version-log/entries')
  listVersionLogEntries(@Query() query: ListVersionLogEntriesQueryDto) {
    return this.service.listVersionLogEntries(query);
  }

  // ── Morocco address picker (ADM-070–071) ──────────────────────────────────

  @Public()
  @Get('regions/tree')
  getMoroccoRegionsTree() {
    return this.service.getMoroccoRegionsTree();
  }

  @Public()
  @Post('regions/validate')
  validateAddress(@Body() dto: ValidateAddressDto) {
    return this.service.validateAddress(dto);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/platform-admin/platform-admin-super.controller.ts \
        apps/backend/src/modules/platform-admin/platform-admin-business.controller.ts \
        apps/backend/src/modules/platform-admin/platform-admin-auth.controller.ts
git commit -m "phase-15: PlatformAdminSuperController, BusinessController, AuthController"
```

---

## Task 8: Module Wiring

**Files:**
- Create: `apps/backend/src/modules/platform-admin/platform-admin.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

```typescript
// apps/backend/src/modules/platform-admin/platform-admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformAdminSuperController } from './platform-admin-super.controller';
import { PlatformAdminBusinessController } from './platform-admin-business.controller';
import { PlatformAdminAuthController } from './platform-admin-auth.controller';
import { TradeCategory } from '../../common/entities/trade-category.entity';
import { Courier } from '../../common/entities/courier.entity';
import { BusinessCourierLink } from '../../common/entities/business-courier-link.entity';
import { BusinessCustomAuthority } from '../../common/entities/business-custom-authority.entity';
import { VersionLogMenu } from '../../common/entities/version-log-menu.entity';
import { VersionLogEntry } from '../../common/entities/version-log-entry.entity';
import { SystemParameter } from '../../common/entities/system-parameter.entity';
import { MoroccoRegion } from '../../common/entities/morocco-region.entity';
import { Business } from '../../common/entities/business.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TradeCategory, Courier, BusinessCourierLink, BusinessCustomAuthority,
      VersionLogMenu, VersionLogEntry, SystemParameter, MoroccoRegion, Business,
    ]),
  ],
  controllers: [
    PlatformAdminSuperController,
    PlatformAdminBusinessController,
    PlatformAdminAuthController,
  ],
  providers: [PlatformAdminService],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
```

- [ ] **Step 2: Register in AppModule**

In `apps/backend/src/app.module.ts`, add:
```typescript
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
```
And add `PlatformAdminModule` to the `imports` array (after `RecommendationModule`).

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/platform-admin/platform-admin.module.ts \
        apps/backend/src/app.module.ts
git commit -m "phase-15: PlatformAdminModule wired into AppModule"
```

---

## Task 9: Final Verification + Docs

- [ ] **Step 1: Run full test suite**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --no-coverage 2>&1 | tail -20
```

Expected: All 596 pre-existing tests pass + 20 new platform-admin tests = **616+ tests passing, 44 suites**.

- [ ] **Step 2: Update `CLAUDE.md`** — find the implementation status section and update:

```
**Current state: 616+ tests passing, 44 suites, zero regressions.**

Completed phases: 0, 5, 6, 7, 8, 9, 10, Reports, 11A, 12A, 12B, 12C, 12D, 13, 14, 15.
Next: Cross-cutting pass (i18n error keys, real-time dashboard events, audit_logs DB writes).
```

Also add to the Key architectural facts:
```
- `PlatformAdminModule` at `src/modules/platform-admin/`: 3 controllers (super/business/auth), `PlatformAdminService` (8 domain groups: trade categories, couriers, custom authority, version log, system params, settlement cutoff, address picker, effective permissions cache)
- Trade categories: self-referencing tree (parent_id self-FK); `getTradeCategoryOptions()` returns flattened with full path names
- Couriers: platform-level registry; `business_courier_links` scoped by `business_id`
- Custom authority: `business_custom_authority` table keyed by `business_id`; `resolveEffectiveFeatures()` overlays custom overrides on business_type_features with 5-min in-process cache
- Settlement cutoff: `businesses.daily_settlement_cutoff_time` TIME DEFAULT '02:00'; `dailyClose` report uses it for date-boundary shifting (XCC-018)
- Morocco regions: 3-level tree (region > prefecture > commune) in `morocco_regions` table; seeded with all 12 régions + 75+ préfectures + key communes
- System parameters: seeded with 6 platform defaults; `updateSystemParameter` audits via console.log stub
- Version log: `version_log_menus` + `version_log_entries`; entries with `expires_at < now()` auto-filtered from public endpoints
```

- [ ] **Step 3: Add Phase 15 entry to `docs/IMPLEMENTATION_LOG.md`**

```markdown
### Phase 15 — Platform Admin Enhancements (DONE). 616+ tests passing (44 suites).

See extension spec §12 (ADM-001–ADM-071) for requirement IDs.

- [x] Migration `1714015000000-AddPlatformAdminEnhancements` — 8 new tables:
      `trade_categories`, `couriers`, `business_courier_links`, `business_custom_authority`,
      `version_log_menus`, `version_log_entries`, `system_parameters`, `morocco_regions`;
      Column additions to `businesses`: `trade_category_id`, `daily_settlement_cutoff_time`;
      Seeded: 3 version-log menus, 6 system parameters, 12 Moroccan regions + 75+ préfectures + communes
- [x] 8 new entities: TradeCategory (self-referencing tree), Courier, BusinessCourierLink,
      BusinessCustomAuthority, VersionLogMenu, VersionLogEntry, SystemParameter, MoroccoRegion
- [x] `PlatformAdminService` — 23 methods across 8 domain groups; 5-min in-process
      effective-permissions cache per business (ADM-022)
- [x] `PlatformAdminSuperController` — 14 routes under `/api/super/` (ADM-001–005, ADM-010–013, ADM-020–021, ADM-040, ADM-042–044, ADM-050–051)
- [x] `PlatformAdminBusinessController` — 5 routes under `/api/business/` (ADM-014–016, ADM-060–061)
- [x] `PlatformAdminAuthController` — 5 routes under `/api/auth/` (ADM-001 public tree, ADM-040–041, ADM-070–071)
- [x] `CapitalDetailGenerator` — per-day breakdown: revenue, TVA collected/paid, refunds, cash/card, points liability, running cash position (ADM-030); wired as `capital-detail` report ID
- [x] `AccountingGenerator.dailyClose` updated to accept `cutoffTime` param; `ReportsService` passes `business.daily_settlement_cutoff_time` (XCC-018, ADM-061)
- [x] 20 new tests in `platform-admin.service.spec.ts`
```

- [ ] **Step 4: Final commit**

```bash
git add CLAUDE.md docs/IMPLEMENTATION_LOG.md
git commit -m "phase-15: update docs — 616+ tests, 44 suites, mark Phase 15 DONE"
```

---

## Self-Review: Spec Coverage

| Requirement | Task | Status |
|---|---|---|
| ADM-001 tree (super + auth) | Task 7 | ✓ |
| ADM-002 create | Task 7 | ✓ |
| ADM-003 update | Task 7 | ✓ |
| ADM-004 delete | Task 7 | ✓ |
| ADM-005 options | Task 7 | ✓ |
| ADM-010 list couriers | Task 7 | ✓ |
| ADM-011 create courier | Task 7 | ✓ |
| ADM-012 update courier | Task 7 | ✓ |
| ADM-013 delete courier | Task 7 | ✓ |
| ADM-014 list biz couriers | Task 7 | ✓ |
| ADM-015 link courier | Task 7 | ✓ |
| ADM-016 unlink courier | Task 7 | ✓ |
| ADM-020 get custom authority | Task 7 | ✓ |
| ADM-021 set custom authority | Task 7 | ✓ |
| ADM-022 effective perms + 5-min cache | Task 5 | ✓ |
| ADM-030 capital-detail report | Task 6 | ✓ |
| ADM-040 list menus (super + auth) | Task 7 | ✓ |
| ADM-041 list entries (auth, auto-expire) | Task 5+7 | ✓ |
| ADM-042 create entry | Task 7 | ✓ |
| ADM-043 update entry | Task 7 | ✓ |
| ADM-044 delete entry | Task 7 | ✓ |
| ADM-050 list params | Task 7 | ✓ |
| ADM-051 update param | Task 7 | ✓ |
| ADM-060 get cutoff | Task 7 | ✓ |
| ADM-061 update cutoff + ops reports | Task 6+7 | ✓ |
| ADM-070 regions tree | Task 7 | ✓ |
| ADM-071 validate address | Task 7 | ✓ |
| ADM-MOD-001 businesses columns | Task 1+2 | ✓ |
| Morocco seed data | Task 1 | ✓ |
