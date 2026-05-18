import {
  IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Length, Max, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const TEMPLATE_TYPES = [
  'manual', 'top_seller', 'high_margin', 'time_of_day', 'customer_grade_targeted', 'seasonal',
] as const;

export class CreateTemplateDto {
  @IsString() @Length(1, 200) name: string;
  @IsIn(TEMPLATE_TYPES) template_type: string;
  @IsOptional() @IsString() time_window_start?: string;
  @IsOptional() @IsString() time_window_end?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  @Type(() => Number)
  applicable_days_of_week?: number[];
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) target_grade_ids?: string[];
  @IsOptional() @IsInt() @Min(1) min_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) max_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) @Max(4) whole_price_tier?: number;
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) applicable_location_ids?: string[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() display_order?: number;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsIn(TEMPLATE_TYPES) template_type?: string;
  @IsOptional() @IsString() time_window_start?: string;
  @IsOptional() @IsString() time_window_end?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  @Type(() => Number)
  applicable_days_of_week?: number[];
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) target_grade_ids?: string[];
  @IsOptional() @IsInt() @Min(1) min_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) max_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) @Max(4) whole_price_tier?: number;
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) applicable_location_ids?: string[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() display_order?: number;
}

export class TemplateItemInputDto {
  @IsUUID() @IsNotEmpty() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class SetTemplateItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateItemInputDto)
  items: TemplateItemInputDto[];
}

export class TemplateQueryDto {
  @IsOptional() @IsIn(TEMPLATE_TYPES) template_type?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  is_active?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  for_terminal_now?: boolean;
}

export class ResolveTemplateQueryDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() location_id?: string;
  @IsOptional() @IsString() current_time?: string;
}
