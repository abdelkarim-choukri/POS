export type ReceiptLanguage = 'fr' | 'ar' | 'en';

export interface ReceiptLabelSet {
  subtotal: string;
  tax: string;
  total: string;
  invoice: string;
  date: string;
  payment_method: string;
  cashier: string;
  points_earned: string;
  points_balance: string;
  customer: string;
  thank_you: string;
}

export const RECEIPT_LABELS: Record<ReceiptLanguage, ReceiptLabelSet> = {
  fr: {
    subtotal: 'Sous-total',
    tax: 'TVA',
    total: 'Total TTC',
    invoice: 'Facture',
    date: 'Date',
    payment_method: 'Mode de paiement',
    cashier: 'Caissier',
    points_earned: 'Points gagnés',
    points_balance: 'Solde de points',
    customer: 'Client',
    thank_you: 'Merci pour votre achat',
  },
  ar: {
    subtotal: 'المجموع الفرعي',
    tax: 'الضريبة',
    total: 'المجموع الكلي',
    invoice: 'فاتورة',
    date: 'التاريخ',
    payment_method: 'طريقة الدفع',
    cashier: 'أمين الصندوق',
    points_earned: 'النقاط المكتسبة',
    points_balance: 'رصيد النقاط',
    customer: 'الزبون',
    thank_you: 'شكراً على تسوقكم',
  },
  en: {
    subtotal: 'Subtotal',
    tax: 'VAT',
    total: 'Total',
    invoice: 'Invoice',
    date: 'Date',
    payment_method: 'Payment Method',
    cashier: 'Cashier',
    points_earned: 'Points Earned',
    points_balance: 'Points Balance',
    customer: 'Customer',
    thank_you: 'Thank you for your purchase',
  },
};
