import {
  type PromoterPermission as Permission,
  resolvePromoterPermissions,
  resolvePromoterRequiredPermissionForPath,
} from "@vybx/permissions";
import type { AuthUser } from "./types";

export type { Permission };

export function resolvePermissions(user: AuthUser | null): Set<Permission> {
  return resolvePromoterPermissions(user?.role, user?.permissions);
}

export const resolveRequiredPermissionForPath = resolvePromoterRequiredPermissionForPath;
