import { resolveApiBaseUrl } from "@vybx/api-client";

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1",
);

export type EmailIntent = "login" | "register";
export type EmailIntentLookupStatus = "resolved" | "unavailable" | "unknown";
export type EmailIntentLookupResult = {
  status: EmailIntentLookupStatus;
  intent: EmailIntent | null;
};

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readBooleanKey(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    if (typeof record[key] === "boolean") return record[key] as boolean;
  }
  return null;
}

function readStringKey(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key].trim().length > 0) {
      return record[key] as string;
    }
  }
  return null;
}

export function getErrorMessage(payload: unknown, fallback: string): string {
  const record = toRecord(payload);
  if (!record) return fallback;
  const message = record.message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  if (Array.isArray(message) && message.length > 0) {
    return message.map((item) => String(item)).join(", ");
  }
  return fallback;
}

export function getCsrfTokenFromCookie(): string {
  return document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? "";
}

function parseEmailIntentFromPayload(payload: unknown): EmailIntent | null {
  const data = toRecord(payload);
  if (!data) return null;

  const exists = readBooleanKey(data, [
    "exists",
    "registered",
    "hasAccount",
    "userExists",
    "emailExists",
    "isRegistered",
  ]);
  if (typeof exists === "boolean") return exists ? "login" : "register";

  const needsPassword = readBooleanKey(data, ["needsPassword", "requirePassword"]);
  if (needsPassword === true) return "login";

  const needsRegistration = readBooleanKey(data, ["needsRegistration", "requiresSignup"]);
  if (needsRegistration === true) return "register";

  const intentValue = readStringKey(data, ["intent", "action", "nextStep", "flow", "mode"]);
  const normalized = intentValue?.toLowerCase() ?? "";
  if (
    normalized.includes("register") ||
    normalized.includes("signup") ||
    normalized.includes("sign-up") ||
    normalized.includes("create")
  ) {
    return "register";
  }
  if (
    normalized.includes("login") ||
    normalized.includes("signin") ||
    normalized.includes("sign-in") ||
    normalized.includes("password")
  ) {
    return "login";
  }

  return null;
}

export async function lookupEmailIntent(email: string): Promise<EmailIntentLookupResult> {
  const encoded = encodeURIComponent(email);

  const res = await fetch(`${API_BASE_URL}/auth/email-intent?email=${encoded}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (res.status === 404) {
    return { status: "unavailable", intent: null };
  }

  if (res.status === 409) {
    return { status: "resolved", intent: "login" };
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(getErrorMessage(payload, "No pudimos validar el correo ahora mismo."));
  }

  const parsedIntent = parseEmailIntentFromPayload(payload);
  if (parsedIntent) {
    return { status: "resolved", intent: parsedIntent };
  }

  return { status: "unknown", intent: null };
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function encodeBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildPublicKeyCreationOptions(payload: unknown): PublicKeyCredentialCreationOptions | null {
  const raw = toRecord(payload);
  if (!raw) return null;
  const source = toRecord(raw.publicKey ?? raw.creationOptions ?? raw.options ?? raw);
  if (!source || typeof source.challenge !== "string") return null;

  const rp = toRecord(source.rp);
  if (!rp || typeof rp.name !== "string") return null;

  const userRaw = toRecord(source.user);
  if (!userRaw || typeof userRaw.name !== "string" || typeof userRaw.id !== "string") return null;

  const pubKeyCredParams: PublicKeyCredentialParameters[] = Array.isArray(source.pubKeyCredParams)
    ? (source.pubKeyCredParams as unknown[]).flatMap((p) => {
        const entry = toRecord(p);
        if (!entry || typeof entry.alg !== "number" || entry.type !== "public-key") return [];
        return [{ type: "public-key" as const, alg: entry.alg }];
      })
    : [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }];

  const excludeCredentials: PublicKeyCredentialDescriptor[] = Array.isArray(source.excludeCredentials)
    ? (source.excludeCredentials as unknown[]).flatMap((item) => {
        const cred = toRecord(item);
        if (!cred || typeof cred.id !== "string") return [];
        return [{ type: "public-key" as const, id: decodeBase64Url(cred.id) }];
      })
    : [];

  const authSelRaw = toRecord(source.authenticatorSelection);

  return {
    challenge: decodeBase64Url(source.challenge),
    rp: { name: rp.name, id: typeof rp.id === "string" ? rp.id : undefined },
    user: {
      id: decodeBase64Url(userRaw.id),
      name: userRaw.name as string,
      displayName: typeof userRaw.displayName === "string" ? userRaw.displayName : (userRaw.name as string),
    },
    pubKeyCredParams,
    timeout: typeof source.timeout === "number" ? source.timeout : 60000,
    attestation: (source.attestation as AttestationConveyancePreference) ?? "none",
    excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
    authenticatorSelection: authSelRaw
      ? {
          residentKey: (authSelRaw.residentKey as ResidentKeyRequirement) ?? "preferred",
          userVerification: (authSelRaw.userVerification as UserVerificationRequirement) ?? "preferred",
        }
      : undefined,
  };
}

export function serializeAttestationCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  const transports =
    typeof response.getTransports === "function" ? response.getTransports() : [];
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: encodeBase64Url(response.attestationObject),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      transports,
    },
  };
}

export function buildPublicKeyRequestOptions(payload: unknown): PublicKeyCredentialRequestOptions | null {
  const raw = toRecord(payload);
  if (!raw) return null;
  const source = toRecord(raw.publicKey ?? raw.requestOptions ?? raw.options ?? raw);
  if (!source || typeof source.challenge !== "string") return null;

  const allowCredentialsRaw = Array.isArray(source.allowCredentials)
    ? source.allowCredentials
    : [];

  const validTransports: AuthenticatorTransport[] = [
    "ble",
    "hybrid",
    "internal",
    "nfc",
    "usb",
  ];
  const allowCredentials: PublicKeyCredentialDescriptor[] = [];
  allowCredentialsRaw.forEach((item) => {
    const cred = toRecord(item);
    if (!cred || typeof cred.id !== "string") return;
    const transportList = Array.isArray(cred.transports)
      ? cred.transports.filter(
          (value): value is AuthenticatorTransport =>
            typeof value === "string" && validTransports.includes(value as AuthenticatorTransport),
        )
      : undefined;
    allowCredentials.push({
      type: "public-key",
      id: decodeBase64Url(cred.id),
      transports: transportList,
    });
  });

  const options: PublicKeyCredentialRequestOptions = {
    challenge: decodeBase64Url(source.challenge),
    timeout: typeof source.timeout === "number" ? source.timeout : undefined,
    rpId: typeof source.rpId === "string" ? source.rpId : undefined,
    userVerification:
      source.userVerification === "required" ||
      source.userVerification === "preferred" ||
      source.userVerification === "discouraged"
        ? source.userVerification
        : "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  };

  return options;
}

export function serializeAssertionCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      ...(response.userHandle ? { userHandle: encodeBase64Url(response.userHandle) } : {}),
    },
  };
}
