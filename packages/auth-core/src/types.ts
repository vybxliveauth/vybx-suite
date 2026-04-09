// ─── Core identity types ──────────────────────────────────────────────────────
// Zero dependencies. Safe to import from web, mobile, or server.

export type SessionUserBase<TRole extends string = string> = {
  userId: string;
  email: string;
  role: TRole;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
};

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";
