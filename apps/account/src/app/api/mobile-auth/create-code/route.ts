import { NextResponse } from "next/server";
import {
  createMobileAuthCode,
  isValidMobileAuthState,
  isSupportedCodeChallengeMethod,
  isValidCodeChallenge,
} from "@/lib/mobile-auth-code";
import { isMobileAuthCodeStoreReady } from "@/lib/mobile-auth-replay-store";
import { applyMobileAuthRateLimit } from "@/lib/mobile-auth-rate-limit";

export const runtime = "nodejs";
const MAX_TOKEN_LENGTH = 4096;

function responseHeaders(rateLimit: Awaited<ReturnType<typeof applyMobileAuthRateLimit>>): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.retryAfterSeconds),
    "X-RateLimit-Source": rateLimit.source,
  });
  return headers;
}

type CreateCodeBody = {
  access_token?: unknown;
  refresh_token?: unknown;
  state?: unknown;
  code_challenge?: unknown;
  code_challenge_method?: unknown;
};

export async function POST(req: Request) {
  const rateLimit = await applyMobileAuthRateLimit("create-code", req);
  const headers = responseHeaders(rateLimit);
  if (!rateLimit.allowed) {
    headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return NextResponse.json(
      { message: "Demasiados intentos. Intenta nuevamente en unos segundos." },
      { status: 429, headers },
    );
  }

  let body: CreateCodeBody;
  try {
    body = (await req.json()) as CreateCodeBody;
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400, headers });
  }

  const accessToken =
    typeof body.access_token === "string" ? body.access_token.trim() : "";
  const refreshToken =
    typeof body.refresh_token === "string" ? body.refresh_token.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";
  const codeChallenge =
    typeof body.code_challenge === "string" ? body.code_challenge.trim() : "";
  const codeChallengeMethod =
    typeof body.code_challenge_method === "string"
      ? body.code_challenge_method.trim()
      : "";

  if (
    !accessToken ||
    !refreshToken ||
    !isValidMobileAuthState(state) ||
    accessToken.length > MAX_TOKEN_LENGTH ||
    refreshToken.length > MAX_TOKEN_LENGTH
  ) {
    return NextResponse.json(
      { message: "Faltan parámetros obligatorios para el handoff móvil." },
      { status: 400, headers },
    );
  }

  if (
    !isSupportedCodeChallengeMethod(codeChallengeMethod) ||
    !isValidCodeChallenge(codeChallenge)
  ) {
    return NextResponse.json(
      { message: "PKCE inválido para handoff móvil." },
      { status: 400, headers },
    );
  }

  const replayStoreReady = await isMobileAuthCodeStoreReady();
  if (!replayStoreReady) {
    return NextResponse.json(
      { message: "El puente móvil seguro no está disponible temporalmente. Intenta nuevamente." },
      { status: 503, headers },
    );
  }

  try {
    const handoff = await createMobileAuthCode({
      state,
      codeChallenge,
      accessToken,
      refreshToken,
    });

    return NextResponse.json(
      {
        auth_code: handoff.authCode,
        expires_in: handoff.expiresIn,
        token_type: "mobile_handoff_code",
      },
      { status: 200, headers },
    );
  } catch {
    return NextResponse.json(
      { message: "No pudimos preparar el acceso móvil seguro." },
      { status: 503, headers },
    );
  }
}
