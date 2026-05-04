import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserPermissionsToJsonb1714001000000 implements MigrationInterface {
  name = 'MigrateUserPermissionsToJsonb1714001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the new JSONB column with empty-object default
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    // 2. Migrate existing boolean values into the JSONB
    //    Users with neither flag stay as {} (the default).
    await queryRunner.query(`
      UPDATE "users"
      SET "permissions" = jsonb_build_object(
        'can_void',   can_void,
        'can_refund', can_refund
      )
      WHERE can_void = true OR can_refund = true
    `);

    // 3. Drop the legacy boolean columns
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "can_void",
        DROP COLUMN "can_refund"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-add the boolean columns with defaults
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "can_void"   BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN "can_refund" BOOLEAN NOT NULL DEFAULT false
    `);

    // 2. Copy values back from JSONB
    await queryRunner.query(`
      UPDATE "users"
      SET
        can_void   = COALESCE((permissions->>'can_void')::boolean,   false),
        can_refund = COALESCE((permissions->>'can_refund')::boolean, false)
      WHERE permissions != '{}'::jsonb
    `);

    // 3. Drop the JSONB column
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "permissions"
    `);
  }
}
