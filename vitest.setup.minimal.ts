/**
 * Minimal Vitest setup file for tests that mock mongoose globally.
 * These tests DON'T use MongoMemoryServer and must mock their own data access.
 * 
 * Used by the "server-mocked" project in vitest.config.ts
 */
import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { TextEncoder, TextDecoder } from "node:util";

// Polyfill TextEncoder/TextDecoder
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Jest compatibility
Object.defineProperty(globalThis, 'jest', {
  value: vi,
  writable: true,
  configurable: true,
});

// Environment setup
if (!process.env.SKIP_ENV_VALIDATION) {
  process.env.SKIP_ENV_VALIDATION = "true";
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "test-nextauth-secret";
}
Reflect.set(process.env, "NODE_ENV", "test");

// Clear mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
