export interface Business {
  id: string;
  business_type_id: string;
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  logo_url: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  settings_json: Record<string, any>;
  ice_number: string;
  if_number: string;
  address: string;
  invoice_counter: number;
  business_code: string;
  last_invoice_year: number;
  points_earn_divisor: number;
  points_redeem_value: number;
  customer_counter: number;
  promotion_stacking_mode: string;
  parent_business_id: string | null;
  chain_role: string;
  trade_category_id: string | null;
  daily_settlement_cutoff_time: string;
  created_at: string;
  updated_at: string;
}

export type BusinessSettings = Record<string, any>;

export interface Category {
  id: string;
  business_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  default_tva_rate: number;
  synced_from_parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  sku: string;
  image_url: string;
  is_sold_out: boolean;
  is_active: boolean;
  sort_order: number;
  tva_rate: number | null;
  tva_exempt: boolean;
  whole_price_1: number | null;
  whole_price_2: number | null;
  whole_price_3: number | null;
  whole_price_4: number | null;
  brand_id: string | null;
  default_vendor_id: string | null;
  unit_of_measure: string;
  unit_of_measure_id: string | null;
  track_stock: boolean;
  synced_from_parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price_override: number;
  sku: string;
  is_sold_out: boolean;
  is_active: boolean;
  synced_from_parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModifierGroup {
  id: string;
  business_id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  synced_from_parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Modifier {
  id: string;
  modifier_group_id: string;
  name: string;
  price: number;
  is_active: boolean;
  synced_from_parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** User (Employee) — password_hash and pin are never included in responses */
export interface Employee {
  id: string;
  business_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  is_active: boolean;
  permissions: Record<string, boolean>;
  dashboard_access: boolean;
  language_preference: string;
  created_at: string;
  updated_at: string;
}

// ---- Request types ----

export interface CreateCategoryRequest {
  name: string;
  sort_order?: number;
  is_active?: boolean;
  default_tva_rate?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
  default_tva_rate?: number;
}

export interface CreateProductRequest {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  sku?: string;
  image_url?: string;
  is_sold_out?: boolean;
  is_active?: boolean;
  sort_order?: number;
  tva_rate?: number;
  tva_exempt?: boolean;
  whole_price_1?: number;
  whole_price_2?: number;
  whole_price_3?: number;
  whole_price_4?: number;
  brand_id?: string;
  default_vendor_id?: string;
  unit_of_measure?: string;
  unit_of_measure_id?: string;
  track_stock?: boolean;
}

export interface UpdateProductRequest {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  cost_price?: number;
  sku?: string;
  image_url?: string;
  is_sold_out?: boolean;
  is_active?: boolean;
  sort_order?: number;
  tva_rate?: number;
  tva_exempt?: boolean;
  whole_price_1?: number;
  whole_price_2?: number;
  whole_price_3?: number;
  whole_price_4?: number;
  brand_id?: string;
  default_vendor_id?: string;
  unit_of_measure?: string;
  unit_of_measure_id?: string;
  track_stock?: boolean;
}

export interface CreateVariantRequest {
  name: string;
  price_override: number;
  sku?: string;
  is_sold_out?: boolean;
  is_active?: boolean;
}

export interface UpdateVariantRequest {
  name?: string;
  price_override?: number;
  sku?: string;
  is_sold_out?: boolean;
  is_active?: boolean;
}

export interface CreateModifierGroupRequest {
  name: string;
  is_required?: boolean;
  max_selections?: number;
  sort_order?: number;
}

export interface UpdateModifierGroupRequest {
  name?: string;
  is_required?: boolean;
  max_selections?: number;
  sort_order?: number;
}

export interface CreateModifierRequest {
  modifier_group_id: string;
  name: string;
  price: number;
  is_active?: boolean;
}

export interface CreateEmployeeRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  is_active?: boolean;
  permissions?: Record<string, boolean>;
  dashboard_access?: boolean;
  language_preference?: string;
}

export interface UpdateEmployeeRequest {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  phone?: string;
  is_active?: boolean;
  permissions?: Record<string, boolean>;
  dashboard_access?: boolean;
  language_preference?: string;
}

export interface CreateLocationRequest {
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  is_active?: boolean;
}

export interface UpdateLocationRequest {
  name?: string;
  address?: string;
  city?: string;
  phone?: string;
  is_active?: boolean;
}

export interface TvaDeclarationQueryParams {
  from_date: string;
  to_date: string;
}

export interface TvaLineItem {
  rate: number;
  ht: number;
  tva: number;
  ttc: number;
  count: number;
}

export interface TvaDeclarationResponse {
  from_date: string;
  to_date: string;
  lines: TvaLineItem[];
  totals: TvaLineItem;
}
