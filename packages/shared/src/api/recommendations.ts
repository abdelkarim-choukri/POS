export interface RecommendationTemplate {
  id: string;
  business_id: string;
  name: string;
  template_type: string;
  time_window_start: string | null;
  time_window_end: string | null;
  applicable_days_of_week: number[] | null;
  target_grade_ids: string[] | null;
  min_recommendations: number;
  max_recommendations: number;
  whole_price_tier: number | null;
  applicable_location_ids: string[] | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RecommendationTemplateItem {
  id: string;
  template_id: string;
  product_id: string;
  variant_id: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface FeaturedItem {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  price: number;
  image_url: string | null;
  template_id: string;
  template_name: string;
}

// ---- Request types ----

export interface CreateRecommendationTemplateRequest {
  name: string;
  template_type: string;
  time_window_start?: string;
  time_window_end?: string;
  applicable_days_of_week?: number[];
  target_grade_ids?: string[];
  min_recommendations?: number;
  max_recommendations?: number;
  whole_price_tier?: number;
  applicable_location_ids?: string[];
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateRecommendationTemplateRequest {
  name?: string;
  time_window_start?: string;
  time_window_end?: string;
  applicable_days_of_week?: number[];
  target_grade_ids?: string[];
  min_recommendations?: number;
  max_recommendations?: number;
  whole_price_tier?: number;
  applicable_location_ids?: string[];
  is_active?: boolean;
  display_order?: number;
}

export interface SetTemplateItemsRequest {
  items: Array<{
    product_id: string;
    variant_id?: string;
    priority?: number;
    is_active?: boolean;
  }>;
}

export interface ListTemplatesQueryParams {
  page?: number;
  limit?: number;
  is_active?: boolean;
  for_terminal_now?: boolean;
  location_id?: string;
  customer_grade_id?: string;
}
