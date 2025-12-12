/**
 * Tests for safe-fetch utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  safeFetch,
  safePost,
  safePut,
  safePatch,
  safeDelete,
} from "@/lib/utils/safe-fetch";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("safeFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns data on successful JSON response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ users: ["John", "Jane"] }),
      headers: new Headers({ "content-length": "30" }),
    });

    const result = await safeFetch<{ users: string[] }>("/api/users");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.users).toEqual(["John", "Jane"]);
      expect(result.status).toBe(200);
    }
  });

  it("handles HTTP error responses", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "User not found" }),
    });

    const result = await safeFetch("/api/users/999");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("User not found");
      expect(result.status).toBe(404);
    }
  });

  it("handles non-JSON error response bodies", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("Not JSON")),
    });

    const result = await safeFetch("/api/error");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("HTTP 500: Internal Server Error");
    }
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await safeFetch("/api/offline");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Network error: Unable to reach server");
      expect(result.status).toBe(0);
    }
  });

  it("handles timeout", async () => {
    vi.useFakeTimers();

    mockFetch.mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new DOMException("Aborted", "AbortError"));
          }, 100);
        })
    );

    const resultPromise = safeFetch("/api/slow", { timeoutMs: 50 });

    // Advance timers
    await vi.advanceTimersByTimeAsync(100);

    const result = await resultPromise;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("timed out");
    }
  });

  it("handles 204 No Content response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers({ "content-length": "0" }),
    });

    const result = await safeFetch("/api/delete-success");

    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
  });

  it("handles JSON parse errors in successful response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-length": "10" }),
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const result = await safeFetch("/api/bad-json");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Failed to parse response as JSON");
    }
  });

  it("includes tenant ID header when provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      headers: new Headers({ "content-length": "2" }),
    });

    await safeFetch("/api/tenant-data", { tenantId: "org-123" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tenant-data",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-tenant-id": "org-123",
        }),
      })
    );
  });
});

describe("safePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends POST request with JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 1, name: "John" }),
      headers: new Headers({ "content-length": "20" }),
    });

    const result = await safePost<{ id: number; name: string }>(
      "/api/users",
      { name: "John" }
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users",
      expect.objectContaining({
        method: "POST",
        body: '{"name":"John"}',
      })
    );
    expect(result.ok).toBe(true);
  });
});

describe("safePut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends PUT request with JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
      headers: new Headers({ "content-length": "15" }),
    });

    await safePut("/api/users/1", { name: "Jane" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users/1",
      expect.objectContaining({
        method: "PUT",
        body: '{"name":"Jane"}',
      })
    );
  });
});

describe("safePatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends PATCH request with JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ patched: true }),
      headers: new Headers({ "content-length": "15" }),
    });

    await safePatch("/api/users/1", { email: "new@example.com" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users/1",
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });
});

describe("safeDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers({ "content-length": "0" }),
    });

    const result = await safeDelete("/api/users/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/users/1",
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(result.ok).toBe(true);
  });
});
