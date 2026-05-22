import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinHashing1714016000000 implements MigrationInterface {
  name = 'AddPinHashing1714016000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(72),
        ADD COLUMN IF NOT EXISTS needs_pin_reset BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await queryRunner.query(`
      UPDATE users SET needs_pin_reset = TRUE WHERE pin IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS needs_pin_reset,
        DROP COLUMN IF EXISTS pin_hash
    `);
  }
}
