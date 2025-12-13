import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as createAccount } from "@/app/api/finance/accounts/route";
import { POST as createPayrollRun } from "@/app/api/hr/payroll/runs/route";

vi.mock("@/server/middleware/withAuthRbac", () => ({
  getSessionUser: vi.fn().mockResolvedValue({
    id: "user-1",
    orgId: "org-1",
    role: "FINANCE",
  }),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-2", orgId: "org-2", role: "HR" },
  }),
}));

vi.mock("@/lib/mongodb-unified", () => ({
  dbConnect: vi.fn(),
  connectToDatabase: vi.fn(),
}));

vi.mock("@/config/rbac.config", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/server/lib/authContext", () => ({
  runWithContext: (_ctx: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/server/models/finance/ChartAccount", () => ({
  __esModule: true,
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/server/services/hr/payroll.service", () => ({
  PayrollService: {
    existsOverlap: vi.fn().mockResolvedValue(false),
    create: vi.fn().mockResolvedValue({ id: "payroll-1" }),
    list: vi.fn().mockResolvedValue([]),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

const makeBadJsonRequest = (url: string, method = "POST") =>
  new NextRequest(
    new Request(url, {
      method,
      headers: { "content-type": "application/json" },
      body: '{"bad_json"',
    }),
  );

describe("Invalid JSON handling (finance/HR routes)", () => {
  it("returns 400 for invalid JSON on finance accounts POST", async () => {
    const res = await createAccount(makeBadJsonRequest("http://localhost/api/finance/accounts"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON on HR payroll runs POST", async () => {
    const res = await createPayrollRun(makeBadJsonRequest("http://localhost/api/hr/payroll/runs"));
    expect(res.status).toBe(400);
  });
});
