import type { EvaluatedPromotion } from './promotions';
import type { CustomerGrade } from './customer';
import type { CouponType } from './promotions';
import type { PaymentMethod } from './common';

export interface TransactionItemInput {
  product_id: string;
  variant_id?: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  modifiers_json?: Record<string, any>;
  line_total: number;
}

export interface CreateTransactionRequest {
  items: TransactionItemInput[];
  subtotal: number;
  tax_amount?: number;
  total: number;
  payment_method: PaymentMethod;
  notes?: string;
  terminal_id?: string;
  location_id?: string;
  customer_id?: string;
  promotion_ids?: string[];
  coupon_codes?: string[];
  table_session_id?: string;
}

export interface VoidTransactionRequest {
  reason: string;
  manager_pin?: string;
}

export interface CartItem {
  product_id: string;
  category_id?: string;
  quantity: number;
  unit_price_ttc: number;
}

export interface EvaluateCartRequest {
  items: CartItem[];
  customer_id?: string;
}

export interface EvaluateCartResponse {
  applicable_promotions: EvaluatedPromotion[];
  total_discount: number;
  discounted_total: number;
}

export interface TerminalCustomerLookup {
  id: string;
  customer_code: string;
  phone: string;
  first_name: string;
  last_name: string;
  points_balance: number;
  grade: CustomerGrade | null;
}

export interface ValidateCouponResponse {
  coupon_id: string;
  coupon_type: CouponType;
  discount_amount: number;
  message: string;
}

export interface BackgroundJob {
  id: string;
  business_id: string;
  job_type: string;
  status: string;
  payload_json: Record<string, any>;
  result_json: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface Transaction {
  id: string;
  business_id: string;
  location_id: string;
  terminal_id: string;
  user_id: string;
  transaction_number: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: string;
  order_status: string;
  payment_method: string;
  payment_confirmed_at: string | null;
  receipt_printed: boolean;
  notes: string;
  invoice_number: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  customer_id: string | null;
  points_earned: number;
  points_redeemed: number;
  discount_total: number;
  is_offline: boolean;
  table_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  modifiers_json: Record<string, any>;
  line_total: number;
  tva_rate: number;
  item_ht: number;
  item_tva: number;
  item_ttc: number;
  discount_amount: number;
  created_at: string;
}
