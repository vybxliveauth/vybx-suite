import { createApiClient, normalizePaginatedPayload } from "@vybx/api-client";
import { clearSession } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";

const client = createApiClient({
  baseUrl: BASE_URL,
  retryOnUnauthorized: true,
  normalizeResponse: normalizePaginatedPayload,
  onSessionExpired: () => {
    if (typeof window !== "undefined") {
      clearSession();
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
  },
});

export const api = {
  get: <T>(path: string) => client.get<T>(path),
  post: <T>(path: string, body: unknown) => client.post<T>(path, body),
  put: <T>(path: string, body: unknown) => client.put<T>(path, body),
  patch: <T>(path: string, body: unknown) => client.patch<T>(path, body),
  delete: <T>(path: string) => client.delete<T>(path),
};
