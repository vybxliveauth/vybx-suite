// Re-export core primitives
export type { SessionUserBase, AuthStatus } from "@vybx/auth-core";
export { formatDisplayName, resolveApiBaseUrl } from "@vybx/auth-core";

// Mobile-specific types
export type {
  MobileAuthUser,
  MobileAuthResponse,
  MobileLoginResult,
  BackendAuthUser,
  MobileUserRole,
} from "./types";

// Token storage
export {
  createMobileTokenStorage,
  defaultTokenStorage,
} from "./storage";
export type { TokenStorage } from "./storage";

// Auth API
export {
  createMobileAuthApi,
  adaptBackendUser,
} from "./api";
export type { MobileAuthApi, MobileAuthApiOptions } from "./api";

// Mobile fetch wrapper (for use with @vybx/api-client)
export { createMobileFetch } from "./fetch";
export type { MobileFetchOptions } from "./fetch";
