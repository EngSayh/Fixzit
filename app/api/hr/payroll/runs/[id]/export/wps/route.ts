import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { PayrollService } from "@/server/services/hr/payroll.service";
import { generateWPSFile, validateWPSFile } from "@/services/hr/wpsService";

type RouteParams = { id: string };

export async function GET(
  _req: NextRequest,
  props: { params: Promise<RouteParams> },
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await props.params;
    const run = await PayrollService.getById(session.user.orgId, id);

    if (!run) {
      return NextResponse.json(
        { error: "Payroll run not found" },
        { status: 404 },
      );
    }

    if (run.status === "DRAFT") {
      return NextResponse.json(
        { error: "Cannot export WPS file for a DRAFT payroll run" },
        { status: 400 },
      );
    }

    if (!run.lines.length) {
      return NextResponse.json(
        { error: "Payroll run has no calculated lines" },
        { status: 400 },
      );
    }

    const periodMonth = new Date(run.periodEnd).toISOString().slice(0, 7);
    const { file: wpsFile, errors } = await generateWPSFile(
      run.lines,
      session.user.orgId,
      periodMonth,
    );

    if (!wpsFile.recordCount) {
      return NextResponse.json(
        {
          error: "Failed to generate WPS file - no valid records",
          errors,
        },
        { status: 400 },
      );
    }

    const validation = validateWPSFile(wpsFile);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "WPS file validation failed",
          errors: validation.errors,
          warnings: validation.warnings,
          generationErrors: errors,
        },
        { status: 400 },
      );
    }

    return new NextResponse(wpsFile.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${wpsFile.filename}"`,
        "X-File-Checksum": wpsFile.checksum,
        "X-Record-Count": wpsFile.recordCount.toString(),
        "X-Total-Net-Salary": wpsFile.totalNetSalary.toString(),
        ...(errors.length > 0 && {
          "X-Generation-Warnings": errors.length.toString(),
        }),
      },
    });
  } catch (error) {
    logger.error("Error generating WPS file:", error);
    return NextResponse.json(
      { error: "Failed to generate WPS file" },
      { status: 500 },
    );
  }
}
