import {
  IsString, IsOptional, IsNumber, IsBoolean, IsDateString,
  IsArray, IsUUID, IsEnum, IsInt, Min, Max, ValidateNested,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TimePeriodDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

export class DateRangeDto {
  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}

export class CreatePromotionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn([
    'percent_off_order', 'percent_off_category', 'percent_off_product',
    'fixed_off_order', 'fixed_off_product', 'bogo', 'bundle', 'points_multiplier',
  ])
  promotion_type: string;

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsUUID()
  target_category_id?: string;

  @IsOptional()
  @IsUUID()
  target_product_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_total_ttc?: number;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsIn(['D', 'W', 'M'])
  valid_date_type?: string;

  @IsOptional()
  @IsString()
  valid_dates?: string;

  @IsOptional()
  @IsIn(['A', 'T'])
  day_type?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimePeriodDto)
  time_periods?: TimePeriodDto[];

  @IsOptional()
  @IsBoolean()
  adjust_for_holidays?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateRangeDto)
  invalid_date_periods?: DateRangeDto[];

  @IsOptional()
  @IsIn(['all', 'grade', 'label', 'specific_customers'])
  target_audience?: string;

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
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_location_ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  max_total_uses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_day?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_customer?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_customer_day?: number;

  @IsOptional()
  @IsBoolean()
  notify_sms?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_email?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_whatsapp?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  advance_notify_days?: number;

  @IsOptional()
  @IsBoolean()
  share_enabled?: boolean;

  @IsOptional()
  @IsString()
  share_main_title?: string;

  @IsOptional()
  @IsString()
  share_subtitle?: string;

  @IsOptional()
  @IsString()
  share_poster_url?: string;

  @IsOptional()
  @IsString()
  share_landing_url?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn([
    'percent_off_order', 'percent_off_category', 'percent_off_product',
    'fixed_off_order', 'fixed_off_product', 'bogo', 'bundle', 'points_multiplier',
  ])
  promotion_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsUUID()
  target_category_id?: string;

  @IsOptional()
  @IsUUID()
  target_product_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsIn(['D', 'W', 'M'])
  valid_date_type?: string;

  @IsOptional()
  @IsString()
  valid_dates?: string;

  @IsOptional()
  @IsIn(['A', 'T'])
  day_type?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimePeriodDto)
  time_periods?: TimePeriodDto[];

  @IsOptional()
  @IsBoolean()
  adjust_for_holidays?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateRangeDto)
  invalid_date_periods?: DateRangeDto[];

  @IsOptional()
  @IsIn(['all', 'grade', 'label', 'specific_customers'])
  target_audience?: string;

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
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_location_ids?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  max_total_uses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_day?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_customer?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_uses_per_customer_day?: number;

  @IsOptional()
  @IsBoolean()
  notify_sms?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_email?: boolean;

  @IsOptional()
  @IsBoolean()
  notify_whatsapp?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  advance_notify_days?: number;

  @IsOptional()
  @IsBoolean()
  share_enabled?: boolean;

  @IsOptional()
  @IsString()
  share_main_title?: string;

  @IsOptional()
  @IsString()
  share_subtitle?: string;

  @IsOptional()
  @IsString()
  share_poster_url?: string;

  @IsOptional()
  @IsString()
  share_landing_url?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ListPromotionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['draft', 'active', 'paused', 'expired', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  promotion_type?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  active_now?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
