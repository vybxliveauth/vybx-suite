import { Redis } from "@upstash/redis";

const MEMORY_CONSUMED_CODES = new Map<string, number>();
const MOBILE_AUTH_REPLAY_KEY_PREFIX = "mobile-auth:consumed-code:";

let redisClient: Redis | null | undefined;

function shouldAllowInMemoryFallback(): boolean {
  const configured = process.env.MOBILE_AUTH_ALLOW_IN_MEMORY_REPLAY_FALLBACK?.trim();
  if (configured) {
    return /^(1|true|yes|on)$/i.test(configured);
  }

  return process.env.NODE_ENV !== "production";
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function cleanupInMemoryStore(nowSeconds: number): void {
  for (const [key, exp] of MEMORY_CONSUMED_CODES.entries()) {
    if (exp <= nowSeconds) MEMORY_CONSUMED_CODES.delete(key);
  }
}

function consumeInMemoryOnce(jti: string, exp: number): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  cleanupInMemoryStore(nowSeconds);
  if (exp <= nowSeconds) return false;
  if (MEMORY_CONSUMED_CODES.has(jti)) return false;

  MEMORY_CONSUMED_CODES.set(jti, exp);
  return true;
}

async function consumeInRedisOnce(jti: string, exp: number): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = exp - nowSeconds;
  if (ttlSeconds <= 0) return false;

  const result = await redis.set(
    `${MOBILE_AUTH_REPLAY_KEY_PREFIX}${jti}`,
    "1",
    { nx: true, ex: ttlSeconds },
  );

  return result === "OK";
}

export async function consumeMobileAuthCodeJti(input: {
  jti: string;
  exp: number;
}): Promise<boolean> {
  const hasRedisConfig =
    !!process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (hasRedisConfig) {
    try {
      return await consumeInRedisOnce(input.jti, input.exp);
    } catch (error) {
      console.error("mobile-auth: replay store failure", error);
      if (!shouldAllowInMemoryFallback()) return false;
    }
  } else if (!shouldAllowInMemoryFallback()) {
    return false;
  }

  return consumeInMemoryOnce(input.jti, input.exp);
}
