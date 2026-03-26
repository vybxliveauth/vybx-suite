"use client";

import type { AuthUser } from "./types";

const USER_KEY = "vybx_promoter_user";

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}

/** Display name helper */
export function displayName(user: AuthUser | null): string {
  if (!user) return "Promotor";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full || (user.email.split("@")[0] ?? "Promotor");
}
