import type { SessionUserBase } from "@vybx/auth-client";

export type EndUserRole = "USER";

export type AuthUser = SessionUserBase<EndUserRole> & {
  id: string;
  emailVerified: boolean;
  country?: string | null;
  city?: string | null;
  marketingEmailOptIn?: boolean;
};
