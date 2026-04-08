"use client";

import { useAuthGuardCore } from "@vybx/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getUser, hydrateUserFromSession } from "./auth";
import type { Permission } from "./permissions";
import { resolvePermissions, resolveRequiredPermissionForPath } from "./permissions";
import type { UserRole } from "./types";

const ALLOWED_ROLES = new Set<UserRole>(["PROMOTER", "ADMIN", "SUPER_ADMIN"]);

/**
 * Redirects to /login if:
 *  - user is not authenticated
 *  - user role is not PROMOTER / ADMIN / SUPER_ADMIN
 *
 * Optionally pass a `permission` to also redirect if the user
 * lacks that specific permission (useful for page-level guards).
 */
export function useAuthGuard(permission?: Permission) {
  const router = useRouter();
  const pathname = usePathname();

  useAuthGuardCore({
    permission,
    pathname: pathname ?? "/dashboard",
    replace: (href) => router.replace(href),
    allowedRoles: ALLOWED_ROLES,
    getRole: (user) => user.role,
    getUser,
    hydrateUserFromSession,
    clearSession,
    resolvePermissions: (user) => resolvePermissions(user),
    resolveRequiredPermissionForPath,
    loginPath: "/login",
    fallbackPath: "/dashboard",
    defaultNextPath: "/dashboard",
  });
}
