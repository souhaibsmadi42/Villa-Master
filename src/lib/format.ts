// Date & number formatting shared by server and client components.
const DAY = 86400000;

export const fmtDate = (d?: string | number | Date | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-GB', opts) : '—';

export const fmtShort = (d?: string | null) => fmtDate(d, { day: 'numeric', month: 'short' });

export const daysBetween = (a: string | number | Date, b: string | number | Date) =>
  Math.round((+new Date(b) - +new Date(a)) / DAY);

/** "in 12 days", "3 days ago", "today". */
export function relDays(d: string | null | undefined, now = Date.now()) {
  if (!d) return '';
  const n = Math.round((+new Date(d) - now) / DAY);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function relTime(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - +new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso, { day: 'numeric', month: 'short' });
}

export const pct = (n: number) => `${Math.round(n)}%`;
