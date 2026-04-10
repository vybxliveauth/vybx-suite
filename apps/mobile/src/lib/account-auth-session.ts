import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_ACCOUNT_APP_URL = "https://account.vybxlive.com";

type AuthMode = "login" | "register";
type PkceMethod = "S256";
type PkcePair = {
  verifier: string;
  challenge: string;
  method: PkceMethod;
};
type MobileExchangeResponse = {
  access_token?: string;
  refresh_token?: string;
  message?: string;
};

export type AccountAuthSessionResult =
  | { type: "success"; accessToken: string; refreshToken: string }
  | { type: "cancel" }
  | { type: "error"; message: string };

const AUTH_SESSION_TIMEOUT_MS = 5 * 60_000;
const PKCE_STATE_TTL_MS = 10 * 60_000;
const pendingPkceStates = new Map<string, { verifier: string; createdAt: number }>();

function resolveAccountAppBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_ACCOUNT_APP_URL?.trim();
  if (!configured) return DEFAULT_ACCOUNT_APP_URL;
  return configured.replace(/\/+$/, "");
}

async function createState(): Promise<string | null> {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return `${Date.now().toString(36)}-${toHex(randomBytes)}`;
  } catch {
    return null;
  }
}

function cleanupPendingPkceStates(): void {
  const now = Date.now();
  for (const [key, value] of pendingPkceStates.entries()) {
    if (now - value.createdAt > PKCE_STATE_TTL_MS) {
      pendingPkceStates.delete(key);
    }
  }
}

function rememberPendingPkce(state: string, verifier: string): void {
  cleanupPendingPkceStates();
  pendingPkceStates.set(state, { verifier, createdAt: Date.now() });
}

export function consumePendingPkceVerifier(state: string): string | null {
  cleanupPendingPkceStates();
  const stored = pendingPkceStates.get(state);
  if (!stored) return null;
  pendingPkceStates.delete(state);
  return stored.verifier;
}

function normalizeBase64ToBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function createPkcePair(): Promise<PkcePair | null> {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const verifier = toHex(randomBytes);
    const digestBase64 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    );
    const challenge = normalizeBase64ToBase64Url(digestBase64);
    if (!verifier || !challenge) return null;
    return { verifier, challenge, method: "S256" };
  } catch {
    return null;
  }
}

function buildAuthUrl(
  mode: AuthMode,
  callbackUrl: string,
  state: string,
  pkce: PkcePair,
): string {
  const baseUrl = resolveAccountAppBaseUrl();
  const url = new URL("/auth", `${baseUrl}/`);
  url.searchParams.set("mode", mode);
  url.searchParams.set("mobile", "1");
  url.searchParams.set("callback", callbackUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkce.challenge);
  url.searchParams.set("code_challenge_method", pkce.method);
  return url.toString();
}

function readCallbackParams(rawUrl: string): URLSearchParams {
  const url = new URL(rawUrl);
  const params = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      params.set(key, value);
    });
  }
  return params;
}

function isSameCallbackTarget(url: string, callbackUrl: string): boolean {
  try {
    const incoming = new URL(url);
    const expected = new URL(callbackUrl);
    const normalizePath = (value: string) =>
      value
        .replace(/\/--\//g, "/")
        .replace(/^\/--/, "/")
        .replace(/\/{2,}/g, "/")
        .replace(/\/+$/, "") || "/";
    const incomingPath = normalizePath(incoming.pathname);
    const expectedPath = normalizePath(expected.pathname);

    const callbackSuffix = "/auth/callback";
    const looksLikeAuthCallback =
      incomingPath.endsWith(callbackSuffix) &&
      expectedPath.endsWith(callbackSuffix);

    return (
      incoming.protocol === expected.protocol &&
      incoming.host === expected.host &&
      (incomingPath === expectedPath || looksLikeAuthCallback)
    );
  } catch {
    return false;
  }
}

export async function exchangeMobileAuthCode(options: {
  authCode: string;
  state: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; refreshToken: string } | null> {
  const accountBaseUrl = resolveAccountAppBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${accountBaseUrl}/api/mobile-auth/exchange-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_code: options.authCode,
        code_verifier: options.codeVerifier,
        state: options.state,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as MobileExchangeResponse;
    if (
      typeof payload.access_token !== "string" ||
      typeof payload.refresh_token !== "string" ||
      payload.access_token.trim().length === 0 ||
      payload.refresh_token.trim().length === 0
    ) {
      return null;
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function startAccountAuthSession(
  mode: AuthMode,
): Promise<AccountAuthSessionResult> {
  const callbackUrl = Linking.createURL("auth/callback");
  const state = await createState();
  if (!state) {
    return {
      type: "error",
      message: "No se pudo preparar el estado seguro de autenticación. Intenta de nuevo.",
    };
  }
  const pkce = await createPkcePair();
  if (!pkce) {
    return {
      type: "error",
      message: "No se pudo preparar el inicio seguro (PKCE). Intenta de nuevo.",
    };
  }
  const authUrl = buildAuthUrl(mode, callbackUrl, state, pkce);
  rememberPendingPkce(state, pkce.verifier);

  let capturedCallbackUrl: string | null = null;
  let resolveDeepLink:
    | ((value: { type: "success"; url: string }) => void)
    | null = null;

  const deepLinkResult = new Promise<{ type: "success"; url: string }>((resolve) => {
    resolveDeepLink = resolve;
  });

  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (!isSameCallbackTarget(url, callbackUrl)) return;
    capturedCallbackUrl = url;
    resolveDeepLink?.({ type: "success", url });
    void WebBrowser.dismissBrowser();
  });

  const result = await Promise.race<
    WebBrowser.WebBrowserAuthSessionResult | { type: "timeout" } | { type: "success"; url: string }
  >([
    WebBrowser.openAuthSessionAsync(authUrl, callbackUrl),
    deepLinkResult,
    new Promise((resolve) => {
      setTimeout(() => resolve({ type: "timeout" as const }), AUTH_SESSION_TIMEOUT_MS);
    }),
  ]);
  subscription.remove();

  if (result.type === "timeout") {
    try {
      await WebBrowser.dismissBrowser();
    } catch {
      // no-op
    }
    return {
      type: "error",
      message: "La autenticación tardó demasiado. Intenta de nuevo.",
    };
  }

  if (result.type !== "success" && !capturedCallbackUrl) {
    const latestKnownUrl =
      Linking.getLinkingURL?.() ?? (await Linking.getInitialURL().catch(() => null));
    if (latestKnownUrl && isSameCallbackTarget(latestKnownUrl, callbackUrl)) {
      capturedCallbackUrl = latestKnownUrl;
    }

    if (capturedCallbackUrl) {
      // continue parsing below
    } else if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancel" };
    } else {
      return {
        type: "error",
        message: "No se pudo completar la autenticación en navegador.",
      };
    }
  }

  const callbackFromResult =
    result.type === "success" ? result.url : capturedCallbackUrl;
  if (!callbackFromResult) {
    return {
      type: "error",
      message: "No se pudo completar la autenticación en navegador.",
    };
  }

  const params = readCallbackParams(callbackFromResult);
  const returnedState = params.get("state");
  if (!returnedState || returnedState !== state) {
    return {
      type: "error",
      message: "No se pudo validar la sesión. Intenta de nuevo.",
    };
  }

  if (params.get("status") === "error") {
    return {
      type: "error",
      message: params.get("message") ?? "No se pudo iniciar sesión.",
    };
  }

  const authCode = params.get("auth_code");
  if (authCode) {
    const verifier = pkce.verifier;
    if (!verifier) {
      return {
        type: "error",
        message: "No se pudo validar el acceso seguro móvil. Intenta de nuevo.",
      };
    }
    const exchanged = await exchangeMobileAuthCode({
      authCode,
      state: returnedState,
      codeVerifier: verifier,
    });
    if (!exchanged) {
      return {
        type: "error",
        message: "No se pudo completar el intercambio seguro de sesión móvil.",
      };
    }
    pendingPkceStates.delete(returnedState);

    return {
      type: "success",
      accessToken: exchanged.accessToken,
      refreshToken: exchanged.refreshToken,
    };
  }
  return {
    type: "error",
    message: "No se recibió un código seguro de autenticación móvil.",
  };
}
