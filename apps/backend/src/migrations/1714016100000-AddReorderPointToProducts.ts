import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReorderPointToProducts1714016100000 implements MigrationInterface {
  name = 'AddReorderPointToProducts1714016100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS reorder_point INTEGER NOT NULL DEFAULT 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products
        DROP COLUMN IF EXISTS reorder_point
    `);
  }
}
