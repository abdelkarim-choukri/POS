import { IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ReportQueryDto {
  @IsIn(['today', 'yesterday', 'last_7days', 'this_month', 'last_month', 'this_year', 'custom'])
  type: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  // Inventory-specific optional filters (INV-090-093)
  @IsOptional() @IsUUID() warehouse_id?: string;
  @IsOptional() @IsUUID() product_id?: string;
  @IsOptional() @IsUUID() category_id?: string;
  @IsOptional() @IsUUID() vendor_id?: string;
  @IsOptional() @IsIn(['receive', 'sale', 'adjustment', 'waste', 'expiry_disposal', 'transfer_in', 'transfer_out']) movement_type?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() low_stock_only?: boolean;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'as_of_date must be YYYY-MM-DD' })
  as_of_date?: string;
}

export interface ReportSummaryItem {
  label: string;
  value: number | string;
  type: 'money' | 'number' | 'text' | 'percentage';
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'money' | 'number' | 'date' | 'datetime' | 'text' | 'percentage' | 'quantity';
}

export interface ReportTable {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
}

export interface UniversalReportResponse {
  title: string;
  currency: string;
  language: string;
  business_type: string;
  generated_at: string;
  period: { type: string; from: string; to: string };
  summary: ReportSummaryItem[];
  tables: ReportTable[];
  meta: { total_rows: number; page: number; limit: number } | null;
}
