const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = getCsrf();
    if (csrf) headers["x-csrf-token"] = csrf;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    // Try refresh once
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) {
      const res2 = await fetch(`${BASE}${path}`, { ...init, headers, credentials: "include" });
      if (!res2.ok) throw new Error(await extractError(res2));
      return res2.json() as Promise<T>;
    }
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("Session expired");
  }

  if (!res.ok) throw new Error(await extractError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export const api = {
  get:    <T>(path: string)                    => request<T>(path, { method: "GET" }),
  post:   <T>(path: string, body: unknown)     => request<T>(path, { method: "POST",  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)     => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string)                    => request<T>(path, { method: "DELETE" }),
};

// Auth helpers
export const auth = {
  login: (email: string, password: string) =>
    api.post<{ user: { role: string } }>("/auth/login", { email, password }),
  profile: () => api.get<{ userId: string; email: string; role: string; firstName?: string; lastName?: string }>("/auth/profile"),
  logout: () => api.post<void>("/auth/logout", {}),
};
