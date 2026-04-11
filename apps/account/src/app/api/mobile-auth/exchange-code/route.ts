import { NextResponse } from "next/server";
import {
  exchangeMobileAuthCode,
  isValidCodeVerifier,
  isValidMobileAuthState,
} from "@/lib/mobile-auth-code";
import { warnIfMobileAuthSecurityModeIsDegraded } from "@/lib/mobile-auth-config";
import {
  applyMobileAuthRateLimit,
  isRateLimitDegradedInProduction,
} from "@/lib/mobile-auth-rate-limit";

export const runtime = "nodejs";

function responseHeaders(rateLimit: Awaited<ReturnType<typeof applyMobileAuthRateLimit>>): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.retryAfterSeconds),
    "X-RateLimit-Source": rateLimit.source,
  });
  if (isRateLimitDegradedInProduction(rateLimit)) {
    headers.set("X-Mobile-Auth-Security-Mode", "degraded-memory-fallback");
  }
  return headers;
}

type ExchangeCodeBody = {
  auth_code?: unknown;
  code_verifier?: unknown;
  state?: unknown;
};

export async function POST(req: Request) {
  warnIfMobileAuthSecurityModeIsDegraded();
  const rateLimit = await applyMobileAuthRateLimit("exchange-code", req);
  const headers = responseHeaders(rateLimit);
  if (rateLimit.unavailable) {
    headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return NextResponse.json(
      { message: "El control de seguridad móvil no está disponible temporalmente." },
      { status: 503, headers },
    );
  }
  if (!rateLimit.allowed) {
    headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return NextResponse.json(
      { message: "Demasiados intentos. Intenta nuevamente en unos segundos." },
      { status: 429, headers },
    );
  }

  let body: ExchangeCodeBody;
  try {
    body = (await req.json()) as ExchangeCodeBody;
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400, headers });
  }

  const authCode =
    typeof body.auth_code === "string" ? body.auth_code.trim() : "";
  const codeVerifier =
    typeof body.code_verifier === "string" ? body.code_verifier.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";

  if (!authCode || !isValidCodeVerifier(codeVerifier) || !isValidMobileAuthState(state)) {
    return NextResponse.json(
      { message: "Faltan parámetros obligatorios para intercambio móvil." },
      { status: 400, headers },
    );
  }

  const exchanged = await exchangeMobileAuthCode({
    authCode,
    codeVerifier,
    state,
  });

  if (!exchanged) {
    return NextResponse.json(
      { message: "No se pudo validar el código de acceso móvil." },
      { status: 401, headers },
    );
  }

  return NextResponse.json(
    {
      access_token: exchanged.accessToken,
      refresh_token: exchanged.refreshToken,
      token_type: "Bearer",
    },
    { status: 200, headers },
  );
}
