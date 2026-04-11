import { createHash } from "crypto";
import { Redis } from "@upstash/redis";
import {
  isMobileAuthDistributedStoreRequired,
  isMobileAuthProduction,
  shouldAllowMobileAuthInMemoryFallback,
} from "@/lib/mobile-auth-config";

const MOBILE_AUTH_RATE_LIMIT_KEY_PREFIX = "mobile-auth:rate-limit:";
const MEMORY_COUNTERS = new Map<string, { count: number; resetAtMs: number }>();

let redisClient: Redis | null | undefined;

type MobileAuthRateLimitAction = "create-code" | "exchange-code";

export type MobileAuthRateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  source: "redis" | "memory" | "disabled" | "unavailable";
  unavailable: boolean;
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getActionConfig(action: MobileAuthRateLimitAction): {
  max: number;
  windowSeconds: number;
} {
  if (action === "create-code") {
    return {
      max: parsePositiveInt(process.env.MOBILE_AUTH_CREATE_RATE_LIMIT_MAX, 20),
      windowSeconds: parsePositiveInt(
        process.env.MOBILE_AUTH_CREATE_RATE_LIMIT_WINDOW_SECONDS,
        60,
      ),
    };
  }

  return {
    max: parsePositiveInt(process.env.MOBILE_AUTH_EXCHANGE_RATE_LIMIT_MAX, 40),
    windowSeconds: parsePositiveInt(
      process.env.MOBILE_AUTH_EXCHANGE_RATE_LIMIT_WINDOW_SECONDS,
      60,
    ),
  };
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function getUserAgentFingerprint(req: Request): string {
  const userAgent = req.headers.get("user-agent")?.trim().toLowerCase() ?? "";
  if (!userAgent) return "none";
  return createHash("sha256").update(userAgent).digest("base64url").slice(0, 16);
}

function buildRateLimitKey(action: MobileAuthRateLimitAction, req: Request): string {
  const ip = getClientIp(req);
  const ua = getUserAgentFingerprint(req);
  return `${MOBILE_AUTH_RATE_LIMIT_KEY_PREFIX}${action}:${ip}:${ua}`;
}

function cleanupInMemoryCounters(nowMs: number): void {
  for (const [key, value] of MEMORY_COUNTERS.entries()) {
    if (value.resetAtMs <= nowMs) {
      MEMORY_COUNTERS.delete(key);
    }
  }
}

function consumeInMemoryWindow(
  key: string,
  max: number,
  windowSeconds: number,
): MobileAuthRateLimitDecision {
  const nowMs = Date.now();
  cleanupInMemoryCounters(nowMs);
  const windowMs = windowSeconds * 1000;
  const current = MEMORY_COUNTERS.get(key);

  if (!current || current.resetAtMs <= nowMs) {
    MEMORY_COUNTERS.set(key, { count: 1, resetAtMs: nowMs + windowMs });
    return {
      allowed: true,
      limit: max,
      remaining: Math.max(0, max - 1),
      retryAfterSeconds: windowSeconds,
      source: "memory",
      unavailable: false,
    };
  }

  current.count += 1;
  MEMORY_COUNTERS.set(key, current);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((current.resetAtMs - nowMs) / 1000),
  );
  return {
    allowed: current.count <= max,
    limit: max,
    remaining: Math.max(0, max - current.count),
    retryAfterSeconds,
    source: "memory",
    unavailable: false,
  };
}

async function consumeRedisWindow(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<MobileAuthRateLimitDecision> {
  const redis = getRedisClient();
  if (!redis) {
    return {
      allowed: true,
      limit: max,
      remaining: max,
      retryAfterSeconds: windowSeconds,
      source: "disabled",
      unavailable: false,
    };
  }

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  const ttl = await redis.ttl(key);
  const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

  return {
    allowed: count <= max,
    limit: max,
    remaining: Math.max(0, max - count),
    retryAfterSeconds,
    source: "redis",
    unavailable: false,
  };
}

export async function applyMobileAuthRateLimit(
  action: MobileAuthRateLimitAction,
  req: Request,
): Promise<MobileAuthRateLimitDecision> {
  const config = getActionConfig(action);
  const key = buildRateLimitKey(action, req);
  const requireDistributedStore = isMobileAuthDistributedStoreRequired();
  const allowFallback = shouldAllowMobileAuthInMemoryFallback();

  try {
    const redis = getRedisClient();
    if (redis) {
      return await consumeRedisWindow(key, config.max, config.windowSeconds);
    }
  } catch {
    if (requireDistributedStore) {
      return {
        allowed: false,
        limit: config.max,
        remaining: 0,
        retryAfterSeconds: config.windowSeconds,
        source: "unavailable",
        unavailable: true,
      };
    }
    if (!allowFallback) {
      return {
        allowed: true,
        limit: config.max,
        remaining: config.max,
        retryAfterSeconds: config.windowSeconds,
        source: "disabled",
        unavailable: false,
      };
    }
  }

  if (requireDistributedStore) {
    return {
      allowed: false,
      limit: config.max,
      remaining: 0,
      retryAfterSeconds: config.windowSeconds,
      source: "unavailable",
      unavailable: true,
    };
  }

  if (!allowFallback) {
    return {
      allowed: true,
      limit: config.max,
      remaining: config.max,
      retryAfterSeconds: config.windowSeconds,
      source: "disabled",
      unavailable: false,
    };
  }

  return consumeInMemoryWindow(key, config.max, config.windowSeconds);
}

export function isRateLimitDegradedInProduction(decision: MobileAuthRateLimitDecision): boolean {
  return isMobileAuthProduction() && decision.source === "memory";
}
