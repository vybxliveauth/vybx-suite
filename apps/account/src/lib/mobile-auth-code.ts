import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { consumeMobileAuthCodeJti } from "@/lib/mobile-auth-replay-store";

const MOBILE_AUTH_CODE_TTL_SECONDS = 120;
const TOKEN_SEPARATOR = ".";

type MobileAuthCodePayload = {
  v: 1;
  jti: string;
  iat: number;
  exp: number;
  state: string;
  codeChallenge: string;
  accessToken: string;
  refreshToken: string;
};

function toBase64Url(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function isSafeTokenPart(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function getMobileAuthCodeSecret(): string | null {
  const fromDedicated = process.env.MOBILE_AUTH_CODE_SECRET?.trim();
  if (fromDedicated) return fromDedicated;

  const fromNextAuth = process.env.NEXTAUTH_SECRET?.trim();
  if (fromNextAuth) return fromNextAuth;

  return null;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function isSupportedCodeChallengeMethod(method: string | null | undefined): boolean {
  return method === "S256";
}

export function isValidCodeChallenge(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

export function buildCodeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createMobileAuthCode(input: {
  state: string;
  codeChallenge: string;
  accessToken: string;
  refreshToken: string;
}): { authCode: string; expiresIn: number } {
  const secret = getMobileAuthCodeSecret();
  if (!secret) {
    throw new Error("Missing MOBILE_AUTH_CODE_SECRET/NEXTAUTH_SECRET");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: MobileAuthCodePayload = {
    v: 1,
    jti: randomBytes(16).toString("hex"),
    iat: nowSeconds,
    exp: nowSeconds + MOBILE_AUTH_CODE_TTL_SECONDS,
    state: input.state,
    codeChallenge: input.codeChallenge,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);

  return {
    authCode: `${encodedPayload}${TOKEN_SEPARATOR}${signature}`,
    expiresIn: MOBILE_AUTH_CODE_TTL_SECONDS,
  };
}

export async function exchangeMobileAuthCode(input: {
  authCode: string;
  codeVerifier: string;
  state: string;
}): Promise<{ accessToken: string; refreshToken: string } | null> {
  const secret = getMobileAuthCodeSecret();
  if (!secret) return null;

  const [encodedPayload, signature] = input.authCode.split(TOKEN_SEPARATOR);
  if (!encodedPayload || !signature) return null;
  if (!isSafeTokenPart(encodedPayload) || !isSafeTokenPart(signature)) return null;

  const expectedSignature = sign(encodedPayload, secret);
  if (expectedSignature.length !== signature.length) return null;

  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(signature);
  if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null;

  let payload: MobileAuthCodePayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as MobileAuthCodePayload;
  } catch {
    return null;
  }

  if (!payload || payload.v !== 1) return null;
  if (typeof payload.jti !== "string" || payload.jti.length < 8) return null;
  if (typeof payload.exp !== "number" || typeof payload.iat !== "number") return null;
  if (typeof payload.state !== "string" || payload.state.length < 4) return null;
  if (!isValidCodeChallenge(payload.codeChallenge)) return null;
  if (typeof payload.accessToken !== "string" || payload.accessToken.length < 8) return null;
  if (typeof payload.refreshToken !== "string" || payload.refreshToken.length < 8) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) return null;
  if (payload.state !== input.state) return null;

  const computedChallenge = buildCodeChallengeS256(input.codeVerifier);
  if (computedChallenge !== payload.codeChallenge) return null;

  const wasConsumedNow = await consumeMobileAuthCodeJti({
    jti: payload.jti,
    exp: payload.exp,
  });
  if (!wasConsumedNow) return null;

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}
