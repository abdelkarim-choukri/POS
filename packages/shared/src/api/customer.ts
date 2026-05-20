export interface Customer {
  id: string;
  business_id: string;
  customer_code: string;
  phone: string;
  email: string | null;
  first_name: string;
  last_name: string;
  birthday: string | null;
  gender: string;
  address: string | null;
  grade_id: string | null;
  points_balance: number;
  lifetime_points: number;
  is_active: boolean;
  consent_marketing: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerGrade {
  id: string;
  business_id: string;
  name: string;
  min_points: number;
  discount_percent: number;
  points_multiplier: number;
  color_hex: string;
  sort_order: number;
  is_active: boolean;
}

export interface CustomerLabel {
  id: string;
  business_id: string;
  name: string;
  color_hex: string;
  is_active: boolean;
}

export interface CustomerAttribute {
  id: string;
  business_id: string;
  key: string;
  label: string;
  data_type: string;
  enum_options: string[];
  is_required: boolean;
}

export interface CustomerPointsHistory {
  id: string;
  business_id: string;
  customer_id: string;
  delta: number;
  balance_after: number;
  source: string;
  transaction_id: string | null;
  adjusted_by_user_id: string | null;
  reason: string | null;
  created_at: string;
}

export type CustomerWithGrade = Customer & { grade?: CustomerGrade | null };

// ---- Request types ----

export interface CreateCustomerRequest {
  phone: string;
  email?: string;
  first_name: string;
  last_name: string;
  birthday?: string;
  gender?: string;
  address?: string;
  grade_id?: string;
  consent_marketing?: boolean;
  notes?: string;
}

export interface UpdateCustomerRequest {
  phone?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  birthday?: string;
  gender?: string;
  address?: string;
  grade_id?: string;
  is_active?: boolean;
  consent_marketing?: boolean;
  notes?: string;
}

export interface ListCustomersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  grade_id?: string;
  label_id?: string;
  is_active?: boolean;
}

export interface CreateGradeRequest {
  name: string;
  min_points: number;
  discount_percent: number;
  points_multiplier?: number;
  color_hex?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateGradeRequest {
  name?: string;
  min_points?: number;
  discount_percent?: number;
  points_multiplier?: number;
  color_hex?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateLabelRequest {
  name: string;
  color_hex?: string;
  is_active?: boolean;
}

export interface UpdateLabelRequest {
  name?: string;
  color_hex?: string;
  is_active?: boolean;
}

export interface AssignLabelsRequest {
  label_ids: string[];
}

export interface CreateAttributeRequest {
  key: string;
  label: string;
  data_type: string;
  enum_options?: string[];
  is_required?: boolean;
}

export interface UpdateAttributeRequest {
  label?: string;
  enum_options?: string[];
  is_required?: boolean;
}

export interface SetAttributeValuesRequest {
  values: Record<string, string>;
}

export interface PointsHistoryQueryParams {
  page?: number;
  limit?: number;
  source?: string;
  from_date?: string;
  to_date?: string;
}

export interface PointsAdjustmentRequest {
  delta: number;
  reason?: string;
}

export interface QuickAddCustomerRequest {
  phone: string;
  first_name: string;
  last_name: string;
}
