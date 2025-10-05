// Global test setup for Vitest with Jest compatibility
import { vi } from 'vitest';

// Provide Jest compatibility layer for tests using jest.* APIs
if (typeof global !== 'undefined') {
  (global as any).jest = vi;
}

// The global test functions are already available through @types/jest
// No need to redeclare them to avoid type conflicts

// Using real MongoDB for all tests

// Environment setup
// NODE_ENV is read-only, managed by test runner
// MongoDB-only configuration for all environments
