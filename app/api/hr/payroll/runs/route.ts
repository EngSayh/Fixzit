import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { PayrollService } from "@/server/services/hr/payroll.service";
// GET /api/hr/payroll/runs - List all payroll runs
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();

    if (!body.periodStart || !body.periodEnd || !body.name) {
      return NextResponse.json(
        { error: "Missing required fields: name, periodStart, periodEnd" },
        { status: 400 },
      );
    }

    const periodStart = new Date(body.periodStart);
    const periodEnd = new Date(body.periodEnd);

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
      name: body.name,
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
