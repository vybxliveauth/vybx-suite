import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_ACCOUNT_APP_URL = "https://account.vybxlive.com";

type AuthMode = "login" | "register";

export type AccountAuthSessionResult =
  | { type: "success"; accessToken: string; refreshToken: string }
  | { type: "cancel" }
  | { type: "error"; message: string };

const AUTH_SESSION_TIMEOUT_MS = 5 * 60_000;

function resolveAccountAppBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_ACCOUNT_APP_URL?.trim();
  if (!configured) return DEFAULT_ACCOUNT_APP_URL;
  return configured.replace(/\/+$/, "");
}

function createState(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildAuthUrl(mode: AuthMode, callbackUrl: string, state: string): string {
  const baseUrl = resolveAccountAppBaseUrl();
  const url = new URL("/auth", `${baseUrl}/`);
  url.searchParams.set("mode", mode);
  url.searchParams.set("mobile", "1");
  url.searchParams.set("callback", callbackUrl);
  url.searchParams.set("state", state);
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

export async function startAccountAuthSession(
  mode: AuthMode,
): Promise<AccountAuthSessionResult> {
  const callbackUrl = Linking.createURL("auth/callback");
  const state = createState();
  const authUrl = buildAuthUrl(mode, callbackUrl, state);

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
    if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancel" };
    }
    return {
      type: "error",
      message: "No se pudo completar la autenticación en navegador.",
    };
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

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    return {
      type: "error",
      message: "No se recibieron tokens de acceso desde la web.",
    };
  }

  return {
    type: "success",
    accessToken,
    refreshToken,
  };
}
