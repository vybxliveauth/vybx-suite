const TEST_TOKEN_ENV = process.env.NEXT_PUBLIC_TURNSTILE_TEST_TOKEN?.trim() ?? "";
const NODE_ENV = process.env.NODE_ENV;

type TurnstileTokenMap = Record<string, string>;

type TurnstileWindow = typeof window & {
  __vybxTurnstileTokens?: TurnstileTokenMap;
  __vybxTurnstileToken?: string;
};

function getWindow(): TurnstileWindow | null {
  if (typeof window === "undefined") return null;
  return window as TurnstileWindow;
}

function readRuntimeToken(action: string): string | null {
  const clientWindow = getWindow();
  if (!clientWindow) return null;

  const byAction = clientWindow.__vybxTurnstileTokens?.[action];
  if (typeof byAction === "string" && byAction.trim().length > 0) {
    return byAction.trim();
  }

  if (
    typeof clientWindow.__vybxTurnstileToken === "string" &&
    clientWindow.__vybxTurnstileToken.trim().length > 0
  ) {
    return clientWindow.__vybxTurnstileToken.trim();
  }

  return null;
}

export function setClientTurnstileToken(action: string, token: string | null): void {
  const clientWindow = getWindow();
  if (!clientWindow) return;

  const current = clientWindow.__vybxTurnstileTokens ?? {};

  if (typeof token === "string" && token.trim().length > 0) {
    current[action] = token.trim();
    clientWindow.__vybxTurnstileToken = token.trim();
  } else {
    delete current[action];
    if (clientWindow.__vybxTurnstileToken) {
      clientWindow.__vybxTurnstileToken = "";
    }
  }

  clientWindow.__vybxTurnstileTokens = current;
}

export function getClientTurnstileToken(action = "default"): string {
  const runtimeToken = readRuntimeToken(action);
  if (runtimeToken) {
    return runtimeToken;
  }

  if (NODE_ENV === "production") {
    throw new Error(
      "Verificacion anti-bot no disponible. Configura el widget real de Turnstile en el cliente.",
    );
  }

  if (TEST_TOKEN_ENV.length === 0) {
    throw new Error(
      "Turnstile no configurado en desarrollo. Define NEXT_PUBLIC_TURNSTILE_TEST_TOKEN.",
    );
  }

  return TEST_TOKEN_ENV;
}
