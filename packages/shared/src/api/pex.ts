export interface PointsExchangeRule {
  id: string;
  business_id: string;
  name: string;
  point_value: number;
  rule_type: string;
  validity_date_type: string;
  validity_days: number;
  rule_start_date: string | null;
  rule_end_date: string | null;
  applicable_location_ids: string[];
  total_redemptions_limit: number;
  per_customer_limit: number;
  per_customer_per_day_limit: number;
  current_redemptions: number;
  remark: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PointsExchangeRuleDetail {
  id: string;
  rule_id: string;
  coupon_type_id: string | null;
  product_id: string | null;
  variant_id: string | null;
  quantity_per_redemption: number;
  discount_amount_mad: number | null;
}

export interface PointsExchangeRedemption {
  id: string;
  business_id: string;
  rule_id: string;
  customer_id: string;
  points_spent: number;
  redeemed_at: string;
  coupon_id: string | null;
  location_id: string | null;
}

export type RedeemableRule = PointsExchangeRule & { details: PointsExchangeRuleDetail[] };

// ---- Request types ----

export interface CreatePointsExchangeRuleRequest {
  name: string;
  point_value: number;
  rule_type: string;
  validity_date_type?: string;
  validity_days?: number;
  rule_start_date?: string;
  rule_end_date?: string;
  applicable_location_ids?: string[];
  total_redemptions_limit?: number;
  per_customer_limit?: number;
  per_customer_per_day_limit?: number;
  remark?: string;
}

export interface UpdatePointsExchangeRuleRequest {
  name?: string;
  validity_date_type?: string;
  validity_days?: number;
  rule_start_date?: string;
  rule_end_date?: string;
  applicable_location_ids?: string[];
  total_redemptions_limit?: number;
  per_customer_limit?: number;
  per_customer_per_day_limit?: number;
  remark?: string;
}

export interface SetRuleDetailsRequest {
  details: Array<{
    coupon_type_id?: string;
    product_id?: string;
    variant_id?: string;
    quantity_per_redemption: number;
    discount_amount_mad?: number;
  }>;
}

export interface RedeemPointsRequest {
  customer_id: string;
  rule_id: string;
  location_id?: string;
}

export interface PexReportQueryParams {
  from_date?: string;
  to_date?: string;
  rule_id?: string;
}
