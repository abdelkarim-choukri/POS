import {
  IsString, IsOptional, IsBoolean, IsUUID, IsIn, IsArray,
  IsDateString, IsInt, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── Templates ────────────────────────────────────────────────────────────────

export class CreateTemplateDto {
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  whatsapp_template_id?: string;

  @IsOptional()
  @IsBoolean()
  is_transactional?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  whatsapp_template_id?: string;

  @IsOptional()
  @IsBoolean()
  is_transactional?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class PreviewTemplateDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;
}

// ── Sending ──────────────────────────────────────────────────────────────────

export class SendSingleDto {
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: string;

  @IsOptional()
  @IsUUID()
  template_id?: string;

  @IsUUID()
  to_customer_id: string;

  @IsOptional()
  @IsString()
  to_address?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsUUID()
  linked_promotion_id?: string;

  @IsOptional()
  @IsUUID()
  linked_coupon_id?: string;
}

export class SendToSegmentDto {
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: string;

  @IsUUID()
  template_id: string;

  @IsIn(['all', 'grade', 'label', 'specific_customers'])
  target_audience: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_grade_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_label_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_customer_ids?: string[];

  @IsOptional()
  @IsDateString()
  schedule_at?: string;

  @IsOptional()
  @IsUUID()
  linked_promotion_id?: string;

  @IsOptional()
  @IsUUID()
  linked_coupon_id?: string;
}

export class SendHistoryQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['sms', 'email', 'whatsapp'])
  channel?: string;

  @IsOptional()
  @IsIn(['queued', 'sent', 'delivered', 'failed', 'bounced', 'read', 'opted_out'])
  status?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  template_id?: string;
}

// ── Public endpoints ─────────────────────────────────────────────────────────

export class OptOutDto {
  @IsString()
  token: string;
}

export class WebhookPayloadDto {
  @IsString()
  provider_message_id: string;

  @IsOptional()
  @IsIn(['delivered', 'read', 'failed', 'bounced'])
  status?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
