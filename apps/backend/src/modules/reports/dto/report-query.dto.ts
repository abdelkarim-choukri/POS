import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
