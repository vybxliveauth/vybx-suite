/** Shared formatting utilities — single source of truth for locale/currency */

const LOCALE = "es-US";
const CURRENCY = "USD";

function toValidDate(input: string): Date | null {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a number as USD currency. Use decimals=2 for exact cent display. */
export function fmtCurrency(n: number, decimals: 0 | 2 = 0): string {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: decimals === 2 ? 2 : 0,
    maximumFractionDigits: decimals,
  }).format(safe);
}

/** Short date: "10 ago" */
export function fmtDateShort(iso: string): string {
  const date = toValidDate(iso);
  if (!date) return "-";
  return date.toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
}

/** Full date: "10 ago 2026" */
export function fmtDate(iso: string): string {
  const date = toValidDate(iso);
  if (!date) return "-";
  return date.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Date + time: "10 ago 2026, 14:00" */
export function fmtDateTime(iso: string): string {
  const date = toValidDate(iso);
  if (!date) return "-";
  return date.toLocaleString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Optional date + time with null-safe fallback */
export function fmtDateTimeSafe(input?: string | null): string {
  if (!input) return "-";
  return fmtDateTime(input);
}

/** Long date + time for event hero contexts */
export function fmtDateLong(iso: string): string {
  const date = toValidDate(iso);
  if (!date) return "-";
  return date.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
