import {
  IsString, IsOptional, IsNumber, IsBoolean, IsUUID,
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
