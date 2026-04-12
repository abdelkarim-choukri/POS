import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderStatus1712060000000 implements MigrationInterface {
  name = 'AddOrderStatus1712060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "order_status" VARCHAR(20) NOT NULL DEFAULT 'new'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_order_status" ON "transactions"("order_status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_order_status"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "order_status"`);
  }
}
