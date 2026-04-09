/**
 * Auth context for the mobile app.
 *
 * Boots from SecureStore on mount (restores session across app restarts).
 * Delegates all auth operations to @vybx/auth-mobile via the authApi instance
 * wired in src/lib/auth-api.ts.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { MobileAuthUser, MobileLoginResult } from "@vybx/auth-mobile";
import { queryClient } from "../lib/query-client";
import { defaultTokenStorage } from "@vybx/auth-mobile";
import { authApi } from "../lib/auth-api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

function hasHttpStatus(error: unknown, statuses: readonly number[]): boolean {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && statuses.includes(status);
}

interface AuthContextValue {
  user: MobileAuthUser | null;
  status: AuthStatus;
  login(email: string, password: string): Promise<MobileLoginResult>;
  verifyTwoFactor(challengeId: string, code: string): Promise<void>;
  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<void>;
  logout(): Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileAuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  // Listen for tokens being cleared externally (e.g. 401 cascade)
  useEffect(
    () =>
      defaultTokenStorage.onTokensCleared(() => {
        queryClient.clear();
        setUser(null);
        setStatus("unauthenticated");
      }),
    [],
  );

  // Restore session from SecureStore on mount
  useEffect(() => {
    async function restoreSession() {
      setStatus("loading");
      try {
        const token = await defaultTokenStorage.getAccessToken();
        if (!token) {
          setStatus("unauthenticated");
          return;
        }
        const profile = await authApi.fetchProfile(token);
        setUser(profile);
        setStatus("authenticated");
      } catch (error) {
        // Clear tokens only on auth failures. Keep them on transient network errors.
        if (hasHttpStatus(error, [401, 403])) {
          await defaultTokenStorage.clearTokens();
        }
        setUser(null);
        setStatus("unauthenticated");
      }
    }
    void restoreSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<MobileLoginResult> => {
      setStatus("loading");
      try {
        const result = await authApi.login(email, password);
        if (result.requiresTwoFactor) {
          setUser(null);
          setStatus("unauthenticated");
          return result;
        }
        setUser(result.user);
        setStatus("authenticated");
        return result;
      } catch (err) {
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const verifyTwoFactor = useCallback(
    async (challengeId: string, code: string): Promise<void> => {
      setStatus("loading");
      try {
        const authUser = await authApi.verifyTwoFactor(challengeId, code);
        setUser(authUser);
        setStatus("authenticated");
      } catch (err) {
        setStatus("unauthenticated");
        throw err;
      }
    },
    [],
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }): Promise<void> => {
      await authApi.register(payload);
      // User must verify email before logging in.
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await defaultTokenStorage.clearTokens();
    queryClient.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, status, login, verifyTwoFactor, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
