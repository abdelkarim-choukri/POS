import type { Business } from './business';
import type { PlatformAnnouncement } from './communications';

export interface Subscription {
  id: string;
  business_id: string;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  price_mad: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessType {
  id: string;
  name: string;
  label: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessTypeFeature {
  id: string;
  business_type_id: string;
  feature_key: string;
  is_enabled: boolean;
  config_json: Record<string, any>;
}

export interface Terminal {
  id: string;
  location_id: string;
  terminal_code: string;
  device_name: string;
  hardware_id: string;
  is_online: boolean;
  last_seen_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessSummary = Business & {
  business_type?: { name: string; label: string };
  subscription?: Subscription | null;
  location_count: number;
  user_count: number;
};

export type SuperAdminAnnouncement = PlatformAnnouncement;

// ---- Request types ----

export interface CreateBusinessRequest {
  business_type_id: string;
  name: string;
  legal_name?: string;
  email: string;
  phone?: string;
  currency?: string;
  timezone?: string;
  ice_number?: string;
  if_number?: string;
  address?: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  currency?: string;
  timezone?: string;
  ice_number?: string;
  if_number?: string;
  address?: string;
  settings_json?: Record<string, any>;
  promotion_stacking_mode?: string;
  points_earn_divisor?: number;
  points_redeem_value?: number;
  trade_category_id?: string;
}

export interface UpdateBusinessStatusRequest {
  is_active: boolean;
}

export interface CreateTerminalRequest {
  location_id: string;
  terminal_code: string;
  device_name?: string;
  hardware_id?: string;
}

export interface AssignTerminalRequest {
  location_id: string;
}

export interface CreateSubscriptionRequest {
  business_id: string;
  plan_name: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  price_mad: number;
}

export interface UpdateSubscriptionRequest {
  plan_name?: string;
  status?: string;
  end_date?: string;
  price_mad?: number;
}

export interface CreateBusinessTypeRequest {
  name: string;
  label: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateFeaturesRequest {
  features: Array<{
    feature_key: string;
    is_enabled: boolean;
    config_json?: Record<string, any>;
  }>;
}

export interface ListBusinessesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  business_type_id?: string;
  is_active?: boolean;
}
