import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommunications1714006000000 implements MigrationInterface {
  name = 'AddCommunications1714006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── platform_announcements ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "platform_announcements" (
        "id"                       UUID          NOT NULL DEFAULT gen_random_uuid(),
        "title"                    VARCHAR(200)  NOT NULL,
        "body"                     TEXT          NOT NULL,
        "severity"                 VARCHAR(20)   NOT NULL DEFAULT 'info',
        "target_business_type_ids" UUID[]        NOT NULL DEFAULT '{}',
        "target_business_ids"      UUID[]        NOT NULL DEFAULT '{}',
        "display_on_homepage"      BOOLEAN       NOT NULL DEFAULT false,
        "display_until"            TIMESTAMPTZ,
        "created_by_user_id"       UUID,
        "created_at"               TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_announcements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_platform_announcements_super_admin"
          FOREIGN KEY ("created_by_user_id") REFERENCES "super_admins"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_platform_announcements_created_by"
        ON "platform_announcements" ("created_by_user_id")
    `);

    // ── user_announcement_dismissals ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_announcement_dismissals" (
        "user_id"         UUID        NOT NULL,
        "announcement_id" UUID        NOT NULL,
        "dismissed_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_announcement_dismissals"
          PRIMARY KEY ("user_id", "announcement_id"),
        CONSTRAINT "FK_dismissals_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_dismissals_announcement"
          FOREIGN KEY ("announcement_id") REFERENCES "platform_announcements"("id") ON DELETE CASCADE
      )
    `);

    // ── business_announcements ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "business_announcements" (
        "id"                  UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"         UUID          NOT NULL,
        "title"               VARCHAR(200)  NOT NULL,
        "body"                TEXT          NOT NULL,
        "target_role"         VARCHAR(20)   NOT NULL DEFAULT 'all',
        "display_until"       TIMESTAMPTZ,
        "is_active"           BOOLEAN       NOT NULL DEFAULT true,
        "created_by_user_id"  UUID,
        "created_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_business_announcements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_business_announcements_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_business_announcements_business_id"
        ON "business_announcements" ("business_id")
    `);

    // ── notification_channels ─────────────────────────────────────────────────
    // Composite PK: (business_id, channel) — one provider per channel per business
    await queryRunner.query(`
      CREATE TABLE "notification_channels" (
        "business_id"           UUID          NOT NULL,
        "channel"               VARCHAR(20)   NOT NULL,
        "provider"              VARCHAR(40),
        "provider_config_json"  JSONB,
        "default_sender_id"     VARCHAR(100),
        "default_sender_name"   VARCHAR(100),
        "balance_cached"        INT,
        "balance_refreshed_at"  TIMESTAMPTZ,
        "is_active"             BOOLEAN       NOT NULL DEFAULT false,
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_channels" PRIMARY KEY ("business_id", "channel"),
        CONSTRAINT "FK_notification_channels_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    // Note: the composite PK already enforces (business_id, channel) uniqueness per §13.3

    // ── notification_templates ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notification_templates" (
        "id"                   UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"          UUID          NOT NULL,
        "channel"              VARCHAR(20)   NOT NULL,
        "name"                 VARCHAR(200)  NOT NULL,
        "subject"              VARCHAR(200),
        "body"                 TEXT          NOT NULL,
        "whatsapp_template_id" VARCHAR(100),
        "is_transactional"     BOOLEAN       NOT NULL DEFAULT false,
        "is_active"            BOOLEAN       NOT NULL DEFAULT true,
        "created_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_templates_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_templates_business_id"
        ON "notification_templates" ("business_id")
    `);

    // ── notification_sends ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notification_sends" (
        "id"                    UUID          NOT NULL DEFAULT gen_random_uuid(),
        "business_id"           UUID          NOT NULL,
        "channel"               VARCHAR(20)   NOT NULL,
        "template_id"           UUID,
        "recipient_customer_id" UUID,
        "recipient_address"     VARCHAR(255)  NOT NULL,
        "subject"               VARCHAR(200),
        "body_rendered"         TEXT          NOT NULL,
        "provider_message_id"   VARCHAR(200),
        "status"                VARCHAR(20)   NOT NULL DEFAULT 'queued',
        "error_message"         TEXT,
        "sent_at"               TIMESTAMPTZ,
        "delivered_at"          TIMESTAMPTZ,
        "read_at"               TIMESTAMPTZ,
        "linked_promotion_id"   UUID,
        "linked_coupon_id"      UUID,
        "campaign_job_id"       UUID,
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_sends" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_sends_business"
          FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_sends_template"
          FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_sends_customer"
          FOREIGN KEY ("recipient_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_sends_promotion"
          FOREIGN KEY ("linked_promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_sends_coupon"
          FOREIGN KEY ("linked_coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_notification_sends_job"
          FOREIGN KEY ("campaign_job_id") REFERENCES "background_jobs"("id") ON DELETE SET NULL
      )
    `);
    // §13.3 indexes for notification_sends
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_sends_business_sent_at"
        ON "notification_sends" ("business_id", "sent_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_sends_customer_channel_status"
        ON "notification_sends" ("recipient_customer_id", "channel", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_sends"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_channels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_announcements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_announcement_dismissals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_announcements"`);
  }
}
