export type Period = 'month_to_date' | 'year_to_date' | 'last_30_days' | 'last_90_days' | 'year';

const fmt = (d: Date) => d.toISOString().split('T')[0];

export function resolvePeriod(period: Period = 'month_to_date'): { start: string; end: string } {
  const now = new Date();
  switch (period) {
    case 'month_to_date':
      return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(now) };
    case 'year_to_date':
      return { start: fmt(new Date(now.getFullYear(), 0, 1)), end: fmt(now) };
    case 'last_30_days': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { start: fmt(d), end: fmt(now) };
    }
    case 'last_90_days': {
      const d = new Date(now); d.setDate(d.getDate() - 90);
      return { start: fmt(d), end: fmt(now) };
    }
    case 'year':
      return { start: fmt(new Date(now.getFullYear(), 0, 1)), end: fmt(new Date(now.getFullYear(), 11, 31)) };
  }
}

// Returns the same-length period immediately before the given period (for trend comparisons).
export function previousPeriod(start: string, end: string): { start: string; end: string } {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  const prevEnd = new Date(s); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - days + 1);
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

export function toNum(val: string | null | undefined): number {
  return parseFloat(val ?? '0') || 0;
}

export function pct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}
