import {
  IsString, IsOptional, IsBoolean, IsUUID, IsIn, IsArray,
  IsDateString, IsObject, IsInt, Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ── Platform Announcements (Super Admin) ─────────────────────────────────────

export class CreatePlatformAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_business_type_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_business_ids?: string[];

  @IsOptional()
  @IsBoolean()
  display_on_homepage?: boolean;

  @IsOptional()
  @IsDateString()
  display_until?: string;
}

export class UpdatePlatformAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_business_type_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  target_business_ids?: string[];

  @IsOptional()
  @IsBoolean()
  display_on_homepage?: boolean;

  @IsOptional()
  @IsDateString()
  display_until?: string;
}

export class ListPlatformAnnouncementsQueryDto {
  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: string;

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
}

// ── Business Announcements ───────────────────────────────────────────────────

export class CreateBusinessAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsIn(['all', 'manager', 'employee'])
  target_role?: string;

  @IsOptional()
  @IsDateString()
  display_until?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateBusinessAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsIn(['all', 'manager', 'employee'])
  target_role?: string;

  @IsOptional()
  @IsDateString()
  display_until?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// ── Notification Channels ────────────────────────────────────────────────────

export class UpsertNotificationChannelDto {
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsObject()
  provider_config_json?: Record<string, any>;

  @IsOptional()
  @IsString()
  default_sender_id?: string;

  @IsOptional()
  @IsString()
  default_sender_name?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class TestChannelDto {
  @IsIn(['sms', 'email', 'whatsapp'])
  channel: string;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  test_message?: string;
}
