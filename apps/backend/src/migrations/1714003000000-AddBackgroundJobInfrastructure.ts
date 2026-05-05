import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackgroundJobInfrastructure1714003000000 implements MigrationInterface {
  name = 'AddBackgroundJobInfrastructure1714003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "background_jobs" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "business_id"      UUID,
        "job_type"         VARCHAR(60)  NOT NULL,
        "unique_lock_key"  VARCHAR(200),
        "status"           VARCHAR(20)  NOT NULL DEFAULT 'queued',
        "payload_json"     JSONB,
        "result_json"      JSONB,
        "error_message"    TEXT,
        "retry_count"      INT          NOT NULL DEFAULT 0,
        "max_retries"      INT          NOT NULL DEFAULT 3,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "started_at"       TIMESTAMPTZ,
        "completed_at"     TIMESTAMPTZ,
        CONSTRAINT "PK_background_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_background_jobs_business" FOREIGN KEY ("business_id")
          REFERENCES "businesses"("id") ON DELETE CASCADE
      )
    `);

    // XCC-052: partial unique index — one active job per lock key
    await queryRunner.query(`
      CREATE UNIQUE INDEX "background_jobs_active_lock_idx"
        ON "background_jobs" ("unique_lock_key")
        WHERE status IN ('queued', 'running') AND unique_lock_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_background_jobs_business_status_created"
        ON "background_jobs" ("business_id", "status", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_background_jobs_business_status_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "background_jobs_active_lock_idx"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "background_jobs"`);
  }
}
