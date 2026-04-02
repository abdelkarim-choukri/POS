import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712050000000 implements MigrationInterface {
  name = 'InitialSchema1712050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types
    await queryRunner.query(`CREATE TYPE "subscription_status_enum" AS ENUM('active', 'suspended', 'cancelled', 'trial')`);
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM('owner', 'manager', 'employee')`);
    await queryRunner.query(`CREATE TYPE "transaction_status_enum" AS ENUM('completed', 'voided', 'refunded', 'partial_refund')`);
    await queryRunner.query(`CREATE TYPE "payment_method_enum" AS ENUM('cash', 'card_cmi', 'card_payzone', 'other')`);
    await queryRunner.query(`CREATE TYPE "refund_method_enum" AS ENUM('cash', 'card_reversal')`);
    await queryRunner.query(`CREATE TYPE "sync_operation_type_enum" AS ENUM('transaction', 'clock_in', 'clock_out', 'void')`);
    await queryRunner.query(`CREATE TYPE "sync_status_enum" AS ENUM('pending', 'synced', 'failed')`);

    // 1. super_admins
    await queryRunner.query(`
      CREATE TABLE "super_admins" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "email" VARCHAR(255) NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "phone" VARCHAR(20),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_super_admins_email" UNIQUE ("email"),
        CONSTRAINT "PK_super_admins" PRIMARY KEY ("id")
      )
    `);

    // 2. business_types
    await queryRunner.query(`
      CREATE TABLE "business_types" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name" VARCHAR(50) NOT NULL,
        "label" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_types" PRIMARY KEY ("id")
      )
    `);

    // 3. business_type_features
    await queryRunner.query(`
      CREATE TABLE "business_type_features" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_type_id" UUID NOT NULL,
        "feature_key" VARCHAR(50) NOT NULL,
        "is_enabled" BOOLEAN NOT NULL DEFAULT true,
        "config_json" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_type_features" PRIMARY KEY ("id"),
        CONSTRAINT "FK_btf_business_type" FOREIGN KEY ("business_type_id") REFERENCES "business_types"("id") ON DELETE CASCADE
      )
    `);

    // 4. businesses
    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_type_id" UUID NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "legal_name" VARCHAR(200),
        "email" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(20),
        "logo_url" VARCHAR(500),
        "currency" VARCHAR(3) NOT NULL DEFAULT 'MAD',
        "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Casablanca',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "settings_json" JSONB,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_businesses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_businesses_type" FOREIGN KEY ("business_type_id") REFERENCES "business_types"("id")
      )
    `);

    // 5. subscriptions
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "plan_name" VARCHAR(50) NOT NULL,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'trial',
        "start_date" DATE NOT NULL,
        "end_date" DATE,
        "price_mad" DECIMAL(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_business" UNIQUE ("business_id"),
        CONSTRAINT "FK_subscriptions_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // 6. locations
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "address" TEXT,
        "city" VARCHAR(100),
        "phone" VARCHAR(20),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_locations_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // 7. terminals
    await queryRunner.query(`
      CREATE TABLE "terminals" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "location_id" UUID NOT NULL,
        "terminal_code" VARCHAR(20) NOT NULL,
        "device_name" VARCHAR(100),
        "hardware_id" VARCHAR(255),
        "os_version" VARCHAR(50),
        "app_version" VARCHAR(20),
        "is_online" BOOLEAN NOT NULL DEFAULT false,
        "last_seen_at" TIMESTAMP,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_terminals_code" UNIQUE ("terminal_code"),
        CONSTRAINT "PK_terminals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_terminals_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
      )
    `);

    // 8. users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "email" VARCHAR(255),
        "password_hash" VARCHAR(255) NOT NULL,
        "pin" VARCHAR(10),
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'employee',
        "phone" VARCHAR(20),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "can_void" BOOLEAN NOT NULL DEFAULT false,
        "can_refund" BOOLEAN NOT NULL DEFAULT false,
        "dashboard_access" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // 9. clock_entries
    await queryRunner.query(`
      CREATE TABLE "clock_entries" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL,
        "terminal_id" UUID NOT NULL,
        "clock_in" TIMESTAMP NOT NULL,
        "clock_out" TIMESTAMP,
        "total_hours" DECIMAL(5,2),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clock_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_clock_entries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_clock_entries_terminal" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE CASCADE
      )
    `);

    // 10. categories
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "sort_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // 11. products
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "category_id" UUID NOT NULL,
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "price" DECIMAL(10,2) NOT NULL,
        "cost_price" DECIMAL(10,2),
        "sku" VARCHAR(50),
        "image_url" VARCHAR(500),
        "is_sold_out" BOOLEAN NOT NULL DEFAULT false,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      )
    `);

    // 12. product_variants
    await queryRunner.query(`
      CREATE TABLE "product_variants" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" UUID NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "price_override" DECIMAL(10,2),
        "sku" VARCHAR(50),
        "is_sold_out" BOOLEAN NOT NULL DEFAULT false,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_variants_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    // 13. modifier_groups
    await queryRunner.query(`
      CREATE TABLE "modifier_groups" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "is_required" BOOLEAN NOT NULL DEFAULT false,
        "max_selections" INT NOT NULL DEFAULT 0,
        "sort_order" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modifier_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_modifier_groups_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // 14. modifiers
    await queryRunner.query(`
      CREATE TABLE "modifiers" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "modifier_group_id" UUID NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_modifiers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_modifiers_group" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE
      )
    `);

    // 15. product_modifier_groups
    await queryRunner.query(`
      CREATE TABLE "product_modifier_groups" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" UUID NOT NULL,
        "modifier_group_id" UUID NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_modifier_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pmg_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pmg_modifier_group" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE CASCADE
      )
    `);

    // 16. transactions
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID NOT NULL,
        "location_id" UUID NOT NULL,
        "terminal_id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "transaction_number" VARCHAR(30) NOT NULL,
        "subtotal" DECIMAL(10,2) NOT NULL,
        "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
        "total" DECIMAL(10,2) NOT NULL,
        "status" "transaction_status_enum" NOT NULL DEFAULT 'completed',
        "payment_method" "payment_method_enum" NOT NULL,
        "payment_confirmed_at" TIMESTAMP,
        "receipt_printed" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        "is_offline" BOOLEAN NOT NULL DEFAULT false,
        "synced_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transactions_number" UNIQUE ("transaction_number"),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
        CONSTRAINT "FK_transactions_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_transactions_terminal" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id"),
        CONSTRAINT "FK_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);

    // 17. transaction_items
    await queryRunner.query(`
      CREATE TABLE "transaction_items" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" UUID NOT NULL,
        "product_id" UUID NOT NULL,
        "variant_id" UUID,
        "product_name" VARCHAR(200) NOT NULL,
        "variant_name" VARCHAR(100),
        "quantity" INT NOT NULL,
        "unit_price" DECIMAL(10,2) NOT NULL,
        "modifiers_json" JSONB,
        "line_total" DECIMAL(10,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction_items" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ti_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);

    // 18. voids
    await queryRunner.query(`
      CREATE TABLE "voids" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" UUID NOT NULL,
        "voided_by" UUID NOT NULL,
        "approved_by" UUID,
        "reason" TEXT NOT NULL,
        "voided_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_voids" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_voids_transaction" UNIQUE ("transaction_id"),
        CONSTRAINT "FK_voids_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);

    // 19. refunds
    await queryRunner.query(`
      CREATE TABLE "refunds" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" UUID NOT NULL,
        "refunded_by" UUID NOT NULL,
        "amount" DECIMAL(10,2) NOT NULL,
        "reason" TEXT NOT NULL,
        "refund_method" "refund_method_enum" NOT NULL,
        "refunded_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refunds" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refunds_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);

    // 20. sync_queue
    await queryRunner.query(`
      CREATE TABLE "sync_queue" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "terminal_id" UUID NOT NULL,
        "operation_type" "sync_operation_type_enum" NOT NULL,
        "payload_json" JSONB NOT NULL,
        "status" "sync_status_enum" NOT NULL DEFAULT 'pending',
        "attempts" INT NOT NULL DEFAULT 0,
        "queued_at" TIMESTAMP NOT NULL DEFAULT now(),
        "synced_at" TIMESTAMP,
        "error_message" TEXT,
        CONSTRAINT "PK_sync_queue" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sync_queue_terminal" FOREIGN KEY ("terminal_id") REFERENCES "terminals"("id") ON DELETE CASCADE
      )
    `);

    // 21. audit_logs
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "business_id" UUID,
        "user_id" UUID NOT NULL,
        "action" VARCHAR(50) NOT NULL,
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_id" UUID NOT NULL,
        "details_json" JSONB,
        "ip_address" VARCHAR(45),
        "performed_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Indexes for performance
    await queryRunner.query(`CREATE INDEX "IDX_businesses_type" ON "businesses"("business_type_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_locations_business" ON "locations"("business_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_terminals_location" ON "terminals"("location_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_business" ON "users"("business_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users"("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_business" ON "products"("business_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products"("category_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_business" ON "transactions"("business_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_location" ON "transactions"("location_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_terminal" ON "transactions"("terminal_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_created" ON "transactions"("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_business" ON "audit_logs"("business_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_performed" ON "audit_logs"("performed_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_sync_queue_terminal" ON "sync_queue"("terminal_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_sync_queue_status" ON "sync_queue"("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_queue" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refunds" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "voids" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_modifier_groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modifiers" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "modifier_groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clock_entries" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "terminals" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "businesses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_type_features" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_types" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "super_admins" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_operation_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "refund_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
  }
}
