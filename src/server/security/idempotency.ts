const idempo = new Map<string, any>();

export function withIdempotency<T>(key: string, exec: () => Promise<T>): Promise<T> {
  if (idempo.has(key)) return idempo.get(key);
  const p = (async () => {
    try { return await exec(); } finally { /* keep result */ }
  })();
  idempo.set(key, p);
  return p;
}

