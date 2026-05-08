import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationOptOutToken1714007000000 implements MigrationInterface {
  name = 'AddNotificationOptOutToken1714007000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_sends"
        ADD COLUMN "opt_out_token" VARCHAR(64) UNIQUE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_sends_opt_out_token"
        ON "notification_sends" ("opt_out_token")
        WHERE "opt_out_token" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_sends_opt_out_token"`);
    await queryRunner.query(`
      ALTER TABLE "notification_sends" DROP COLUMN IF EXISTS "opt_out_token"
    `);
  }
}
