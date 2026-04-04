import { resolveApiBaseUrl } from "@vybx/api-client";

const DEV_API_BASE_URL = "http://localhost:3004/api/v1";
const PROD_API_BASE_URL = "https://api.vybxlive.com/api/v1";

function isLocalHost(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function resolveServerApiBaseUrl(): string {
  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi) return resolveApiBaseUrl(publicApi);

  const serverApi = process.env.API_URL?.trim();
  if (serverApi) return resolveApiBaseUrl(serverApi);

  if (process.env.NODE_ENV === "production") {
    return resolveApiBaseUrl(PROD_API_BASE_URL);
  }

  return resolveApiBaseUrl(DEV_API_BASE_URL);
}

export function resolveClientApiBaseUrl(origin?: string): string {
  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi) return resolveApiBaseUrl(publicApi);

  if (origin && isLocalHost(origin)) {
    return resolveApiBaseUrl(`${origin.replace(/\/$/, "")}/api/v1`);
  }

  if (process.env.NODE_ENV === "production") {
    return resolveApiBaseUrl(PROD_API_BASE_URL);
  }

  return resolveApiBaseUrl(DEV_API_BASE_URL);
}
