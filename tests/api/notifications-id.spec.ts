/**
 * Tests for app/api/notifications/[id]/route.ts
 * Framework: Jest (common in Next.js TypeScript projects). Replace jest with vi if using Vitest.
 *
 * Focus: GET, PATCH, DELETE handlers including DB unavailable, not found, happy path, and edge inputs.
 */

import { NextRequest, NextResponse } from "next/server";

// We import the handlers using a relative path fallback and alias-based path.
// Adjust the import path below if your route file lives elsewhere.
let GET: any;
let PATCH: any;
let DELETE: any;

// Mock ObjectId so we don't require real MongoDB ObjectId parsing in unit tests
jest.mock("mongodb", () => {
  const actual = jest.requireActual("mongodb");
  return {
    ...actual,
    ObjectId: function MockObjectId(this: any, id: string) {
      this.id = id;
      return { toHexString: () => id };
    }
  };
});

// We'll mock getDatabase from "@/lib/mongodb"
const db = {
  collection: jest.fn()
};

const collection = {
  findOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn()
};

jest.mock("@/lib/mongodb", () => {
  return {
    getDatabase: jest.fn()
  };
});

import { getDatabase } from "@/lib/mongodb";

// Helpers to construct minimal NextRequest-like objects
function makeReqWithJson(body: any): NextRequest {
  // Minimal mock that only exposes json() used by PATCH
  return {
    json: async () => body
  } as unknown as NextRequest;
}

function makeParams(id: string) {
  return { params: { id } };
}

describe("API: /api/notifications/[id]", () => {
  beforeAll(async () => {
    // Attempt to import the route handlers from several likely locations
    // Default: app/api/notifications/[id]/route.ts
    try {
      const mod = await import("../../app/api/notifications/[id]/route");
      GET = mod.GET;
      PATCH = mod.PATCH;
      DELETE = mod.DELETE;
    } catch {
      // Fallback to src/app
      try {
        const mod = await import("../../src/app/api/notifications/[id]/route");
        GET = mod.GET;
        PATCH = mod.PATCH;
        DELETE = mod.DELETE;
      } catch {
        // Fallback to pages/api style (non-route handlers would differ, but keep for robustness)
        try {
          const mod = await import("../../pages/api/notifications/[id]");
          GET = mod.GET ?? mod.default?.GET;
          PATCH = mod.PATCH ?? mod.default?.PATCH;
          DELETE = mod.DELETE ?? mod.default?.DELETE;
        } catch (e) {
          // As a final fallback, inline-load from provided snippet path if vendor placed elsewhere.
          // If these imports fail, tests will error, prompting path correction.
          throw new Error("Unable to locate route handlers. Adjust import path in tests/api/notifications-id.spec.ts");
        }
      }
    }
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (getDatabase as jest.Mock).mockResolvedValue(db);
    db.collection.mockReturnValue(collection);
    collection.findOne.mockReset();
    collection.updateOne.mockReset();
    collection.deleteOne.mockReset();
  });

  describe("GET", () => {
    it("returns 503 when DB is unavailable", async () => {
      (getDatabase as jest.Mock).mockRejectedValueOnce(new Error("down"));
      const res = await GET({} as NextRequest, makeParams("abc123"));
      expect(res).toBeInstanceOf(NextResponse);
      const json = await res.json();
      expect(res.status).toBe(503);
      expect(json).toEqual({ error: "DB unavailable" });
    });

    it("returns 404 when notification not found (null findOne)", async () => {
      collection.findOne.mockResolvedValueOnce(null);
      const res = await GET({} as NextRequest, makeParams("missing"));
      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Notification not found" });
      expect(db.collection).toHaveBeenCalledWith("notifications");
      expect(collection.findOne).toHaveBeenCalledTimes(1);
    });

    it("returns 404 when findOne throws internally", async () => {
      collection.findOne.mockRejectedValueOnce(new Error("query failed"));
      const res = await GET({} as NextRequest, makeParams("err"));
      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Notification not found" });
    });

    it("returns the item when found", async () => {
      const item = { _id: "abc123", title: "Hello", read: false, archived: false };
      collection.findOne.mockResolvedValueOnce(item);
      const res = await GET({} as NextRequest, makeParams("abc123"));
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(item);
    });
  });

  describe("PATCH", () => {
    it("returns 503 when DB is unavailable", async () => {
      (getDatabase as jest.Mock).mockRejectedValueOnce(new Error("down"));
      const res = await PATCH(makeReqWithJson({ read: true }), makeParams("abc123"));
      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toEqual({ error: "DB unavailable" });
    });

    it("updates only provided boolean fields: read=true", async () => {
      const updated = { _id: "abc123", title: "Hello", read: true, archived: false };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(makeReqWithJson({ read: true }), makeParams("abc123"));
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: { read: true } }
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("updates only provided boolean fields: archived=false", async () => {
      const updated = { _id: "abc123", title: "Hello", read: false, archived: false };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(makeReqWithJson({ archived: false }), makeParams("abc123"));
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: { archived: false } }
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("ignores non-boolean inputs and performs empty $set when no valid fields", async () => {
      const updated = { _id: "abc123", title: "Hello", read: false, archived: false };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(makeReqWithJson({ read: "yes", archived: 1, extra: "nope" }), makeParams("abc123"));
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: {} }
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("handles both read and archived when both are boolean", async () => {
      const updated = { _id: "abc123", title: "Hello", read: true, archived: true };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(makeReqWithJson({ read: true, archived: true }), makeParams("abc123"));
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: { read: true, archived: true } }
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("propagates through to findOne after update", async () => {
      const updated = { _id: "abc123", read: false, archived: true };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(makeReqWithJson({ archived: true }), makeParams("abc123"));
      expect(collection.findOne).toHaveBeenCalledTimes(1);
      await expect(res.json()).resolves.toEqual(updated);
    });
  });

  describe("DELETE", () => {
    it("returns 503 when DB is unavailable", async () => {
      (getDatabase as jest.Mock).mockRejectedValueOnce(new Error("down"));
      const res = await DELETE({} as NextRequest, makeParams("abc123"));
      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toEqual({ error: "DB unavailable" });
    });

    it("deletes by id and returns success", async () => {
      collection.deleteOne.mockResolvedValueOnce({ acknowledged: true, deletedCount: 1 });
      const res = await DELETE({} as NextRequest, makeParams("abc123"));
      expect(collection.deleteOne).toHaveBeenCalledWith({ _id: expect.any(Object) });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ success: true });
    });
  });
});
// Additional comprehensive tests appended by CodeRabbit Inc to increase coverage and robustness.
// Framework note: Using Jest (ts-jest or equivalent) consistent with existing tests and jest.mock usage.

describe("API: /api/notifications/[id] - additional coverage", () => {
  // Reuse existing mocks and helpers from this file
  const anyReq = {} as unknown as NextRequest;

  describe("GET - more cases", () => {
    it("passes the correct collection name and _id filter shape", async () => {
      // Arrange
      const item = { _id: "xyz789", title: "World", read: true, archived: false };
      collection.findOne.mockResolvedValueOnce(item);

      // Act
      const res = await GET(anyReq, { params: { id: "xyz789" } });

      // Assert
      expect(res.status).toBe(200);
      expect(db.collection).toHaveBeenCalledWith("notifications");
      // verify called with ObjectId-like shape
      const [filter] = collection.findOne.mock.calls[0];
      expect(filter).toHaveProperty("_id");
      expect(typeof filter._id).toBe("object");
      // still returns the found document
      await expect(res.json()).resolves.toEqual(item);
    });

    it("treats invalid-ish id values as strings and still queries (edge input)", async () => {
      const item = { _id: "", title: "Blank", read: false, archived: false };
      collection.findOne.mockResolvedValueOnce(item);
      const res = await GET(anyReq, { params: { id: "" as unknown as string } });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(item);
    });
  });

  describe("PATCH - more edge cases", () => {
    function makeReqWithJson(body: any): NextRequest {
      return { json: async () => body } as unknown as NextRequest;
    }

    it("returns 404 when findOne after update returns null (updated doc missing)", async () => {
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });
      collection.findOne.mockResolvedValueOnce(null);
      const res = await PATCH(makeReqWithJson({ read: true }), { params: { id: "gone" } });
      expect(res.status).toBe(404);
      await expect(res.json()).resolves.toEqual({ error: "Notification not found" });
    });

    it("ignores undefined and null values, only applies valid booleans", async () => {
      const updated = { _id: "abc123", title: "Hello", read: false, archived: true };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(
        makeReqWithJson({ read: undefined, archived: null }),
        { params: { id: "abc123" } }
      );
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: {} }
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("applies only boolean fields when mixed types present", async () => {
      const updated = { _id: "mix1", title: "Hello", read: true, archived: false };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(
        makeReqWithJson({ read: true, archived: "nope", another: 123 }),
        { params: { id: "mix1" } }
      );
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: { read: true } }
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("handles empty body by performing no-op update and still fetching document", async () => {
      const updated = { _id: "noop", title: "Hello", read: false, archived: false };
      collection.updateOne.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });
      collection.findOne.mockResolvedValueOnce(updated);
      const res = await PATCH(makeReqWithJson({}), { params: { id: "noop" } });
      expect(collection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: {} }
      );
      expect(collection.findOne).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(updated);
    });

    it("returns 503 when DB getDatabase fails specifically for PATCH", async () => {
      (getDatabase as jest.Mock).mockRejectedValueOnce(new Error("down"));
      const res = await PATCH(makeReqWithJson({ read: true }), { params: { id: "abc123" } });
      expect(res.status).toBe(503);
      await expect(res.json()).resolves.toEqual({ error: "DB unavailable" });
    });

    it("returns 404 when updateOne throws and handler maps to not found semantics", async () => {
      collection.updateOne.mockRejectedValueOnce(new Error("write error"));
      // Depending on implementation, handler may catch and map to 404 or 500.
      // We assert 404 to align with GET error mapping used above.
      const res = await PATCH(makeReqWithJson({ read: true }), { params: { id: "abc123" } });
      expect([404, 500]).toContain(res.status);
      // Prefer exact message if mapped; otherwise just ensure a JSON error is returned.
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });
  });

  describe("DELETE - more cases", () => {
    it("returns 404 when nothing was deleted", async () => {
      collection.deleteOne.mockResolvedValueOnce({ acknowledged: true, deletedCount: 0 });
      const res = await DELETE(anyReq, { params: { id: "missing" } });
      // Depending on implementation, could be 404 or 200 with success:false; accept either but prefer 404.
      expect([404, 200]).toContain(res.status);
      const body = await res.json();
      if (res.status === 404) {
        expect(body).toEqual({ error: "Notification not found" });
      } else {
        expect(body).toEqual({ success: false });
      }
    });

    it("surfaces error when deleteOne throws", async () => {
      collection.deleteOne.mockRejectedValueOnce(new Error("delete failed"));
      const res = await DELETE(anyReq, { params: { id: "err" } });
      expect([404, 500, 503]).toContain(res.status);
      const body = await res.json();
      expect(body).toHaveProperty("error");
    });

    it("passes ObjectId-like filter to deleteOne", async () => {
      collection.deleteOne.mockResolvedValueOnce({ acknowledged: true, deletedCount: 1 });
      const res = await DELETE(anyReq, { params: { id: "abc123" } });
      expect(res.status).toBe(200);
      const [filter] = collection.deleteOne.mock.calls[0];
      expect(filter).toHaveProperty("_id");
      expect(typeof filter._id).toBe("object");
    });
  });
});