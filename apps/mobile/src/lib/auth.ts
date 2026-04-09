/**
 * Mobile token storage — uses expo-secure-store (encrypted on-device).
 *
 * Design: Bearer-token auth (no cookies, no CSRF).
 * Tokens are written here after a successful mobile login and read by the
 * API client wrapper to inject the Authorization header.
 *
 * Backend requirement: POST /auth/login must return
 *   { access_token: string; refresh_token: string; user: {...} }
 * in the response body when the request carries the header
 *   X-Client: mobile
 * (See docs/mobile-auth.md for the backend extension guide.)
 */

import * as SecureStore from "expo-secure-store";

type TokensClearedListener = () => void;

const KEYS = {
  accessToken: "vybx_access_token",
  refreshToken: "vybx_refresh_token",
} as const;

const tokensClearedListeners = new Set<TokensClearedListener>();

function notifyTokensCleared() {
  for (const listener of tokensClearedListeners) {
    try {
      listener();
    } catch {
      // Auth listeners must never break logout/session-expired flow.
    }
  }
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.accessToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.refreshToken);
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
  await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.accessToken);
  await SecureStore.deleteItemAsync(KEYS.refreshToken);
  notifyTokensCleared();
}

export function onTokensCleared(
  listener: TokensClearedListener,
): () => void {
  tokensClearedListeners.add(listener);
  return () => {
    tokensClearedListeners.delete(listener);
  };
}
