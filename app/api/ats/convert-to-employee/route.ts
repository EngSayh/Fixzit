import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from '@/server/models/Application';
import { Candidate } from '@/server/models/Candidate';
import { Job } from '@/server/models/Job';
import { Employee } from '@/server/models/Employee';
import { getUserFromToken } from '@/lib/auth';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const user = await getSessionUser(req);
    
    // Verify user authentication
    if (!user) {
      return createSecureResponse({ error: 'Unauthorized' }, 401, req);
    }

    // Check user permissions (super_admin, corporate_admin, or HR manager can convert applications)
    const canConvertApplications = ['super_admin', 'corporate_admin', 'hr_manager'].includes(user.role);
    if (!canConvertApplications) {
      return createSecureResponse({ error: 'Forbidden: Insufficient permissions' }, 403, req);
    }

    const { applicationId } = await req.json();
    if (!applicationId) return validationError("applicationId is required");

    const app = await Application.findById(applicationId).lean();
    if (!app) return notFoundError("Application");

    // Verify org authorization (only super_admin can access cross-org)
    if (app.orgId !== user.orgId && user.role !== 'super_admin') {
      return createSecureResponse({ error: 'Forbidden' }, 403, req);
    }

    if (app.stage !== 'hired') return validationError("Application status must be hired", req);

    const [cand, job] = await Promise.all([
      Candidate.findById(app.candidateId).lean(),
      Job.findById(app.jobId).lean()
    ]);
    if (!cand || !job) return validationError("Candidate or Job missing", req);

    const orgId = app.orgId;
    const existing = await Employee.findOne({ orgId, 'personal.email': cand.email }).lean();
    if (existing) return NextResponse.json({ success: true, data: existing, message: 'Employee already exists' });

    const employee = await Employee.create({
      orgId,
      personal: { firstName: cand.firstName, lastName: cand.lastName, email: cand.email, phone: cand.phone },
      professional: { role: 'EMPLOYEE', department: job.department, title: job.title },
      status: 'ACTIVE',
      metadata: { source: 'ats', jobId: job._id.toString(), applicationId: app._id.toString(), convertedBy: user?.id || 'system' }
    });
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Convert to employee error:', error);
    return createSecureResponse({ error: "Failed to convert to employee" }, 500, req);
  }
}




