import {
  type AdminPermission as Permission,
  resolveAdminPermissions,
  resolveAdminRequiredPermissionForPath,
} from "@vybx/permissions";
import type { AuthUser } from "./types";

export type { Permission };

export function resolvePermissions(user: AuthUser | null): Set<Permission> {
  return resolveAdminPermissions(user?.role, user?.permissions);
}

export const resolveRequiredPermissionForPath = resolveAdminRequiredPermissionForPath;
