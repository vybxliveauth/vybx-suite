"use client";

import {
  createAuthSessionStore,
  createSessionUserNormalizer,
  formatDisplayName,
} from "@vybx/auth-client";
import type { AuthUser } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";
const VALID_ROLES = ["USER"] as const;

const normalizeBase = createSessionUserNormalizer<AuthUser["role"]>(VALID_ROLES);

const sessionStore = createAuthSessionStore<AuthUser["role"], AuthUser>({
  baseUrl: BASE_URL,
  validRoles: VALID_ROLES,
  mePath: "/auth/profile",
  legacyStorageKeys: ["vybx-auth", "vybx_user", "vybx-account-user"],
  normalizeUser: (input) => normalizeBase(input) as AuthUser | null,
});

export const getUser = sessionStore.getUser;
export const setUser = sessionStore.setUser;
export const clearSession = sessionStore.clearSession;
export const isAuthenticated = sessionStore.isAuthenticated;
export const subscribeAuthChanges = sessionStore.subscribeAuthChanges;
export const useAuthUser = sessionStore.useAuthUser;
export const hydrateUserFromSession = sessionStore.hydrateUserFromSession;

export function displayName(user: AuthUser | null): string {
  return formatDisplayName(user, "Usuario");
}
