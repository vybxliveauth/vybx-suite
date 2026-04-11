/**
 * Mobile auth API calls.
 *
 * All requests carry  X-Client: mobile  so the backend returns tokens in the
 * response body instead of setting httpOnly cookies.
 *
 * Usage:
 *   const authApi = createMobileAuthApi({ baseUrl: process.env.EXPO_PUBLIC_API_URL });
 */

import { resolveApiBaseUrl } from "@vybx/auth-core";
import type {
  BackendAuthUser,
  MobileAuthResponse,
  MobileAuthUser,
  MobileLoginResult,
} from "./types";
import type { TokenStorage } from "./storage";

// ─── Internal helpers ─────────────────────────────────────────────────────────

type HttpError = Error & { status?: number };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBackendAuthUser(value: unknown): value is BackendAuthUser {
  if (!isRecord(value)) return false;
  return (
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.role === "string"
  );
}

function isTwoFactorChallenge(value: unknown): value is {
  success: false;
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message?: string;
} {
  if (!isRecord(value)) return false;
  return (
    value.requiresTwoFactor === true &&
    value.success === false &&
    typeof value.challengeId === "string"
  );
}

function isEndUserRole(role: unknown): role is "USER" {
  return role === "USER";
}

function parseMobileAuthResponse(data: unknown): MobileAuthResponse | null {
  if (!isRecord(data)) return null;
  const { access_token, refresh_token, user } = data;
  if (
    typeof access_token !== "string" ||
    typeof refresh_token !== "string" ||
    !isBackendAuthUser(user)
  )
    return null;
  return { access_token, refresh_token, user };
}

function isWebAuthSuccessResponse(value: unknown): value is {
  success?: boolean;
  user: BackendAuthUser;
} {
  if (!isRecord(value)) return false;
  return isBackendAuthUser(value.user);
}

function resolveEmailVerified(raw: BackendAuthUser): boolean {
  if (typeof raw.emailVerified === "boolean") return raw.emailVerified;
  if (typeof raw.isEmailVerified === "boolean") return raw.isEmailVerified;
  if (typeof raw.email_verified === "boolean") return raw.email_verified;
  return false;
}

export function adaptBackendUser(raw: BackendAuthUser): MobileAuthUser {
  return {
    userId: raw.userId,
    email: raw.email,
    role: raw.role,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    emailVerified: resolveEmailVerified(raw),
    profileImageUrl: raw.profileImageUrl ?? undefined,
    country: raw.country ?? null,
    city: raw.city ?? null,
  };
}

async function parseErrorMessage(res: Response): Promise<string> {
  let message: string | null = null;
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (typeof body.message === "string") message = body.message;
    if (Array.isArray(body.message)) message = body.message.join(", ");
  } catch {
    // ignore parse errors
  }
  if (
    message &&
    /turnstile|trafico sospechoso/i.test(
      message.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    )
  ) {
    return "Registro protegido por verificación de seguridad. Crea tu cuenta en vybxlive.com y luego inicia sesión aquí.";
  }
  if (
    message &&
    /email must be an email|password must be longer than or equal to 8 characters|password must be a string/i.test(
      message,
    )
  ) {
    return "Revisa tu email y contraseña. La contraseña debe tener al menos 8 caracteres.";
  }
  return message ?? `Error ${res.status}`;
}

function makeHttpError(message: string, status: number): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

async function throwHttpError(res: Response): Promise<never> {
  throw makeHttpError(await parseErrorMessage(res), res.status);
}

function assertEndUserRole(user: BackendAuthUser): void {
  if (!isEndUserRole(user.role)) {
    throw makeHttpError(
      "Esta app solo admite cuentas de usuario final (USER).",
      403,
    );
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export type MobileAuthApiOptions = {
  baseUrl: string;
  storage: TokenStorage;
};

export type MobileAuthApi = {
  login(email: string, password: string): Promise<MobileLoginResult>;
  verifyTwoFactor(challengeId: string, code: string): Promise<MobileAuthUser>;
  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<void>;
  fetchProfile(accessToken: string): Promise<MobileAuthUser>;
  resendVerification(email: string): Promise<{ success?: boolean; message?: string }>;
  refreshTokens(): Promise<string | null>;
};

const MOBILE_HEADERS = {
  "Content-Type": "application/json",
  "X-Client": "mobile",
} as const;

export function createMobileAuthApi(options: MobileAuthApiOptions): MobileAuthApi {
  const base = resolveApiBaseUrl(options.baseUrl);
  const { storage } = options;

  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: MOBILE_HEADERS,
      body: JSON.stringify(body),
    });

  return {
    async login(email, password): Promise<MobileLoginResult> {
      const normalizedEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";
      const normalizedPassword =
        typeof password === "string" ? password : "";
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw makeHttpError("Email invalido.", 400);
      }
      if (normalizedPassword.length < 8) {
        throw makeHttpError(
          "La contraseña debe tener al menos 8 caracteres.",
          400,
        );
      }

      const res = await post("/auth/login", {
        email: normalizedEmail,
        password: normalizedPassword,
      });
      if (!res.ok) await throwHttpError(res);

      const data = (await res.json()) as unknown;

      if (isTwoFactorChallenge(data)) {
        return {
          requiresTwoFactor: true,
          challengeId: data.challengeId,
          expiresInSeconds: data.expiresInSeconds,
          message: data.message,
        };
      }

      const auth = parseMobileAuthResponse(data);
      if (!auth) {
        if (isWebAuthSuccessResponse(data) && isEndUserRole(data.user.role)) {
          throw makeHttpError(
            "El backend respondio en modo web (sin tokens para mobile). Reintenta en unos segundos; si persiste, hay que revisar la deteccion de X-Client en el backend.",
            502,
          );
        }
        if (
          isRecord(data) &&
          isRecord(data.user) &&
          typeof data.user.role === "string" &&
          !isEndUserRole(data.user.role)
        ) {
          throw makeHttpError(
            "Esta app solo admite cuentas de usuario final (USER).",
            403,
          );
        }
        throw new Error(
          "No se pudo iniciar sesión desde móvil. Intenta de nuevo o usa la web.",
        );
      }

      assertEndUserRole(auth.user);
      await storage.saveTokens(auth.access_token, auth.refresh_token);
      return { requiresTwoFactor: false, user: adaptBackendUser(auth.user) };
    },

    async verifyTwoFactor(challengeId, code): Promise<MobileAuthUser> {
      const res = await post("/auth/login/2fa", { challengeId, code });
      if (!res.ok) await throwHttpError(res);

      const data = (await res.json()) as unknown;
      const auth = parseMobileAuthResponse(data);
      if (!auth) {
        if (isWebAuthSuccessResponse(data) && isEndUserRole(data.user.role)) {
          throw makeHttpError(
            "El backend respondio en modo web (sin tokens para mobile). Reintenta en unos segundos; si persiste, hay que revisar la deteccion de X-Client en el backend.",
            502,
          );
        }
        if (
          isRecord(data) &&
          isRecord(data.user) &&
          typeof data.user.role === "string" &&
          !isEndUserRole(data.user.role)
        ) {
          throw makeHttpError(
            "Esta app solo admite cuentas de usuario final (USER).",
            403,
          );
        }
        throw new Error("Respuesta inválida al verificar 2FA.");
      }

      assertEndUserRole(auth.user);
      await storage.saveTokens(auth.access_token, auth.refresh_token);
      return adaptBackendUser(auth.user);
    },

    async register(payload): Promise<void> {
      const res = await post("/auth/register", payload);
      if (!res.ok) await throwHttpError(res);
    },

    async fetchProfile(accessToken): Promise<MobileAuthUser> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let res: Response;
      try {
        res = await fetch(`${base}/auth/profile`, {
          headers: { ...MOBILE_HEADERS, Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name?: string }).name === "AbortError"
        ) {
          throw new Error("No se pudo verificar tu sesión. Revisa tu conexión e intenta de nuevo.");
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) await throwHttpError(res);
      const data = (await res.json()) as unknown;
      if (!isBackendAuthUser(data)) {
        throw new Error("Respuesta inválida de perfil.");
      }
      assertEndUserRole(data);
      return adaptBackendUser(data);
    },

    async resendVerification(email): Promise<{ success?: boolean; message?: string }> {
      const res = await post("/auth/resend-verification", { email });
      if (!res.ok) await throwHttpError(res);
      try {
        return (await res.json()) as { success?: boolean; message?: string };
      } catch {
        return { success: true };
      }
    },

    async refreshTokens(): Promise<string | null> {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: MOBILE_HEADERS,
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        await storage.clearTokens();
        return null;
      }

      const data = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
      };

      if (!data.access_token) {
        await storage.clearTokens();
        return null;
      }

      await storage.saveTokens(
        data.access_token,
        data.refresh_token ?? refreshToken,
      );
      return data.access_token;
    },
  };
}
