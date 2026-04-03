/** Shared formatting utilities — single source of truth for locale/currency */

const LOCALE = "es-DO";
const CURRENCY = "DOP";

/** Format a number as DOP currency. Use decimals=2 for exact cent display. */
export function fmtCurrency(n: number, decimals: 0 | 2 = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Short date: "10 ago" */
export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
}

/** Full date: "10 ago 2026" */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Date + time: "10 ago 2026, 14:00" */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
