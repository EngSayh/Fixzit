/**
 * @fileoverview HR WPS Export API
 * @description Generates Wage Protection System (WPS) files for Saudi Arabia
 * central bank compliance, containing employee banking and salary data.
 * 
 * @module api/hr/payroll/runs/[id]/export/wps
 * @requires HR, HR_OFFICER, FINANCE, FINANCE_OFFICER, SUPER_ADMIN, or CORPORATE_ADMIN role
 * 
 * @endpoints
 * - GET /api/hr/payroll/runs/:id/export/wps - Download WPS file for payroll run
 * 
 * @params
 * - id: Payroll run ID
 * 
 * @response
 * - Content-Type: text/csv; charset=utf-8
 * - Content-Disposition: attachment; filename="WPS_YYYY-MM.csv"
 * - X-File-Checksum: MD5 hash for validation
 * - X-Record-Count: Number of employee records
 * - X-Total-Net-Salary: Total salary amount in SAR
 * 
 * @validation
 * - Run must not be in DRAFT status
 * - Run must have calculated payroll lines
 * - WPS file validation checks IBAN format, amounts, etc.
 * 
 * @security
 * - CRITICAL: Contains banking data (IBANs, salaries)
 * - RBAC: Only HR/Finance officers can export
 * - Access denied logging for audit trail
 * - Tenant-scoped: WPS exports are isolated by organization
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { PayrollService } from "@/server/services/hr/payroll.service";
import { generateWPSFile, validateWPSFile } from "@/services/hr/wpsService";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

// 🔒 STRICT v4.1 CRITICAL: WPS export contains banking data (IBANs, salaries)
// Requires HR Officer, Finance Officer, or Admin role
const PAYROLL_EXPORT_ALLOWED_ROLES = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'HR', 'HR_OFFICER', 'FINANCE', 'FINANCE_OFFICER'];

type RouteParams = { id: string };

export async function GET(
  _req: NextRequest,
  props: { params: Promise<RouteParams> },
) {
  enforceRateLimit(_req, { requests: 10, windowMs: 60_000, keyPrefix: "hr:payroll:wps" });
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🔒 RBAC check - CRITICAL for banking data protection
    if (!session.user.role || !PAYROLL_EXPORT_ALLOWED_ROLES.includes(session.user.role)) {
      logger.warn("WPS export access denied", { 
        userId: session.user.id, 
        role: session.user.role,
        orgId: session.user.orgId 
      });
      return NextResponse.json({ error: "Forbidden: HR/Finance access required for WPS export" }, { status: 403 });
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
