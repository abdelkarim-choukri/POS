import {
  IsString, IsOptional, IsNumber, IsBoolean, IsUUID, IsDateString,
  IsIn, IsInt, Min, IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCouponTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['percent_off', 'fixed_off', 'free_item', 'bogo'])
  discount_type: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  discount_value: number;

  @IsOptional()
  @IsUUID()
  free_item_product_id?: string;

  @IsOptional()
  @IsUUID()
  free_item_variant_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value != null ? Number(value) : undefined)
  min_order_total_ttc?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_category_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_product_ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  validity_days_from_issue?: number;

  @IsOptional()
  @IsIn(['N', 'S', 'M'])
  share_case?: string;
}

// Fields locked once any coupon has been issued from this type
export const COUPON_TYPE_LOCKED_FIELDS = [
  'discount_type', 'discount_value', 'applicable_category_ids',
  'applicable_product_ids', 'free_item_product_id', 'free_item_variant_id',
] as const;

export class UpdateCouponTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => value != null ? Number(value) : undefined)
  min_order_total_ttc?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validity_days_from_issue?: number;

  @IsOptional()
  @IsIn(['N', 'S', 'M'])
  share_case?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class IssueCouponDto {
  @IsOptional()
  @IsUUID()
  customer_id?: string;
}

// [CPN-033]
export class VoidCouponDto {
  @IsString()
  reason: string;
}

// [CPN-021]
export class BulkIssueCouponDto {
  @IsUUID()
  coupon_type_id: string;

  @IsArray()
  @IsUUID('all', { each: true })
  customer_ids: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

// [CPN-022]
export class IssueToSegmentDto {
  @IsUUID()
  coupon_type_id: string;

  @IsIn(['all', 'grade', 'label'])
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
  @IsString()
  note?: string;
}

// [CPN-040]
export class CouponReportQueryDto {
  @IsDateString()
  from_date: string;

  @IsDateString()
  to_date: string;

  @IsOptional()
  @IsUUID()
  coupon_type_id?: string;

  @IsOptional()
  @IsString()
  issue_source?: string;
}

// [XCC-040]
export class DiscountWriteOffReportQueryDto {
  @IsDateString()
  from_date: string;

  @IsDateString()
  to_date: string;

  @IsOptional()
  @IsUUID()
  terminal_id?: string;

  @IsOptional()
  @IsUUID()
  coupon_id?: string;
}
