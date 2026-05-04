import { buildReceipt, ReceiptBusiness, ReceiptTransaction } from './receipt-builder';

const business: ReceiptBusiness = {
  name: 'Café Atlas',
  legal_name: 'Café Atlas SARL',
  address: '12 Rue Mohammed V, Casablanca',
  ice_number: '002345678000045',
  if_number: '12345678',
};

// 2x Test Product at 20% + 1x Thé Vert at 10%
const transaction: ReceiptTransaction = {
  invoice_number: 'INV-CAFE01-2026-000001',
  transaction_number: 'TXN-20260503-001',
  created_at: new Date('2026-05-03T09:00:00.000Z'),
  payment_method: 'cash',
  total_ht: 55.31,
  total_tva: 9.69,
  total_ttc: 65.00,
  items: [
    {
      product_name: 'Test Product',
      variant_name: null,
      quantity: 2,
      unit_price: 25.00,
      tva_rate: 20,
      item_ht: 41.67,
      item_tva: 8.33,
      item_ttc: 50.00,
    },
    {
      product_name: 'Thé Vert',
      variant_name: null,
      quantity: 1,
      unit_price: 15.00,
      tva_rate: 10,
      item_ht: 13.64,
      item_tva: 1.36,
      item_ttc: 15.00,
    },
  ],
};

describe('buildReceipt (SRS §3.6.2)', () => {
  let receipt: ReturnType<typeof buildReceipt>;

  beforeEach(() => {
    receipt = buildReceipt(transaction, business);
  });

  it('includes mandatory business identity fields', () => {
    expect(receipt.business_name).toBe('Café Atlas');
    expect(receipt.legal_name).toBe('Café Atlas SARL');
    expect(receipt.address).toBe('12 Rue Mohammed V, Casablanca');
    expect(receipt.ice_number).toBe('002345678000045');
    expect(receipt.if_number).toBe('12345678');
  });

  it('includes invoice_number, transaction_number, and ISO date', () => {
    expect(receipt.invoice_number).toBe('INV-CAFE01-2026-000001');
    expect(receipt.transaction_number).toBe('TXN-20260503-001');
    expect(receipt.date).toBe('2026-05-03T09:00:00.000Z');
  });

  it('includes per-line TVA fields for all items', () => {
    expect(receipt.items).toHaveLength(2);

    const item0 = receipt.items[0];
    expect(item0.product_name).toBe('Test Product');
    expect(item0.quantity).toBe(2);
    expect(item0.unit_price).toBe(25.00);
    expect(item0.tva_rate).toBe(20);
    expect(item0.item_ht).toBe(41.67);
    expect(item0.item_tva).toBe(8.33);
    expect(item0.item_ttc).toBe(50.00);

    const item1 = receipt.items[1];
    expect(item1.product_name).toBe('Thé Vert');
    expect(item1.tva_rate).toBe(10);
    expect(item1.item_ht).toBe(13.64);
    expect(item1.item_tva).toBe(1.36);
    expect(item1.item_ttc).toBe(15.00);
  });

  it('builds TVA summary grouped by rate, sorted descending', () => {
    expect(receipt.tva_summary).toHaveLength(2);

    // First entry: 20% (highest rate first)
    expect(receipt.tva_summary[0].tva_rate).toBe(20);
    expect(receipt.tva_summary[0].total_ht).toBe(41.67);
    expect(receipt.tva_summary[0].total_tva).toBe(8.33);
    expect(receipt.tva_summary[0].total_ttc).toBe(50.00);

    // Second entry: 10%
    expect(receipt.tva_summary[1].tva_rate).toBe(10);
    expect(receipt.tva_summary[1].total_ht).toBe(13.64);
    expect(receipt.tva_summary[1].total_tva).toBe(1.36);
    expect(receipt.tva_summary[1].total_ttc).toBe(15.00);
  });

  it('includes correct transaction totals', () => {
    expect(receipt.total_ht).toBe(55.31);
    expect(receipt.total_tva).toBe(9.69);
    expect(receipt.total_ttc).toBe(65.00);
  });

  it('includes payment_method', () => {
    expect(receipt.payment_method).toBe('cash');
  });

  it('handles missing optional business fields gracefully (null)', () => {
    const minimalBusiness: ReceiptBusiness = { name: 'Minimal Shop' };
    const r = buildReceipt(transaction, minimalBusiness);
    expect(r.legal_name).toBeNull();
    expect(r.address).toBeNull();
    expect(r.ice_number).toBeNull();
    expect(r.if_number).toBeNull();
  });

  it('handles null invoice_number gracefully', () => {
    const r = buildReceipt({ ...transaction, invoice_number: null }, business);
    expect(r.invoice_number).toBeNull();
  });

  it('collapses multiple items at the same TVA rate into one summary line', () => {
    const txnSameRate: ReceiptTransaction = {
      ...transaction,
      items: [
        { product_name: 'A', quantity: 1, unit_price: 10, tva_rate: 20, item_ht: 8.33, item_tva: 1.67, item_ttc: 10 },
        { product_name: 'B', quantity: 1, unit_price: 20, tva_rate: 20, item_ht: 16.67, item_tva: 3.33, item_ttc: 20 },
      ],
      total_ht: 25,
      total_tva: 5,
      total_ttc: 30,
    };

    const r = buildReceipt(txnSameRate, business);
    expect(r.tva_summary).toHaveLength(1);
    expect(r.tva_summary[0].tva_rate).toBe(20);
    expect(r.tva_summary[0].total_ht).toBe(25);
    expect(r.tva_summary[0].total_tva).toBe(5);
    expect(r.tva_summary[0].total_ttc).toBe(30);
  });
});
