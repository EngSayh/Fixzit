/**
 * Unit tests for api/qa/health route.
 * Testing framework: Vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as mongodbUnified from "@/lib/mongodb-unified";

vi.mock("@/lib/mongodb-unified", () => {
  const connectToDatabase = vi.fn();
  return { connectToDatabase };
});
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { POST, GET } from "@/app/api/qa/health/route";
import { logger } from "@/lib/logger";

function createMockRequest() {
  return {
    headers: { get: () => null },
    url: "http://localhost:3000/api/qa/health",
  };
}

describe("api/qa/health route - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__connectToDatabaseMock =
      vi.mocked(mongodbUnified).connectToDatabase;
  });

  afterEach(() => {
    delete (process as any).env.npm_package_version;
    delete (globalThis as any).__connectToDatabaseMock;
  });

  it("returns healthy with database status when DB connects successfully", async () => {
    const mod = vi.mocked(mongodbUnified);
    const version = "9.9.9-test";
    (process as any).env.npm_package_version = version;

    // Mock mongoose-like connection object
    const toArray = vi
      .fn()
      .mockResolvedValue([{ name: "col1" }, { name: "col2" }]);
    const listCollections = vi.fn().mockReturnValue({ toArray });
    const mockMongoose = {
      connection: {
        db: { listCollections },
      },
    };
    mod.connectToDatabase.mockResolvedValue(mockMongoose as any);

    const memSpy = vi.spyOn(process, "memoryUsage").mockReturnValue({
      rss: 100 * 1024 * 1024,
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 60 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 1 * 1024 * 1024,
    });

    const res = await GET(createMockRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.status).toBe("healthy");
    expect(body.database).toContain("connected");
    expect(body.database).toContain("2 collections");
    expect(body.version).toBe(version);

    memSpy.mockRestore();
  });

  it("returns critical (503) when DB connection fails", async () => {
    const mod = vi.mocked(mongodbUnified);
    const err = new Error("DB down");
    mod.connectToDatabase.mockRejectedValue(err);

    const res = await GET(createMockRequest() as any);
    expect(logger.error).toHaveBeenCalled();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("critical");
    expect(body.database).toBe("disconnected");
  });
});

describe("api/qa/health route - POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__connectToDatabaseMock =
      vi.mocked(mongodbUnified).connectToDatabase;
  });

  afterEach(() => {
    delete (globalThis as any).__connectToDatabaseMock;
  });

  it("returns success when DB reconnects successfully", async () => {
    const mod = vi.mocked(mongodbUnified);
    mod.connectToDatabase.mockResolvedValue(undefined as any);

    const res = await POST(createMockRequest() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Database reconnected");
  });

  it("returns failure (500) when DB reconnection fails", async () => {
    const mod = vi.mocked(mongodbUnified);
    const err = new Error("reconnect failed");
    mod.connectToDatabase.mockRejectedValue(err);

    const res = await POST(createMockRequest() as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to reconnect database");
  });
});
