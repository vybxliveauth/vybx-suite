import type { UserRole } from "@vybx/types";

export type AdminPermission =
  | "dashboard:view"
  | "events:view"
  | "events:create"
  | "events:edit"
  | "promoters:view"
  | "payouts:view"
  | "sales:view"
  | "refunds:view"
  | "refunds:review"
  | "users:view"
  | "users:manage"
  | "security:view"
  | "security:manage"
  | "audit:view"
  | "staff:view"
  | "staff:assign"
  | "settings:view";

export const ADMIN_ALL_PERMISSIONS: readonly AdminPermission[] = [
  "dashboard:view",
  "events:view",
  "events:create",
  "events:edit",
  "promoters:view",
  "payouts:view",
  "sales:view",
  "refunds:view",
  "refunds:review",
  "users:view",
  "users:manage",
  "security:view",
  "security:manage",
  "audit:view",
  "staff:view",
  "staff:assign",
  "settings:view",
];

const ADMIN_PERMISSION_SET = new Set<AdminPermission>(ADMIN_ALL_PERMISSIONS);

export const ADMIN_DEFAULT_PERMISSIONS: readonly AdminPermission[] = [
  "dashboard:view",
  "events:view",
  "events:create",
  "events:edit",
  "promoters:view",
  "payouts:view",
  "sales:view",
  "refunds:view",
  "refunds:review",
  "users:view",
  "security:view",
  "audit:view",
  "staff:view",
  "staff:assign",
  "settings:view",
];

const ADMIN_ROLE_PERMISSIONS: Record<UserRole, readonly AdminPermission[]> = {
  USER: [],
  PROMOTER: [],
  ADMIN: ADMIN_DEFAULT_PERMISSIONS,
  SUPER_ADMIN: ADMIN_ALL_PERMISSIONS,
};

export function normalizeAdminPermissionClaims(input: unknown): AdminPermission[] {
  if (!Array.isArray(input)) return [];
  const out: AdminPermission[] = [];
  for (const value of input) {
    if (typeof value === "string" && ADMIN_PERMISSION_SET.has(value as AdminPermission)) {
      out.push(value as AdminPermission);
    }
  }
  return out;
}

export function resolveAdminPermissions(
  role: UserRole | null | undefined,
  grantedPermissions?: readonly string[],
): Set<AdminPermission> {
  if (Array.isArray(grantedPermissions)) {
    return new Set(normalizeAdminPermissionClaims(grantedPermissions));
  }
  if (!role) return new Set();
  return new Set(ADMIN_ROLE_PERMISSIONS[role] ?? []);
}

export function resolveAdminRequiredPermissionForPath(
  pathname: string,
): AdminPermission | null {
  if (!pathname || pathname === "/") return "dashboard:view";
  if (pathname === "/login" || pathname.startsWith("/login/")) return null;
  if (pathname === "/promoter" || pathname.startsWith("/promoter/")) {
    return "dashboard:view";
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "dashboard:view";
  }
  if (pathname === "/events/new" || pathname.startsWith("/events/new/")) {
    return "events:create";
  }
  if (pathname === "/events/[id]/edit" || pathname.endsWith("/edit")) {
    return "events:edit";
  }
  if (pathname === "/events" || pathname.startsWith("/events/")) {
    return "events:view";
  }
  if (pathname === "/promoters" || pathname.startsWith("/promoters/")) {
    return "promoters:view";
  }
  if (pathname === "/payouts" || pathname.startsWith("/payouts/")) {
    return "payouts:view";
  }
  if (pathname === "/sales" || pathname.startsWith("/sales/")) {
    return "sales:view";
  }
  if (pathname === "/refunds" || pathname.startsWith("/refunds/")) {
    return "refunds:view";
  }
  if (pathname === "/users" || pathname.startsWith("/users/")) {
    return "users:view";
  }
  if (pathname === "/security" || pathname.startsWith("/security/")) {
    return "security:view";
  }
  if (pathname === "/audit" || pathname.startsWith("/audit/")) {
    return "audit:view";
  }
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    return "staff:view";
  }
  if (pathname === "/categories" || pathname.startsWith("/categories/")) {
    return "settings:view";
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "settings:view";
  }
  return null;
}

export type PromoterPermission =
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

export const PROMOTER_ALL_PERMISSIONS: readonly PromoterPermission[] = [
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

const PROMOTER_PERMISSION_SET = new Set<PromoterPermission>(PROMOTER_ALL_PERMISSIONS);

const PROMOTER_ROLE_PERMISSIONS: Partial<
  Record<UserRole, readonly PromoterPermission[]>
> = {
  PROMOTER: PROMOTER_ALL_PERMISSIONS,
  ADMIN: PROMOTER_ALL_PERMISSIONS,
  SUPER_ADMIN: PROMOTER_ALL_PERMISSIONS,
};

export function resolvePromoterPermissions(
  role: UserRole | null | undefined,
  grantedPermissions?: readonly string[],
): Set<PromoterPermission> {
  if (Array.isArray(grantedPermissions)) {
    return new Set(normalizePromoterPermissionClaims(grantedPermissions));
  }
  if (!role) return new Set();
  return new Set(PROMOTER_ROLE_PERMISSIONS[role] ?? []);
}

export function normalizePromoterPermissionClaims(input: unknown): PromoterPermission[] {
  if (!Array.isArray(input)) return [];
  const out: PromoterPermission[] = [];
  for (const value of input) {
    if (
      typeof value === "string" &&
      PROMOTER_PERMISSION_SET.has(value as PromoterPermission)
    ) {
      out.push(value as PromoterPermission);
    }
  }
  return out;
}
