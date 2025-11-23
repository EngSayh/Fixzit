import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { requireEnv } from '@/lib/env';

// Hide Mongoose's "Jest + jsdom" warning noise
process.env.SUPPRESS_JEST_WARNINGS = 'true';

// Mock Next.js environment for comprehensive testing
global.Request = global.Request || class Request {};
global.Response = global.Response || class Response {};
global.fetch = global.fetch || vi.fn();

// ============================================
// 1. MOCK MONGOOSE (Fixes "reading 'Mixed'" error)
// ============================================
vi.mock('mongoose', async (importOriginal) => {
  const original = await importOriginal<typeof import('mongoose')>();

  type AnyDoc = Record<string, unknown>;
  type IdLike = { toString(): string } | string | number | undefined;
  type ModelInstance = AnyDoc & {
    _id?: IdLike;
    isNew?: boolean;
    validateSync: () => unknown;
    populate: () => Promise<ModelInstance>;
    toObject: () => AnyDoc;
    toJSON: () => AnyDoc;
    lean: () => Promise<AnyDoc>;
    exec: () => Promise<ModelInstance>;
    save: () => Promise<ModelInstance>;
    lines?: Array<{ debit?: number; credit?: number }>;
    status?: string;
    journalDate?: Date;
    totalDebit?: number;
    totalCredit?: number;
    isBalanced?: boolean;
    fiscalYear?: number;
    fiscalPeriod?: number;
  };

  const storeByModel = new Map<string, Map<string, AnyDoc>>();
  const mkId = () => (original.Types?.ObjectId ? new original.Types.ObjectId() : { toString: () => `${Date.now()}${Math.random()}` });

  const matchQuery = (doc: AnyDoc, query: Record<string, unknown>) => {
    if (!query || Object.keys(query).length === 0) return true;
    return Object.entries(query).every(([k, v]) => {
      if (v && v._bsontype === 'ObjectID') return doc[k]?.toString() === v.toString();
      if (v && typeof v === 'object' && (v as { $in?: unknown[] }).$in) {
        const values = (v as { $in: unknown[] }).$in;
        return values.map((x) => (x as { toString?: () => string })?.toString?.() ?? String(x)).includes(doc[k]?.toString());
      }
      if (v && typeof v === 'object' && ('$gte' in v || '$lte' in v)) {
        const val = doc[k];
        if (v.$gte !== undefined && val < v.$gte) return false;
        if (v.$lte !== undefined && val > v.$lte) return false;
        return true;
      }
      return doc[k] === v || doc[k]?.toString?.() === v?.toString?.();
    });
  };

  const applyUpdate = (update: AnyDoc) => {
    if (!update) return {};
    if (update.$set) return update.$set;
    if (update.$unset) return {};
    return update;
  };

  function populateQueryHelpers<T extends AnyDoc>(obj: T): T {
    obj.populate = vi.fn().mockReturnValue(obj);
    obj.select = vi.fn().mockReturnValue(obj);
    obj.lean = vi.fn().mockResolvedValue(obj);
    return obj;
  }

  class MockSchema {
    static Types = original.Schema?.Types || original.Types || { ObjectId: Object };
    paths: Record<string, unknown>;
    virtuals: Record<string, unknown>;
    options: Record<string, unknown>;
    methods: Record<string, unknown>;
    statics: Record<string, unknown>;
    constructor(public definition: AnyDoc = {}, opts: AnyDoc = {}) {
      this.options = opts;
      this.paths = {};
      this.virtuals = {};
      this.methods = {};
      this.statics = {};
    }
    add = vi.fn();
    index = vi.fn();
    pre = vi.fn();
    post = vi.fn();
    plugin = vi.fn();
    virtual = vi.fn(() => ({ get: vi.fn(), set: vi.fn() }));
    set = vi.fn();
    path = vi.fn(() => ({ options: {} }));
    indexes = vi.fn(() => []);
  }

  const makeModel = (name: string) => {
    const store = storeByModel.get(name) || new Map<string, AnyDoc>();
    storeByModel.set(name, store);

    class Model {
      static modelName = name;
      static schema = new MockSchema();
      static Types = original.Types;

      constructor(data: AnyDoc = {}) {
        const self = this as unknown as ModelInstance;
        Object.assign(self, data);
        self.isNew = !data?._id;
        self.validateSync = vi.fn(() => undefined);
        self.populate = vi.fn(async () => self);
        self.toObject = vi.fn(() => ({ ...self }));
        self.toJSON = vi.fn(() => ({ ...self }));
        self.lean = vi.fn(async () => (self.toObject ? self.toObject() : { ...self }));
        self.exec = vi.fn(async () => self);
        self.save = vi.fn(async () => {
          const id = self._id || mkId();
          self._id = id;
          const existing = store.get(id.toString());
          if (name && /journal/i.test(name) && existing && existing.status === 'POSTED') {
            if (self.status === 'VOID') {
              // allow voiding a posted journal
            } else {
              const currentSnapshot = JSON.stringify({ ...self, save: undefined, validateSync: undefined });
              const existingSnapshot = JSON.stringify(existing);
              if (currentSnapshot !== existingSnapshot) {
                throw new Error('Posted journals cannot be modified');
              }
            }
          }
          if (name && /journal/i.test(name) && Array.isArray(self.lines)) {
            const totalDebit = self.lines.reduce((sum: number, l) => sum + (l.debit || 0), 0);
            const totalCredit = self.lines.reduce((sum: number, l) => sum + (l.credit || 0), 0);
            self.totalDebit = totalDebit;
            self.totalCredit = totalCredit;
            self.isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
            if (!self.fiscalYear || !self.fiscalPeriod) {
              const d = self.journalDate ? new Date(self.journalDate) : new Date();
              self.fiscalYear = d.getFullYear();
              self.fiscalPeriod = d.getMonth() + 1;
            }
          }
          store.set(id.toString(), { ...self });
          self.isNew = false;
          return self;
        });
      }

      static async create(data: AnyDoc) {
        const inst = new Model(data);
        await (inst as unknown as ModelInstance).save();
        return inst;
      }

      static find(query: AnyDoc = {}) {
        const results = Array.from(store.values())
          .filter((d) => matchQuery(d, query))
          .map((d) => new Model(d));
        
        // Type query result array with helper methods
        interface QueryHelpers {
          exec: () => Promise<ModelInstance[]>;
          lean: () => Promise<AnyDoc[]>;
          limit: (n: number) => ModelInstance[] & QueryHelpers;
          sort: () => ModelInstance[] & QueryHelpers;
          toArray: () => Promise<ModelInstance[]>;
        }
        const arr = results as ModelInstance[] & QueryHelpers;
        
        arr.exec = async () => arr;
        arr.lean = async () => (arr as unknown as ModelInstance[]).map((i) => i.toObject());
        arr.limit = (n: number) => {
          arr.splice(n);
          return arr;
        };
        arr.sort = () => arr;
        arr.toArray = async () => arr;
        populateQueryHelpers(arr);
        return arr;
      }

      static findOne(query: AnyDoc = {}) {
        const found = Array.from(store.values()).find((d) => matchQuery(d, query));
        if (!found) {
          const queryObj: AnyDoc = {};
          queryObj.lean = vi.fn(async () => null);
          queryObj.exec = vi.fn(async () => null);
          queryObj.populate = vi.fn().mockReturnValue(queryObj);
          queryObj.select = vi.fn().mockReturnValue(queryObj);
          return queryObj;
        }
        const instance = new Model(found);
        const self = instance as unknown as ModelInstance;
        self.lean = vi.fn(async () => self.toObject());
        self.exec = vi.fn(async () => instance);
        self.populate = vi.fn().mockReturnValue(instance);
        self.select = vi.fn().mockReturnValue(instance);
        return instance;
      }

      static async findById(id: AnyDoc) {
        const key = id?.toString?.() ?? String(id);
        const found = store.get(key);
        return found ? new Model(found) : null;
      }

      static findOneAndUpdate(filter: AnyDoc, update: AnyDoc, options?: AnyDoc) {
        const entry = Array.from(store.entries()).find(([, v]) => matchQuery(v, filter));
        let value: ModelInstance | null = null;
        if (entry) {
          const updated = { ...entry[1], ...applyUpdate(update) };
          store.set(entry[0], updated);
          value = new Model(updated) as unknown as ModelInstance;
        } else if (options?.upsert) {
          const id = mkId().toString();
          const updated = { ...applyUpdate(update), _id: id };
          store.set(id, updated);
          value = new Model(updated) as unknown as ModelInstance;
        }
        const res: AnyDoc = { value };
        res.exec = async () => res;
        res.lean = async () => (value ? value.toObject() : null);
        return res;
      }

      static findOneAndDelete(filter: AnyDoc) {
        const entry = Array.from(store.entries()).find(([, v]) => matchQuery(v, filter));
        let value: ModelInstance | null = null;
        if (entry) {
          store.delete(entry[0]);
          value = new Model(entry[1]) as unknown as ModelInstance;
        }
        const res: AnyDoc = { value };
        res.exec = async () => res;
        res.lean = async () => (value ? value.toObject() : null);
        return res;
      }

      static async findByIdAndUpdate(id: AnyDoc, update: AnyDoc) {
        const key = id?.toString?.() ?? String(id);
        const existing = store.get(key);
        if (!existing) return null;
        const updated = { ...existing, ...applyUpdate(update) };
        store.set(key, updated);
        return new Model(updated);
      }

      static async updateOne(filter: AnyDoc, update: AnyDoc) {
        const entry = Array.from(store.entries()).find(([, v]) => matchQuery(v, filter));
        if (entry) {
          const updated = { ...entry[1], ...applyUpdate(update) };
          store.set(entry[0], updated);
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      }

  static async updateMany(filter: AnyDoc, update: AnyDoc) {
        const updated: string[] = [];
        Array.from(store.entries()).forEach(([key, value]) => {
          if (matchQuery(value, filter)) {
            const next = { ...value, ...applyUpdate(update) };
            store.set(key, next);
            updated.push(key);
          }
        });
        return { modifiedCount: updated.length, matchedCount: updated.length };
      }

  static async deleteOne(filter: AnyDoc) {
        const entry = Array.from(store.entries()).find(([, v]) => matchQuery(v, filter));
        if (entry) {
          store.delete(entry[0]);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      }

  static async deleteMany(filter: AnyDoc) {
        const toDelete = Array.from(store.entries()).filter(([, v]) => matchQuery(v, filter));
        toDelete.forEach(([k]) => store.delete(k));
        return { deletedCount: toDelete.length };
      }

  static async countDocuments(filter: AnyDoc = {}) {
        const count = Array.from(store.values()).filter((d) => matchQuery(d, filter)).length;
        return count;
      }

      static aggregate() {
        return {
          exec: async () => [],
        };
      }

  static async getAccountBalance(orgId: AnyDoc, accountId: AnyDoc) {
        const entries = Array.from(store.values()).filter((e) => {
          const accountMatch = e.accountId?.toString?.() === accountId?.toString?.();
          const orgMatch = !orgId || e.orgId?.toString?.() === orgId?.toString?.();
          return accountMatch && orgMatch;
        });
        if (entries.length === 0) return 0;
        const last = entries[entries.length - 1];
        if (typeof last.balance === 'number') return last.balance;
       return entries.reduce((sum, en: AnyDoc) => {
          const acctType = en.accountType;
          if (acctType === 'REVENUE' || acctType === 'LIABILITY' || acctType === 'EQUITY') {
            return sum + (en.credit || 0) - (en.debit || 0);
          }
          return sum + (en.debit || 0) - (en.credit || 0);
        }, 0);
      }
    }

    return Model;
  };

  const mocked: Partial<typeof original> & { models: Record<string, unknown>; default?: unknown; connection: AnyDoc } = {
    ...original,
    connect: vi.fn(async (..._args: unknown[]) => ({ connection: mocked.connection })),
    createConnection: (...args: unknown[]) => original.createConnection?.(...args),
    disconnect: vi.fn(async () => {}),
    connection: {
      readyState: 1,
      on: vi.fn(),
      once: vi.fn(),
      close: vi.fn(),
      db: {
        collection: vi.fn(() => ({
          findOneAndUpdate: vi.fn(),
          findOne: vi.fn(),
          find: vi.fn(() => ({
            sort: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            toArray: vi.fn(() => Promise.resolve([])),
          })),
          deleteMany: vi.fn(() => Promise.resolve({ deletedCount: 0 })),
        })),
        admin: vi.fn(() => ({
          ping: vi.fn(() => Promise.resolve()),
        })),
      },
    },
    Schema: original.Schema ?? MockSchema,
    Types: original.Types,
    model: vi.fn((name: string) => {
      if (!mocked.models[name]) {
        mocked.models[name] = makeModel(name);
      }
      return mocked.models[name];
    }),
    models: {} as Record<string, unknown>,
  };

  mocked.default = mocked;
  return mocked;
});
// ============================================
// 1.5. MOCK USER MODEL (for auth tests)
// ============================================
vi.mock('@/modules/users/schema', () => {
  const makeDefaultUser = () => ({
    _id: '1',
    code: 'USR-001',
    username: 'superadmin',
    email: 'superadmin@fixzit.co',
    password: '$2b$10$igvySIqTp4AO9Hwg0c5fOOZUDAbDFAwsfBM3IlbQBs6GReiw1lG2W', // bcrypt hash of 'admin123'
    personal: { firstName: 'System', lastName: 'Administrator' },
    professional: { role: 'SUPER_ADMIN' },
    status: 'ACTIVE',
    tenantId: 'demo-tenant',
    orgId: 'demo-tenant',
  });

  const inactiveUser = () => ({
    _id: '99',
    code: 'USR-099',
    username: 'inactive',
    email: 'inactive@x.com',
    password: '$2b$10$igvySIqTp4AO9Hwg0c5fOOZUDAbDFAwsfBM3IlbQBs6GReiw1lG2W',
    personal: { firstName: 'Inactive', lastName: 'User' },
    professional: { role: 'USER' },
    status: 'SUSPENDED',
    tenantId: 'demo-tenant',
    orgId: 'demo-tenant',
  });

  return {
    __esModule: true,
    User: {
      findOne: vi.fn(async (query: Record<string, unknown>) => {
        // Inactive user for auth tests
        if (query.email === 'inactive@x.com' || query.username === 'inactive') {
          return inactiveUser();
        }
        
        // Default superadmin user
        if (query.email === 'superadmin@fixzit.co' || query.username === 'superadmin') {
          return makeDefaultUser();
        }
        
        // For getUserFromToken test - user by _id
        if (query._id === '42') {
          return {
            _id: '42',
            email: 'ok@x.com',
            username: 'okuser',
            password: '$2b$10$igvySIqTp4AO9Hwg0c5fOOZUDAbDFAwsfBM3IlbQBs6GReiw1lG2W',
            personal: { firstName: 'Ok', lastName: 'User' },
            professional: { role: 'ADMIN' },
            status: 'ACTIVE',
            tenantId: 'tenant-42',
            orgId: 'tenant-42',
          };
        }
        
        // Not found
        return null;
      }),
      findById: vi.fn(async (id: string) => {
        if (id === '42') {
          return {
            _id: '42',
            email: 'ok@x.com',
            username: 'okuser',
            password: '$2b$10$igvySIqTp4AO9Hwg0c5fOOZUDAbDFAwsfBM3IlbQBs6GReiw1lG2W',
            personal: { firstName: 'Ok', lastName: 'User' },
            professional: { role: 'ADMIN' },
            status: 'ACTIVE',
            tenantId: 'tenant-42',
            orgId: 'tenant-42',
          };
        }
        if (id === '1') {
          return makeDefaultUser();
        }
        if (id === '99') {
          return inactiveUser();
        }
        return null;
      }),
      create: vi.fn(async (data: Record<string, unknown>) => ({ _id: 'new-id', ...data })),
      updateOne: vi.fn(async () => ({ modifiedCount: 1 })),
      deleteOne: vi.fn(async () => ({ deletedCount: 1 })),
    },
  };
});

// ============================================
// 2. MOCK NEXT-AUTH
// ============================================
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'admin@fixzit.co',
        name: 'Test Admin',
        role: 'SUPER_ADMIN',
        orgId: 'test-org-id',
      },
      expires: '9999-12-31T23:59:59.999Z',
    },
    status: 'authenticated',
    update: vi.fn(),
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => 
    React.createElement(React.Fragment, null, children),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCsrfToken: vi.fn(() => Promise.resolve('mock-csrf-token')),
  getProviders: vi.fn(() => Promise.resolve({})),
  getSession: vi.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'admin@fixzit.co',
      name: 'Test Admin',
      role: 'SUPER_ADMIN',
      orgId: 'test-org-id',
    },
    expires: '9999-12-31T23:59:59.999Z',
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: vi.fn(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

// Mock fetch globally for SWR and API route tests
global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
  const method = init?.method || 'GET';
  
  // Return generic success responses to prevent test timeouts
  const response = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({
      items: [],
      page: 1,
      limit: 10,
      total: 0,
      message: `Mocked ${method} ${urlStr}`,
    }),
    text: async () => JSON.stringify({ items: [], page: 1, total: 0 }),
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    clone: function() { return this; },
  } as Response;
  
  return Promise.resolve(response);
}) as unknown as typeof fetch;

// Mock NextRequest for API route tests
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  
  return {
    ...actual,
    NextRequest: vi.fn().mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const urlObj = typeof url === 'string' ? new URL(url, 'http://localhost:3000') : url instanceof URL ? url : new URL((url as Request).url);
      
      return {
        url: urlObj.toString(),
        nextUrl: {
          href: urlObj.toString(),
          origin: urlObj.origin,
          protocol: urlObj.protocol,
          username: urlObj.username,
          password: urlObj.password,
          host: urlObj.host,
          hostname: urlObj.hostname,
          port: urlObj.port,
          pathname: urlObj.pathname,
          search: urlObj.search,
          searchParams: urlObj.searchParams,
          hash: urlObj.hash,
        },
        headers: new Headers(init?.headers),
        method: init?.method || 'GET',
        body: init?.body,
        cookies: {
          get: vi.fn((name: string) => ({ name, value: 'mock-cookie-value' })),
          getAll: vi.fn(() => []),
          set: vi.fn(),
          delete: vi.fn(),
          has: vi.fn(() => false),
        },
        geo: undefined,
        ip: '127.0.0.1',
        json: async () => (init?.body ? JSON.parse(init.body as string) : {}),
        text: async () => (init?.body ? String(init.body) : ''),
        formData: async () => new FormData(),
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        clone: function() { return this; },
      };
    }),
  };
});

// Mock IntersectionObserver for UI tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for UI tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive tests (only in browser/jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock environment variables with secure defaults
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
}

// NODE_ENV already set above
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit_test';
// Using real MongoDB for all test environments
process.env.JWT_SECRET = requireEnv('JWT_SECRET', {
  testFallback: 'test-secret-key-for-jest-tests-minimum-32-characters-long',
});
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-for-jest-tests-minimum-32-characters-long';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Mock crypto for secure random generation in tests
if (typeof globalThis.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  globalThis.crypto = webcrypto as Crypto;
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================
// 3. CUSTOM RENDER WITH PROVIDERS
// ============================================
// This wraps all components with necessary providers for testing
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'admin@fixzit.co',
    name: 'Test Admin',
    role: 'SUPER_ADMIN',
    orgId: 'test-org-id',
  },
  expires: '9999-12-31T23:59:59.999Z',
};

// Note: Import providers dynamically to avoid circular dependencies
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // We use the mocked SessionProvider from next-auth/react above
  const { SessionProvider } = require('next-auth/react');
  
  // Wrap with TranslationProvider if available
  try {
    const { TranslationProvider } = require('@/contexts/TranslationContext');
    return React.createElement(
      SessionProvider,
      { session: mockSession },
      React.createElement(TranslationProvider, null, children)
    );
  } catch {
    // If TranslationProvider doesn't exist or fails, just use SessionProvider
    return React.createElement(
      SessionProvider,
      { session: mockSession },
      children
    );
  }
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
// Override the render method with our custom one
export { customRender as render };
