import { createHash } from 'crypto';

type CacheEntry<T> = {
  promise: Promise<T>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60_000; // 1 minute is enough to cover transient retries without leaking forever

const idempo = new Map<string, CacheEntry<any>>();

export function withIdempotency<T>(key: string, exec: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  const now = Date.now();
  const existing = idempo.get(key);

  if (existing) {
    if (now < existing.expiresAt) {
      return existing.promise;
    }

    if (idempo.get(key) === existing) {
      idempo.delete(key);
    }
  }

  const ttl = Number.isFinite(ttlMs) ? Math.max(ttlMs, 0) : DEFAULT_TTL_MS;

  const entry: CacheEntry<T> = {
    expiresAt: now + ttl,
    promise: Promise.resolve()
      .then(exec)
      .then(
        result => {
          const delay = Math.max(entry.expiresAt - Date.now(), 0);
          setTimeout(() => {
            if (idempo.get(key) === entry) {
              idempo.delete(key);
            }
          }, delay);
          return result;
        },
        error => {
          idempo.delete(key);
          throw error;
        }
      )
  };

  idempo.set(key, entry);
  return entry.promise;
}

export function createIdempotencyKey(prefix: string, payload: unknown): string {
  const digest = createHash('sha256').update(stableStringify(payload)).digest('hex');
  return `${prefix}:${digest}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (value instanceof Set) {
    return stableStringify(Array.from(value.values()));
  }

  if (value instanceof Map) {
    return stableStringify(Array.from(value.entries()));
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);

  return `{${entries.join(',')}}`;
}

