"use client";

import {
  createAuthSessionStore,
  createSessionUserNormalizer,
  formatDisplayName,
} from "@vybx/auth-client";
import { normalizeAdminPermissionClaims } from "@vybx/permissions";
import type { AuthUser } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";
const VALID_ROLES = ["USER", "PROMOTER", "ADMIN", "SUPER_ADMIN"] as const;

const normalizeBaseAuthUser = createSessionUserNormalizer<AuthUser["role"]>(VALID_ROLES);

function normalizeAuthUser(input: unknown): AuthUser | null {
  const base = normalizeBaseAuthUser(input);
  if (!base) return null;

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return base as AuthUser;
  }

  const raw = input as { permissions?: unknown };
  if (!Object.prototype.hasOwnProperty.call(raw, "permissions")) {
    return base as AuthUser;
  }

  return {
    ...(base as AuthUser),
    permissions: normalizeAdminPermissionClaims(raw.permissions),
  };
}

const sessionStore = createAuthSessionStore<AuthUser["role"], AuthUser>({
  baseUrl: BASE_URL,
  validRoles: VALID_ROLES,
  mePath: "/auth/profile",
  legacyStorageKeys: ["vybx_admin_user"],
  normalizeUser: (input) => normalizeAuthUser(input) as AuthUser | null,
});

export const getUser = sessionStore.getUser;
export const setUser = sessionStore.setUser;
export const clearSession = sessionStore.clearSession;
export const isAuthenticated = sessionStore.isAuthenticated;
export const subscribeAuthChanges = sessionStore.subscribeAuthChanges;
export const useAuthUser = sessionStore.useAuthUser;
export const hydrateUserFromSession = sessionStore.hydrateUserFromSession;

/** Display name helper */
export function displayName(user: AuthUser | null): string {
  return formatDisplayName(user, "Administrador");
}
