import { NextResponse } from "next/server";
import { exchangeMobileAuthCode } from "@/lib/mobile-auth-code";

export const runtime = "nodejs";

type ExchangeCodeBody = {
  auth_code?: unknown;
  code_verifier?: unknown;
  state?: unknown;
};

export async function POST(req: Request) {
  let body: ExchangeCodeBody;
  try {
    body = (await req.json()) as ExchangeCodeBody;
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
  }

  const authCode =
    typeof body.auth_code === "string" ? body.auth_code.trim() : "";
  const codeVerifier =
    typeof body.code_verifier === "string" ? body.code_verifier.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";

  if (!authCode || !codeVerifier || !state) {
    return NextResponse.json(
      { message: "Faltan parámetros obligatorios para intercambio móvil." },
      { status: 400 },
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
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      access_token: exchanged.accessToken,
      refresh_token: exchanged.refreshToken,
      token_type: "Bearer",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    },
  );
}
