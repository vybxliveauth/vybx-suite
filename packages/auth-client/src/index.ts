// Re-export cross-platform primitives from auth-core so consumers that only
// install auth-client don't need a separate auth-core import.
export type { SessionUserBase, AuthStatus } from "@vybx/auth-core";
export {
  createSessionUserNormalizer,
  formatDisplayName,
  resolveApiBaseUrl,
} from "@vybx/auth-core";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  createSessionUserNormalizer,
  resolveApiBaseUrl,
} from "@vybx/auth-core";
import type { SessionUserBase } from "@vybx/auth-core";

// ─── Auth session store (web / cookie-based) ──────────────────────────────────

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
    for (const listener of listeners) listener();
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

// ─── Auth guard hook (framework-agnostic core) ────────────────────────────────

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
          // Guard against false logouts during short-lived refresh/network races.
          await new Promise((resolve) => setTimeout(resolve, 150));
          if (!cancelled) user = await hydrateUserFromSession();
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

      if (
        requiredPermission &&
        !resolvePermissions(user).has(requiredPermission)
      ) {
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

// ─── Permissions hook ─────────────────────────────────────────────────────────

export function usePermissionsCore<TUser, TPermission>(
  useAuthUser: () => TUser | null,
  resolvePermissions: (user: TUser | null) => Set<TPermission>,
) {
  const user = useAuthUser();
  const permissions = useMemo(
    () => resolvePermissions(user),
    [user, resolvePermissions],
  );
  const can = useCallback(
    (permission: TPermission): boolean => permissions.has(permission),
    [permissions],
  );

  return { user, permissions, can };
}

// ─── Passkeys / WebAuthn (browser-only) ──────────────────────────────────────

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

export async function isPasskeyPlatformAvailable(): Promise<boolean> {
  if (!isPasskeySupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

type PublicKeyCreationOptionsJSON = {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: "public-key"; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{ type: "public-key"; id: string }>;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
};

type PublicKeyRequestOptionsJSON = {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{ type: "public-key"; id: string }>;
  userVerification?: UserVerificationRequirement;
};

export async function createPasskeyCredential(
  optionsJSON: PublicKeyCreationOptionsJSON,
) {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: base64UrlToBuffer(optionsJSON.challenge),
    rp: optionsJSON.rp,
    user: {
      id: base64UrlToBuffer(optionsJSON.user.id),
      name: optionsJSON.user.name,
      displayName: optionsJSON.user.displayName,
    },
    pubKeyCredParams: optionsJSON.pubKeyCredParams,
    timeout: optionsJSON.timeout,
    excludeCredentials: optionsJSON.excludeCredentials?.map((c) => ({
      type: c.type,
      id: base64UrlToBuffer(c.id),
    })),
    authenticatorSelection: optionsJSON.authenticatorSelection,
    attestation: optionsJSON.attestation ?? "none",
  };

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Passkey creation was cancelled");

  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key" as const,
    response: {
      attestationObject: bufferToBase64Url(response.attestationObject),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    },
  };
}

export async function getPasskeyAssertion(
  optionsJSON: PublicKeyRequestOptionsJSON,
) {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: base64UrlToBuffer(optionsJSON.challenge),
    timeout: optionsJSON.timeout,
    rpId: optionsJSON.rpId,
    allowCredentials: optionsJSON.allowCredentials?.map((c) => ({
      type: c.type,
      id: base64UrlToBuffer(c.id),
    })),
    userVerification: optionsJSON.userVerification ?? "preferred",
  };

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Passkey authentication was cancelled");

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: "public-key" as const,
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle
        ? bufferToBase64Url(response.userHandle)
        : undefined,
    },
  };
}
