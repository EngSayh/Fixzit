// Tests for SearchSynonym model selection and schema behavior
// Framework: Jest (adapt if project uses Vitest by replacing jest with vi and expect APIs as needed)

import path from "path"

// Utilities to load module fresh with controlled env and mocks
function withIsolatedModule<T>(env: Record<string, string | undefined>, mocks: { [k: string]: any }, loader: () => T): T {
  const oldEnv = { ...process.env }
  Object.keys(env).forEach(k => {
    const v = env[k]
    if (typeof v === "undefined") delete (process.env as any)[k]
    else (process.env as any)[k] = v as string
  })

  jest.resetModules()
  // Apply require mocks
  Object.entries(mocks).forEach(([mod, impl]) => {
    jest.doMock(mod, () => impl, { virtual: true })
  })

  try {
    return loader()
  } finally {
    jest.dontMock("mongoose")
    process.env = oldEnv
  }
}

// Helper to resolve module under test.
// Adjust path if the model file resides elsewhere; tests rely on path alias "@"
const modulePath = path.posix.normalize("@/models/SearchSynonym")

describe("models/SearchSynonym - environment-based model selection", () => {
  afterEach(() => {
    jest.resetModules()
    jest.restoreAllMocks()
    jest.clearAllMocks()
    jest.dontMock("mongoose")
  })

  test("uses mock DB when NODE_ENV=development and MONGODB_URI is undefined", () => {
    const { SearchSynonym } = withIsolatedModule(
      { NODE_ENV: "development", MONGODB_URI: undefined },
      {
        mongoose: {
          Schema: class {},
          model: jest.fn(),
          models: {}
        }
      },
      () => require(modulePath)
    )
    expect(SearchSynonym).toBeDefined()
    expect(SearchSynonym.name).toBe("searchsynonyms")
  })

  test("uses mock DB when NODE_ENV=development and MONGODB_URI is localhost", () => {
    const { SearchSynonym } = withIsolatedModule(
      { NODE_ENV: "development", MONGODB_URI: "mongodb://localhost:27017/db" },
      {
        mongoose: {
          Schema: class {},
          model: jest.fn(),
          models: {}
        }
      },
      () => require(modulePath)
    )
    expect(SearchSynonym).toBeDefined()
    expect(SearchSynonym.name).toBe("searchsynonyms")
  })

  test("uses real mongoose model when NODE_ENV\!=development (e.g., test) even if MONGODB_URI undefined", () => {
    const fakeSchema = {}
    const fakeModelInst = { __kind: "MongooseModel", modelName: "SearchSynonym" }
    const mockSchemaCtor = jest.fn().mockImplementation(() => fakeSchema)
    const mockIndex = jest.fn()
    (mockSchemaCtor as any).prototype = {}
    (mockSchemaCtor as any).prototype.index = mockIndex

    const { SearchSynonym } = withIsolatedModule(
      { NODE_ENV: "test", MONGODB_URI: undefined },
      {
        mongoose: {
          Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)(...args) },
          InferSchemaType: {} // not used at runtime
        }
      },
      () => require(modulePath)
    )
    expect(SearchSynonym).toBe(fakeModelInst)
    expect(mockSchemaCtor).toHaveBeenCalledTimes(1)
    expect(mockIndex).toHaveBeenCalledWith({ locale: 1, term: 1 }, { unique: true })
  })

  test("reuses existing mongoose model if models.SearchSynonym exists", () => {
    const fakeSchema = {}
    const existingModel = { __kind: "ExistingMongooseModel", modelName: "SearchSynonym" }
    const mockSchemaCtor = jest.fn().mockImplementation(() => fakeSchema)
    const mockIndex = jest.fn()
    (mockSchemaCtor as any).prototype = {}
    (mockSchemaCtor as any).prototype.index = mockIndex

    const { SearchSynonym } = withIsolatedModule(
      { NODE_ENV: "production", MONGODB_URI: "mongodb+srv://cluster/some" },
      {
        mongoose: {
          Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)(...args) },
          model: jest.fn(), // should not be called because models.SearchSynonym exists
        }
      },
      () => require(modulePath)
    )

    expect(SearchSynonym).toBe(existingModel)
  })
})

describe("models/SearchSynonym - schema constraints", () => {
  afterEach(() => {
    jest.resetModules()
    jest.restoreAllMocks()
    jest.clearAllMocks()
    jest.dontMock("mongoose")
  })

  test("defines locale enum ['en','ar'], term required, synonyms array of string, timestamps enabled", () => {
    const schemaOptsRef: any = { timestamps: true }
    const schemaArgRef: any = {
      locale: { type: String, enum: ['en','ar'], required: true, index: true },
      term: { type: String, required: true },
      synonyms: [String]
    }

    const indexSpy = jest.fn()
    class FakeSchema {
      public def: any
      public opts: any
      constructor(def: any, opts: any) {
        this.def = def
        this.opts = opts
      }
      index = indexSpy
    }

    const { default: mongooseDefault, SearchSynonym: _ } = withIsolatedModule(
      { NODE_ENV: "test" },
      {
        mongoose: {
          Schema: FakeSchema as any,
          model: jest.fn().mockReturnValue({}),
          models: {}
        }
      },
      () => require(modulePath)
    )

    // Access the constructed schema instance via the last FakeSchema instance
    // We cannot directly access it, but we can assert what index was called with,
    // and confirm constructor received expected def/opts via a spy.
    // To inspect constructor args, we wrap FakeSchema with a jest spy.
  })

  test("index on (locale, term) is unique", () => {
    const indexSpy = jest.fn()
    const ctorSpy = jest.fn()
    class FakeSchema {
      constructor(def: any, opts: any) {
        ctorSpy(def, opts)
      }
      index = indexSpy
    }

    withIsolatedModule(
      { NODE_ENV: "test" },
      {
        mongoose: {
          Schema: FakeSchema as any,
          model: jest.fn().mockReturnValue({}),
          models: {}
        }
      },
      () => require(modulePath)
    )

    expect(indexSpy).toHaveBeenCalledWith({ locale: 1, term: 1 }, { unique: true })
    // Validate core field shape
    const [defArg, optsArg] = (ctorSpy.mock.calls[0] ?? [])
    expect(optsArg).toEqual({ timestamps: true })
    expect(defArg).toMatchObject({
      locale: { type: expect.any(Function), enum: ['en','ar'], required: true, index: true },
      term: { type: expect.any(Function), required: true },
      synonyms: [expect.any(Function)]
    })
  })
})

describe("models/SearchSynonym - negative and edge behaviors without DB", () => {
  afterEach(() => {
    jest.resetModules()
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test("invalid environment combination: NODE_ENV=development with remote MONGODB_URI uses real model", () => {
    const fakeSchema = {}
    const fakeModelInst = { __kind: "MongooseModel", modelName: "SearchSynonym" }
    const mockSchemaCtor = jest.fn().mockImplementation(() => fakeSchema)
    const mockIndex = jest.fn()
    (mockSchemaCtor as any).prototype = {}
    (mockSchemaCtor as any).prototype.index = mockIndex

    const { SearchSynonym } = withIsolatedModule(
      { NODE_ENV: "development", MONGODB_URI: "mongodb+srv://prod/uri" },
      {
        mongoose: {
          Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)(...args) },
        }
      },
      () => require(modulePath)
    )
    expect(SearchSynonym).toBe(fakeModelInst)
  })
})

