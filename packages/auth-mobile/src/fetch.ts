/**
 * Mobile fetch wrapper.
 *
 * Injects the Authorization header from SecureStore and retries once after
 * token refresh on 401. Use as the fetchFn for @vybx/api-client on mobile.
 *
 * Usage:
 *   const mobileFetch = createMobileFetch({ storage, authApi });
 *   const apiClient = createApiClient({ fetchFn: mobileFetch, ... });
 */

import type { TokenStorage } from "./storage";
import type { MobileAuthApi } from "./api";

export type MobileFetchOptions = {
  storage: TokenStorage;
  authApi: MobileAuthApi;
};

export function createMobileFetch(options: MobileFetchOptions): typeof fetch {
  const { storage, authApi } = options;

  // Deduplicate concurrent refresh calls
  let refreshPromise: Promise<string | null> | null = null;

  const refresh = (): Promise<string | null> => {
    refreshPromise ??= authApi
      .refreshTokens()
      .finally(() => {
        refreshPromise = null;
      });
    return refreshPromise;
  };

  const buildHeaders = (
    token: string | null,
    init?: RequestInit,
  ): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (init?.headers) {
      const h = new Headers(init.headers);
      h.forEach((v, k) => {
        headers[k] = v;
      });
    }

    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["X-Client"] = "mobile";

    return headers;
  };

  return async (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const canRetryWithoutToken = method === "GET" || method === "HEAD";
    const token = await storage.getAccessToken();

    const first = await fetch(input, {
      ...init,
      headers: buildHeaders(token, init),
    });

    if (first.status !== 401) return first;

    const newToken = await refresh();
    if (newToken) {
      const second = await fetch(input, {
        ...init,
        headers: buildHeaders(newToken, init),
      });
      if (second.status !== 401) {
        return second;
      }

      // If refreshed auth still fails for a public endpoint, try anonymous.
      if (canRetryWithoutToken) {
        return fetch(input, {
          ...init,
          headers: buildHeaders(null, init),
        });
      }

      return second;
    }

    // If auth refresh failed but this is a public read endpoint, retry once
    // without Authorization so stale tokens don't hide public data.
    if (token && canRetryWithoutToken) {
      return fetch(input, {
        ...init,
        headers: buildHeaders(null, init),
      });
    }

    return first; // let the caller handle the 401
  };
}
