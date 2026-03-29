const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

export const EVENT_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80";
export const EVENT_IMAGE_THUMBNAIL_FALLBACK =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80";

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local")
  );
}

function getApiBaseUrl(): URL | null {
  if (!API_BASE_URL) return null;
  try {
    return new URL(API_BASE_URL);
  } catch {
    return null;
  }
}

function getRuntimeOriginUrl(): URL | null {
  if (typeof window === "undefined") return null;
  try {
    return new URL(window.location.origin);
  } catch {
    return null;
  }
}

function canUseLoopbackImageHost(): boolean {
  if (typeof window === "undefined") return true;
  return isLoopbackHost(window.location.hostname);
}

function normalizeImageUrl(parsed: URL): string {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return EVENT_IMAGE_FALLBACK;
  }

  if (isLoopbackHost(parsed.hostname) && !canUseLoopbackImageHost()) {
    return EVENT_IMAGE_FALLBACK;
  }

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    parsed.protocol === "http:" &&
    !isLoopbackHost(parsed.hostname)
  ) {
    parsed.protocol = "https:";
  }

  return parsed.toString();
}

export function normalizeEventImageUrl(rawImage: string | null | undefined): string {
  if (!rawImage) return EVENT_IMAGE_FALLBACK;
  const value = rawImage.trim();
  if (value.length === 0) return EVENT_IMAGE_FALLBACK;

  if (value.startsWith("data:image/")) {
    return value;
  }

  if (value.startsWith("//")) {
    try {
      return normalizeImageUrl(new URL(`https:${value}`));
    } catch {
      return EVENT_IMAGE_FALLBACK;
    }
  }

  const apiBase = getApiBaseUrl() ?? getRuntimeOriginUrl();

  if (value.startsWith("/")) {
    if (!apiBase) return EVENT_IMAGE_FALLBACK;
    return normalizeImageUrl(new URL(value, apiBase));
  }

  try {
    return normalizeImageUrl(new URL(value));
  } catch {
    if (!apiBase) return EVENT_IMAGE_FALLBACK;
    try {
      return normalizeImageUrl(new URL(value, apiBase));
    } catch {
      return EVENT_IMAGE_FALLBACK;
    }
  }
}
