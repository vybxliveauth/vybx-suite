import type { SessionUserBase } from "@vybx/auth-core";

// ─── Mobile auth types ────────────────────────────────────────────────────────

export type MobileUserRole =
  | "USER"
  | "PROMOTER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "STAFF"
  | (string & {});

/** Normalized auth user for mobile — extends the core session type. */
export interface MobileAuthUser extends SessionUserBase<string> {
  emailVerified: boolean;
  country?: string | null;
  city?: string | null;
}

/** Raw user shape returned by the backend. */
export interface BackendAuthUser {
  userId: string;
  email: string;
  role: string;
  emailVerified?: boolean | null;
  isEmailVerified?: boolean | null;
  email_verified?: boolean | null;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  marketingEmailOptIn?: boolean;
  country?: string | null;
  city?: string | null;
}

/** Successful auth response body from the backend (mobile mode). */
export interface MobileAuthResponse {
  access_token: string;
  refresh_token: string;
  user: BackendAuthUser;
}

/** Result of a login call — either success or a 2FA challenge. */
export type MobileLoginResult =
  | { requiresTwoFactor: true; challengeId: string; expiresInSeconds: number; message?: string }
  | { requiresTwoFactor: false; user: MobileAuthUser };
