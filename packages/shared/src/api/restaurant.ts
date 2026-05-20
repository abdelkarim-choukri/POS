export interface DiningArea {
  id: string;
  business_id: string;
  location_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableType {
  id: string;
  business_id: string;
  name: string;
  default_capacity: number;
  is_active: boolean;
}

export interface RestaurantTable {
  id: string;
  business_id: string;
  location_id: string;
  area_id: string;
  table_type_id: string | null;
  table_number: string;
  capacity: number;
  position_x: number | null;
  position_y: number | null;
  qr_code: string | null;
  is_active: boolean;
}

export interface TableSession {
  id: string;
  business_id: string;
  location_id: string;
  table_id: string;
  opened_at: string;
  opened_by_user_id: string;
  closed_at: string | null;
  customer_id: string | null;
  guest_count: number | null;
  expected_split_count: number;
  partial_payment: boolean;
  notes: string | null;
  status: string;
}

export interface TableSessionItem {
  id: string;
  business_id: string;
  table_session_id: string;
  product_id: string;
  variant_id: string | null;
  customer_id: string | null;
  quantity: number;
  unit_price_ttc: number;
  modifiers_json: Record<string, any>;
  notes: string | null;
  added_at: string;
  added_by_user_id: string;
  kds_status: string;
}

export interface FloorPlanEntry {
  table: RestaurantTable;
  session: {
    id: string;
    status: string;
    guest_count: number | null;
    item_count: number;
    opened_at: string;
  } | null;
}

export interface CheckoutPayload {
  session_id: string;
  table_id: string;
  table_number: string;
  label?: string;
  items: TableSessionItem[];
  subtotal_ttc: number;
}

export interface SplitBillResponse {
  splits: CheckoutPayload[];
}

export interface KdsItem {
  id: string;
  type: 'table_session' | 'direct_transaction';
  product_name: string;
  variant_name: string | null;
  quantity: number;
  notes: string | null;
  kds_status: string;
  table_number: string | null;
  session_id: string | null;
  order_source: string;
  added_at: string;
}

export interface OssResponse {
  preparing: Array<{ session_id: string; table_number: string; item_count: number }>;
  ready: Array<{ session_id: string; table_number: string; item_count: number }>;
}

// ---- Request types ----

export interface CreateDiningAreaRequest {
  location_id: string;
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateDiningAreaRequest {
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateTableTypeRequest {
  name: string;
  default_capacity?: number;
  is_active?: boolean;
}

export interface UpdateTableTypeRequest {
  name?: string;
  default_capacity?: number;
  is_active?: boolean;
}

export interface CreateTableRequest {
  location_id: string;
  area_id: string;
  table_type_id?: string;
  table_number: string;
  capacity?: number;
  position_x?: number;
  position_y?: number;
  is_active?: boolean;
}

export interface UpdateTableRequest {
  area_id?: string;
  table_type_id?: string;
  table_number?: string;
  capacity?: number;
  position_x?: number;
  position_y?: number;
  is_active?: boolean;
}

export interface OpenTableRequest {
  guest_count?: number;
  customer_id?: string;
  notes?: string;
}

export interface AddSessionItemsRequest {
  items: Array<{
    product_id: string;
    variant_id?: string;
    customer_id?: string;
    quantity: number;
    modifiers_json?: Record<string, any>;
    notes?: string;
  }>;
}

export interface ModifySessionItemRequest {
  quantity?: number;
  notes?: string;
  customer_id?: string;
}

export interface TransferItemsRequest {
  item_ids: string[];
  target_session_id: string;
}

export interface CancelSessionRequest {
  force_close_partial?: boolean;
}

export interface SplitBillRequest {
  split_type: 'by_item' | 'even' | 'custom';
  split_count?: number;
  custom_splits?: Array<Array<string>>;
}

export interface KdsStatusUpdateRequest {
  status: string;
}
