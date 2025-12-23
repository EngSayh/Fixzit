/**
 * @fileoverview HR Payroll Runs API
 * @description Manages payroll run lifecycle including creation, listing,
 * and status transitions for payroll processing.
 * 
 * @module api/hr/payroll/runs
 * @requires HR, HR_OFFICER, SUPER_ADMIN, or CORPORATE_ADMIN role
 * 
 * @endpoints
 * - GET /api/hr/payroll/runs - List payroll runs with optional status filter
 * - POST /api/hr/payroll/runs - Create a new DRAFT payroll run
 * 
 * @queryParams (GET)
 * - status: Filter by run status (DRAFT, IN_REVIEW, APPROVED, LOCKED, EXPORTED)
 * 
 * @requestBody (POST)
 * - name: (required) Payroll run name
 * - periodStart: (required) Pay period start date
 * - periodEnd: (required) Pay period end date
 * 
 * @workflow
 * 1. Create DRAFT run
 * 2. Calculate payroll (POST /runs/:id/calculate)
 * 3. Review and approve
 * 4. Export WPS file
 * 
 * @security
 * - RBAC: HR roles have access
 * - Period overlap prevention: Cannot create overlapping runs
 * - Tenant-scoped: Payroll runs are isolated by organization
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { PayrollService } from "@/server/services/hr/payroll.service";
import { parseBodyOrNull } from "@/lib/api/parse-body";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { hasAllowedRole } from "@/lib/auth/role-guards";
import { z } from "zod";

// Zod schema for payroll run creation
const PayrollRunCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  periodStart: z.string().min(1, "Period start date is required"),
  periodEnd: z.string().min(1, "Period end date is required"),
});

// 🔒 STRICT v4.2: Payroll requires HR roles (optionally Corporate Admin) - no Finance role bleed
const PAYROLL_ALLOWED_ROLES = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'HR', 'HR_OFFICER'];

// GET /api/hr/payroll/runs - List all payroll runs
export async function GET(req: NextRequest) {
  // Rate limiting: 60 requests per minute per IP
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "hr-payroll:list",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 STRICT v4.2: Payroll requires HR roles - supports subRole pattern (consistent with POST)
    const user = session.user as { role?: string; subRole?: string | null; orgId: string };
    if (!hasAllowedRole(user.role, user.subRole, PAYROLL_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const runs = await PayrollService.list({
      orgId: session.user.orgId,
      status: (() => {
        const allowed = new Set([
          "DRAFT",
          "APPROVED",
          "IN_REVIEW",
          "LOCKED",
          "EXPORTED",
        ]);
        return status && allowed.has(status)
          ? (status as
              | "DRAFT"
              | "APPROVED"
              | "IN_REVIEW"
              | "LOCKED"
              | "EXPORTED")
          : undefined;
      })(),
    });

    return NextResponse.json({ runs });
  } catch (error) {
    logger.error("Error fetching payroll runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll runs" },
      { status: 500 },
    );
  }
}

// POST /api/hr/payroll/runs - Create a new DRAFT payroll run
export async function POST(req: NextRequest) {
  // Rate limiting: 10 requests per minute per IP for payroll writes (sensitive)
  const rateLimitResponse = enforceRateLimit(req, {
    keyPrefix: "hr-payroll:create",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 STRICT v4.2: Payroll requires HR roles - supports subRole pattern
    const user = session.user as { role?: string; subRole?: string | null; orgId?: string };
    if (!hasAllowedRole(user.role, user.subRole, PAYROLL_ALLOWED_ROLES)) {
      return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
    }

    await connectToDatabase();

    const body = (await parseBodyOrNull(req)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    // Validate with Zod schema
    const parseResult = PayrollRunCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { name, periodStart: periodStartStr, periodEnd: periodEndStr } = parseResult.data;
    const periodStart = new Date(periodStartStr);
    const periodEnd = new Date(periodEndStr);

    const overlap = await PayrollService.existsOverlap(
      session.user.orgId,
      periodStart,
      periodEnd,
    );
    if (overlap) {
      return NextResponse.json(
        { error: "A payroll run already exists for this period" },
        { status: 409 },
      );
    }

    const run = await PayrollService.create({
      orgId: session.user.orgId,
      name,
      periodStart,
      periodEnd,
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    logger.error("Error creating payroll run:", error);
    return NextResponse.json(
      { error: "Failed to create payroll run" },
      { status: 500 },
    );
  }
}
