import {
  IsString, IsInt, IsOptional, IsBoolean, IsArray, IsUUID,
  IsIn, IsNumber, Min, ValidateNested, IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreatePexRuleDetailDto {
  @IsOptional()
  @IsUUID()
  coupon_type_id?: string;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity_per_redemption?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount_mad?: number;
}

export class CreatePexRuleBodyDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  point_value: number;

  @IsIn(['coupon', 'free_product', 'discount'])
  rule_type: string;

  @IsOptional()
  @IsIn(['D', 'W', 'M'])
  validity_date_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  validity_days?: number;

  @IsOptional()
  @IsDateString()
  rule_start_date?: string;

  @IsOptional()
  @IsDateString()
  rule_end_date?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_location_ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  total_redemptions_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  per_customer_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  per_customer_per_day_limit?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreatePexRuleDto {
  @ValidateNested()
  @Type(() => CreatePexRuleBodyDto)
  rule: CreatePexRuleBodyDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePexRuleDetailDto)
  details: CreatePexRuleDetailDto[];
}

export class UpdatePexRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  point_value?: number;

  @IsOptional()
  @IsIn(['D', 'W', 'M'])
  validity_date_type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  validity_days?: number;

  @IsOptional()
  @IsDateString()
  rule_start_date?: string;

  @IsOptional()
  @IsDateString()
  rule_end_date?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_location_ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  total_redemptions_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  per_customer_limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  per_customer_per_day_limit?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ListPexRulesQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsIn(['coupon', 'free_product', 'discount'])
  rule_type?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  currently_valid?: boolean;
}

export class CheckPointValueQueryDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  point_value: number;

  @IsIn(['coupon', 'free_product', 'discount'])
  rule_type: string;

  @IsOptional()
  @IsUUID()
  exclude_rule_id?: string;
}

export class RedeemPointsDto {
  @IsUUID()
  customer_id: string;
}

export class PexReportQueryDto {
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;

  @IsOptional()
  @IsUUID()
  rule_id?: string;
}
