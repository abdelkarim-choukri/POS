import { IsString, IsOptional, IsBoolean, IsUUID, IsNumber, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

// ── Trade Categories ──────────────────────────────────────────────────────────

export class CreateTradeCategoryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional() @IsUUID()
  parent_id?: string;

  @IsOptional() @IsUUID()
  default_business_type_id?: string;

  @IsOptional()
  default_settings_json?: Record<string, any>;

  @IsOptional() @IsBoolean()
  is_active?: boolean;

  @IsOptional() @IsNumber()
  sort_order?: number;
}

export class UpdateTradeCategoryDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  code?: string;

  @IsOptional() @IsUUID()
  parent_id?: string;

  @IsOptional() @IsBoolean()
  is_active?: boolean;

  @IsOptional() @IsNumber()
  sort_order?: number;
}

// ── Couriers ──────────────────────────────────────────────────────────────────

export class CreateCourierDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  api_endpoint?: string;

  @IsOptional() @IsString()
  tracking_url_template?: string;

  @IsOptional() @IsBoolean()
  supports_cash_on_delivery?: boolean;
}

export class UpdateCourierDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  logo_url?: string;

  @IsOptional() @IsString()
  api_endpoint?: string;

  @IsOptional() @IsString()
  tracking_url_template?: string;

  @IsOptional() @IsBoolean()
  supports_cash_on_delivery?: boolean;

  @IsOptional() @IsBoolean()
  is_active?: boolean;
}

export class LinkCourierDto {
  @IsUUID()
  courier_id: string;

  @IsOptional()
  credentials?: Record<string, any>;

  @IsOptional() @IsBoolean()
  is_default?: boolean;
}

// ── Custom Authority ──────────────────────────────────────────────────────────

export class SetCustomAuthorityDto {
  @IsOptional()
  feature_overrides?: Record<string, boolean>;

  @IsOptional()
  permission_overrides?: Record<string, string[]>;

  @IsOptional() @IsString()
  notes?: string;
}

// ── Version Log ───────────────────────────────────────────────────────────────

export class CreateVersionLogEntryDto {
  @IsUUID()
  menu_id: string;

  @IsString()
  version: string;

  @IsString()
  description: string;

  @IsOptional() @IsString()
  published_at?: string;

  @IsOptional() @IsString()
  expires_at?: string;
}

export class UpdateVersionLogEntryDto {
  @IsOptional() @IsString()
  version?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  expires_at?: string;
}

export class ListVersionLogEntriesQueryDto {
  @IsOptional() @IsUUID()
  menu_id?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number;
}

// ── System Parameters ─────────────────────────────────────────────────────────

export class UpdateSystemParameterDto {
  @IsString()
  value: string;
}

export class ListSystemParametersQueryDto {
  @IsOptional() @IsString()
  param_type?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number;
}

// ── Settlement Cutoff ─────────────────────────────────────────────────────────

export class UpdateSettlementCutoffDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'cutoff_time must be HH:MM in 24h format' })
  cutoff_time: string;
}

// ── Address ───────────────────────────────────────────────────────────────────

export class ValidateAddressDto {
  @IsOptional() @IsString()
  region_code?: string;

  @IsOptional() @IsString()
  prefecture_code?: string;

  @IsOptional() @IsString()
  commune_code?: string;
}
