/**
 * Auth API for the mobile app.
 * Thin wrapper around @vybx/auth-mobile that wires up the app's
 * token storage and environment variables.
 */

import {
  createMobileAuthApi,
  adaptBackendUser,
} from "@vybx/auth-mobile";
import { defaultTokenStorage } from "@vybx/auth-mobile";

export type {
  MobileAuthUser as AuthUser,
  MobileLoginResult,
  BackendAuthUser,
} from "@vybx/auth-mobile";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://api.vybxlive.com/api/v1";

export const authApi = createMobileAuthApi({
  baseUrl: BASE_URL,
  storage: defaultTokenStorage,
});

// Named helpers kept for backwards compatibility
export const mobileLogin = (email: string, password: string) =>
  authApi.login(email, password);
export const mobileVerifyLoginTwoFactor = (challengeId: string, code: string) =>
  authApi.verifyTwoFactor(challengeId, code);
export const mobileRegister = (payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) => authApi.register(payload);
export const fetchMobileProfile = (accessToken: string) =>
  authApi.fetchProfile(accessToken);
export const mobileResendVerification = (email: string) =>
  authApi.resendVerification(email);

export { adaptBackendUser };
