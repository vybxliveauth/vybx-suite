import {
  type PromoterPermission as Permission,
  resolvePromoterPermissions,
} from "@vybx/permissions";
import type { AuthUser } from "./types";

export type { Permission };

export function resolvePermissions(user: AuthUser | null): Set<Permission> {
  return resolvePromoterPermissions(user?.role, user?.permissions);
}
