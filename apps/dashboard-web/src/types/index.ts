export interface User {
  id: string; email: string; first_name: string; last_name: string;
  role: 'owner' | 'manager' | 'employee'; business_id: string; business_name?: string;
  can_void: boolean; can_refund: boolean; dashboard_access: boolean;
}
export interface AuthResponse { access_token: string; refresh_token: string; user: User; }
export interface Category { id: string; name: string; sort_order: number; is_active: boolean; }
export interface Product {
  id: string; name: string; description?: string; price: number; cost_price?: number;
  sku?: string; image_url?: string; is_sold_out: boolean; is_active: boolean;
  sort_order: number; category_id: string; category?: Category; variants?: ProductVariant[];
}
export interface ProductVariant { id: string; name: string; price_override?: number; sku?: string; is_sold_out: boolean; is_active: boolean; }
export interface Employee {
  id: string; email?: string; first_name: string; last_name: string; role: string;
  phone?: string; is_active: boolean; can_void: boolean; can_refund: boolean; dashboard_access: boolean; created_at: string;
}
export interface Location { id: string; name: string; address?: string; city?: string; phone?: string; is_active: boolean; terminals?: Terminal[]; }
export interface Terminal { id: string; terminal_code: string; device_name?: string; is_online: boolean; last_seen_at?: string; }
export interface Transaction {
  id: string; transaction_number: string; subtotal: number; tax_amount: number; total: number;
  status: string; payment_method: string; created_at: string;
  user?: { first_name: string; last_name: string }; items?: TransactionItem[];
}
export interface TransactionItem { id: string; product_name: string; variant_name?: string; quantity: number; unit_price: number; line_total: number; }
export interface ClockEntry { id: string; clock_in: string; clock_out?: string; total_hours?: number; user?: { first_name: string; last_name: string; role: string }; }
export interface PaginatedResult<T> { data: T[]; total: number; page: number; limit: number; totalPages: number; }
export interface DailySales { date: string; transaction_count: string; total_revenue: string; }
