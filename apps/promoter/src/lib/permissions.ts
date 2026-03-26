import type { AuthUser } from "./types";

// ── Permission definitions ─────────────────────────────────────────────────────
export type Permission =
  | "dashboard:view"
  | "events:view"
  | "events:create"
  | "events:edit"
  | "sales:view"
  | "refunds:view"
  | "refunds:review"
  | "staff:view"
  | "staff:assign"
  | "settings:view";

// ── Role → permission map ──────────────────────────────────────────────────────
// Today all promoters get everything. When the backend starts returning
// `permissions: Permission[]` in the user profile, update resolvePermissions()
// below to use that array instead — zero other changes needed across the app.

const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "events:view",
  "events:create",
  "events:edit",
  "sales:view",
  "refunds:view",
  "refunds:review",
  "staff:view",
  "staff:assign",
  "settings:view",
];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  PROMOTER:    ALL_PERMISSIONS,
  ADMIN:       ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,
};

// ── Resolver ───────────────────────────────────────────────────────────────────
export function resolvePermissions(user: AuthUser | null): Set<Permission> {
  if (!user) return new Set();

  // Future: if the backend starts returning granular permissions, use them:
  // if (Array.isArray((user as any).permissions)) {
  //   return new Set((user as any).permissions as Permission[]);
  // }

  return new Set(ROLE_PERMISSIONS[user.role] ?? []);
}
