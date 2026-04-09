/**
 * Mobile token storage using expo-secure-store (encrypted on-device).
 * Bearer-token strategy — no cookies, no CSRF.
 *
 * Usage:
 *   const tokenStorage = createMobileTokenStorage();
 *   await tokenStorage.saveTokens(accessToken, refreshToken);
 */

import * as SecureStore from "expo-secure-store";

export type TokenStorage = {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  saveTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
  onTokensCleared(listener: () => void): () => void;
};

export function createMobileTokenStorage(
  keys = {
    accessToken: "vybx_access_token",
    refreshToken: "vybx_refresh_token",
  },
): TokenStorage {
  const clearedListeners = new Set<() => void>();

  const notifyCleared = () => {
    for (const listener of clearedListeners) {
      try {
        listener();
      } catch {
        // auth listeners must never break logout/session-expired flow
      }
    }
  };

  return {
    getAccessToken: () => SecureStore.getItemAsync(keys.accessToken),
    getRefreshToken: () => SecureStore.getItemAsync(keys.refreshToken),

    async saveTokens(accessToken, refreshToken) {
      await SecureStore.setItemAsync(keys.accessToken, accessToken);
      await SecureStore.setItemAsync(keys.refreshToken, refreshToken);
    },

    async clearTokens() {
      await SecureStore.deleteItemAsync(keys.accessToken);
      await SecureStore.deleteItemAsync(keys.refreshToken);
      notifyCleared();
    },

    onTokensCleared(listener) {
      clearedListeners.add(listener);
      return () => {
        clearedListeners.delete(listener);
      };
    },
  };
}

/** Singleton default storage for apps that don't need custom keys. */
export const defaultTokenStorage = createMobileTokenStorage();
