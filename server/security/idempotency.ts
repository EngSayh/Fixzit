import { createHash } from "crypto";

type CacheEntry<T> = {
  promise: Promise<T>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60_000;
const idempo = new Map<string, CacheEntry<unknown>>();

export function withIdempotency<T>(
  key: string,
  exec: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const found = idempo.get(key);
  if (found && now < found.expiresAt) {
    return found.promise as Promise<T>;
  }
  if (found) idempo.delete(key);

  const ttl = Number.isFinite(ttlMs) ? Math.max(0, ttlMs) : DEFAULT_TTL_MS;

  const entry: CacheEntry<T> = {
    expiresAt: now + ttl,
    promise: Promise.resolve()
      .then(exec)
      .then(
        (result) => {
          const delay = Math.max(0, entry.expiresAt - Date.now());
          setTimeout(() => {
            if (idempo.get(key) === entry) idempo.delete(key);
          }, delay);
          return result;
        },
        (error) => {
          idempo.delete(key);
          throw error;
        },
      ),
  };

  idempo.set(key, entry);
  return entry.promise;
}

export function createIdempotencyKey(prefix: string, payload: unknown): string {
  const digest = createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
  return `${prefix}:${digest}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
