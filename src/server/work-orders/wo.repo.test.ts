import { describe, it, expect, beforeEach, vi } from "vitest"; // If repo uses Jest, replace with '@jest/globals'
import type { Prisma } from "@prisma/client";

// Under test
// Assuming implementation lives alongside as 'wo.repo.ts'. Adjust path if different in this repo.
import * as repo from "./wo.repo";

// Mock prisma client module
vi.mock("@/server/db/client", () => {
  // create granular spies for methods used
  const findFirst = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const findUnique = vi.fn();
  const findMany = vi.fn();

  // $transaction has 2 overloads; we only use callback form plus options
  const $transaction = vi.fn(async (cb: any, options?: any) => {
    // emulate a tx object exposing a subset of prisma APIs used in code
    const tx = {
      workOrder: { findFirst, create }
    };
    const result = await cb(tx);
    // Attach for assertions
    ($transaction as any).__lastOptions = options;
    return result;
  });

  const prisma = {
    $transaction,
    workOrder: { findFirst, create, update, findUnique, findMany }
  };

  return { prisma };
});

type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof vi.fn>
    : T[K] extends object
      ? DeepMocked<T[K]>
      : T[K];
};

describe("wo.repo", () => {
  let prisma: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("@/server/db/client");
    prisma = (mod as any).prisma as DeepMocked<typeof mod["prisma"]>;
  });

  describe("woCreate", () => {
    it("creates first work order with code WO-000001 when none exists", async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce(null);
      prisma.workOrder.create.mockImplementationOnce(async ({ data }: any) => data);

      const input = {
        tenantId: "t1",
        title: "First",
        description: "d",
        status: "OPEN"
      } as any;

      const result = await repo.woCreate(input);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // verify isolation level passed in transaction
      const { Prisma: PrismaNS } = await import("@prisma/client");
      const lastOptions = (prisma.$transaction as any).__lastOptions;
      expect(lastOptions).toEqual({ isolationLevel: PrismaNS.TransactionIsolationLevel.Serializable });

      // ensure findFirst searched latest by code desc scoped by tenant
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { tenantId: input.tenantId },
        orderBy: { code: "desc" },
        select: { code: true }
      });

      // ensure code padded to 6 and merged to data
      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ...input, code: "WO-000001" })
      });
      expect(result).toEqual(expect.objectContaining({ ...input, code: "WO-000001" }));
    });

    it("increments latest code when one exists (WO-000123 -> WO-000124)", async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce({ code: "WO-000123" });
      prisma.workOrder.create.mockImplementationOnce(async ({ data }: any) => data);

      const input = {
        tenantId: "t1",
        title: "Second",
        description: "d2",
        status: "OPEN"
      } as any;

      const result = await repo.woCreate(input);

      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: "WO-000124" })
      });
      expect(result.code).toBe("WO-000124");
    });

    it("handles latest code with extra digits and continues padding (WO-001234 -> WO-001235)", async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce({ code: "WO-001234" });
      prisma.workOrder.create.mockImplementationOnce(async ({ data }: any) => data);

      const input = {
        tenantId: "t1",
        title: "Third",
        description: "d3",
        status: "OPEN"
      } as any;

      const result = await repo.woCreate(input);

      expect(result.code).toBe("WO-001235");
    });

    it("ignores malformed latest code and resets to WO-000001", async () => {
      prisma.workOrder.findFirst.mockResolvedValueOnce({ code: "BADCODE" });
      prisma.workOrder.create.mockImplementationOnce(async ({ data }: any) => data);

      const input = {
        tenantId: "t9",
        title: "Reset",
        description: "x",
        status: "OPEN"
      } as any;

      const result = await repo.woCreate(input);

      expect(result.code).toBe("WO-000001");
    });
  });

  describe("woUpdate", () => {
    it("delegates to prisma.workOrder.update with correct args", async () => {
      const updated = { id: "id1", title: "New", status: "CLOSED" };
      prisma.workOrder.update.mockResolvedValueOnce(updated);

      const res = await repo.woUpdate("id1", { title: "New", status: "CLOSED" } as any);

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: "id1" },
        data: { title: "New", status: "CLOSED" }
      });
      expect(res).toBe(updated);
    });
  });

  describe("woGet", () => {
    it("fetches by id using findUnique", async () => {
      const wo = { id: "id2", code: "WO-000777" };
      prisma.workOrder.findUnique.mockResolvedValueOnce(wo);

      const res = await repo.woGet("id2");

      expect(prisma.workOrder.findUnique).toHaveBeenCalledWith({ where: { id: "id2" } });
      expect(res).toBe(wo);
    });
  });

  describe("woList", () => {
    it("lists by tenant with no filters, ordered desc and limited to 200", async () => {
      const rows = [{ id: "a" }, { id: "b" }];
      prisma.workOrder.findMany.mockResolvedValueOnce(rows as any);

      const res = await repo.woList("t123");

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: "t123",
          AND: [{}, {}]
        },
        orderBy: { createdAt: "desc" },
        take: 200
      });
      expect(res).toBe(rows);
    });

    it("applies q filter to title and description (case-insensitive)", async () => {
      prisma.workOrder.findMany.mockResolvedValueOnce([] as any);

      await repo.woList("t123", "pump");

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "t123",
            AND: [
              {
                OR: [
                  { title: { contains: "pump", mode: "insensitive" } },
                  { description: { contains: "pump", mode: "insensitive" } }
                ]
              },
              {}
            ]
          })
        })
      );
    });

    it("applies status filter when provided", async () => {
      prisma.workOrder.findMany.mockResolvedValueOnce([] as any);

      await repo.woList("t123", undefined, "CLOSED");

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: "t123",
            AND: [{}, { status: "CLOSED" as any }]
          })
        })
      );
    });

    it("applies both q and status filters together", async () => {
      prisma.workOrder.findMany.mockResolvedValueOnce([] as any);

      await repo.woList("t123", "motor", "OPEN");

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: "t123",
          AND: [
            {
              OR: [
                { title: { contains: "motor", mode: "insensitive" } },
                { description: { contains: "motor", mode: "insensitive" } }
              ]
            },
            { status: "OPEN" as any }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 200
      });
    });
  });
});