import { vi } from 'vitest';

// Global test setup for Vitest with Jest compatibility
global.beforeEach = beforeEach;
global.afterEach = afterEach;
global.beforeAll = beforeAll;
global.afterAll = afterAll;
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.vi = vi;

// Mock database for tests
const mockDatabase = new Map();

global.MockDatabase = {
  clear: () => mockDatabase.clear(),
  set: (key: string, value: any) => mockDatabase.set(key, value),
  get: (key: string) => mockDatabase.get(key),
  has: (key: string) => mockDatabase.has(key),
  delete: (key: string) => mockDatabase.delete(key),
  size: () => mockDatabase.size,
};

// Environment setup
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
