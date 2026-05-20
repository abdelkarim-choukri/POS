export interface TradeCategory {
  id: string;
  parent_id: string | null;
  name: string;
  code: string;
  default_business_type_id: string | null;
  is_active: boolean;
  sort_order: number;
  children?: TradeCategory[];
}

export interface Courier {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  api_endpoint: string | null;
  tracking_url_template: string | null;
  supports_cash_on_delivery: boolean;
  is_active: boolean;
}

export interface BusinessCourierLink {
  business_id: string;
  courier_id: string;
  is_default: boolean;
}

export interface SystemParameter {
  id: string;
  key: string;
  param_type: string;
  value: string;
  description: string | null;
  is_overridable_per_business: boolean;
}

export interface MoroccoRegion {
  id: string;
  parent_id: string | null;
  name: string;
  code: string;
  level: string;
  sort_order: number;
  children?: MoroccoRegion[];
}

export interface VersionLogMenu {
  id: string;
  name: string;
  sort_order: number;
}

export interface VersionLogEntry {
  id: string;
  menu_id: string;
  version: string;
  description: string;
  published_at: string;
  expires_at: string | null;
}

export interface BusinessCustomAuthority {
  business_id: string;
  feature_overrides_json: Record<string, boolean>;
  permission_overrides_json: Record<string, string[]>;
  notes: string | null;
  updated_at: string;
}

export interface EffectiveFeaturesResponse {
  features: Record<string, boolean>;
  permissions: Record<string, string[]>;
}

export interface SettlementCutoff {
  cutoff_time: string;
}

export interface ValidateAddressResponse {
  valid: boolean;
  region: MoroccoRegion | null;
  prefecture: MoroccoRegion | null;
  commune: MoroccoRegion | null;
}

// ---- Request types ----

export interface CreateTradeCategoryRequest {
  parent_id?: string;
  name: string;
  code: string;
  default_business_type_id?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateTradeCategoryRequest {
  parent_id?: string;
  name?: string;
  code?: string;
  default_business_type_id?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateCourierRequest {
  name: string;
  code: string;
  logo_url?: string;
  api_endpoint?: string;
  tracking_url_template?: string;
  supports_cash_on_delivery?: boolean;
  is_active?: boolean;
}

export interface UpdateCourierRequest {
  name?: string;
  code?: string;
  logo_url?: string;
  api_endpoint?: string;
  tracking_url_template?: string;
  supports_cash_on_delivery?: boolean;
  is_active?: boolean;
}

export interface LinkCourierRequest {
  courier_id: string;
  is_default?: boolean;
}

export interface SetBusinessCustomAuthorityRequest {
  feature_overrides_json?: Record<string, boolean>;
  permission_overrides_json?: Record<string, string[]>;
  notes?: string;
}

export interface CreateVersionLogEntryRequest {
  menu_id: string;
  version: string;
  description: string;
  published_at?: string;
  expires_at?: string;
}

export interface UpdateVersionLogEntryRequest {
  version?: string;
  description?: string;
  published_at?: string;
  expires_at?: string;
}

export interface UpdateSystemParameterRequest {
  value: string;
}

export interface UpdateSettlementCutoffRequest {
  cutoff_time: string;
}

export interface ValidateAddressRequest {
  region_code?: string;
  prefecture_code?: string;
  commune_code?: string;
}
