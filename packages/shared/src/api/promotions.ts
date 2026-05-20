export interface TimePeriod {
  start: string;
  end: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface EvaluatedPromotion {
  promotion_id: string;
  name: string;
  discount_amount: number;
  type: string;
}

export interface Promotion {
  id: string;
  business_id: string;
  code: string;
  name: string;
  description: string | null;
  promotion_type: string;
  value: number;
  target_category_id: string | null;
  target_product_id: string | null;
  min_order_total_ttc: number;
  start_date: string;
  end_date: string;
  valid_date_type: string;
  valid_dates: string | null;
  day_type: string;
  time_periods: Array<TimePeriod> | null;
  adjust_for_holidays: boolean;
  invalid_date_periods: Array<DateRange> | null;
  target_audience: string;
  target_grade_ids: string[];
  target_label_ids: string[];
  target_customer_ids: string[];
  applicable_location_ids: string[];
  max_total_uses: number;
  max_uses_per_day: number;
  max_uses_per_customer: number;
  max_uses_per_customer_day: number;
  current_uses: number;
  notify_sms: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
  advance_notify_days: number;
  share_enabled: boolean;
  share_main_title: string | null;
  share_subtitle: string | null;
  share_poster_url: string | null;
  share_landing_url: string | null;
  status: string;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionRedemption {
  id: string;
  promotion_id: string;
  transaction_id: string;
  customer_id: string | null;
  discount_amount: number;
  created_at: string;
}

export interface CouponType {
  id: string;
  business_id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  free_item_product_id: string | null;
  free_item_variant_id: string | null;
  min_order_total_ttc: number;
  applicable_category_ids: string[];
  applicable_product_ids: string[];
  validity_days_from_issue: number;
  share_case: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  business_id: string;
  coupon_type_id: string;
  coupon_code: string;
  customer_id: string | null;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  status: string;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  transaction_id: string;
  customer_id: string | null;
  discount_amount: number;
  created_at: string;
}

export interface DiscountWriteOff {
  id: string;
  business_id: string;
  transaction_id: string;
  terminal_id: string | null;
  discount_source: string;
  discount_amount: number;
  created_at: string;
}

// ---- Request types ----

export interface CreatePromotionRequest {
  code?: string;
  name: string;
  description?: string;
  promotion_type: string;
  value: number;
  target_category_id?: string;
  target_product_id?: string;
  min_order_total_ttc?: number;
  start_date: string;
  end_date: string;
  valid_date_type?: string;
  valid_dates?: string;
  day_type?: string;
  time_periods?: Array<TimePeriod>;
  adjust_for_holidays?: boolean;
  invalid_date_periods?: Array<DateRange>;
  target_audience?: string;
  target_grade_ids?: string[];
  target_label_ids?: string[];
  target_customer_ids?: string[];
  applicable_location_ids?: string[];
  max_total_uses?: number;
  max_uses_per_day?: number;
  max_uses_per_customer?: number;
  max_uses_per_customer_day?: number;
  notify_sms?: boolean;
  notify_email?: boolean;
  notify_whatsapp?: boolean;
  advance_notify_days?: number;
  share_enabled?: boolean;
  share_main_title?: string;
  share_subtitle?: string;
  share_poster_url?: string;
  share_landing_url?: string;
  remark?: string;
}

export interface UpdatePromotionRequest {
  name?: string;
  description?: string;
  value?: number;
  target_category_id?: string;
  target_product_id?: string;
  min_order_total_ttc?: number;
  start_date?: string;
  end_date?: string;
  valid_date_type?: string;
  valid_dates?: string;
  day_type?: string;
  time_periods?: Array<TimePeriod>;
  adjust_for_holidays?: boolean;
  invalid_date_periods?: Array<DateRange>;
  target_audience?: string;
  target_grade_ids?: string[];
  target_label_ids?: string[];
  target_customer_ids?: string[];
  applicable_location_ids?: string[];
  max_total_uses?: number;
  max_uses_per_day?: number;
  max_uses_per_customer?: number;
  max_uses_per_customer_day?: number;
  notify_sms?: boolean;
  notify_email?: boolean;
  notify_whatsapp?: boolean;
  advance_notify_days?: number;
  share_enabled?: boolean;
  share_main_title?: string;
  share_subtitle?: string;
  share_poster_url?: string;
  share_landing_url?: string;
  remark?: string;
}

export interface ListPromotionsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  promotion_type?: string;
  search?: string;
}

export interface BulkIssueCouponRequest {
  coupon_type_id: string;
  customer_ids: string[];
}

export interface IssueToSegmentRequest {
  coupon_type_id: string;
  segment: 'all' | 'grade' | 'label' | 'specific';
  grade_id?: string;
  label_id?: string;
  customer_ids?: string[];
}

export interface CouponReportQueryParams {
  from_date?: string;
  to_date?: string;
  coupon_type_id?: string;
}

export interface DiscountWriteOffReportQueryParams {
  from_date?: string;
  to_date?: string;
  terminal_id?: string;
}

export interface PromotionReportQueryParams {
  from_date?: string;
  to_date?: string;
  promotion_id?: string;
}
