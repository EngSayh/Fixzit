import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { getUserFromToken } from '@/src/lib/auth';
import { createSecureResponse } from '@/src/server/security/headers';
import { 
  unauthorizedError, 
  forbiddenError, 
  validationError,
  notFoundError,
  handleApiError 
} from '@/src/server/utils/errorResponses';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db;
    
    // Authentication & Authorization
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = token ? await getUserFromToken(token) : null;
    if (!user?.tenantId) return unauthorizedError();
    
    const allowedRoles = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'HR', 'ATS_ADMIN', 'RECRUITER']);
    if (!allowedRoles.has((user as any).role || '')) return forbiddenError();
    
    // Input validation
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return validationError('Invalid application ID format');
    }
    
    // Tenant isolation - only access applications from user's organization
    const application = await Application
      .findOne({ _id: params.id, orgId: user.tenantId })
      .populate('jobId')
      .populate('candidateId')
      .select('-__v -attachments -internal -secrets')
      .lean();
      
    if (!application) return notFoundError('Application');
    
    // Standardized role evaluation for PII protection
    const privilegedRoles = new Set(['ADMIN','OWNER','ATS_ADMIN','RECRUITER','SUPER_ADMIN','CORPORATE_ADMIN']);
    const userRoles = Array.isArray((user as any).roles) && (user as any).roles.length > 0
      ? (user as any).roles
      : [ (user as any).role ].filter(Boolean);
    const canSeePII = userRoles.some((r: string) => privilegedRoles.has(r));
    
    // Filter sensitive data for non-privileged users
    if (!canSeePII) {
      // Remove private notes
      if (Array.isArray((application as any).notes)) {
        (application as any).notes = (application as any).notes.filter((n: any) => !n?.isPrivate);
      }
      
      // Remove PII from candidate data if populated
      if ((application as any).candidateId) {
        const candidate = (application as any).candidateId;
        delete candidate.email;
        delete candidate.phone;
        delete candidate.resumeText;
        delete candidate.resumeUrl;
        delete candidate.address;
        delete candidate.dateOfBirth;
        delete candidate.nationalId;
        delete candidate.consents;
      }
      
      // Remove resumeText from application itself
      delete (application as any).resumeText;
      delete (application as any).resumeUrl;
      delete (application as any).personalData;
    }
    
    return createSecureResponse({ success: true, data: application }, 200, req);
  } catch (error) {
    return handleApiError(error);
  }
}

const applicationUpdateSchema = z.object({
  stage: z.enum(['applied','screening','interview','offer','hired','rejected']).optional(),
  score: z.number().min(0).max(100).optional(),
  note: z.string().max(5000).optional(),
  reason: z.string().max(1000).optional(),
  isPrivate: z.boolean().optional(),
  flags: z.array(z.string()).max(50).optional(),
  reviewers: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)).max(50).optional()
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db;
    
    // Authentication & Authorization
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = token ? await getUserFromToken(token) : null;
    if (!user?.tenantId) return unauthorizedError();
    
    const allowedRoles = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN', 'HR', 'ATS_ADMIN', 'RECRUITER']);
    if (!allowedRoles.has((user as any).role || '')) return forbiddenError();
    
    // Input validation
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return validationError('Invalid application ID format');
    }
    
    const body = applicationUpdateSchema.parse(await req.json());
    const userId = user.id;
    
    // Tenant isolation - only access applications from user's organization
    const application = await Application.findOne({ _id: params.id, orgId: user.tenantId });
    if (!application) return notFoundError('Application');
    
    // Stage validation and updates
    const allowedStages = new Set(['applied','screening','interview','offer','hired','rejected']);
    if (body.stage && body.stage !== application.stage) {
      if (!allowedStages.has(body.stage)) {
        return validationError('Invalid stage transition');
      }
      const oldStage = application.stage;
      application.stage = body.stage;
      application.history.push({ 
        action: `stage_change:${oldStage}->${body.stage}`, 
        by: userId, 
        at: new Date(), 
        details: body.reason 
      });
    }
    
    // Score validation and updates
    if (typeof body.score === 'number' && body.score !== application.score) {
      const oldScore = application.score;
      application.score = body.score;
      application.history.push({ 
        action: 'score_updated', 
        by: userId, 
        at: new Date(), 
        details: `Score changed from ${oldScore} to ${body.score}` 
      });
    }
    
    // Private notes with role-based access control
    if (body.note) {
      application.notes = application.notes || [];
      const privilegedRoles = new Set(['ADMIN','OWNER','ATS_ADMIN','RECRUITER','SUPER_ADMIN','CORPORATE_ADMIN']);
      const userRoles = Array.isArray((user as any).roles) && (user as any).roles.length > 0
        ? (user as any).roles
        : [ (user as any).role ].filter(Boolean);
      const canWritePrivate = userRoles.some((r: string) => privilegedRoles.has(r));
      const isPrivate = !!body.isPrivate && canWritePrivate;
      
      application.notes.push({ 
        author: userId, 
        text: String(body.note).slice(0, 5000), 
        createdAt: new Date(), 
        isPrivate 
      });
    }
    
    // Controlled field updates with validation
    if (Array.isArray(body.flags)) {
      (application as any).flags = body.flags.filter((f: any) => typeof f === 'string').slice(0, 50);
    }
    if (Array.isArray(body.reviewers)) {
      (application as any).reviewers = body.reviewers.filter((r: any) => /^[a-fA-F0-9]{24}$/.test(r)).slice(0, 50);
    }
    
    await application.save();
    
    // Filter response data
    const result: any = application.toObject();
    delete result.attachments;
    delete result.internal;
    delete result.secrets;
    
    // Hide private notes from non-privileged users
    const privilegedRoles = new Set(['ADMIN','OWNER','ATS_ADMIN','RECRUITER','SUPER_ADMIN','CORPORATE_ADMIN']);
    const userRoles = Array.isArray((user as any).roles) && (user as any).roles.length > 0
      ? (user as any).roles
      : [ (user as any).role ].filter(Boolean);
    const canSeePrivate = userRoles.some((r: string) => privilegedRoles.has(r));
    
    if (!canSeePrivate && Array.isArray(result.notes)) {
      result.notes = result.notes.filter((n: any) => !n?.isPrivate);
    }
    
    return createSecureResponse({ success: true, data: result }, 200, req);
  } catch (error) {
    return handleApiError(error);
  }
}


