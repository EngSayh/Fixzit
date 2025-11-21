import { describe, it, expect, vi, afterEach } from 'vitest';

const modulePath = '@/server/models/SearchSynonym';

async function loadWithMocks(
  options: {
    mongooseMock?: any;
  } = {}
) {
  vi.resetModules();
  if (options.mongooseMock) {
    const mocked = options.mongooseMock;
    const value = { ...(mocked as Record<string, unknown>) };
    (value as any).default = value;
    if (!value.__esModule) value.__esModule = true;
    vi.doMock('mongoose', () => value);
  }
  return import(modulePath);
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unmock('mongoose');
});

describe('SearchSynonym model registration', () => {
  it('reuses existing mongoose model when available', async () => {
    const existingModel = { __kind: 'ExistingModel' };
    const indexSpy = vi.fn();
    class FakeSchema {
      public definition: unknown;
      public opts: unknown;
      constructor(def: unknown, opts: unknown) {
        this.definition = def;
        this.opts = opts;
      }
      index = indexSpy;
      plugin = vi.fn();
    }

    const { SearchSynonym } = await loadWithMocks({
      mongooseMock: {
        __esModule: true,
        Schema: FakeSchema as any,
        model: vi.fn(),
        models: { SearchSynonym: existingModel },
      },
    });

    expect(SearchSynonym).toBe(existingModel);
    expect(indexSpy).toHaveBeenCalledWith({ locale: 1, term: 1 }, { unique: true });
  });

  it('registers a new model with timestamps and locale/term schema', async () => {
    const indexSpy = vi.fn();
    const constructorSpy = vi.fn();
    class FakeSchema {
      public definition: any;
      public opts: any;
      constructor(def: any, opts: any) {
        constructorSpy(def, opts);
        this.definition = def;
        this.opts = opts;
      }
      index = indexSpy;
      plugin = vi.fn();
    }
    const modelSpy = vi.fn().mockReturnValue({ __kind: 'NewModel' });

    const { SearchSynonym } = await loadWithMocks({
      mongooseMock: {
        __esModule: true,
        Schema: FakeSchema as any,
        model: modelSpy,
        models: {},
      },
    });

    expect(SearchSynonym).toEqual({ __kind: 'NewModel' });
    const [defArg, optsArg] = constructorSpy.mock.calls[0] || [];
    expect(optsArg).toMatchObject({ timestamps: true });
    expect(defArg).toMatchObject({
      locale: { type: expect.any(Function), enum: ['en', 'ar'], required: true },
      term: { type: expect.any(Function), required: true },
      synonyms: [expect.any(Function)],
    });
    expect(indexSpy).toHaveBeenCalledWith({ locale: 1, term: 1 }, { unique: true });
  });
});

describe('SearchSynonym schema defaults (real import)', () => {
  it('allows storing synonyms for a locale/term pair', async () => {
    vi.unmock('mongoose');
    await vi.resetModules();
    const candidates = [modulePath, '../server/models/SearchSynonym', '@/server/models/SearchSynonym', 'server/models/SearchSynonym'];
    let SearchSynonym: any;
    let schemaExport: any;
    const attempts: string[] = [];
    for (const p of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const mod = await import(p);
        const candidateKeys = Object.keys(mod).join(',');
        const candidate = (mod as any).SearchSynonym || (mod as any).default || mod;
        schemaExport = schemaExport || (mod as any).SearchSynonymSchema;
        const hasSchema = Boolean((candidate as any)?.schema);
        attempts.push(`${p}:${candidateKeys}:schema=${hasSchema}`);
        if (candidate && (candidate as any).schema) {
          SearchSynonym = candidate;
          break;
        }
      } catch {
        attempts.push(`${p}:ERR`);
        continue;
      }
    }
    if (!SearchSynonym && schemaExport) {
      // Fall back to direct schema export when model is mocked without schema prop
      SearchSynonym = { schema: schemaExport };
    }
    if (!SearchSynonym) {
      throw new Error(`Could not resolve SearchSynonym model. Attempts: ${attempts.join(' | ')}`);
    }
    const schema = (SearchSynonym as any)?.schema || schemaExport;
    expect(schema).toBeDefined();
    if (!schema) return;

    const shape = (schema as any).obj || (schema as any).definition || schema;
    expect(shape).toMatchObject({
      locale: { type: expect.any(Function), enum: ['en', 'ar'], required: true },
      term: { type: expect.any(Function), required: true },
      synonyms: [expect.any(Function)],
    });
  });
});
