import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorPayments1714012000000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE vendor_payments (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id           UUID NOT NULL REFERENCES businesses(id),
        vendor_id             UUID NOT NULL REFERENCES vendors(id),
        purchase_order_id     UUID REFERENCES purchase_orders(id),
        payment_number        VARCHAR(50) NOT NULL,
        amount_paid           NUMERIC(12,2) NOT NULL,
        payment_date          DATE NOT NULL,
        payment_method        VARCHAR(30) NOT NULL,
        reference_number      VARCHAR(100),
        notes                 TEXT,
        status                VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_by_user_id    UUID NOT NULL REFERENCES users(id),
        confirmed_by_user_id  UUID REFERENCES users(id),
        confirmed_at          TIMESTAMPTZ,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await qr.query(`CREATE INDEX idx_vendor_payments_business_id ON vendor_payments(business_id)`);
    await qr.query(`CREATE INDEX idx_vendor_payments_vendor_id ON vendor_payments(vendor_id)`);
    await qr.query(`CREATE INDEX idx_vendor_payments_po_id ON vendor_payments(purchase_order_id) WHERE purchase_order_id IS NOT NULL`);
    await qr.query(`CREATE UNIQUE INDEX idx_vendor_payments_number_per_business ON vendor_payments(business_id, payment_number)`);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS vendor_payments`);
  }
}
