import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_ACCOUNT_APP_URL = "https://account.vybxlive.com";

type AuthMode = "login" | "register";

export type AccountAuthSessionResult =
  | { type: "success"; accessToken: string; refreshToken: string }
  | { type: "cancel" }
  | { type: "error"; message: string };

const AUTH_SESSION_TIMEOUT_MS = 45_000;

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

export async function startAccountAuthSession(
  mode: AuthMode,
): Promise<AccountAuthSessionResult> {
  const callbackUrl = Linking.createURL("/auth/callback");
  const state = createState();
  const authUrl = buildAuthUrl(mode, callbackUrl, state);

  const result = await Promise.race<
    WebBrowser.WebBrowserAuthSessionResult | { type: "timeout" }
  >([
    WebBrowser.openAuthSessionAsync(authUrl, callbackUrl),
    new Promise((resolve) => {
      setTimeout(() => resolve({ type: "timeout" as const }), AUTH_SESSION_TIMEOUT_MS);
    }),
  ]);

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

  if (result.type !== "success") {
    if (result.type === "cancel" || result.type === "dismiss") {
      return { type: "cancel" };
    }
    return {
      type: "error",
      message: "No se pudo completar la autenticación en navegador.",
    };
  }

  const params = readCallbackParams(result.url);
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
