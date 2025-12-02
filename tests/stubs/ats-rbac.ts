import type { NextRequest } from "next/server";

export const atsRBAC = async (_req: NextRequest, _requiredPermissions: any[]) => ({
  authorized: true,
  userId: "user-id",
  orgId: "org-id",
  role: "Recruiter" as any,
  isSuperAdmin: false,
  atsModule: { enabled: true, jobPostLimit: Number.MAX_SAFE_INTEGER, seats: 1, seatUsage: 0 },
});
