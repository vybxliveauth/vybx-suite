/**
 * Auth context for the mobile app.
 *
 * Boots from SecureStore on mount (restores session across app restarts).
 * Exposes login / register / logout helpers plus the current user state.
 *
 * Auth strategy: Bearer tokens stored in expo-secure-store — no cookies, no CSRF.
 * Backend requirement: POST /auth/login must return { access_token, refresh_token, user }
 * in the response body when the request carries  X-Client: mobile
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { queryClient } from "../lib/query-client";
import {
  clearTokens,
  getAccessToken,
  onTokensCleared,
} from "../lib/auth";
import {
  fetchMobileProfile,
  mobileLogin,
  mobileRegister,
  type AuthUser,
} from "../lib/auth-api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");

  useEffect(() => {
    return onTokensCleared(() => {
      queryClient.clear();
      setUser(null);
      setStatus("unauthenticated");
    });
  }, []);

  // Restore session from SecureStore on mount
  useEffect(() => {
    async function restoreSession() {
      setStatus("loading");
      try {
        const token = await getAccessToken();
        if (!token) {
          setStatus("unauthenticated");
          return;
        }
        const profile = await fetchMobileProfile(token);
        setUser(profile);
        setStatus("authenticated");
      } catch {
        // Token may be expired or invalid — clear and require re-login
        await clearTokens();
        setStatus("unauthenticated");
      }
    }
    void restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    try {
      const authUser = await mobileLogin(email, password);
      setUser(authUser);
      setStatus("authenticated");
    } catch (err) {
      setStatus("unauthenticated");
      throw err;
    }
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => {
      await mobileRegister(payload);
      // Registration succeeds → user must verify email before logging in.
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearTokens();
    queryClient.clear();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
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
