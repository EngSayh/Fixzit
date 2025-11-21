import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from '@/server/models/Application';
import { Candidate } from '@/server/models/Candidate';
import { Job } from '@/server/models/Job';
import { Employee } from '@/server/models/hr.models';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';
import {notFoundError, validationError, rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { buildRateLimitKey } from '@/server/security/rateLimitKey';

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
    const user = await getSessionUser(req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    await connectToDatabase();
    
    // Verify user authentication
    if (!user) {
      return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    }

    // Check user permissions (SUPER_ADMIN, ADMIN, or MANAGER can convert applications)
    const canConvertApplications = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
    if (!canConvertApplications) {
      return createSecureResponse({ error: 'Forbidden: Insufficient permissions' }, 403, req);
    }

    const { applicationId } = await req.json();
    if (!applicationId) return validationError("applicationId is required");

    const app = await Application.findById(applicationId).lean();
    if (!app) return notFoundError("Application");

    // Verify org authorization (only SUPER_ADMIN can access cross-org)
    if (app.orgId !== user.orgId && user.role !== 'SUPER_ADMIN') {
      return createSecureResponse({ error: 'Forbidden' }, 403, req);
    }

    if (app.stage !== 'hired') return validationError("Application status must be hired");

    const [cand, job] = await Promise.all([
      Candidate.findById(app.candidateId).lean(),
      Job.findById(app.jobId).lean()
    ]);
    if (!cand || !job) return validationError("Candidate or Job missing");

    const orgId = app.orgId;
    const existing = await Employee.findOne({ orgId, email: cand.email, isDeleted: false }).lean();
    if (existing) return NextResponse.json({ success: true, data: existing, message: 'Employee already exists' });

    const jobAny = job as any;
    const employeeCode = `ATS-${(jobAny.code || jobAny.title || 'NEW').slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const hireDate = jobAny.startDate ? new Date(jobAny.startDate) : new Date();

    const employee = await Employee.create({
      orgId,
      employeeCode,
      firstName: cand.firstName,
      lastName: cand.lastName,
      email: cand.email,
      phone: cand.phone,
      jobTitle: jobAny.title || 'Employee',
      departmentId: jobAny.departmentId,
      employmentType: jobAny.employmentType || 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      hireDate,
      compensation: {
        baseSalary: jobAny.salaryRange?.min || jobAny.salaryRange?.max || 0,
        currency: jobAny.currency || 'SAR',
      },
      meta: { source: 'ats', jobId: jobAny._id?.toString?.() || String(jobAny._id), applicationId: app._id.toString(), convertedBy: user?.id || 'system' }
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    logger.error('Convert to employee error:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: "Failed to convert to employee" }, 500, req);
  }
}

