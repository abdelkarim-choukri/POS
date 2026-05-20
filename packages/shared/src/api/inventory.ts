export interface UnitOfMeasure {
  id: string;
  business_id: string | null;
  name: string;
  abbreviation: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  business_id: string;
  name: string;
  code: string;
  address: string | null;
  manager_user_id: string | null;
  is_central: boolean;
  linked_location_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  business_id: string;
  code: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  ice_number: string | null;
  if_number: string | null;
  payment_terms_days: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorCheckDetail {
  id: string;
  vendor_id: string;
  check_number: string;
  bank_name: string | null;
  amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionInfo {
  id: string;
  business_id: string;
  product_id: string;
  serving_size_g: number | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  sugar_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  allergens: string | null;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_halal: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockBatch {
  id: string;
  business_id: string;
  warehouse_id: string;
  product_id: string;
  variant_id: string | null;
  batch_code: string;
  quantity_initial: number;
  quantity_remaining: number;
  unit_cost: number;
  unit_cost_tva_rate: number;
  unit_of_measure: string;
  received_at: string;
  expires_at: string | null;
  vendor_id: string | null;
  purchase_order_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  business_id: string;
  batch_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  source_origin: string;
  performed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockTemplate {
  id: string;
  business_id: string;
  name: string;
  default_vendor_id: string | null;
  default_warehouse_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockTemplateItem {
  id: string;
  template_id: string;
  product_id: string;
  variant_id: string | null;
  default_quantity: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  business_id: string;
  po_number: string;
  vendor_id: string | null;
  warehouse_id: string;
  parent_business_id: string | null;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Computed by service */
  amount_paid: number;
  /** Computed by service */
  balance_due: number;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_of_measure: string;
  unit_cost_ht: number;
  tva_rate: number;
  line_total_ht: number;
  line_total_tva: number;
  line_total_ttc: number;
  created_at: string;
  updated_at: string;
}

export interface StockAdjustment {
  id: string;
  business_id: string;
  adjustment_number: string;
  warehouse_id: string;
  status: string;
  reason: string;
  proposed_by_user_id: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  posted_at: string | null;
  rejected_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockAdjustmentItem {
  id: string;
  adjustment_id: string;
  product_id: string;
  variant_id: string | null;
  batch_id: string;
  proposed_delta: number;
  current_quantity: number;
  notes: string | null;
}

export interface StockTransfer {
  id: string;
  business_id: string;
  transfer_number: string;
  source_warehouse_id: string;
  target_warehouse_id: string;
  status: string;
  notes: string | null;
  created_by_user_id: string;
  posted_at: string | null;
  posted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  variant_id: string | null;
  batch_id: string;
  quantity: number;
  notes: string | null;
}

export interface VendorPayment {
  id: string;
  business_id: string;
  vendor_id: string;
  purchase_order_id: string | null;
  payment_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  status: string;
  created_by_user_id: string;
  confirmed_by_user_id: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface ExpirationAlert {
  id: string;
  business_id: string;
  batch_id: string;
  warehouse_id: string;
  product_id: string;
  severity: string;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  action: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockDiscrepancyAlert {
  id: string;
  business_id: string;
  batch_id: string | null;
  warehouse_id: string | null;
  product_id: string | null;
  expected_remaining: number;
  actual_remaining: number;
  discrepancy_quantity: number;
  source: string;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorOutstandingItem {
  vendor_id: string;
  vendor_name: string;
  balance_due: number;
  last_po_date: string | null;
}

// ---- Request types ----

export interface CreateUomRequest {
  name: string;
  abbreviation: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateUomRequest {
  name?: string;
  abbreviation?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateWarehouseRequest {
  name: string;
  code: string;
  address?: string;
  manager_user_id?: string;
  is_central?: boolean;
  linked_location_id?: string;
  is_active?: boolean;
}

export interface UpdateWarehouseRequest {
  name?: string;
  code?: string;
  address?: string;
  manager_user_id?: string;
  is_central?: boolean;
  linked_location_id?: string;
  is_active?: boolean;
}

export interface CreateVendorRequest {
  code?: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  ice_number?: string;
  if_number?: string;
  payment_terms_days?: number;
  notes?: string;
}

export interface UpdateVendorRequest {
  code?: string;
  name?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  ice_number?: string;
  if_number?: string;
  payment_terms_days?: number;
  notes?: string;
  is_active?: boolean;
}

export interface CreateBrandRequest {
  name: string;
  code?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateBrandRequest {
  name?: string;
  code?: string;
  logo_url?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateNutritionInfoRequest {
  product_id: string;
  serving_size_g?: number;
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  sugar_g?: number;
  fat_g?: number;
  saturated_fat_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
  allergens?: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_halal?: boolean;
}

export interface CreateBatchRequest {
  warehouse_id: string;
  product_id: string;
  variant_id?: string;
  batch_code?: string;
  quantity_initial: number;
  unit_cost: number;
  unit_cost_tva_rate?: number;
  unit_of_measure?: string;
  received_at?: string;
  expires_at?: string;
  vendor_id?: string;
  purchase_order_id?: string;
}

export interface AdjustBatchRequest {
  delta: number;
  reason?: string;
  notes?: string;
}

export interface DisposeBatchRequest {
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface TransferBatchRequest {
  target_warehouse_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateStockTemplateRequest {
  name: string;
  default_vendor_id?: string;
  default_warehouse_id?: string;
  is_active?: boolean;
  items?: Array<{
    product_id: string;
    variant_id?: string;
    default_quantity: number;
  }>;
}

export interface UpdateStockTemplateRequest {
  name?: string;
  default_vendor_id?: string;
  default_warehouse_id?: string;
  is_active?: boolean;
}

export interface CreatePurchaseOrderRequest {
  vendor_id?: string;
  warehouse_id: string;
  order_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity_ordered: number;
    unit_of_measure?: string;
    unit_cost_ht: number;
    tva_rate?: number;
  }>;
}

export interface UpdatePurchaseOrderRequest {
  vendor_id?: string;
  expected_delivery_date?: string;
  notes?: string;
  items?: Array<{
    product_id: string;
    variant_id?: string;
    quantity_ordered: number;
    unit_of_measure?: string;
    unit_cost_ht: number;
    tva_rate?: number;
  }>;
}

export interface ReceivePurchaseOrderRequest {
  items: Array<{
    purchase_order_item_id: string;
    quantity_received: number;
    expires_at?: string;
  }>;
}

export interface CreateStockAdjustmentRequest {
  warehouse_id: string;
  reason: string;
  notes?: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    batch_id: string;
    proposed_delta: number;
    notes?: string;
  }>;
}

export interface RejectAdjustmentRequest {
  rejected_reason: string;
}

export interface CreateStockTransferRequest {
  source_warehouse_id: string;
  target_warehouse_id: string;
  notes?: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    batch_id: string;
    quantity: number;
    notes?: string;
  }>;
}

export interface CreateVendorPaymentRequest {
  vendor_id: string;
  purchase_order_id?: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface ResolveExpirationAlertRequest {
  action: string;
  notes?: string;
}

export interface ResolveDiscrepancyAlertRequest {
  action: 'manual_recount' | 'accept_loss' | 'adjust_batch';
  notes?: string;
}

export interface ListBatchesQueryParams {
  page?: number;
  limit?: number;
  warehouse_id?: string;
  product_id?: string;
  low_stock_only?: boolean;
  expiring_soon?: boolean;
}

export interface ListPurchaseOrdersQueryParams {
  page?: number;
  limit?: number;
  vendor_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface ListVendorPaymentsQueryParams {
  page?: number;
  limit?: number;
  vendor_id?: string;
  purchase_order_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}
