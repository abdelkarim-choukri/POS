import { BadRequestException } from '@nestjs/common';

export type DateRangeType =
  | 'today'
  | 'yesterday'
  | 'last_7days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
  fromStr: string;
  toStr: string;
}

const VALID_TYPES = new Set<string>([
  'today', 'yesterday', 'last_7days', 'this_month', 'last_month', 'this_year', 'custom',
]);

function localDateStr(tz: string, dt = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(dt);
}

function shiftDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function startOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function startOfYear(dateStr: string): string {
  return `${dateStr.slice(0, 4)}-01-01`;
}

function prevMonthRange(dateStr: string): { from: string; to: string } {
  const [y, m] = dateStr.split('-').map(Number);
  const lastOfPrev = new Date(Date.UTC(y, m - 1, 0));
  const firstOfPrev = new Date(Date.UTC(y, m - 2, 1));
  return {
    from: firstOfPrev.toISOString().slice(0, 10),
    to: lastOfPrev.toISOString().slice(0, 10),
  };
}

function toDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function resolveDateRange(
  type: string,
  from?: string,
  to?: string,
  timezone = 'Africa/Casablanca',
): DateRange {
  if (!VALID_TYPES.has(type)) {
    throw new BadRequestException(`Invalid date range type: ${type}`);
  }

  const today = localDateStr(timezone);
  let fromStr: string;
  let toStr: string;

  switch (type) {
    case 'today':
      fromStr = today;
      toStr = today;
      break;
    case 'yesterday':
      fromStr = shiftDays(today, -1);
      toStr = fromStr;
      break;
    case 'last_7days':
      fromStr = shiftDays(today, -6);
      toStr = today;
      break;
    case 'this_month':
      fromStr = startOfMonth(today);
      toStr = today;
      break;
    case 'last_month': {
      const range = prevMonthRange(today);
      fromStr = range.from;
      toStr = range.to;
      break;
    }
    case 'this_year':
      fromStr = startOfYear(today);
      toStr = today;
      break;
    case 'custom':
      if (!from || !to) {
        throw new BadRequestException('from and to are required for custom date range');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new BadRequestException('from and to must be in YYYY-MM-DD format');
      }
      if (from > to) {
        throw new BadRequestException('from must not be after to');
      }
      fromStr = from;
      toStr = to;
      break;
    default:
      throw new BadRequestException(`Invalid date range type: ${type}`);
  }

  return { from: toDate(fromStr), to: toDate(toStr), fromStr, toStr };
}
