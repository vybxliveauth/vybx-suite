"use client";

import type { AuthUser } from "./types";

const TOKEN_KEY = "vybx_promoter_token";
const USER_KEY = "vybx_promoter_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Display name helper */
export function displayName(user: AuthUser | null): string {
  if (!user) return "Promotor";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full || (user.email.split("@")[0] ?? "Promotor");
}
