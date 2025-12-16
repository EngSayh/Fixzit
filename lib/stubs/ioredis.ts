type StoredValue = { value: string; expiresAt: number | null };

function now(): number {
  return Date.now();
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

class RedisMulti {
  private ops: Array<() => Promise<unknown>> = [];

  constructor(private client: Redis) {}

  incr(key: string): this {
    this.ops.push(() => this.client.incr(key));
    return this;
  }

  expire(key: string, seconds: number, _mode?: string): this {
    this.ops.push(() => this.client.expire(key, seconds));
    return this;
  }

  ttl(key: string): this {
    this.ops.push(() => this.client.ttl(key));
    return this;
  }

  async exec(): Promise<Array<[null, unknown]>> {
    const results: Array<[null, unknown]> = [];
    for (const op of this.ops) {
      results.push([null, await op()]);
    }
    return results;
  }
}

export default class Redis {
  status: string = "ready";

  private store = new Map<string, StoredValue>();
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  // Accept any constructor signature to remain drop-in compatible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_url?: any, _options?: any) {}

  private cleanup(key: string): StoredValue | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  private setExpiry(key: string, ttlMs: number): void {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = now() + ttlMs;
    this.store.set(key, entry);
  }

  // Basic event emitter helpers to satisfy consumer calls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): this {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event, handlers);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(event: string, handler: (...args: any[]) => void): this {
    const onceHandler = (...args: unknown[]) => {
      this.off(event, onceHandler);
      handler(...args);
    };
    return this.on(event, onceHandler);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, handler: (...args: any[]) => void): this {
    const handlers = this.listeners.get(event);
    handlers?.delete(handler);
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    handlers?.forEach((handler) => handler(...args));
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  async connect(): Promise<void> {
    this.status = "ready";
    this.emit("connect");
    this.emit("ready");
  }

  async quit(): Promise<string> {
    this.status = "ended";
    this.emit("end");
    return "OK";
  }

  disconnect(): void {
    this.status = "disconnected";
    this.emit("close");
  }

  async ping(): Promise<string> {
    return "PONG";
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cleanup(key);
    return entry ? entry.value : null;
  }

  async set(key: string, value: unknown, mode?: string, ttlSeconds?: number): Promise<string> {
    const expiresAt =
      mode === "EX" && typeof ttlSeconds === "number"
        ? now() + ttlSeconds * 1000
        : null;
    this.store.set(key, { value: String(value), expiresAt });
    return "OK";
  }

  async setex(key: string, ttlSeconds: number, value: unknown): Promise<string> {
    await this.set(key, value);
    this.setExpiry(key, ttlSeconds * 1000);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed++;
    }
    return removed;
  }

  async exists(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.cleanup(key)) count++;
    }
    return count;
  }

  async mget(...keys: string[]): Promise<Array<string | null>> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.setExpiry(key, seconds * 1000);
    return 1;
  }

  async pexpire(key: string, ms: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.setExpiry(key, ms);
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cleanup(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    const remainingMs = entry.expiresAt - now();
    if (remainingMs <= 0) return -2;
    return Math.ceil(remainingMs / 1000);
  }

  async pttl(key: string): Promise<number> {
    const entry = this.cleanup(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, entry.expiresAt - now());
  }

  async incr(key: string): Promise<number> {
    const current = Number((await this.get(key)) ?? "0");
    const next = current + 1;
    await this.set(key, next.toString());
    return next;
  }

  async incrbyfloat(key: string, amount: number): Promise<number> {
    const current = Number((await this.get(key)) ?? "0");
    const next = current + amount;
    await this.set(key, next.toString());
    return next;
  }

  multi(): RedisMulti {
    return new RedisMulti(this);
  }

  // Lua eval stub tailored for the existing budget script pattern
  async eval(_script: string, _numKeys: number, key: string, amount?: string, budget?: string, ttlSeconds?: string): Promise<number> {
    const amountNum = Number(amount ?? 0);
    const budgetNum = Number(budget ?? 0);
    const current = Number((await this.get(key)) ?? "0");
    if (current + amountNum <= budgetNum) {
      const ttl = Number(ttlSeconds ?? "0");
      if (ttl > 0) {
        await this.setex(key, ttl, (current + amountNum).toString());
      } else {
        await this.set(key, (current + amountNum).toString());
      }
      return 1;
    }
    return 0;
  }

  // Basic SCAN stream implementation for cache invalidation helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scanStream(options: { match?: string; count?: number } = {}): AsyncIterable<any> {
    const regex = options.match ? wildcardToRegExp(options.match) : /.*/;
    const keys = Array.from(this.store.keys()).filter((key) => regex.test(key) && this.cleanup(key));
    async function* iterator(): AsyncGenerator<string[]> {
      if (keys.length > 0) {
        yield keys;
      }
    }
    return iterator();
  }
}
