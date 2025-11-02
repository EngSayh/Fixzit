// Global test setup for Vitest with Jest compatibility
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Provide Jest compatibility layer for tests using jest.* APIs
if (typeof global !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).jest = vi;
}

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

// Environment setup
// NODE_ENV is read-only, managed by test runner
// MongoDB-only configuration for all environments
