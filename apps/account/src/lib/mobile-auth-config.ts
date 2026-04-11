function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw || raw.trim().length === 0) return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

export function isMobileAuthProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function hasMobileAuthRedisConfig(): boolean {
  return (
    !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

export function shouldAllowMobileAuthInMemoryFallback(): boolean {
  const configured = process.env.MOBILE_AUTH_ALLOW_IN_MEMORY_REPLAY_FALLBACK?.trim();
  if (configured) return parseBoolean(configured, false);
  return !isMobileAuthProduction();
}

export function isMobileAuthDistributedStoreRequired(): boolean {
  const configured = process.env.MOBILE_AUTH_REQUIRE_DISTRIBUTED_STORE?.trim();
  if (configured) return parseBoolean(configured, false);
  return false;
}

let warnedInsecureMode = false;

export function warnIfMobileAuthSecurityModeIsDegraded(): void {
  if (warnedInsecureMode) return;
  if (!isMobileAuthProduction()) return;
  if (hasMobileAuthRedisConfig()) return;
  if (!shouldAllowMobileAuthInMemoryFallback()) return;

  warnedInsecureMode = true;
  console.warn(
    "mobile-auth: running with in-memory fallback in production (not distributed). Configure Upstash Redis and enable strict distributed mode.",
  );
}
