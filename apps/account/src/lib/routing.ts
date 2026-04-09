const EXTERNAL_PROTOCOL_REGEX = /^https?:$/i;

export function normalizeNextPath(raw: string | null | undefined): string {
  const candidate = raw?.trim();
  if (!candidate) return "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";

  try {
    const parsed = new URL(candidate, "https://vybx.local");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export function resolveWebAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WEB_APP_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (EXTERNAL_PROTOCOL_REGEX.test(parsed.protocol)) {
        parsed.pathname = parsed.pathname.replace(/\/$/, "");
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString().replace(/\/$/, "");
      }
    } catch {
      // ignore invalid env
    }
  }

  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
  }

  return "https://www.vybxlive.com";
}

export function buildWebAppUrl(nextPath: string): string {
  const safePath = normalizeNextPath(nextPath);
  return new URL(safePath, resolveWebAppBaseUrl()).toString();
}
