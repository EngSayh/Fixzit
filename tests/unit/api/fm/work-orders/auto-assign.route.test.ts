import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";
import { makePostRequest } from "@/tests/helpers/request";

vi.mock("@/lib/mongodb-unified", () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock("@/lib/middleware/rate-limit", () => ({
  enforceRateLimit: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: vi.fn(),
}));

vi.mock("@/services/fm/auto-assignment-engine", () => ({
  autoAssignWorkOrder: vi.fn(),
}));

vi.mock("@/app/api/fm/utils/fm-auth", () => ({
  requireFmAbility: vi.fn(),
}));

vi.mock("@/app/api/fm/utils/tenant", () => ({
  resolveTenantId: vi.fn(),
  isCrossTenantMode: vi.fn(() => false),
}));

vi.mock("@/app/api/fm/work-orders/utils", async () => {
  const actual = await vi.importActual<typeof import("@/app/api/fm/work-orders/utils")>(
    "@/app/api/fm/work-orders/utils",
  );
  return {
    ...actual,
    recordTimelineEntry: vi.fn(),
  };
});

import { POST } from "@/app/api/fm/work-orders/auto-assign/route";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { autoAssignWorkOrder } from "@/services/fm/auto-assignment-engine";
import { requireFmAbility } from "@/app/api/fm/utils/fm-auth";
import { resolveTenantId, isCrossTenantMode } from "@/app/api/fm/utils/tenant";
import { recordTimelineEntry } from "@/app/api/fm/work-orders/utils";

const WORK_ORDER_ID = "507f1f77bcf86cd799439011";
const originalEnv = { ...process.env };

describe("api/fm/work-orders/auto-assign route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    (connectToDatabase as vi.Mock).mockResolvedValue(undefined);
    (enforceRateLimit as vi.Mock).mockReturnValue(null);
    (resolveTenantId as vi.Mock).mockReturnValue({ tenantId: "tenant-1", source: "session" });
    (isCrossTenantMode as vi.Mock).mockReturnValue(false);
    (isFeatureEnabled as vi.Mock).mockReturnValue(false);
    (autoAssignWorkOrder as vi.Mock).mockResolvedValue({
      success: false,
      error: "Auto-assignment is disabled",
    });
    (recordTimelineEntry as vi.Mock).mockResolvedValue(undefined);
    (requireFmAbility as vi.Mock).mockImplementation(() => async () => ({
      id: "user-1",
      role: "FM_MANAGER",
      orgId: "tenant-1",
      tenantId: "tenant-1",
    }));
  });

  it("returns guard response when ability denies access", async () => {
    const guardResponse = NextResponse.json({ error: "forbidden" }, { status: 403 });
    (requireFmAbility as vi.Mock).mockImplementation(() => async () => guardResponse);

    const req = makePostRequest(
      "https://fixzit.test/api/fm/work-orders/auto-assign",
      { workOrderId: WORK_ORDER_ID },
    );
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(autoAssignWorkOrder).not.toHaveBeenCalled();
  });

  it("auto-assigns a work order when feature flag is enabled", async () => {
    (requireFmAbility as vi.Mock).mockImplementation(() => async () => ({
      id: "user-1",
      role: "FM_MANAGER",
      orgId: "tenant-1",
      tenantId: "tenant-1",
    }));
    (isFeatureEnabled as vi.Mock).mockImplementation((flagId: string) => flagId === "fm.work_order_auto_assign");
    (autoAssignWorkOrder as vi.Mock).mockResolvedValue({
      success: true,
      assignee: {
        type: "user",
        id: "tech-1",
        name: "Tech One",
        score: 88,
        reasons: ["Skill match"],
        availability: "available",
        currentWorkload: 1,
        maxWorkload: 5,
        skills: ["electrical"],
      },
    });

    const req = makePostRequest(
      "https://fixzit.test/api/fm/work-orders/auto-assign",
      { workOrderId: WORK_ORDER_ID },
    );
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.routingMode).toBe("heuristic");
    expect(recordTimelineEntry).toHaveBeenCalled();
  });
});
