import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from "@/server/models/Application";
import { Candidate } from "@/server/models/Candidate";
import { Job } from "@/server/models/Job";
import { Employee } from "@/server/models/hr.models";
import { smartRateLimit } from "@/server/security/rateLimit";
import {
  notFoundError,
  validationError,
  rateLimitError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";
import { atsRBAC } from "@/lib/ats/rbac";
import type { ATSPermission } from "@/lib/ats/permissions";

interface JobDocument {
  code?: string;
  title?: string;
  startDate?: Date | string;
  departmentId?: string;
  employmentType?: string;
  salaryRange?: { min?: number; max?: number };
  currency?: string;
  _id?: { toString?: () => string } | string;
  [key: string]: unknown;
}

/**
 * @openapi
 * /api/ats/convert-to-employee:
 *   get:
 *     summary: ats/convert-to-employee operations
 *     tags: [ats]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  try {
    // Enforce ATS RBAC (requires application update/stage-transition)
    const required: ATSPermission[] = [
      "applications:update",
      "applications:stage-transition",
    ];
    const authz = await atsRBAC(req, required);
    if (!authz.authorized) {
      return authz.response;
    }
    const { userId, orgId, isSuperAdmin } = authz;

    const rl = await smartRateLimit(buildRateLimitKey(req, userId), 60, 60_000);
    if (!rl.allowed) return rateLimitError();

    await connectToDatabase();

    const { applicationId } = await req.json();
    if (!applicationId) return validationError("applicationId is required");

    const app = await Application.findById(applicationId).lean();
    if (!app) return notFoundError("Application");

    // Verify org authorization (only Super Admin via ATS RBAC can access cross-org)
    if (app.orgId !== orgId && !isSuperAdmin) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }

    if (app.stage !== "hired")
      return validationError("Application status must be hired");

    const [cand, job] = await Promise.all([
      Candidate.findById(app.candidateId).lean(),
      Job.findById(app.jobId).lean(),
    ]);
    if (!cand || !job) return validationError("Candidate or Job missing");

    const existing = await Employee.findOne({
      orgId: app.orgId,
      email: cand.email,
      isDeleted: false,
    }).lean();
    if (existing)
      return NextResponse.json({
        success: true,
        data: existing,
        message: "Employee already exists",
      });

    const jobTyped = job as unknown as JobDocument;
    const employeeCode = `ATS-${(jobTyped.code || jobTyped.title || "NEW").slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const hireDate = jobTyped.startDate
      ? new Date(jobTyped.startDate)
      : new Date();

    const employee = await Employee.create({
      orgId,
      employeeCode,
      firstName: cand.firstName,
      lastName: cand.lastName,
      email: cand.email,
      phone: cand.phone,
      jobTitle: jobTyped.title || "Employee",
      departmentId: jobTyped.departmentId,
      employmentType: jobTyped.employmentType || "FULL_TIME",
      employmentStatus: "ACTIVE",
      hireDate,
      compensation: {
        baseSalary: jobTyped.salaryRange?.min || jobTyped.salaryRange?.max || 0,
        currency: jobTyped.currency || "SAR",
      },
      meta: {
        source: "ats",
        jobId: jobTyped._id?.toString?.() || String(jobTyped._id),
        applicationId: app._id.toString(),
        convertedBy: userId || "system",
      },
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    logger.error(
      "Convert to employee error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to convert to employee" },
      500,
      req,
    );
  }
}
