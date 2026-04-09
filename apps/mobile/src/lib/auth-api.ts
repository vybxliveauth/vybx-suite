/**
 * Auth API calls for mobile.
 *
 * Uses direct fetch (not the authenticated apiClient) so that these
 * calls work before a session is established.
 *
 * Backend requirement: these endpoints must return tokens in the response body
 * when the request carries the header  X-Client: mobile
 * Expected response shape:
 *   { access_token: string; refresh_token: string; user: BackendAuthUser }
 */

import type { PublicAuthUser, UserRole } from "@vybx/types";
import { saveTokens } from "./auth";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";
const TURNSTILE_BYPASS_TOKEN =
  process.env.EXPO_PUBLIC_TURNSTILE_BYPASS_TOKEN?.trim();

const MOBILE_HEADERS = {
  "Content-Type": "application/json",
  "X-Client": "mobile",
};

export interface BackendAuthUser {
  userId: string;
  email: string;
  role: UserRole;
  emailVerified?: boolean | null;
  isEmailVerified?: boolean | null;
  email_verified?: boolean | null;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  marketingEmailOptIn?: boolean;
  country?: string | null;
  city?: string | null;
}

export interface MobileAuthResponse {
  access_token: string;
  refresh_token: string;
  user: BackendAuthUser;
}

export type AuthUser = PublicAuthUser;

type MobileLoginTwoFactorChallenge = {
  success: false;
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasSecurityChallengeMessage(message: string): boolean {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalized.includes("turnstile") ||
    normalized.includes("trafico sospechoso")
  );
}

function isTwoFactorChallenge(
  value: unknown,
): value is MobileLoginTwoFactorChallenge {
  if (!isRecord(value)) return false;
  return (
    value.requiresTwoFactor === true &&
    value.success === false &&
    typeof value.challengeId === "string"
  );
}

function isBackendAuthUser(value: unknown): value is BackendAuthUser {
  if (!isRecord(value)) return false;
  return (
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.role === "string"
  );
}

function resolveEmailVerified(raw: BackendAuthUser): boolean {
  if (typeof raw.emailVerified === "boolean") return raw.emailVerified;
  if (typeof raw.isEmailVerified === "boolean") return raw.isEmailVerified;
  if (typeof raw.email_verified === "boolean") return raw.email_verified;
  return false;
}

function adaptUser(raw: BackendAuthUser): AuthUser {
  return {
    id: raw.userId,
    email: raw.email,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    role: raw.role,
    emailVerified: resolveEmailVerified(raw),
    profileImageUrl: raw.profileImageUrl ?? null,
    country: raw.country ?? null,
    city: raw.city ?? null,
  };
}

async function parseError(res: Response): Promise<string> {
  let message: string | null = null;
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (typeof body.message === "string") message = body.message;
    if (Array.isArray(body.message)) message = body.message.join(", ");
  } catch {
    // ignore
  }
  if (message && hasSecurityChallengeMessage(message)) {
    return "Registro protegido por verificacion de seguridad. Crea tu cuenta en vybxlive.com y luego inicia sesion aqui.";
  }
  return message ?? `Error ${res.status}`;
}

export async function mobileLogin(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: MOBILE_HEADERS,
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error(await parseError(res));

  const data = (await res.json()) as unknown;
  if (isTwoFactorChallenge(data)) {
    throw new Error(
      "Tu cuenta tiene verificacion en dos pasos. Inicia sesion primero en la web para completar 2FA.",
    );
  }
  if (!isRecord(data)) {
    throw new Error("Respuesta de autenticacion invalida.");
  }
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;
  const rawUser = data.user;
  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    !isBackendAuthUser(rawUser)
  ) {
    throw new Error(
      "No se pudo iniciar sesion desde movil con esta cuenta. Intenta de nuevo o usa la web.",
    );
  }
  await saveTokens(accessToken, refreshToken);
  return adaptUser(rawUser);
}

export async function mobileRegister(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<void> {
  const body = {
    ...payload,
    ...(TURNSTILE_BYPASS_TOKEN
      ? { turnstileToken: TURNSTILE_BYPASS_TOKEN }
      : {}),
  };
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: MOBILE_HEADERS,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchMobileProfile(
  accessToken: string,
): Promise<AuthUser> {
  const res = await fetch(`${BASE_URL}/auth/profile`, {
    headers: {
      ...MOBILE_HEADERS,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  const raw = (await res.json()) as BackendAuthUser;
  return adaptUser(raw);
}

export async function mobileResendVerification(email: string): Promise<{
  success?: boolean;
  message?: string;
}> {
  const res = await fetch(`${BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: MOBILE_HEADERS,
    body: JSON.stringify({ email }),
  });

  if (!res.ok) throw new Error(await parseError(res));

  try {
    return (await res.json()) as { success?: boolean; message?: string };
  } catch {
    return { success: true };
  }
}
