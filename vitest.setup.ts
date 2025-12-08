// Global test setup for Vitest with Jest compatibility
import React from "react";
import { TextEncoder, TextDecoder } from "node:util";
import { render } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { vi, beforeAll, afterAll, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Polyfill TextEncoder/TextDecoder for environments where global objects are missing
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder =
    TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Jest compatibility: assign vi to globalThis.jest for legacy test code
// Using Object.defineProperty to avoid TypeScript conflicts with @types/jest
Object.defineProperty(globalThis, 'jest', {
  value: vi,
  writable: true,
  configurable: true,
});

const MONGO_MEMORY_LAUNCH_TIMEOUT_MS = Number(
  process.env.MONGO_MEMORY_LAUNCH_TIMEOUT ?? "60000",
);

if (!process.env.SKIP_ENV_VALIDATION) {
  process.env.SKIP_ENV_VALIDATION = "true";
}

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "test-nextauth-secret";
}

// Prevent jsdom "navigation to another Document" warnings in tests that click anchors
const originalLocation =
  typeof window !== "undefined" ? window.location : undefined;
const originalOpen = typeof window !== "undefined" ? window.open : undefined;

beforeAll(() => {
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        assign: vi.fn(),
        replace: vi.fn(),
        href: "",
      },
      writable: true,
    });
    vi.stubGlobal("open", vi.fn());
  }
});

afterAll(() => {
  if (typeof window !== "undefined" && originalLocation) {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  }
  if (originalOpen) {
    vi.stubGlobal("open", originalOpen);
  }
});

// --- Mock Modules ---

// Mock @/lib/mongo when SKIP_GLOBAL_MONGO is true (for pure domain tests)
if (process.env.SKIP_GLOBAL_MONGO === "true") {
  vi.mock("@/lib/mongo", () => ({
    db: Promise.resolve(null),
    connectDb: vi.fn().mockResolvedValue(null),
    connectMongo: vi.fn().mockResolvedValue(null),
    getDatabase: vi.fn().mockResolvedValue({
      collection: () => ({
        findOne: vi.fn(),
        find: vi.fn(),
        insertOne: vi.fn(),
        updateOne: vi.fn(),
        deleteOne: vi.fn(),
      }),
    }),
  }));
}

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
vi.mock("bcryptjs", () => ({
  hash: vi.fn(async (pwd: string) => `hashed:${pwd}`),
  compare: vi.fn(
    async (pwd: string, hashed: string) => hashed === `hashed:${pwd}`,
  ),
}));

// MOCK NEXT-AUTH (Fixes 'useSession' errors)
// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const TEST_EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: "test-user-id",
        email: `admin@${TEST_EMAIL_DOMAIN}`,
        name: "Test Admin",
        role: "SUPER_ADMIN",
        orgId: "test-org-id",
      },
    },
    status: "authenticated",
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// Mock next/navigation for App Router hooks
vi.mock("next/navigation", () => {
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
      pathname: "/fm/dashboard",
      query: {},
      asPath: "/fm/dashboard",
    }),
    usePathname: () => "/fm/dashboard",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    notFound: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT: ${url}`);
    }),
  };
});

vi.mock("@/lib/queues/setup", () => ({
  QUEUE_NAMES: {
    BUY_BOX_RECOMPUTE: "souq:buybox-recompute",
    AUTO_REPRICER: "souq:auto-repricer",
    SETTLEMENT: "souq:settlement",
    INVENTORY_HEALTH: "souq:inventory-health",
    ADS_AUCTION: "souq:ads-auction",
    POLICY_SWEEP: "souq:policy-sweep",
    SEARCH_INDEX: "souq:search-index",
    ACCOUNT_HEALTH: "souq:account-health",
    NOTIFICATIONS: "souq:notifications",
  },
  addJob: vi.fn(async () => undefined),
  getQueue: vi.fn(),
  createWorker: vi.fn(),
}));

export {};

// The global test functions are already available through @types/jest
// No need to redeclare them to avoid type conflicts

// Some test imports may end up with ESM/CJS interop where the default export
// is the Mongoose model (module.default) but tests expect methods on the
// module variable directly. Normalize common finance model modules so that
// `Journal.deleteMany`, etc., are available regardless of import interop.
(async () => {
  try {
    const journalModule = await import("@/server/models/finance/Journal");
    // 🔒 TYPE SAFETY: Use unknown for dynamic module import
    const JournalModel =
      (journalModule as { default?: unknown }).default || journalModule;
    // Ensure deleteMany exists on the model (alias to collection.deleteMany if needed)
    if (
      JournalModel &&
      typeof (JournalModel as Record<string, unknown>).deleteMany !==
        "function" &&
      (JournalModel as { collection?: { deleteMany?: unknown } }).collection &&
      typeof (JournalModel as { collection: { deleteMany: unknown } })
        .collection.deleteMany === "function"
    ) {
      // Add deleteMany alias with proper typing
      (JournalModel as Record<string, unknown>).deleteMany = (
        ...args: unknown[]
      ) =>
        (
          JournalModel as {
            collection: { deleteMany: (..._args: unknown[]) => unknown };
          }
        ).collection.deleteMany(...args);
    }
  } catch {
    // Non-fatal; only needed for tests that import these modules
  }

  try {
    const ledgerModule = await import("@/server/models/finance/LedgerEntry");
    const LedgerModel =
      (ledgerModule as { default?: unknown }).default || ledgerModule;
    if (
      LedgerModel &&
      typeof (LedgerModel as Record<string, unknown>).deleteMany !==
        "function" &&
      (LedgerModel as { collection?: { deleteMany?: unknown } }).collection &&
      typeof (LedgerModel as { collection: { deleteMany: unknown } }).collection
        .deleteMany === "function"
    ) {
      (LedgerModel as Record<string, unknown>).deleteMany = (
        ...args: unknown[]
      ) =>
        (
          LedgerModel as {
            collection: { deleteMany: (..._args: unknown[]) => unknown };
          }
        ).collection.deleteMany(...args);
    }
  } catch {
    // Non-fatal
  }

  try {
    const chartModule = await import("@/server/models/finance/ChartAccount");
    const ChartModel =
      (chartModule as { default?: unknown }).default || chartModule;
    if (
      ChartModel &&
      typeof (ChartModel as Record<string, unknown>).deleteMany !==
        "function" &&
      (ChartModel as { collection?: { deleteMany?: unknown } }).collection &&
      typeof (ChartModel as { collection: { deleteMany: unknown } }).collection
        .deleteMany === "function"
    ) {
      // 🔒 TYPE SAFETY: Use unknown[] for variadic args
      (ChartModel as Record<string, unknown>).deleteMany = (
        ...args: unknown[]
      ) =>
        (
          ChartModel as {
            collection: { deleteMany: (..._args: unknown[]) => unknown };
          }
        ).collection.deleteMany(...args);
    }
  } catch {
    // Non-fatal
  }
})();

type NextAppRouteHandler<
  TParams extends Record<string, string> = Record<string, string>,
> = (
  req: NextRequest,
  ctx: { params: TParams },
) => Promise<Response | NextResponse>;

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Record<string, string> },
) => Promise<Response | NextResponse>;

const lazyRoute = <T extends Record<string, string>>(
  loader: () => Promise<Record<string, unknown>>,
  key: string,
): RouteHandler => {
  return async (req, ctx) => {
    const mod = await loader();
    const handler = mod[key] as NextAppRouteHandler<T> | undefined;
    if (!handler) {
      return new Response("Handler not implemented", { status: 500 });
    }
    return handler(req, ctx as { params: T });
  };
};

interface RouteConfig {
  pattern: RegExp;
  paramNames: string[];
  handlers: Partial<Record<string, RouteHandler | undefined>>;
}

const apiRoutes: RouteConfig[] = [
  {
    pattern: /^\/api\/souq\/claims$/,
    paramNames: [],
    handlers: {
      GET: lazyRoute(() => import("@/app/api/souq/claims/route"), "GET"),
      POST: lazyRoute(() => import("@/app/api/souq/claims/route"), "POST"),
    },
  },
  {
    pattern: /^\/api\/souq\/claims\/([^/]+)$/,
    paramNames: ["id"],
    handlers: {
      GET: lazyRoute(() => import("@/app/api/souq/claims/[id]/route"), "GET"),
      PUT: lazyRoute(() => import("@/app/api/souq/claims/[id]/route"), "PUT"),
    },
  },
  {
    pattern: /^\/api\/souq\/claims\/([^/]+)\/evidence$/,
    paramNames: ["id"],
    handlers: {
      POST: lazyRoute(
        () => import("@/app/api/souq/claims/[id]/evidence/route"),
        "POST",
      ),
    },
  },
  {
    pattern: /^\/api\/souq\/claims\/([^/]+)\/response$/,
    paramNames: ["id"],
    handlers: {
      POST: lazyRoute(
        () => import("@/app/api/souq/claims/[id]/response/route"),
        "POST",
      ),
    },
  },
  {
    pattern: /^\/api\/souq\/claims\/([^/]+)\/decision$/,
    paramNames: ["id"],
    handlers: {
      POST: lazyRoute(
        () => import("@/app/api/souq/claims/[id]/decision/route"),
        "POST",
      ),
    },
  },
  {
    pattern: /^\/api\/souq\/claims\/([^/]+)\/appeal$/,
    paramNames: ["id"],
    handlers: {
      POST: lazyRoute(
        () => import("@/app/api/souq/claims/[id]/appeal/route"),
        "POST",
      ),
    },
  },
];

function matchRoute(pathname: string) {
  for (const route of apiRoutes) {
    const match = pathname.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, idx) => {
        params[name] = match[idx + 1];
      });
      return { route, params };
    }
  }
  return null;
}

const originalFetch = globalThis.fetch.bind(globalThis);

const mockFetch: typeof globalThis.fetch = async (input, init) => {
  const requestInit = init ?? {};

  const resolvedUrl =
    input instanceof Request
      ? new URL(input.url)
      : typeof input === "string" || input instanceof URL
        ? new URL(input.toString())
        : new URL(String((input as { url?: string }).url ?? input));

  if (resolvedUrl.origin !== "http://localhost:3000") {
    return originalFetch(input as RequestInfo, init);
  }

  const match = matchRoute(resolvedUrl.pathname);
  if (!match) {
    return new Response("Not Found", { status: 404 });
  }

  const method = (
    requestInit.method ?? (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  const handler = match.route.handlers[method];
  if (!handler) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const request =
    input instanceof Request
      ? new Request(input, requestInit)
      : new Request(resolvedUrl.toString(), requestInit);

  const requestWithNext = request as NextRequest & {
    nextUrl?: NextRequest["nextUrl"];
  };
  requestWithNext.nextUrl = resolvedUrl as unknown as NextRequest["nextUrl"];

  try {
    return await handler(requestWithNext, { params: match.params });
  } catch (error) {
    logger.error("Mock fetch handler failed", error as Error);
    return new Response("Internal Mock Error", { status: 500 });
  }
};

globalThis.fetch = mockFetch;

// --- MongoDB Memory Server Setup ---
const isJsdomEnv = typeof window !== "undefined" && typeof document !== "undefined";
const forceMongo =
  process.env.SKIP_GLOBAL_MONGO === "false" || process.env.FORCE_GLOBAL_MONGO === "true";
// Default: skip MongoMemoryServer in jsdom unless explicitly forced via env above.
const shouldUseInMemoryMongo = forceMongo || (!isJsdomEnv && process.env.SKIP_GLOBAL_MONGO !== "true");
let mongoServer: MongoMemoryServer | undefined;
const mongoStartAttempts = Number(process.env.MONGO_MEMORY_ATTEMPTS || "3");

async function startMongoMemoryServer() {
  for (let attempt = 1; attempt <= mongoStartAttempts; attempt++) {
    try {
      mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: "fixzit-test",
          launchTimeout: MONGO_MEMORY_LAUNCH_TIMEOUT_MS,
          port: 0, // let the server choose a free port
        },
      });
      return mongoServer;
    } catch (_error: unknown) {
      const error =
        _error instanceof Error ? _error : new Error(String(_error));
      const message = error.message || "";
      const isPortInUse =
        message.includes("Port") && message.includes("in use");
      if (isPortInUse && attempt < mongoStartAttempts) {
        logger.warn(
          `MongoMemoryServer port conflict (attempt ${attempt}). Retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to start MongoMemoryServer after retries");
}

/**
 * Start MongoDB Memory Server before all tests
 * Provides in-memory database for model validation tests
 */
beforeAll(async () => {
  if (!shouldUseInMemoryMongo) {
    return;
  }
  try {
    if (!mongoServer) {
      await startMongoMemoryServer();
    }

    if (!mongoServer) {
      throw new Error("Failed to start MongoDB Memory Server");
    }

    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    process.env.MONGODB_DB = "fixzit-test";
    // Ensure previous connections are closed before connecting
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri, {
      autoCreate: true,
      autoIndex: true,
    });

    logger.debug("✅ MongoDB Memory Server started:", { mongoUri });
  } catch (error) {
    logger.error("❌ Failed to start MongoDB Memory Server", error as Error);
    throw error;
  }
}, 60000); // 60 second timeout for MongoDB download on first run

/**
 * Clean up after each test to prevent data leakage between tests
 */
afterEach(async () => {
  if (!shouldUseInMemoryMongo || mongoose.connection.readyState !== 1) {
    return;
  }
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Stop MongoDB Memory Server after all tests
 */
afterAll(async () => {
  if (!shouldUseInMemoryMongo) {
    return;
  }
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
      logger.debug("MongoDB Memory Server stopped");
    }
  } catch (error) {
    logger.error("❌ Failed to stop MongoDB Memory Server", error as Error);
    throw error;
  }
}, 30000); // 30 second timeout

// Environment setup
// NODE_ENV is read-only, managed by test runner
// MongoDB-only configuration for all environments

// --- Custom Render Function (Wraps all tests) ---
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(SessionProvider, {
    session: null,
    children: React.createElement(TranslationProvider, { children }),
  });
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from "@testing-library/react";
// Override the 'render' method with our custom one
export { customRender as render };
