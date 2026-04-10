import { createApiClient, resolveApiBaseUrl } from "@vybx/api-client";
import type { UserRole } from "@vybx/types";
import type { AuthUser } from "./types";

const BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

const client = createApiClient({
  baseUrl: BASE_URL,
  requestTimeoutMs: 12000,
  retryOnUnauthorized: false,
});

type BackendAuthUser = {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  marketingEmailOptIn?: boolean;
  country?: string | null;
  city?: string | null;
};

function request<T>(path: string, init?: RequestInit) {
  return client.request<T>(path, init);
}

function assertEndUserRole(role: UserRole): asserts role is "USER" {
  if (role !== "USER") {
    throw new Error("Esta aplicacion solo permite acceso de usuarios finales.");
  }
}

export function adaptAuthUser(raw: BackendAuthUser): AuthUser {
  assertEndUserRole(raw.role);

  return {
    id: raw.userId,
    userId: raw.userId,
    email: raw.email,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    role: raw.role,
    emailVerified: true,
    profileImageUrl: raw.profileImageUrl ?? undefined,
    marketingEmailOptIn: raw.marketingEmailOptIn ?? true,
    country: raw.country ?? null,
    city: raw.city ?? null,
  };
}

export type LoginSuccessResponse = {
  success: true;
  user: AuthUser;
};

export type LoginTwoFactorChallengeResponse = {
  success: false;
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message?: string;
};

export type LoginResponse = LoginSuccessResponse | LoginTwoFactorChallengeResponse;
export type MobileAuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};
export type MobileLoginSuccessResponse = {
  success: true;
  auth: MobileAuthTokens;
};
export type MobileLoginResponse =
  | MobileLoginSuccessResponse
  | LoginTwoFactorChallengeResponse;

type BackendMobileAuthResponse = {
  success?: boolean;
  access_token: string;
  refresh_token: string;
  user: BackendAuthUser;
};
type BackendMobileSessionExchangeResponse = {
  success?: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: BackendAuthUser;
};

function isTwoFactorChallenge(
  value:
    | { user: BackendAuthUser; success?: boolean }
    | {
        success: false;
        requiresTwoFactor: true;
        challengeId: string;
        expiresInSeconds: number;
        message?: string;
      },
): value is {
  success: false;
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message?: string;
} {
  return "requiresTwoFactor" in value && value.requiresTwoFactor === true;
}

function isMobileAuthSuccess(value: unknown): value is BackendMobileAuthResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<BackendMobileAuthResponse>;
  return (
    typeof maybe.access_token === "string" &&
    typeof maybe.refresh_token === "string" &&
    !!maybe.user &&
    typeof maybe.user === "object"
  );
}

function toMobileAuthTokens(raw: BackendMobileAuthResponse): MobileAuthTokens {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    user: adaptAuthUser(raw.user),
  };
}

function readOptionalToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return token.length > 0 ? token : null;
}

function requestMobile<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("X-Client", "mobile");
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return request<T>(path, {
    ...init,
    headers,
  });
}

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  const response = await request<
    | { user: BackendAuthUser; success?: boolean }
    | {
        success: false;
        requiresTwoFactor: true;
        challengeId: string;
        expiresInSeconds: number;
        message?: string;
      }
  >("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (isTwoFactorChallenge(response)) {
    return {
      success: false,
      requiresTwoFactor: true,
      challengeId: response.challengeId,
      expiresInSeconds: response.expiresInSeconds,
      message: response.message,
    };
  }

  return {
    success: true,
    user: adaptAuthUser(response.user),
  };
}

export async function verifyLoginTwoFactor(payload: {
  challengeId: string;
  code: string;
}): Promise<AuthUser> {
  const response = await request<{ user: BackendAuthUser; success?: boolean }>(
    "/auth/login/2fa",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return adaptAuthUser(response.user);
}

export async function loginForMobile(payload: {
  email: string;
  password: string;
}): Promise<MobileLoginResponse> {
  const response = await requestMobile<
    BackendMobileAuthResponse
    | {
        success: false;
        requiresTwoFactor: true;
        challengeId: string;
        expiresInSeconds: number;
        message?: string;
      }
  >("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (isTwoFactorChallenge(response)) {
    return {
      success: false,
      requiresTwoFactor: true,
      challengeId: response.challengeId,
      expiresInSeconds: response.expiresInSeconds,
      message: response.message,
    };
  }

  if (!isMobileAuthSuccess(response)) {
    throw new Error("No se recibieron tokens para login mobile.");
  }

  return {
    success: true,
    auth: toMobileAuthTokens(response),
  };
}

export async function verifyLoginTwoFactorForMobile(payload: {
  challengeId: string;
  code: string;
}): Promise<MobileAuthTokens> {
  const response = await requestMobile<BackendMobileAuthResponse>(
    "/auth/login/2fa",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!isMobileAuthSuccess(response)) {
    throw new Error("No se recibieron tokens al verificar 2FA en mobile.");
  }

  return toMobileAuthTokens(response);
}

export async function exchangeSessionForMobileAuth(): Promise<MobileAuthTokens | null> {
  try {
    const response = await requestMobile<BackendMobileSessionExchangeResponse>("/auth/refresh", {
      method: "POST",
    });

    const accessToken = readOptionalToken(response.access_token);
    // Some backends return only access_token on cookie-based refresh.
    // Use access token as temporary refresh fallback to unblock mobile handoff.
    const refreshToken = readOptionalToken(response.refresh_token) ?? accessToken;
    if (!accessToken) {
      return null;
    }

    const user =
      response.user && typeof response.user === "object"
        ? adaptAuthUser(response.user)
        : await fetchProfile();

    return {
      accessToken,
      refreshToken,
      user,
    };
  } catch {
    return null;
  }
}

export async function register(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country?: string;
  city?: string;
  turnstileToken: string;
}) {
  return request<{ success: boolean; needsVerification?: boolean; message?: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function fetchProfile(): Promise<AuthUser> {
  const response = await request<BackendAuthUser>("/auth/profile");
  return adaptAuthUser(response);
}

export async function logout() {
  await request("/auth/logout", { method: "POST" });
}

export const api = {
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
};

export function getApiBaseUrl(): string {
  return BASE_URL;
}
