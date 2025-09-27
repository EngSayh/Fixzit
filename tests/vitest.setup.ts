import { createRequire } from "module";
import { vi, expect } from "vitest";

const require = createRequire(import.meta.url);

try {
  require("tsconfig-paths/register");
} catch (error) {
  const ciValue = process.env.CI;
  const isCI = typeof ciValue === "string" && ciValue.toLowerCase() !== "false" && ciValue !== "0";
  if (!isCI) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn("tsconfig-paths/register not loaded; falling back to Vitest aliases", message);
  }
}

type JestLike = typeof vi & {
  mock: typeof vi.mock;
  doMock: typeof vi.doMock;
  fn: typeof vi.fn;
  spyOn: typeof vi.spyOn;
  clearAllMocks: typeof vi.clearAllMocks;
  resetAllMocks: typeof vi.resetAllMocks;
  restoreAllMocks: typeof vi.restoreAllMocks;
  resetModules: typeof vi.resetModules;
  useFakeTimers: typeof vi.useFakeTimers & (() => ReturnType<typeof vi.useFakeTimers>);
  useRealTimers: typeof vi.useRealTimers;
  setSystemTime: typeof vi.setSystemTime;
  advanceTimersByTime: typeof vi.advanceTimersByTime;
  requireMock: <T = unknown>(moduleId: string) => T;
  dontMock: (moduleId: string) => void;
};

const fakeTimersWrapper = (...args: Parameters<typeof vi.useFakeTimers>) => {
  const clock = viUseFakeTimers(...args);
  return Object.assign(clock, {
    setSystemTime: clock.setSystemTime?.bind(clock),
  });
};

const moduleFactories = new Map<string, unknown>();

const viMock = vi.mock.bind(vi);
const viDoMock = vi.doMock.bind(vi);
const viUnmock = vi.unmock.bind(vi);
const viFn = vi.fn.bind(vi);
const viSpyOn = vi.spyOn.bind(vi);
const viClearAllMocks = vi.clearAllMocks.bind(vi);
const viResetAllMocks = vi.resetAllMocks.bind(vi);
const viRestoreAllMocks = vi.restoreAllMocks.bind(vi);
const viResetModules = vi.resetModules.bind(vi);
const viUseFakeTimers = vi.useFakeTimers.bind(vi);
const viUseRealTimers = vi.useRealTimers.bind(vi);
const viSetSystemTime = vi.setSystemTime.bind(vi);
const viAdvanceTimersByTime = vi.advanceTimersByTime.bind(vi);

const MOCK_DB_MODULE_IDS = new Set([
  "@/src/lib/mockDb",
  "../src/lib/mockDb",
  "../src/lib/mockDb.js",
]);

interface MockDbModuleLike {
  MockDatabase?: {
    getCollection: (name: string) => unknown[];
    setCollection: (name: string, data: unknown[]) => void;
  };
}

type GlobalWithMarketplaceMock = typeof globalThis & {
  __FIXZIT_MARKETPLACE_DB_MOCK__?: MockDbModuleLike['MockDatabase'];
};

const globalMarketplaceEnv = globalThis as GlobalWithMarketplaceMock;

const cacheMockDatabase = (moduleId: string, result: unknown) => {
  if (!MOCK_DB_MODULE_IDS.has(moduleId)) {
    return;
  }
  const maybeDb = (result as MockDbModuleLike | undefined)?.MockDatabase;
  if (maybeDb) {
    globalMarketplaceEnv.__FIXZIT_MARKETPLACE_DB_MOCK__ = maybeDb;
  }
};

const jestCompat: JestLike = Object.assign(vi, {
  mock(moduleId: string, factory?: () => unknown, options?: { virtual?: boolean }) {
    if (typeof factory === "function") {
      const wrappedFactory = () => {
        try {
          const result = factory();
          moduleFactories.set(moduleId, result);
          cacheMockDatabase(moduleId, result);
          return result;
        } catch (error) {
          moduleFactories.delete(moduleId);
          throw error;
        }
      };
      return viMock(moduleId, wrappedFactory, options);
    }
    moduleFactories.delete(moduleId);
    return viMock(moduleId, undefined, options);
  },
  doMock(moduleId: string, factory?: () => unknown, options?: { virtual?: boolean }) {
    if (typeof factory === "function") {
      const wrappedFactory = () => {
        try {
          const result = factory();
          moduleFactories.set(moduleId, result);
          cacheMockDatabase(moduleId, result);
          return result;
        } catch (error) {
          moduleFactories.delete(moduleId);
          throw error;
        }
      };
      return viDoMock(moduleId, wrappedFactory, options);
    }
    moduleFactories.delete(moduleId);
    return viDoMock(moduleId, undefined, options);
  },
  fn: viFn,
  spyOn: viSpyOn,
  clearAllMocks: viClearAllMocks,
  resetAllMocks: viResetAllMocks,
  restoreAllMocks: viRestoreAllMocks,
  resetModules: ((...args: Parameters<typeof vi.resetModules>) => {
    moduleFactories.clear();
    delete globalMarketplaceEnv.__FIXZIT_MARKETPLACE_DB_MOCK__;
    return viResetModules(...args);
  }) as JestLike["resetModules"],
  useFakeTimers: ((...args: Parameters<typeof vi.useFakeTimers>) => fakeTimersWrapper(...args)) as JestLike["useFakeTimers"],
  useRealTimers: viUseRealTimers,
  setSystemTime: viSetSystemTime,
  advanceTimersByTime: viAdvanceTimersByTime,
  requireMock: <T = unknown>(moduleId: string): T => {
    if (typeof moduleId === "string" && moduleFactories.has(moduleId)) {
      return moduleFactories.get(moduleId) as T;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(moduleId) as T;
  },
  dontMock: (moduleId: string) => {
    viUnmock(moduleId);
    moduleFactories.delete(moduleId);
  },
});

// Additional helpers to ease migration from Jest APIs.
(jestCompat as any).mocked = <T>(item: T) => item;

Object.defineProperty(globalThis, "jest", {
  value: jestCompat,
  writable: false,
});

// Re-export vitest's expect for TypeScript to pick up matchers when using jest.expect
Object.defineProperty(globalThis, "expect", {
  value: expect,
  writable: false,
});

// Module path aliases are handled via tsconfig-paths/register to avoid
// monkey-patching Node.js internals. This keeps resolution logic aligned with
// the TypeScript configuration and Vitest's own alias support.
