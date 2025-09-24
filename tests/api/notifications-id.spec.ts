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