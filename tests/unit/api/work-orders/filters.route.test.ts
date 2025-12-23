import { describe, expect, it } from "vitest";
import { buildWorkOrderFilter } from "@/app/api/work-orders/route";

const ORG_ID = "org-123";
const BASE_USER = { id: "user-1", orgId: ORG_ID, role: "ADMIN" };

function findOrClause(
  clauses: unknown[] | undefined,
  predicate: (entry: Record<string, unknown>) => boolean,
) {
  if (!Array.isArray(clauses)) return undefined;
  return clauses.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (!("$or" in entry) || !Array.isArray((entry as { $or: unknown[] }).$or)) {
      return false;
    }
    return (entry as { $or: Record<string, unknown>[] }).$or.some(predicate);
  });
}

describe("buildWorkOrderFilter (API)", () => {
  it("includes overdue filter using SLA deadline", () => {
    const filter = buildWorkOrderFilter(
      new URLSearchParams({ overdue: "true" }),
      ORG_ID,
      BASE_USER,
    );

    const clause = findOrClause(filter.$and as unknown[], (entry) =>
      "sla.resolutionDeadline" in entry,
    );
    expect(clause).toBeDefined();
  });

  it("includes due date range filter when provided", () => {
    const filter = buildWorkOrderFilter(
      new URLSearchParams({
        dueDateFrom: "2024-01-01",
        dueDateTo: "2024-01-31",
      }),
      ORG_ID,
      BASE_USER,
    );

    const clause = findOrClause(filter.$and as unknown[], (entry) =>
      "sla.resolutionDeadline" in entry || "dueAt" in entry || "dueDate" in entry,
    ) as { $or: Record<string, { $gte?: Date; $lte?: Date }>[] } | undefined;
    expect(clause).toBeDefined();
    const range = clause?.$or[0];
    expect(range && Object.values(range)[0]).toMatchObject({
      $gte: expect.any(Date),
      $lte: expect.any(Date),
    });
  });

  it("scopes to current user when assignedToMe=true", () => {
    const filter = buildWorkOrderFilter(
      new URLSearchParams({ assignedToMe: "true" }),
      ORG_ID,
      BASE_USER,
    );

    const clause = findOrClause(filter.$and as unknown[], (entry) =>
      Object.values(entry || {}).includes(BASE_USER.id),
    );
    expect(clause).toBeDefined();
  });

  it("adds unassigned clause when requested", () => {
    const filter = buildWorkOrderFilter(
      new URLSearchParams({ unassigned: "true" }),
      ORG_ID,
      BASE_USER,
    );

    const clause = findOrClause(filter.$and as unknown[], (entry) =>
      "assignment.assignedTo" in entry ||
      "assignment.assignedTo.userId" in entry ||
      "assigneeId" in entry ||
      "assignedTo" in entry,
    );
    expect(clause).toBeDefined();
  });

  it("filters by SLA risk statuses when slaRisk=true", () => {
    const filter = buildWorkOrderFilter(
      new URLSearchParams({ slaRisk: "true" }),
      ORG_ID,
      BASE_USER,
    );

    const clause = (filter.$and as Record<string, unknown>[] | undefined)?.find(
      (entry) => entry && typeof entry === "object" && "sla.status" in entry,
    ) as { "sla.status"?: { $in?: string[] } } | undefined;

    expect(clause?.["sla.status"]?.$in).toEqual([
      "BREACHED",
      "OVERDUE",
      "AT_RISK",
    ]);
  });

  it("combines search with other filters safely", () => {
    const filter = buildWorkOrderFilter(
      new URLSearchParams({ search: "HVAC", overdue: "true" }),
      ORG_ID,
      BASE_USER,
    );

    const searchClause = findOrClause(filter.$and as unknown[], (entry) =>
      "title" in entry || "description" in entry || "workOrderNumber" in entry,
    );
    const overdueClause = findOrClause(filter.$and as unknown[], (entry) =>
      "sla.resolutionDeadline" in entry,
    );

    expect(searchClause).toBeDefined();
    expect(overdueClause).toBeDefined();
  });
});
