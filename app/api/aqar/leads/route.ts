/**
 * Aqar Souq - Leads API
 * 
 * POST /api/aqar/leads - Create inquiry lead
 * GET /api/aqar/leads - Get user's leads (owner/agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongo';
import { AqarLead, AqarListing } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { incrementAnalyticsWithRetry } from '@/lib/analytics/incrementWithRetry';
import { checkRateLimit } from '@/lib/rateLimit';
import mongoose from 'mongoose';
import { z } from 'zod';

// Validation schema for lead creation
const LeadCreateSchema = z.object({
  listingId: z.string().optional(),
  projectId: z.string().optional(),
  inquirerName: z.string().trim().min(1, 'Name is required').max(100),
  inquirerPhone: z.string().trim().regex(/^[\d\s\-+()]{7,20}$/, 'Invalid phone number format'),
  inquirerEmail: z.string().trim().toLowerCase().email('Invalid email format').max(100).optional().or(z.literal('')),
  intent: z.enum(['BUY', 'RENT', 'DAILY']),
  message: z.string().trim().max(1000).optional(),
  source: z.enum(['LISTING_INQUIRY', 'PROJECT_INQUIRY', 'WHATSAPP', 'PHONE_CALL', 'WALK_IN', 'REFERRAL', 'OTHER']),
});

// Pagination constants
const MAX_PAGE_LIMIT = 100;
const MAX_SKIP = 100000; // Prevent DoS via huge skip values


export const runtime = 'nodejs';

// POST /api/aqar/leads
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting BEFORE DB connection to shed load early
    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      message: 'Too many lead submissions. Please try again in an hour.',
    });
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    await connectDb();
    
    // Auth is optional for public inquiries
    let userId: string | undefined;
    let userOrgId: string | undefined;
    try {
      const user = await getSessionUser(request);
      userId = user.id;
      userOrgId = user.orgId;
    } catch (authError) {
      // Distinguish between "not authenticated" (public inquiry allowed) vs actual errors
      // Expected: getSessionUser throws Error with 'Unauthorized' message when no session
      // Unexpected: Any other error (DB connection, token parsing, etc.)
      const isExpectedAuthFailure = authError instanceof Error && 
        (authError.message === 'Unauthorized' || authError.message.includes('No session found'));
      
      if (!isExpectedAuthFailure) {
        logger.error(
          'Unexpected auth error in leads POST',
          authError instanceof Error ? authError : new Error(String(authError)),
          { route: 'POST /api/aqar/leads' }
        );
      }
      // Public inquiry - no auth required
    }
    
    const body = await request.json();
    
    // Validate request body with Zod
    const validation = LeadCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { listingId, projectId, inquirerName, inquirerPhone, inquirerEmail, intent, message, source } = validation.data;
    
    // Ensure either listingId or projectId is provided
    if (!listingId && !projectId) {
      return NextResponse.json(
        { error: 'Either listingId or projectId is required' },
        { status: 400 }
      );
    }
    
    // Validate ObjectId format for listingId and projectId
    if (listingId && !mongoose.Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: 'Invalid listingId format' }, { status: 400 });
    }
    
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 });
    }
    
    // Get recipient (listing owner or project developer)
    let recipientId;
    
    if (listingId) {
      const listing = await (AqarListing as any).findById(listingId);
      if (!listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
      recipientId = listing.listerId;
      
      // Validate recipientId is a valid ObjectId
      if (!recipientId) {
        return NextResponse.json({ error: 'Listing has no owner' }, { status: 400 });
      }
      
      // Increment inquiries count with timestamp (async, non-blocking with retry logic)
      (async () => {
        try {
          await incrementAnalyticsWithRetry({
            model: AqarListing,
            id: new mongoose.Types.ObjectId(listingId),
            updateOp: {
              $inc: { 'analytics.inquiries': 1 },
              $set: { 'analytics.lastInquiryAt': new Date() }
            },
            entityType: 'listing'
          });
        } catch (error) {
          logger.error('Failed to increment listing analytics:', error instanceof Error ? error : new Error(String(error)), { listingId });
        }
      })();
    } else if (projectId) {
      const { AqarProject } = await import('@/models/aqar');
      const project = await (AqarProject as any).findById(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      recipientId = project.developerId;
      
      // Validate recipientId is a valid ObjectId
      if (!recipientId) {
        return NextResponse.json({ error: 'Project has no developer' }, { status: 400 });
      }
      
      // Increment inquiries count with timestamp (async, non-blocking with retry logic)
      (async () => {
        try {
          await incrementAnalyticsWithRetry({
            model: AqarProject,
            id: new mongoose.Types.ObjectId(projectId),
            updateOp: { 
              $inc: { inquiries: 1 },
              $set: { lastInquiryAt: new Date() }
            },
            entityType: 'project'
          });
        } catch (error) {
          logger.error('Failed to increment project analytics:', error instanceof Error ? error : new Error(String(error)), { projectId });
        }
      })();
    }
    
    const lead = new AqarLead({
      orgId: userOrgId || recipientId,
      listingId,
      projectId,
      source,
      inquirerId: userId,
      inquirerName,
      inquirerPhone,
      inquirerEmail: inquirerEmail || undefined,
      recipientId,
      intent,
      message: message || undefined,
    });
    
    await lead.save();
    
    // FUTURE: Send notification to recipient (email/SMS/push).
    // Implementation: Use lib/fm-notifications.ts sendNotification() or SendGrid for emails.
    
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    logger.error('Error creating lead:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

// GET /api/aqar/leads
export async function GET(request: NextRequest) {
  try {
    // Handle authentication first to avoid wasting DB resources on unauthenticated requests
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error('Authentication failed:', authError instanceof Error ? authError.message : 'Unknown error');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only connect to database after authentication succeeds
    await connectDb();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Parse and validate pagination parameters
    const rawPage = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const rawLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    
    // Clamp pagination values to prevent DoS attacks
    const page = Math.max(1, Math.min(rawPage, 10000)); // Max page 10000
    const limit = Math.max(1, Math.min(rawLimit, MAX_PAGE_LIMIT)); // Max 100 items per page
    const skip = Math.min((page - 1) * limit, MAX_SKIP); // Prevent huge skip values
    
    const query: Record<string, unknown> = {
      recipientId: user.id,
    };
    
    if (status) {
      query.status = status;
    }
    
    const [leads, total] = await Promise.all([
      AqarLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('listingId')
        .populate('projectId')
        .lean(),
      AqarLead.countDocuments(query),
    ]);
    
    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching leads:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
