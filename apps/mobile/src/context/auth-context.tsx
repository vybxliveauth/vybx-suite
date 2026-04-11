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
import { AnalyticsEvents } from "../lib/analytics";
import { reportMobileError, reportMobileInfo } from "../lib/observability";

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
  completeBrowserAuth(tokens: {
    accessToken: string;
    refreshToken: string;
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
      let hadAccessToken = false;
      try {
        const token = await defaultTokenStorage.getAccessToken();
        if (!token) {
          setStatus("unauthenticated");
          return;
        }
        hadAccessToken = true;
        const profile = await authApi.fetchProfile(token);
        setUser(profile);
        setStatus("authenticated");
      } catch (error) {
        // Clear tokens only on auth failures. Keep them on transient network errors.
        if (hasHttpStatus(error, [401, 403])) {
          await defaultTokenStorage.clearTokens();
        }
        reportMobileError(
          "mobile_auth_restore_failed",
          {
            flow: "session_restore",
            had_access_token: hadAccessToken,
          },
          error,
        );
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
          reportMobileInfo("mobile_auth_2fa_challenge_issued", {
            flow: "credentials",
            expires_in_seconds: result.expiresInSeconds,
          });
          setUser(null);
          setStatus("unauthenticated");
          return result;
        }
        reportMobileInfo(AnalyticsEvents.AUTH_LOGIN_SUCCESS, {
          flow: "credentials",
        });
        setUser(result.user);
        setStatus("authenticated");
        return result;
      } catch (err) {
        reportMobileError(
          AnalyticsEvents.AUTH_LOGIN_FAILED,
          { flow: "credentials" },
          err,
        );
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
        reportMobileInfo(AnalyticsEvents.AUTH_LOGIN_SUCCESS, {
          flow: "2fa",
        });
        setUser(authUser);
        setStatus("authenticated");
      } catch (err) {
        reportMobileError(
          "mobile_auth_2fa_failed",
          { flow: "2fa_verify" },
          err,
        );
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
      try {
        await authApi.register(payload);
      } catch (err) {
        reportMobileError(
          "mobile_auth_register_failed",
          { flow: "register" },
          err,
        );
        throw err;
      }
      // User must verify email before logging in.
    },
    [],
  );

  const completeBrowserAuth = useCallback(
    async (tokens: { accessToken: string; refreshToken: string }): Promise<void> => {
      setStatus("loading");
      try {
        await defaultTokenStorage.saveTokens(
          tokens.accessToken,
          tokens.refreshToken,
        );
        const profile = await authApi.fetchProfile(tokens.accessToken);
        reportMobileInfo(AnalyticsEvents.AUTH_LOGIN_SUCCESS, {
          flow: "browser_callback",
        });
        setUser(profile);
        setStatus("authenticated");
      } catch (err) {
        reportMobileError(
          "mobile_auth_browser_exchange_failed",
          { flow: "browser_callback" },
          err,
        );
        await defaultTokenStorage.clearTokens();
        setUser(null);
        setStatus("unauthenticated");
        throw err;
      }
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
      value={{
        user,
        status,
        login,
        verifyTwoFactor,
        register,
        completeBrowserAuth,
        logout,
      }}
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
