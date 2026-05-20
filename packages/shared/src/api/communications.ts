export interface NotificationChannel {
  business_id: string;
  channel: string;
  provider: string | null;
  default_sender_id: string | null;
  default_sender_name: string | null;
  /** provider_config_json is redacted in responses */
  balance_cached: number | null;
  balance_refreshed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  business_id: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  whatsapp_template_id: string | null;
  is_transactional: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSend {
  id: string;
  business_id: string;
  channel: string;
  template_id: string | null;
  recipient_customer_id: string | null;
  recipient_address: string;
  subject: string | null;
  body_rendered: string;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  opt_out_token: string | null;
  created_at: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  severity: string;
  target_business_type_ids: string[];
  target_business_ids: string[];
  display_on_homepage: boolean;
  display_until: string | null;
  created_at: string;
}

export interface BusinessAnnouncement {
  id: string;
  business_id: string;
  title: string;
  body: string;
  target_role: string;
  display_until: string | null;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsBalanceResponse {
  balance: number;
  refreshed_at: string | null;
}

export interface CampaignJobResponse {
  job_id: string;
  estimated_recipients: number;
  estimated_cost: number;
}

// ---- Request types ----

export interface UpsertNotificationChannelRequest {
  provider?: string;
  provider_config_json?: Record<string, any>;
  default_sender_id?: string;
  default_sender_name?: string;
  is_active?: boolean;
}

export interface CreateNotificationTemplateRequest {
  channel: string;
  name: string;
  subject?: string;
  body: string;
  whatsapp_template_id?: string;
  is_transactional?: boolean;
  is_active?: boolean;
}

export interface UpdateNotificationTemplateRequest {
  name?: string;
  subject?: string;
  body?: string;
  whatsapp_template_id?: string;
  is_transactional?: boolean;
  is_active?: boolean;
}

export interface PreviewTemplateRequest {
  customer_id?: string;
  sample_data?: Record<string, string>;
}

export interface SendNotificationRequest {
  template_id: string;
  customer_id: string;
}

export interface SendCampaignRequest {
  template_id: string;
  segment: 'all' | 'grade' | 'label' | 'specific';
  grade_id?: string;
  label_id?: string;
  customer_ids?: string[];
}

export interface ListNotificationSendsQueryParams {
  page?: number;
  limit?: number;
  channel?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  customer_id?: string;
  template_id?: string;
}

export interface CreatePlatformAnnouncementRequest {
  title: string;
  body: string;
  severity?: string;
  target_business_type_ids?: string[];
  target_business_ids?: string[];
  display_on_homepage?: boolean;
  display_until?: string;
}

export interface UpdatePlatformAnnouncementRequest {
  title?: string;
  body?: string;
  severity?: string;
  target_business_type_ids?: string[];
  target_business_ids?: string[];
  display_on_homepage?: boolean;
  display_until?: string;
}

export interface CreateBusinessAnnouncementRequest {
  title: string;
  body: string;
  target_role?: string;
  display_until?: string;
  is_active?: boolean;
}

export interface UpdateBusinessAnnouncementRequest {
  title?: string;
  body?: string;
  target_role?: string;
  display_until?: string;
  is_active?: boolean;
}
