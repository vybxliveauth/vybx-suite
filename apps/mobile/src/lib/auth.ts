/**
 * Token storage for the mobile app.
 * Re-exports the default storage instance from @vybx/auth-mobile.
 *
 * If you need custom SecureStore keys, call createMobileTokenStorage({ ... })
 * directly instead of using this default export.
 */

export {
  defaultTokenStorage as tokenStorage,
  createMobileTokenStorage,
} from "@vybx/auth-mobile";
export type { TokenStorage } from "@vybx/auth-mobile";

// Backwards-compatible named exports used by legacy imports in this app.
import { defaultTokenStorage } from "@vybx/auth-mobile";

export const getAccessToken = () => defaultTokenStorage.getAccessToken();
export const getRefreshToken = () => defaultTokenStorage.getRefreshToken();
export const saveTokens = (a: string, r: string) =>
  defaultTokenStorage.saveTokens(a, r);
export const clearTokens = () => defaultTokenStorage.clearTokens();
export const onTokensCleared = (listener: () => void) =>
  defaultTokenStorage.onTokensCleared(listener);
