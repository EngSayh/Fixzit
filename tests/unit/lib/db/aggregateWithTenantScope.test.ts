import { beforeEach, describe, expect, it, vi } from "vitest";
import { aggregateWithTenantScope } from "@/lib/db/aggregateWithTenantScope";

describe("aggregateWithTenantScope", () => {
  const aggregateMock = vi.fn();
  const model = { aggregate: aggregateMock };

  beforeEach(() => {
    vi.clearAllMocks();
    aggregateMock.mockResolvedValue([]);
  });

  it("throws when orgId is missing", async () => {
    await expect(
      aggregateWithTenantScope(model as any, "" as string, []),
    ).rejects.toThrow("orgId is required");
  });

  it("prepends orgId match and applies limit/maxTimeMS", async () => {
    const basePipeline = [{ $match: { status: "open" } }, { $group: { _id: "$status" } }];

    await aggregateWithTenantScope(model as any, "org123", basePipeline, {
      maxResults: 50,
      maxTimeMS: 5_000,
    });

    expect(aggregateMock).toHaveBeenCalledWith(
      [
        { $match: { orgId: "org123" } },
        ...basePipeline,
        { $limit: 50 },
      ],
      { maxTimeMS: 5_000 },
    );

    // Ensure original pipeline not mutated
    expect(basePipeline).toEqual([
      { $match: { status: "open" } },
      { $group: { _id: "$status" } },
    ]);
  });

  it("uses default maxTimeMS when not provided", async () => {
    await aggregateWithTenantScope(model as any, "org123", []);
    expect(aggregateMock).toHaveBeenCalledWith(
      [{ $match: { orgId: "org123" } }],
      { maxTimeMS: 30_000 },
    );
  });
});
