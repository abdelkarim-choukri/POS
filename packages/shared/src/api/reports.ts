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
  period: {
    type: string;
    from: string;
    to: string;
  };
  summary: ReportSummaryItem[];
  tables: ReportTable[];
  meta: {
    total_rows: number;
    page: number;
    limit: number;
  } | null;
}

export interface ReportQueryParams {
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  warehouse_id?: string;
  product_id?: string;
  category_id?: string;
  vendor_id?: string;
  movement_type?: string;
  low_stock_only?: boolean;
  as_of_date?: string;
}

export const ALL_REPORT_IDS = [
  'sales-summary', 'sales-by-hour', 'sales-by-day', 'sales-by-month',
  'sales-by-category', 'sales-by-product', 'sales-by-table',
  'payment-summary', 'cash-report', 'card-report',
  'customer-summary', 'top-customers', 'customer-grades', 'loyalty-summary',
  'employee-performance', 'kitchen-performance', 'table-turnover', 'voids-cancellations',
  'tva-declaration', 'daily-close', 'invoice-register', 'tva-by-rate',
  'promotion-report', 'coupon-report', 'discount-write-offs', 'points-exchange-report',
  'stock-position', 'stock-movements', 'vendor-purchases', 'input-tva',
  'cogs', 'vendor-balance', 'bill-aging', 'capital-detail',
] as const;

export type ReportId = typeof ALL_REPORT_IDS[number];
