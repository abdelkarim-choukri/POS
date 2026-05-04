import {
  IsString, IsOptional, IsEmail, IsUUID, IsBoolean,
  IsDateString, IsEnum, IsInt, IsNumber, IsArray, Min, Max,
  MinLength, IsObject, IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const toBoolean = ({ value }: { value: any }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

export enum CustomerGender {
  MALE = 'male',
  FEMALE = 'female',
  UNSPECIFIED = 'unspecified',
}

// ── Customer DTO ─────────────────────────────────────────────────────────────

export class CreateCustomerDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  grade_id?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  label_ids?: string[];

  @IsOptional()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  consent_marketing?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsEnum(CustomerGender)
  gender?: CustomerGender;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  grade_id?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  consent_marketing?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListCustomersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  grade_id?: string;

  @IsOptional()
  @IsString()
  label_ids?: string; // comma-separated UUIDs

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean = true;

  @IsOptional()
  @IsDateString()
  created_from?: string;

  @IsOptional()
  @IsDateString()
  created_to?: string;

  @IsOptional()
  @IsDateString()
  birthday_from?: string;

  @IsOptional()
  @IsDateString()
  birthday_to?: string;

  @IsOptional()
  @IsEnum(['gt', 'lt', 'eq'])
  points_op?: 'gt' | 'lt' | 'eq';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  points_value?: number;
}

// ── Grade DTOs ────────────────────────────────────────────────────────────────

export class CreateGradeDto {
  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_points?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percent?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  points_multiplier?: number = 1;

  @IsOptional()
  @IsString()
  color_hex?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number = 0;
}

export class UpdateGradeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  min_points?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  points_multiplier?: number;

  @IsOptional()
  @IsString()
  color_hex?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;
}

// ── Label DTOs ────────────────────────────────────────────────────────────────

export class CreateLabelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color_hex?: string;
}

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color_hex?: string;
}

export class AssignLabelsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  label_ids: string[];
}

// ── Attribute DTOs ────────────────────────────────────────────────────────────

export const ATTRIBUTE_DATA_TYPES = ['string', 'number', 'date', 'boolean', 'enum'] as const;
export type AttributeDataType = typeof ATTRIBUTE_DATA_TYPES[number];

export class CreateAttributeDto {
  @IsString()
  key: string;

  @IsString()
  label: string;

  @IsIn(ATTRIBUTE_DATA_TYPES)
  data_type: AttributeDataType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enum_options?: string[];

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsIn(ATTRIBUTE_DATA_TYPES)
  data_type?: AttributeDataType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enum_options?: string[];

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class SetAttributeValuesDto {
  @IsObject()
  values: Record<string, string>;
}

// ── Points DTOs ───────────────────────────────────────────────────────────────

export class PointsHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class PointsAdjustmentDto {
  @IsInt()
  delta: number;

  @IsString()
  @MinLength(10)
  reason: string;
}
