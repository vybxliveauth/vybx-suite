import { Redis } from "@upstash/redis";
import {
  hasMobileAuthRedisConfig,
  isMobileAuthDistributedStoreRequired,
  shouldAllowMobileAuthInMemoryFallback,
} from "@/lib/mobile-auth-config";

const MEMORY_AUTH_CODES = new Map<string, { payload: string; exp: number }>();
const MOBILE_AUTH_CODE_KEY_PREFIX = "mobile-auth:code:";

let redisClient: Redis | null | undefined;

function encodeRedisPayload(payload: string): string {
  return Buffer.from(payload, "utf8").toString("base64url");
}

function decodeRedisPayload(raw: unknown): string | null {
  if (typeof raw === "string") {
    try {
      return Buffer.from(raw, "base64url").toString("utf8");
    } catch {
      return raw;
    }
  }
  if (raw && typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return null;
    }
  }
  return null;
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
  for (const [key, entry] of MEMORY_AUTH_CODES.entries()) {
    if (entry.exp <= nowSeconds) MEMORY_AUTH_CODES.delete(key);
  }
}

function storeInMemoryCode(codeId: string, payload: string, exp: number): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  cleanupInMemoryStore(nowSeconds);
  if (exp <= nowSeconds) return false;
  if (MEMORY_AUTH_CODES.has(codeId)) return false;

  MEMORY_AUTH_CODES.set(codeId, { payload, exp });
  return true;
}

function consumeInMemoryCode(codeId: string): string | null {
  const nowSeconds = Math.floor(Date.now() / 1000);
  cleanupInMemoryStore(nowSeconds);
  const entry = MEMORY_AUTH_CODES.get(codeId);
  if (!entry) return null;
  if (entry.exp <= nowSeconds) {
    MEMORY_AUTH_CODES.delete(codeId);
    return null;
  }

  MEMORY_AUTH_CODES.delete(codeId);
  return entry.payload;
}

async function storeInRedisCode(input: {
  codeId: string;
  payload: string;
  exp: number;
}): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = input.exp - nowSeconds;
  if (ttlSeconds <= 0) return false;

  const result = await redis.set(
    `${MOBILE_AUTH_CODE_KEY_PREFIX}${input.codeId}`,
    encodeRedisPayload(input.payload),
    { nx: true, ex: ttlSeconds },
  );

  return result === "OK";
}

async function consumeInRedisCode(codeId: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  const value = await redis.getdel<unknown>(
    `${MOBILE_AUTH_CODE_KEY_PREFIX}${codeId}`,
  );
  return decodeRedisPayload(value);
}

export async function isMobileAuthCodeStoreReady(): Promise<boolean> {
  if (hasMobileAuthRedisConfig()) {
    const redis = getRedisClient();
    if (!redis) return false;

    const probeKey = `${MOBILE_AUTH_CODE_KEY_PREFIX}probe:${Math.random().toString(36).slice(2, 10)}`;
    try {
      const result = await redis.set(probeKey, "1", { nx: true, ex: 15 });
      if (result !== "OK") return false;
      await redis.del(probeKey);
      return true;
    } catch (error) {
      console.error("mobile-auth: replay store probe failure", error);
      return false;
    }
  }

  if (isMobileAuthDistributedStoreRequired()) {
    return false;
  }

  return shouldAllowMobileAuthInMemoryFallback();
}

export async function storeMobileAuthCodePayload(input: {
  codeId: string;
  payload: string;
  exp: number;
}): Promise<boolean> {
  if (hasMobileAuthRedisConfig()) {
    try {
      const stored = await storeInRedisCode(input);
      if (stored) return true;
      if (
        isMobileAuthDistributedStoreRequired() ||
        !shouldAllowMobileAuthInMemoryFallback()
      ) {
        return false;
      }
      return storeInMemoryCode(input.codeId, input.payload, input.exp);
    } catch (error) {
      console.error("mobile-auth: code store failure", error);
      if (
        isMobileAuthDistributedStoreRequired() ||
        !shouldAllowMobileAuthInMemoryFallback()
      ) {
        return false;
      }
    }
  } else if (
    isMobileAuthDistributedStoreRequired() ||
    !shouldAllowMobileAuthInMemoryFallback()
  ) {
    return false;
  }

  return storeInMemoryCode(input.codeId, input.payload, input.exp);
}

export async function consumeMobileAuthCodePayload(codeId: string): Promise<string | null> {
  if (hasMobileAuthRedisConfig()) {
    try {
      const consumed = await consumeInRedisCode(codeId);
      if (typeof consumed === "string" && consumed.length > 0) {
        return consumed;
      }
      if (
        isMobileAuthDistributedStoreRequired() ||
        !shouldAllowMobileAuthInMemoryFallback()
      ) {
        return null;
      }
      return consumeInMemoryCode(codeId);
    } catch (error) {
      console.error("mobile-auth: code consume failure", error);
      if (
        isMobileAuthDistributedStoreRequired() ||
        !shouldAllowMobileAuthInMemoryFallback()
      ) {
        return null;
      }
    }
  } else if (
    isMobileAuthDistributedStoreRequired() ||
    !shouldAllowMobileAuthInMemoryFallback()
  ) {
    return null;
  }

  return consumeInMemoryCode(codeId);
}
