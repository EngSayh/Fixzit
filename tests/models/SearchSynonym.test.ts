import { describe, it, expect, vi, afterEach } from 'vitest';

const modulePath = '@/server/models/SearchSynonym';

type MongooseMock = {
  __esModule?: boolean;
  Schema?: unknown;
  model?: unknown;
  models?: Record<string, unknown>;
};

type SchemaLike = { obj?: unknown; definition?: unknown };
type ModelWithSchema = { schema?: SchemaLike };

const hasSchema = (value: unknown): value is ModelWithSchema =>
  Boolean(value && typeof (value as { schema?: unknown }).schema !== 'undefined');

async function loadWithMocks(
  options: {
    mongooseMock?: MongooseMock;
  } = {}
) {
  vi.resetModules();
  if (options.mongooseMock) {
    const mocked = options.mongooseMock as Record<string, unknown>;
    const value = { ...mocked };
    (value as Record<string, unknown>).default = value;
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
        Schema: FakeSchema,
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
      public definition: Record<string, unknown>;
      public opts: Record<string, unknown>;
      constructor(def: Record<string, unknown>, opts: Record<string, unknown>) {
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
        Schema: FakeSchema,
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
    let SearchSynonym: unknown;
    let schemaExport: SchemaLike | undefined;
    const attempts: string[] = [];
    for (const p of candidates) {
      try {
        const mod = await import(p);
        const candidateKeys = Object.keys(mod).join(',');
        const candidateModule = mod as Record<string, unknown>;
        const candidate = candidateModule.SearchSynonym || candidateModule.default || mod;
        if (!schemaExport && candidateModule.SearchSynonymSchema) {
          schemaExport = candidateModule.SearchSynonymSchema as SchemaLike;
        }
        const schemaPresent = hasSchema(candidate);
        attempts.push(`${p}:${candidateKeys}:schema=${schemaPresent}`);
        if (schemaPresent) {
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
    const schema = (hasSchema(SearchSynonym) ? SearchSynonym.schema : undefined) || schemaExport;
    expect(schema).toBeDefined();
    if (!schema) return;

    const shapeSource = schema.obj ?? schema.definition ?? schema;
    const shape = shapeSource as Record<string, unknown>;
    expect(shape).toMatchObject({
      locale: { type: expect.any(Function), enum: ['en', 'ar'], required: true },
      term: { type: expect.any(Function), required: true },
      synonyms: [expect.any(Function)],
    });
  });
});
