type NormalizeResponseFn = <T>(payload: unknown) => T;

type ApiClientOptions = {
  baseUrl: string;
  credentials?: RequestCredentials;
  requestTimeoutMs?: number;
  retryOnUnauthorized?: boolean;
  refreshPath?: string;
  getCsrfToken?: () => string;
  normalizeResponse?: NormalizeResponseFn;
  onSessionExpired?: () => void;
  makeSessionExpiredError?: () => Error;
  fetchFn?: typeof fetch;
  extractErrorMessage?: (res: Response) => Promise<string>;
  defaultCache?: RequestCache;
};

function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : "/";
}

function withApiVersionPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (/^\/api(?:\/|$)/i.test(normalized)) return normalized;
  const prefix = normalized === "/" ? "" : normalized;
  return `${prefix}/api/v1`;
}

export function resolveApiBaseUrl(baseUrl: string) {
  const raw = baseUrl.trim();
  try {
    const parsed = new URL(raw);
    parsed.pathname = withApiVersionPath(parsed.pathname);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    const normalized = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    if (/\/api(?:\/|$)/i.test(normalized)) return normalized;
    return `${normalized}/api/v1`;
  }
}

function isMutatingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method);
}

function readCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]+)`),
  );
  const value = match?.[1];
  return value ? decodeURIComponent(value) : "";
}

function toHeadersRecord(input?: HeadersInit): Record<string, string> {
  if (!input) return {};
  if (input instanceof Headers) {
    return Object.fromEntries(input.entries());
  }
  if (Array.isArray(input)) {
    return Object.fromEntries(input);
  }
  return { ...input };
}

function findHeaderKey(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  return Object.keys(headers).find((key) => key.toLowerCase() === target);
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return findHeaderKey(headers, name) !== undefined;
}

function setHeader(
  headers: Record<string, string>,
  name: string,
  value: string,
): void {
  const existingKey = findHeaderKey(headers, name);
  if (existingKey) {
    headers[existingKey] = value;
    return;
  }
  headers[name] = value;
}

function normalizeJsonLike(payload: unknown): payload is { message?: unknown } {
  return Boolean(payload) && typeof payload === "object" && !Array.isArray(payload);
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

export async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as unknown;
    if (!normalizeJsonLike(body)) {
      return `HTTP ${res.status}`;
    }
    const rawMessage = body.message;
    if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
      return rawMessage;
    }
    if (Array.isArray(rawMessage)) {
      const joined = rawMessage.map((item) => String(item)).join(", ").trim();
      if (joined.length > 0) return joined;
    }
    if (
      rawMessage &&
      typeof rawMessage === "object" &&
      "message" in rawMessage &&
      typeof rawMessage.message === "string" &&
      rawMessage.message.trim().length > 0
    ) {
      return rawMessage.message;
    }
    return `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function normalizePaginatedPayload<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload as T;
  }

  const record = payload as {
    items?: unknown;
    pagination?: { page?: number; limit?: number; total?: number };
  };

  if (!Array.isArray(record.items) || !record.pagination) {
    return payload as T;
  }

  const page = Number(record.pagination.page ?? 1);
  const limit = Number(record.pagination.limit ?? 20);
  const total = Number(record.pagination.total ?? 0);

  return {
    ...(payload as Record<string, unknown>),
    data: record.items,
    total,
    page,
    pageSize: limit,
  } as T;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = resolveApiBaseUrl(options.baseUrl);
  const credentials = options.credentials ?? "include";
  const requestTimeoutMs = Math.max(1000, Math.floor(options.requestTimeoutMs ?? 12000));
  const retryOnUnauthorized = options.retryOnUnauthorized ?? false;
  const refreshPath = options.refreshPath ?? "/auth/refresh";
  const getCsrfToken = options.getCsrfToken ?? (() => readCookieValue("csrf_token"));
  const normalizeResponse = options.normalizeResponse;
  const onSessionExpired = options.onSessionExpired;
  const makeSessionExpiredError =
    options.makeSessionExpiredError ?? (() => new Error("Session expired"));
  const fetchFn = options.fetchFn ?? fetch;
  const parseError = options.extractErrorMessage ?? extractErrorMessage;
  const defaultCache = options.defaultCache ?? "no-store";

  const withAuthHeaders = (
    method: string,
    headers: Record<string, string>,
    contentTypeMode: "always" | "mutating",
  ) => {
    if (
      contentTypeMode === "always" ||
      (contentTypeMode === "mutating" && isMutatingMethod(method))
    ) {
      if (!hasHeader(headers, "Content-Type")) {
        setHeader(headers, "Content-Type", "application/json");
      }
    }
    if (isMutatingMethod(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) setHeader(headers, "x-csrf-token", csrfToken);
    }
  };

  const fetchOnce = async (
    path: string,
    init: RequestInit,
    contentTypeMode: "always" | "mutating",
  ) => {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = toHeadersRecord(init.headers);
    withAuthHeaders(method, headers, contentTypeMode);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
    const forwardAbort = () => controller.abort();
    if (init.signal) {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener("abort", forwardAbort, { once: true });
      }
    }

    try {
      return await fetchFn(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials,
        cache: init.cache ?? defaultCache,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error) && !init.signal?.aborted) {
        throw new Error("La solicitud tardó demasiado. Intenta nuevamente.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (init.signal) {
        init.signal.removeEventListener("abort", forwardAbort);
      }
    }
  };

  const fetchWithRefresh = async (
    path: string,
    init: RequestInit,
    contentTypeMode: "always" | "mutating",
  ) => {
    const first = await fetchOnce(path, init, contentTypeMode);
    if (!(retryOnUnauthorized && first.status === 401)) {
      return first;
    }

    const refreshed = await fetchOnce(
      refreshPath,
      {
        method: "POST",
      },
      "mutating",
    );
    if (!refreshed.ok) {
      onSessionExpired?.();
      throw makeSessionExpiredError();
    }

    return fetchOnce(path, init, contentTypeMode);
  };

  const parseJsonResponse = async <T>(res: Response): Promise<T> => {
    if (res.status === 204 || res.status === 205 || res.status === 304) {
      return undefined as T;
    }
    const raw = await res.text();
    if (raw.trim().length === 0) {
      return undefined as T;
    }
    const payload = JSON.parse(raw) as unknown;
    return normalizeResponse ? normalizeResponse<T>(payload) : (payload as T);
  };

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const res = await fetchWithRefresh(path, init, "mutating");
    if (!res.ok) throw new Error(await parseError(res));
    return parseJsonResponse<T>(res);
  };

  const requestRaw = async (
    path: string,
    init: RequestInit = {},
  ): Promise<Response> => {
    const res = await fetchWithRefresh(path, init, "mutating");
    if (!res.ok) throw new Error(await parseError(res));
    return res;
  };

  return {
    request,
    requestRaw,
    get: <T>(path: string) => request<T>(path, { method: "GET" }),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}
