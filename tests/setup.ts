import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Hide Mongoose's "Jest + jsdom" warning noise
process.env.SUPPRESS_JEST_WARNINGS = 'true';

// Mock Next.js environment for comprehensive testing
global.Request = global.Request || class Request {};
global.Response = global.Response || class Response {};
global.fetch = global.fetch || vi.fn();

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

// Mock matchMedia for responsive tests
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

// Mock environment variables with secure defaults
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
}

// NODE_ENV already set above
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit_test';
// Using real MongoDB for all test environments
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest-tests-minimum-32-characters-long';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-for-jest-tests-minimum-32-characters-long';
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

// Mock mongoose in jsdom environment to avoid warnings
if (typeof window !== 'undefined') {
  // Only mock mongoose in browser (jsdom) env so Node-side tests still use real mongoose.
  vi.mock('mongoose', () => {
    const fake = {
      connect: vi.fn(async () => ({})),
      disconnect: vi.fn(async () => undefined),
      connection: { readyState: 1, on: vi.fn(), once: vi.fn(), close: vi.fn() },
      model: vi.fn(() => function Model() {}),
      models: {},
      Schema: class {},
    };
    return { __esModule: true, default: fake, ...fake };
  });
}
