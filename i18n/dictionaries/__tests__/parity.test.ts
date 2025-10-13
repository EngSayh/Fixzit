// Parity test to catch accidental drastic drops in en.ts keys
// Ensures English and Arabic dictionaries remain roughly in sync by leaf count

type Dict = Record<string, unknown>;

async function loadDict(lang: 'en' | 'ar'): Promise<Dict> {
  const mod = await import(`../${lang}`);
  return (mod as any).default ?? mod;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function countLeaves(obj: Record<string, unknown>): number {
  let count = 0;
  const stack: Array<Record<string, unknown>> = [obj];
  while (stack.length) {
    const current = stack.pop()!;
    for (const value of Object.values(current)) {
      if (isPlainObject(value)) {
        stack.push(value);
      } else {
        count += 1;
      }
    }
  }
  return count;
}

describe('i18n dictionaries parity', () => {
  it('English and Arabic leaf counts are within acceptable ratio', async () => {
    const [en, ar] = await Promise.all([loadDict('en'), loadDict('ar')]);
    const enLeaves = countLeaves(en as Record<string, unknown>);
    const arLeaves = countLeaves(ar as Record<string, unknown>);

    // Acceptable ratio bounds: prevent drastic drops (e.g., < 60% of the other)
    const lowerBound = 0.6;
    const upperBound = 1 / lowerBound; // ~1.666...

    const ratio = enLeaves / Math.max(1, arLeaves);

    expect(ratio).toBeGreaterThanOrEqual(lowerBound);
    expect(ratio).toBeLessThanOrEqual(upperBound);
  });
});
