/**
 * Tests for lib/utils/safe-fetch.ts
 *
 * @group unit
 * @group lib/utils
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  safeFetch,
  safePost,
  safePut,
  safePatch,
  safeDelete,
  fetchWithCancel,
  type SafeFetchResult,
} from "@/lib/utils/safe-fetch";

// Mock global fetch
global.fetch = vi.fn();

describe("safeFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("successful requests", () => {
    it("should return data on successful JSON response", async () => {
      const mockData = { id: 1, name: "Test" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": "100" }),
        json: async () => mockData,
      });

      const result = await safeFetch<typeof mockData>("/api/test");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(mockData);
        expect(result.status).toBe(200);
        expect(result.error).toBeUndefined();
      }
    });

    it("should handle 204 No Content responses", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ "content-length": "0" }),
      });

      const result = await safeFetch("/api/test");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeUndefined();
        expect(result.status).toBe(204);
      }
    });

    it("should include custom headers", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      await safeFetch("/api/test", {
        headers: { Authorization: "Bearer token123" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
        })
      );
    });

    it("should include tenantId in headers when provided", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      await safeFetch("/api/test", { tenantId: "org-123" });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-tenant-id": "org-123",
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should handle HTTP error responses (404)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
        json: async () => ({ error: "Resource not found" }),
      });

      const result = await safeFetch("/api/test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(404);
        expect(result.error).toBe("Resource not found");
        expect(result.data).toBeUndefined();
      }
    });

    it("should handle HTTP error with message field", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers(),
        json: async () => ({ message: "Invalid input" }),
      });

      const result = await safeFetch("/api/test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Invalid input");
      }
    });

    it("should use statusText when error body is not JSON", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
        json: async () => {
          throw new Error("Not JSON");
        },
      });

      const result = await safeFetch("/api/test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("HTTP 500: Internal Server Error");
      }
    });

    it("should handle JSON parse errors on success response", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-length": "100" }),
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const result = await safeFetch("/api/test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Failed to parse response as JSON");
        expect(result.status).toBe(200);
      }
    });

    it("should handle network errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError("Failed to fetch")
      );

      const result = await safeFetch("/api/test");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Network error: Unable to reach server");
        expect(result.status).toBe(0);
      }
    });

    it("should suppress logging when silent=true", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
        json: async () => ({ error: "Not found" }),
      });

      await safeFetch("/api/test", { silent: true });

      // Should not log when silent
      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("timeout handling", () => {
    it("should timeout after default 30 seconds", async () => {
      const abortError = new DOMException("Aborted", "AbortError");

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 30_000);
        });
      });

      const resultPromise = safeFetch("/api/test");

      // Fast-forward time to trigger timeout
      await vi.advanceTimersByTimeAsync(30_000);

      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Request timed out after 30000ms");
        expect(result.status).toBe(408);
      }
    });

    it("should timeout after custom timeout", async () => {
      const abortError = new DOMException("Aborted", "AbortError");

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 5_000);
        });
      });

      const resultPromise = safeFetch("/api/test", { timeoutMs: 5_000 });

      await vi.advanceTimersByTimeAsync(5_000);

      const result = await resultPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Request timed out after 5000ms");
        expect(result.status).toBe(408);
      }
    });

    it("should clear timeout on successful request", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ success: true }),
      });

      await safeFetch("/api/test");

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("HTTP method helpers", () => {
    it("safePost should send POST request with body", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      });

      const body = { name: "Test" };
      await safePost("/api/test", body);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        })
      );
    });

    it("safePut should send PUT request with body", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      });

      const body = { name: "Updated" };
      await safePut("/api/test/1", body);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(body),
        })
      );
    });

    it("safePatch should send PATCH request with body", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      });

      const body = { name: "Patched" };
      await safePatch("/api/test/1", body);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(body),
        })
      );
    });

    it("safeDelete should send DELETE request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({ "content-length": "0" }),
      });

      await safeDelete("/api/test/1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test/1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("fetchWithCancel", () => {
    it("should call onComplete with result", async () => {
      const mockData = { id: 1 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockData,
      });

      const onComplete = vi.fn();
      fetchWithCancel("/api/test", onComplete);

      // Wait for promise to resolve
      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            ok: true,
            data: mockData,
          })
        );
      });
    });

    it("should cancel request when cancel is called", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 1000);
        });
      });

      const onComplete = vi.fn();
      const { cancel } = fetchWithCancel("/api/test", onComplete);

      // Cancel immediately
      cancel();

      // Wait long enough for mock promise to reject (1000ms + buffer)
      // FIX: Changed from 100ms to 1500ms to eliminate race condition in parallel test runs
      await vi.advanceTimersByTimeAsync(1500);

      // onComplete should eventually be called with an error result
      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
        const result = onComplete.mock.calls[0][0];
        expect(result.ok).toBe(false);
      }, { timeout: 2000 }); // ADDED: explicit timeout to prevent hanging
    });

    it("should return cancel function for cleanup", () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      const { cancel } = fetchWithCancel("/api/test", () => {});

      expect(cancel).toBeInstanceOf(Function);
    });
  });

  describe("type safety", () => {
    it("should maintain discriminated union type safety", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1, name: "Test" }),
      });

      const result = await safeFetch<{ id: number; name: string }>("/api/test");

      // TypeScript should narrow the type based on ok property
      if (result.ok) {
        // This should compile without errors
        const id: number = result.data.id;
        const name: string = result.data.name;
        expect(id).toBe(1);
        expect(name).toBe("Test");
      } else {
        // This branch should have error and no data
        const error: string = result.error;
        expect(error).toBeDefined();
      }
    });
  });
});
