import { vi, expect } from "vitest";
import Module from "module";
import path from "path";

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

const jestCompat: JestLike = Object.assign(vi, {
  mock(moduleId: any, factory?: any, options?: any) {
    if (typeof moduleId === "string" && typeof factory === "function") {
      const wrappedFactory = () => {
        try {
          const result = factory();
          moduleFactories.set(moduleId, result);
          if (moduleId === "@/src/lib/mockDb" || moduleId === "../src/lib/mockDb" || moduleId === "../src/lib/mockDb.js") {
            const maybeDb = (result as any)?.MockDatabase;
            if (maybeDb) {
              (globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__ = maybeDb;
            }
          }
          return result;
        } catch (error) {
          moduleFactories.delete(moduleId);
          throw error;
        }
      };
      return viMock(moduleId, wrappedFactory as any, options as any);
    }
    moduleFactories.delete(moduleId);
    return viMock(moduleId as any, factory as any, options as any);
  },
  doMock(moduleId: any, factory?: any, options?: any) {
    if (typeof moduleId === "string" && typeof factory === "function") {
      const wrappedFactory = () => {
        try {
          const result = factory();
          moduleFactories.set(moduleId, result);
          if (moduleId === "@/src/lib/mockDb" || moduleId === "../src/lib/mockDb" || moduleId === "../src/lib/mockDb.js") {
            const maybeDb = (result as any)?.MockDatabase;
            if (maybeDb) {
              (globalThis as Record<string, unknown>).__FIXZIT_MARKETPLACE_DB_MOCK__ = maybeDb;
            }
          }
          return result;
        } catch (error) {
          moduleFactories.delete(moduleId);
          throw error;
        }
      };
      return viDoMock(moduleId, wrappedFactory as any, options as any);
    }
    moduleFactories.delete(moduleId);
    return viDoMock(moduleId as any, factory as any, options as any);
  },
  fn: viFn,
  spyOn: viSpyOn,
  clearAllMocks: viClearAllMocks,
  resetAllMocks: viResetAllMocks,
  restoreAllMocks: viRestoreAllMocks,
  resetModules: ((...args: Parameters<typeof vi.resetModules>) => {
    moduleFactories.clear();
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

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    if (request === "@/src/lib/mockDb" || request.startsWith("@/src/lib/mockDb")) {
      return originalResolveFilename.call(this, request, parent, isMain, options);
    }
    const relativePath = request.slice(2);
    const basePath = path.resolve(process.cwd(), relativePath);
    const candidates = [
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.mjs`,
      `${basePath}.cjs`,
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
      path.join(basePath, "index.js"),
    ];

    for (const candidate of candidates) {
      try {
        return originalResolveFilename.call(this, candidate, parent, isMain, options);
      } catch {
        continue;
      }
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
