// Global test setup for Vitest with Jest compatibility
import React from 'react';
import { render } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { TranslationProvider } from '@/contexts/TranslationContext';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Provide Jest compatibility layer for tests using jest.* APIs
if (typeof global !== 'undefined') {
  (global as any).jest = vi;
}

// --- Mock Modules ---

// NOTE: We used to mock 'mongoose' here to work around some plugin/type issues
// (Schema.plugin and Schema.Types.Mixed). However this global mock interferes
// with tests that rely on real Mongoose models (create/deleteMany/etc.).
//
// Removing the global mongoose mock so that unit tests which use models
// can operate normally. Individual tests that need to stub mongoose
// behavior should mock it locally.


// ❌ REMOVED: The vi.mock('@/server/models/User', ...) block.
// This will be handled by individual tests that need it.

// MOCK BCRYPT (To match our mock user passwords)
vi.mock('bcryptjs', () => ({
  hash: vi.fn(async (pwd: string) => `hashed:${pwd}`),
  compare: vi.fn(async (pwd: string, hashed: string) => hashed === `hashed:${pwd}`),
}));

// MOCK NEXT-AUTH (Fixes 'useSession' errors)
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
    },
    status: 'authenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

// Mock next/navigation for App Router hooks
vi.mock('next/navigation', () => {
  const pushMock = vi.fn();
  const replaceMock = vi.fn();
  const prefetchMock = vi.fn();
  const backMock = vi.fn();
  const forwardMock = vi.fn();
  const refreshMock = vi.fn();
  
  return {
    useRouter: () => ({
      push: pushMock,
      replace: replaceMock,
      prefetch: prefetchMock,
      back: backMock,
      forward: forwardMock,
      refresh: refreshMock,
      pathname: '/fm/dashboard',
      query: {},
      asPath: '/fm/dashboard',
    }),
    usePathname: () => '/fm/dashboard',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    notFound: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT: ${url}`);
    }),
  };
});

// The global test functions are already available through @types/jest
// No need to redeclare them to avoid type conflicts

// Mock MongoDB unified module globally
vi.mock('@/lib/mongodb-unified', () => {
  const createMockCollection = () => ({
    insertOne: vi.fn().mockResolvedValue({ acknowledged: true, insertedId: 'mock-id' }),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockResolvedValue(null),
    updateOne: vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  });
  
  const mockDb = {
    collection: vi.fn(() => createMockCollection()),
  };
  
  return {
    getDatabase: vi.fn(() => mockDb),
    connectToDatabase: vi.fn().mockResolvedValue({ db: () => mockDb }),
    getMongooseConnection: vi.fn().mockResolvedValue({
      readyState: 1,
      close: vi.fn(),
    }),
    dbConnect: vi.fn().mockResolvedValue(undefined),
  };
});

// Some test imports may end up with ESM/CJS interop where the default export
// is the Mongoose model (module.default) but tests expect methods on the
// module variable directly. Normalize common finance model modules so that
// `Journal.deleteMany`, etc., are available regardless of import interop.
(async () => {
  try {
    const journalModule = await import('@/server/models/finance/Journal');
    // 🔒 TYPE SAFETY: Use unknown for dynamic module import
    const JournalModel = (journalModule as { default?: unknown }).default || journalModule;
    // Ensure deleteMany exists on the model (alias to collection.deleteMany if needed)
    if (JournalModel && typeof (JournalModel as Record<string, unknown>).deleteMany !== 'function' && 
        (JournalModel as { collection?: { deleteMany?: unknown } }).collection && 
        typeof (JournalModel as { collection: { deleteMany: unknown } }).collection.deleteMany === 'function') {
      // Add deleteMany alias with proper typing
      (JournalModel as Record<string, unknown>).deleteMany = (...args: unknown[]) => 
        ((JournalModel as { collection: { deleteMany: (..._args: unknown[]) => unknown } }).collection.deleteMany)(...args);
    }
  } catch {
    // Non-fatal; only needed for tests that import these modules
  }

  try {
    const ledgerModule = await import('@/server/models/finance/LedgerEntry');
    const LedgerModel = (ledgerModule as { default?: unknown }).default || ledgerModule;
    if (LedgerModel && typeof (LedgerModel as Record<string, unknown>).deleteMany !== 'function' && 
        (LedgerModel as { collection?: { deleteMany?: unknown } }).collection && 
        typeof (LedgerModel as { collection: { deleteMany: unknown } }).collection.deleteMany === 'function') {
      (LedgerModel as Record<string, unknown>).deleteMany = (...args: unknown[]) => 
        ((LedgerModel as { collection: { deleteMany: (..._args: unknown[]) => unknown } }).collection.deleteMany)(...args);
    }
  } catch {
    // Non-fatal
  }

  try {
    const chartModule = await import('@/server/models/finance/ChartAccount');
    const ChartModel = (chartModule as { default?: unknown }).default || chartModule;
    if (ChartModel && typeof (ChartModel as Record<string, unknown>).deleteMany !== 'function' && 
        (ChartModel as { collection?: { deleteMany?: unknown } }).collection && 
        typeof (ChartModel as { collection: { deleteMany: unknown } }).collection.deleteMany === 'function') {
      // 🔒 TYPE SAFETY: Use unknown[] for variadic args
      (ChartModel as Record<string, unknown>).deleteMany = (...args: unknown[]) => 
        ((ChartModel as { collection: { deleteMany: (..._args: unknown[]) => unknown } }).collection.deleteMany)(...args);
    }
  } catch {
    // Non-fatal
  }
})();

// --- MongoDB Memory Server Setup ---
let mongoServer: MongoMemoryServer | undefined;

/**
 * Start MongoDB Memory Server before all tests
 * Provides in-memory database for model validation tests
 */
beforeAll(async () => {
  try {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'fixzit-test',
      },
    });
    
    const mongoUri = mongoServer.getUri();
    
    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri, {
      autoCreate: true,
      autoIndex: true,
    });
    
    console.log('✅ MongoDB Memory Server started:', mongoUri);
  } catch (error) {
    console.error('❌ Failed to start MongoDB Memory Server:', error);
    throw error;
  }
}, 60000); // 60 second timeout for MongoDB download on first run

/**
 * Clean up after each test to prevent data leakage between tests
 */
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    // Clear all collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

/**
 * Stop MongoDB Memory Server after all tests
 */
afterAll(async () => {
  try {
    // Clear all models before closing connection using proper Mongoose API
    if (mongoose.connection && mongoose.connection.models) {
      const modelNames = Object.keys(mongoose.connection.models);
      modelNames.forEach((modelName) => {
        mongoose.connection.deleteModel(modelName);
      });
    }
    
    // Close mongoose connection
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(true); // Force close
    }
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
      console.log('✅ MongoDB Memory Server stopped');
    }
  } catch (error) {
    console.error('❌ Failed to stop MongoDB Memory Server:', error);
    throw error;
  }
}, 30000); // 30 second timeout

// Environment setup
// NODE_ENV is read-only, managed by test runner
// MongoDB-only configuration for all environments

// --- Custom Render Function (Wraps all tests) ---
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(
    SessionProvider,
    { session: null, children: React.createElement(TranslationProvider, { children }) }
  );
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';
// Override the 'render' method with our custom one
export { customRender as render };
