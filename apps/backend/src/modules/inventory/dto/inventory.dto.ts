import {
  IsString, IsOptional, IsBoolean, IsInt, IsNumber, IsUUID,
  IsIn, Min, Max, IsDateString, IsEmail,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ── Units of Measure ─────────────────────────────────────────────────────────

export class CreateUnitOfMeasureDto {
  @IsString() name: string;
  @IsString() abbreviation: string;
  @IsOptional() @IsInt() sort_order?: number;
}

export class UpdateUnitOfMeasureDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() abbreviation?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() sort_order?: number;
}

// ── Warehouses ────────────────────────────────────────────────────────────────

export class CreateWarehouseDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsUUID() manager_user_id?: string;
  @IsBoolean() is_central: boolean;
  @IsOptional() @IsUUID() linked_location_id?: string;
}

export class UpdateWarehouseDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsUUID() manager_user_id?: string;
  @IsOptional() @IsBoolean() is_central?: boolean;
  @IsOptional() @IsUUID() linked_location_id?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export class ListVendorsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() is_active?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() for_select?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateVendorDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() contact_name?: string;
  @IsOptional() @IsString() contact_phone?: string;
  @IsOptional() @IsEmail() contact_email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() ice_number?: string;
  @IsOptional() @IsString() if_number?: string;
  @IsOptional() @IsInt() payment_terms_days?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateVendorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() contact_name?: string;
  @IsOptional() @IsString() contact_phone?: string;
  @IsOptional() @IsEmail() contact_email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() ice_number?: string;
  @IsOptional() @IsString() if_number?: string;
  @IsOptional() @IsInt() payment_terms_days?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

// ── Vendor Check Details ──────────────────────────────────────────────────────

export class CreateVendorCheckDetailDto {
  @IsDateString() check_date: string;
  @IsUUID() checked_by_user_id: string;
  @IsOptional() @IsInt() @Min(1) @Max(10) quality_score?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) delivery_score?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) price_score?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() attachments_json?: any;
}

// ── Brands ────────────────────────────────────────────────────────────────────

export class CreateBrandDto {
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateBrandDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() logo_url?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

// ── Nutrition Info ────────────────────────────────────────────────────────────

export class SetNutritionInfoDto {
  @IsOptional() @IsNumber() serving_size_g?: number;
  @IsOptional() @IsNumber() calories_kcal?: number;
  @IsOptional() @IsNumber() protein_g?: number;
  @IsOptional() @IsNumber() carbs_g?: number;
  @IsOptional() @IsNumber() sugar_g?: number;
  @IsOptional() @IsNumber() fat_g?: number;
  @IsOptional() @IsNumber() saturated_fat_g?: number;
  @IsOptional() @IsNumber() fiber_g?: number;
  @IsOptional() @IsNumber() sodium_mg?: number;
  @IsOptional() @IsString() allergens?: string;
  @IsOptional() @IsBoolean() is_vegetarian?: boolean;
  @IsOptional() @IsBoolean() is_vegan?: boolean;
  @IsOptional() @IsBoolean() is_halal?: boolean;
}

export class ListNutritionQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() allergen_excludes?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() is_vegan?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() is_halal?: boolean;
}
