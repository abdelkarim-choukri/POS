export interface TerminalConfig {
  terminal: { id: string; terminal_code: string; device_name: string };
  business: { id: string; name: string; currency: string };
  location: { id: string; name: string };
  features: string[];
}
export interface Employee {
  id: string; first_name: string; last_name: string; role: string;
  can_void: boolean; can_refund: boolean;
}
export interface Category { id: string; name: string; sort_order: number; }
export interface Product {
  id: string; name: string; price: number; category_id: string;
  is_sold_out: boolean; image_url?: string; description?: string;
  variants?: Variant[]; product_modifier_groups?: PMG[];
}
export interface Variant { id: string; name: string; price_override?: number; is_sold_out: boolean; }
export interface PMG { modifier_group: ModifierGroup; }
export interface ModifierGroup { id: string; name: string; is_required: boolean; max_selections: number; modifiers: Modifier[]; }
export interface Modifier { id: string; name: string; price: number; }
export interface CartItem {
  id: string; product: Product; variant?: Variant; quantity: number;
  selectedModifiers: Modifier[]; unitPrice: number; lineTotal: number;
}
export interface Transaction {
  id: string; transaction_number: string; total: number; status: string;
  items: any[];
}
