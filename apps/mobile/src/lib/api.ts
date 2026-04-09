/**
 * Mobile API client.
 *
 * Wraps @vybx/api-client with:
 *  - Bearer token injection (from SecureStore, not cookies)
 *  - Mobile-aware 401 retry: refreshes token via /auth/refresh with
 *    the stored refresh_token in the body (not via cookie)
 *  - No CSRF header (mobile clients don't need double-submit cookies)
 */

import { createApiClient } from "@vybx/api-client";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "./auth";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";

// ─── Token refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client": "mobile" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        await clearTokens();
        return null;
      }

      const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
      };

      if (!data.access_token) {
        await clearTokens();
        return null;
      }

      await saveTokens(
        data.access_token,
        data.refresh_token ?? refreshToken,
      );
      return data.access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Fetch wrapper with Bearer injection and retry ───────────────────────────

const mobileFetch: typeof fetch = async (input, init) => {
  const accessToken = await getAccessToken();

  const addAuth = (token: string | null, headers: Record<string, string>) => {
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["X-Client"] = "mobile";
  };

  const buildHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = new Headers(init.headers);
      h.forEach((v: string, k: string) => {
        headers[k] = v;
      });
    }
    addAuth(token, headers);
    return headers;
  };

  // First attempt
  const firstRes = await fetch(input, {
    ...init,
    headers: buildHeaders(accessToken),
  });

  if (firstRes.status !== 401) return firstRes;

  // Try to refresh then retry once
  const newToken = await refreshAccessToken();
  if (!newToken) return firstRes; // Let the caller handle 401

  return fetch(input, {
    ...init,
    headers: buildHeaders(newToken),
  });
};

// ─── Client ───────────────────────────────────────────────────────────────────

export const apiClient = createApiClient({
  baseUrl: BASE_URL,
  credentials: "omit", // No cookies — mobile uses Bearer
  getCsrfToken: () => "", // No CSRF on mobile
  retryOnUnauthorized: false, // Retry handled in mobileFetch above
  fetchFn: mobileFetch,
  onSessionExpired: () => {
    void clearTokens();
    // Auth context will detect the missing token and redirect to login.
    // Trigger via router — see src/context/auth-context.tsx
  },
});

// Convenience helpers
export const api = {
  get: <T>(path: string) => apiClient.request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    apiClient.request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    apiClient.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiClient.request<T>(path, { method: "DELETE" }),
};
