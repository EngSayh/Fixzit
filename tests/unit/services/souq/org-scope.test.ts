import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { ObjectId as MongoObjectId } from "mongodb";
import { buildSouqOrgFilter } from "@/services/souq/org-scope";
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe("buildSouqOrgFilter", () => {
  it("returns $or with orgId and org_id for string orgId", () => {
    const filter = buildSouqOrgFilter("org-123");
    expect(filter).toMatchObject({
      $or: [
        { orgId: { $in: expect.arrayContaining(["org-123"]) } },
        { org_id: { $in: expect.arrayContaining(["org-123"]) } },
      ],
    });
  });

  it("includes both string and ObjectId candidates when orgId is a valid ObjectId string", () => {
    const oid = new MongoObjectId().toString();
    const filter = buildSouqOrgFilter(oid);
    const orgIdClause = (filter as { $or: Array<Record<string, { $in: unknown[] }>> }).$or[0].orgId.$in;
    expect(orgIdClause).toContain(oid);
    expect(orgIdClause.some((v) => v instanceof MongoObjectId)).toBe(true);
  });

  it("handles mongoose ObjectId input", () => {
    const mongooseId = new Types.ObjectId();
    const filter = buildSouqOrgFilter(mongooseId);
    const orgIdClause = (filter as { $or: Array<Record<string, { $in: unknown[] }>> }).$or[0].orgId.$in;
    expect(orgIdClause).toContain(mongooseId);
    expect(orgIdClause).toContain(mongooseId.toString());
  });

  it("returns orgless filter when allowOrgless with empty orgId", () => {
    const filter = buildSouqOrgFilter("" as string, { allowOrgless: true });
    expect(filter).toEqual({
      $or: [{ orgId: { $exists: false } }, { org_id: { $exists: false } }],
    });
  });

  it("merges candidates with orgless when allowOrgless true and orgId provided", () => {
    const filter = buildSouqOrgFilter("org-x", { allowOrgless: true });
    expect(filter).toMatchObject({
      $or: [
        { orgId: { $in: expect.arrayContaining(["org-x"]) } },
        { org_id: { $in: expect.arrayContaining(["org-x"]) } },
        { orgId: { $exists: false } },
        { org_id: { $exists: false } },
      ],
    });
  });
});
