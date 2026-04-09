const EXTERNAL_PROTOCOL_REGEX = /^https?:$/i;

function normalizeExternalBaseUrl(raw: string | undefined): string | null {
  const candidate = raw?.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (!EXTERNAL_PROTOCOL_REGEX.test(parsed.protocol)) return null;
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

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

export function buildAuthUrl(options?: {
  mode?: "login" | "register";
  nextPath?: string;
}): string {
  const mode = options?.mode ?? "login";
  const nextPath = normalizeNextPath(options?.nextPath ?? "/");
  const params = new URLSearchParams();

  if (nextPath !== "/") {
    params.set("next", nextPath);
  }
  if (mode === "register") {
    params.set("mode", "register");
  }

  const authPath = `/auth${params.size > 0 ? `?${params.toString()}` : ""}`;
  const externalBase = normalizeExternalBaseUrl(process.env.NEXT_PUBLIC_ACCOUNT_APP_URL);
  if (!externalBase) return authPath;
  return `${externalBase}${authPath}`;
}
