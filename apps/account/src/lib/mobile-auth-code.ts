import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  consumeMobileAuthCodePayload,
  storeMobileAuthCodePayload,
} from "@/lib/mobile-auth-replay-store";

const MOBILE_AUTH_CODE_TTL_SECONDS = 120;
const MOBILE_AUTH_CODE_LENGTH_BYTES = 32;

type MobileAuthCodePayload = {
  v: 1;
  exp: number;
  state: string;
  codeChallenge: string;
  accessToken: string;
  refreshToken: string;
};

function buildOpaqueCodeId(authCode: string): string {
  return createHash("sha256").update(authCode).digest("base64url");
}

export function isSupportedCodeChallengeMethod(method: string | null | undefined): boolean {
  return method === "S256";
}

export function isValidCodeChallenge(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

export function isValidCodeVerifier(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

export function isValidMobileAuthState(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[A-Za-z0-9._~-]{8,200}$/.test(value);
}

export function buildCodeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

function timingSafeEqualText(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function createMobileAuthCode(input: {
  state: string;
  codeChallenge: string;
  accessToken: string;
  refreshToken: string;
}): Promise<{ authCode: string; expiresIn: number }> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: MobileAuthCodePayload = {
    v: 1,
    exp: nowSeconds + MOBILE_AUTH_CODE_TTL_SECONDS,
    state: input.state,
    codeChallenge: input.codeChallenge,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  };

  const authCode = randomBytes(MOBILE_AUTH_CODE_LENGTH_BYTES).toString("base64url");
  const codeId = buildOpaqueCodeId(authCode);

  return storeMobileAuthCodePayload({
    codeId,
    payload: JSON.stringify(payload),
    exp: payload.exp,
  }).then((stored) => {
    if (!stored) {
      throw new Error("Mobile auth code store unavailable");
    }
    return {
      authCode,
      expiresIn: MOBILE_AUTH_CODE_TTL_SECONDS,
    };
  });
}

export async function exchangeMobileAuthCode(input: {
  authCode: string;
  codeVerifier: string;
  state: string;
}): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(input.authCode)) return null;
  if (!isValidCodeVerifier(input.codeVerifier)) return null;
  if (!isValidMobileAuthState(input.state)) return null;
  const codeId = buildOpaqueCodeId(input.authCode);
  const consumedPayload = await consumeMobileAuthCodePayload(codeId);
  if (!consumedPayload) return null;

  let payload: MobileAuthCodePayload;
  try {
    payload = JSON.parse(consumedPayload) as MobileAuthCodePayload;
  } catch {
    return null;
  }

  if (!payload || payload.v !== 1) return null;
  if (typeof payload.exp !== "number") return null;
  if (!isValidMobileAuthState(payload.state)) return null;
  if (!isValidCodeChallenge(payload.codeChallenge)) return null;
  if (typeof payload.accessToken !== "string" || payload.accessToken.length < 8) return null;
  if (typeof payload.refreshToken !== "string" || payload.refreshToken.length < 8) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) return null;
  if (!timingSafeEqualText(payload.state, input.state)) return null;

  const computedChallenge = buildCodeChallengeS256(input.codeVerifier);
  if (!timingSafeEqualText(computedChallenge, payload.codeChallenge)) return null;

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}
