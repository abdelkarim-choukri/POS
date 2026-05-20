export interface ChainTreeNode {
  id: string;
  name: string;
  chain_role: string;
  children: ChainTreeNode[];
}

export interface ChainSyncConfig {
  id: string;
  business_id: string;
  sync_categories: boolean;
  sync_products: boolean;
  sync_promotions: boolean;
  sync_pricing: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBusinessRole {
  user_id: string;
  business_id: string;
  role: string;
  granted_at: string;
}

export interface AccessibleBusiness {
  id: string;
  name: string;
  role: string;
  chain_role: string;
}

// ---- Request types ----

export interface LinkChildRequest {
  child_business_id: string;
}

export interface SyncConfigRequest {
  sync_categories?: boolean;
  sync_products?: boolean;
  sync_promotions?: boolean;
  sync_pricing?: boolean;
}

export interface TriggerSyncRequest {
  child_business_id?: string;
}

export interface PullProductRequest {
  product_id: string;
}

export interface RolloutPromotionRequest {
  promotion_id: string;
  child_business_ids?: string[];
}

export interface GrantBusinessAccessRequest {
  user_id: string;
  business_id: string;
  role: string;
}

export interface SwitchBusinessRequest {
  business_id: string;
}

export interface ChainDashboardQueryParams {
  from_date?: string;
  to_date?: string;
}

export interface ChainTransactionsQueryParams {
  page?: number;
  limit?: number;
  from_date?: string;
  to_date?: string;
  child_business_id?: string;
}
