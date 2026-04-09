import type { SessionUserBase } from "./types";

/**
 * Returns the user's full name, or falls back to the email prefix, or the
 * provided fallback string. Safe for any environment.
 */
export function formatDisplayName(
  user:
    | Pick<SessionUserBase, "email" | "firstName" | "lastName">
    | null
    | undefined,
  fallback: string,
): string {
  if (!user) return fallback;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full || (user.email.split("@")[0] ?? fallback);
}

/**
 * Resolves a raw base URL into a canonical API base with /api/v1 appended
 * if no /api prefix is already present.
 * Shared between @vybx/auth-client, @vybx/auth-mobile, and @vybx/api-client.
 */
export function resolveApiBaseUrl(baseUrl: string): string {
  const raw = baseUrl.trim();
  try {
    const parsed = new URL(raw);
    parsed.pathname = withApiVersionPath(parsed.pathname);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    if (/\/api(?:\/|$)/i.test(normalized)) return normalized;
    return `${normalized}/api/v1`;
  }
}

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

function withApiVersionPath(pathname: string): string {
  const normalized = normalizePathname(pathname);
  if (/^\/api(?:\/|$)/i.test(normalized)) return normalized;
  const prefix = normalized === "/" ? "" : normalized;
  return `${prefix}/api/v1`;
}
