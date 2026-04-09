/**
 * Mobile API client.
 *
 * Uses @vybx/auth-mobile's createMobileFetch to inject Bearer tokens and
 * retry on 401 with automatic token refresh. No cookies, no CSRF.
 */

import { createApiClient, normalizePaginatedPayload } from "@vybx/api-client";
import { createMobileFetch } from "@vybx/auth-mobile";
import { defaultTokenStorage } from "@vybx/auth-mobile";
import { authApi } from "./auth-api";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";

const mobileFetch = createMobileFetch({
  storage: defaultTokenStorage,
  authApi,
});

export const apiClient = createApiClient({
  baseUrl: BASE_URL,
  credentials: "omit",           // no cookies on mobile
  getCsrfToken: () => "",        // no CSRF on mobile
  retryOnUnauthorized: false,    // retry handled inside mobileFetch
  normalizeResponse: normalizePaginatedPayload,
  fetchFn: mobileFetch,
  onSessionExpired: () => {
    void defaultTokenStorage.clearTokens();
  },
});

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
  delete: <T>(path: string) =>
    apiClient.request<T>(path, { method: "DELETE" }),
};
