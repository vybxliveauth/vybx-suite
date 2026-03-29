"use client";

import { usePermissionsCore } from "@vybx/auth-client";
import { useAuthUser } from "./auth";
import { resolvePermissions, type Permission } from "./permissions";
import type { AuthUser } from "./types";

export function usePermissions() {
  return usePermissionsCore<AuthUser, Permission>(useAuthUser, resolvePermissions);
}
