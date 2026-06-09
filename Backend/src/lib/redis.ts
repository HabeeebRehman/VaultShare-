import Redis from "ioredis";
import { config } from "./config.js";

export const redis = new Redis(config.redisUrl, {
  // Keep the app resilient if Redis is briefly unavailable.
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});

redis.on("connect", () => {
  console.log("[redis] connected");
});

const SECRET_PREFIX = "secret:";

/**
 * Store a secret payload (ciphertext only — never plaintext) with a TTL.
 * The TTL is the self-destruct timer; Redis evicts the key automatically.
 */
export async function storeSecret(
  id: string,
  payload: string,
  ttlSeconds: number
): Promise<void> {
  await redis.set(SECRET_PREFIX + id, payload, "EX", ttlSeconds);
}

/**
 * Atomically fetch and delete a secret (one-time read / burn-after-read).
 * GETDEL guarantees the secret can only ever be retrieved once.
 */
export async function consumeSecret(id: string): Promise<string | null> {
  return redis.getdel(SECRET_PREFIX + id);
}

/** Peek without deleting — used to check existence/status without burning it. */
export async function secretExists(id: string): Promise<boolean> {
  const exists = await redis.exists(SECRET_PREFIX + id);
  return exists === 1;
}
