import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

type SessionUserBase<TRole extends string> = {
  userId: string;
  email: string;
  role: TRole;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
};

type AuthSessionStoreOptions<TUser, TRole extends string> = {
  baseUrl: string;
  validRoles: readonly TRole[];
  legacyStorageKeys?: string[];
  credentials?: RequestCredentials;
  mePath?: string;
  refreshPath?: string;
  fetchFn?: typeof fetch;
  normalizeUser?: (input: unknown) => TUser | null;
};

function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

function withApiVersionPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (/^\/api(?:\/|$)/i.test(normalized)) return normalized;
  const prefix = normalized === "/" ? "" : normalized;
  return `${prefix}/api/v1`;
}

function resolveApiBaseUrl(baseUrl: string) {
  const raw = baseUrl.trim();
  try {
    const parsed = new URL(raw);
    parsed.pathname = withApiVersionPath(parsed.pathname);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    if (/\/api(?:\/|$)/i.test(normalized)) return normalized;
    return `${normalized}/api/v1`;
  }
}

export function createSessionUserNormalizer<TRole extends string>(
  validRoles: readonly TRole[],
) {
  const roleSet = new Set<TRole>(validRoles);

  return (input: unknown): SessionUserBase<TRole> | null => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return null;
    }

    const raw = input as Partial<SessionUserBase<TRole>> & { id?: unknown };
    const userId =
      typeof raw.userId === "string"
        ? raw.userId
        : typeof raw.id === "string"
          ? raw.id
          : null;
    const email = typeof raw.email === "string" ? raw.email : null;
    const role = typeof raw.role === "string" ? raw.role : null;

    if (!userId || !email || !role || !roleSet.has(role as TRole)) {
      return null;
    }

    return {
      userId,
      email,
      role: role as TRole,
      firstName: typeof raw.firstName === "string" ? raw.firstName : undefined,
      lastName: typeof raw.lastName === "string" ? raw.lastName : undefined,
      profileImageUrl:
        typeof raw.profileImageUrl === "string" ? raw.profileImageUrl : undefined,
    };
  };
}

export function createAuthSessionStore<
  TRole extends string,
  TUser extends SessionUserBase<TRole>,
>(options: AuthSessionStoreOptions<TUser, TRole>) {
  const baseUrl = resolveApiBaseUrl(options.baseUrl);
  const mePath = options.mePath ?? "/users/me";
  const refreshPath = options.refreshPath ?? "/auth/refresh";
  const legacyStorageKeys = options.legacyStorageKeys ?? [];
  const credentials = options.credentials ?? "include";
  const fetchFn = options.fetchFn ?? fetch;
  const normalizeUser =
    options.normalizeUser ??
    ((input: unknown) =>
      createSessionUserNormalizer(options.validRoles)(input) as TUser | null);

  let currentUser: TUser | null = null;
  const listeners = new Set<() => void>();

  const notifyAuthChange = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const cleanupLegacyStorage = () => {
    if (typeof window === "undefined" || legacyStorageKeys.length === 0) return;
    for (const key of legacyStorageKeys) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore storage access errors
      }
    }
  };

  const fetchSessionUser = async (): Promise<TUser | null> => {
    const requestInit: RequestInit = {
      method: "GET",
      credentials,
      headers: { Accept: "application/json" },
      cache: "no-store",
    };

    try {
      const response = await fetchFn(`${baseUrl}${mePath}`, requestInit);
      if (response.status === 401) {
        const refreshed = await fetchFn(`${baseUrl}${refreshPath}`, {
          method: "POST",
          credentials,
          cache: "no-store",
        });
        if (!refreshed.ok) return null;
        const retry = await fetchFn(`${baseUrl}${mePath}`, requestInit);
        if (!retry.ok) return null;
        return normalizeUser(await retry.json());
      }

      if (!response.ok) return null;
      return normalizeUser(await response.json());
    } catch {
      return null;
    }
  };

  const getUser = () => currentUser;

  const setUser = (user: TUser) => {
    const normalized = normalizeUser(user);
    cleanupLegacyStorage();
    if (!normalized) return;
    currentUser = normalized;
    notifyAuthChange();
  };

  const clearSession = () => {
    cleanupLegacyStorage();
    if (currentUser !== null) {
      currentUser = null;
      notifyAuthChange();
    }
  };

  const isAuthenticated = () => currentUser !== null;

  const subscribeAuthChanges = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const useAuthUser = () =>
    useSyncExternalStore(subscribeAuthChanges, getUser, () => null);

  const hydrateUserFromSession = async (): Promise<TUser | null> => {
    cleanupLegacyStorage();
    if (currentUser) return currentUser;
    const user = await fetchSessionUser();
    if (!user) return null;
    currentUser = user;
    notifyAuthChange();
    return user;
  };

  return {
    getUser,
    setUser,
    clearSession,
    isAuthenticated,
    subscribeAuthChanges,
    useAuthUser,
    hydrateUserFromSession,
  };
}

export function formatDisplayName(
  user:
    | {
        firstName?: string;
        lastName?: string;
        email: string;
      }
    | null
    | undefined,
  fallback: string,
) {
  if (!user) return fallback;
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full || (user.email.split("@")[0] ?? fallback);
}

type UseAuthGuardOptions<TUser, TRole extends string, TPermission> = {
  permission?: TPermission;
  pathname: string;
  replace: (href: string) => void;
  allowedRoles: ReadonlySet<TRole>;
  getRole: (user: TUser) => TRole;
  getUser: () => TUser | null;
  hydrateUserFromSession: () => Promise<TUser | null>;
  clearSession: () => void;
  resolvePermissions: (user: TUser) => Set<TPermission>;
  resolveRequiredPermissionForPath?: (pathname: string) => TPermission | null;
  loginPath?: string;
  fallbackPath?: string;
  defaultNextPath?: string;
};

export function useAuthGuardCore<TUser, TRole extends string, TPermission>(
  options: UseAuthGuardOptions<TUser, TRole, TPermission>,
) {
  const {
    permission,
    pathname,
    replace,
    allowedRoles,
    getRole,
    getUser,
    hydrateUserFromSession,
    clearSession,
    resolvePermissions,
    resolveRequiredPermissionForPath,
    loginPath = "/login",
    fallbackPath = "/dashboard",
    defaultNextPath = "/dashboard",
  } = options;

  useEffect(() => {
    let cancelled = false;

    const runGuard = async () => {
      let user = getUser();

      if (!user) {
        user = await hydrateUserFromSession();
        if (!user) {
          // Avoid false logouts during short-lived refresh/network races on hard reload.
          await new Promise((resolve) => setTimeout(resolve, 150));
          if (!cancelled) {
            user = await hydrateUserFromSession();
          }
        }
      }

      if (cancelled) return;

      if (!user) {
        const nextPath = pathname || defaultNextPath;
        replace(`${loginPath}?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      if (!allowedRoles.has(getRole(user))) {
        clearSession();
        replace(loginPath);
        return;
      }

      const requiredPermission =
        permission ?? resolveRequiredPermissionForPath?.(pathname) ?? null;

      if (requiredPermission && !resolvePermissions(user).has(requiredPermission)) {
        replace(fallbackPath);
      }
    };

    void runGuard();
    return () => {
      cancelled = true;
    };
  }, [
    permission,
    pathname,
    replace,
    allowedRoles,
    getRole,
    getUser,
    hydrateUserFromSession,
    clearSession,
    resolvePermissions,
    resolveRequiredPermissionForPath,
    loginPath,
    fallbackPath,
    defaultNextPath,
  ]);
}

export function usePermissionsCore<TUser, TPermission>(
  useAuthUser: () => TUser | null,
  resolvePermissions: (user: TUser | null) => Set<TPermission>,
) {
  const user = useAuthUser();
  const permissions = useMemo(() => resolvePermissions(user), [user, resolvePermissions]);
  const can = useCallback(
    (permission: TPermission): boolean => permissions.has(permission),
    [permissions],
  );

  return { user, permissions, can };
}
