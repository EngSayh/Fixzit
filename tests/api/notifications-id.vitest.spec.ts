/**
 * Vitest variant of tests for app/api/notifications/[id]/route.ts
 * Testing library/framework: Vitest
 * Note: Mirrors Jest suite but uses vi.* APIs.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

let GET: any;
let PATCH: any;
let DELETE: any;

vi.mock("mongodb", async () => {
  const actual = await vi.importActual<any>("mongodb");
  return {
    ...actual,
    ObjectId: function MockObjectId(this: any, id: string) {
      this.id = id;
      return { toHexString: () => id };
    }
  };
});

const db = {
  collection: vi.fn()
};

const collection = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn()
};

vi.mock("@/lib/mongodb", () => {
  return {
    getDatabase: vi.fn()
  };
});

import { getDatabase } from "@/lib/mongodb";

function makeReqWithJson(body: any): NextRequest {
  return {
    json: async () => body
  } as unknown as NextRequest;
}

function makeParams(id: string) {
  return { params: { id } };
}

describe("API: /api/notifications/[id] (Vitest)", () => {
  beforeAll(async () => {
    try {
      const mod = await import("../../app/api/notifications/[id]/route");
      GET = mod.GET;
      PATCH = mod.PATCH;
      DELETE = mod.DELETE;
    } catch {
      try {
        const mod = await import("../../src/app/api/notifications/[id]/route");
        GET = mod.GET;
        PATCH = mod.PATCH;
        DELETE = mod.DELETE;
      } catch {
        try {
          const mod = await import("../../pages/api/notifications/[id]");
          GET = (mod as any).GET ?? (mod as any).default?.GET;
          PATCH = (mod as any).PATCH ?? (mod as any).default?.PATCH;
          DELETE = (mod as any).DELETE ?? (mod as any).default?.DELETE;
        } catch (e) {
          throw new Error(
            "Unable to locate route handlers. Adjust import path in tests/api/notifications-id.vitest.spec.ts"
          );
        }
      }
    }
  });

  beforeEach(() => {
    vi.resetAllMocks();
    (getDatabase as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(db);
    (db.collection as any).mockReturnValue(collection);
    collection.findOne.mockReset();
    collection.updateOne.mockReset();
    collection.deleteOne.mockReset();
  });

  describe("GET", () => {
    it("returns 503 when DB is unavailable", async () => {
      (getDatabase as any).mockRejectedValueOnce(new Error("down"));
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
      (getDatabase as any).mockRejectedValueOnce(new Error("down"));
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
      (getDatabase as any).mockRejectedValueOnce(new Error("down"));
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