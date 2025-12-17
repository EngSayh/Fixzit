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

  it("merges orgId into existing first $match stage", async () => {
    const basePipeline = [{ $match: { status: "open" } }, { $group: { _id: "$status" } }];

    await aggregateWithTenantScope(model as any, "org123", basePipeline, {
      maxResults: 50,
      maxTimeMS: 5_000,
    });

    expect(aggregateMock).toHaveBeenCalledWith(
      [
        { $match: { orgId: "org123", status: "open" } }, // orgId merged into existing $match
        { $group: { _id: "$status" } },
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

  it("injects $match AFTER $search (must-be-first stage)", async () => {
    const pipeline = [
      { $search: { index: "default", text: { query: "urgent", path: "title" } } },
      { $limit: 10 },
    ];

    await aggregateWithTenantScope(model as any, "org123", pipeline);

    expect(aggregateMock).toHaveBeenCalledWith(
      [
        { $search: { index: "default", text: { query: "urgent", path: "title" } } },
        { $match: { orgId: "org123" } },
        { $limit: 10 },
      ],
      { maxTimeMS: 30_000 },
    );
  });

  it("injects $match AFTER $geoNear (must-be-first stage)", async () => {
    const pipeline = [
      { $geoNear: { near: { type: "Point", coordinates: [40, 5] }, distanceField: "dist", spherical: true } },
      { $limit: 5 },
    ];

    await aggregateWithTenantScope(model as any, "org123", pipeline);

    expect(aggregateMock).toHaveBeenCalledWith(
      [
        { $geoNear: { near: { type: "Point", coordinates: [40, 5] }, distanceField: "dist", spherical: true } },
        { $match: { orgId: "org123" } },
        { $limit: 5 },
      ],
      { maxTimeMS: 30_000 },
    );
  });

  it("injects $match AFTER $vectorSearch (must-be-first stage)", async () => {
    const pipeline = [
      { $vectorSearch: { index: "vector_idx", path: "embedding", queryVector: [0.1, 0.2], numCandidates: 100 } },
    ];

    await aggregateWithTenantScope(model as any, "org123", pipeline);

    const [actualPipeline] = aggregateMock.mock.calls[0];
    expect(actualPipeline[0]).toHaveProperty("$vectorSearch");
    expect(actualPipeline[1]).toEqual({ $match: { orgId: "org123" } });
  });
});
