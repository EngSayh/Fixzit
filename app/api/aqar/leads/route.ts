/**
 * Aqar Souq - Leads API
 * 
 * POST /api/aqar/leads - Create inquiry lead
 * GET /api/aqar/leads - Get user's leads (owner/agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarLead, AqarListing } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { incrementAnalyticsWithRetry } from '@/lib/analytics/incrementWithRetry';
import mongoose, { type Types } from 'mongoose';


export const runtime = 'nodejs';

// POST /api/aqar/leads
export async function POST(request: NextRequest) {
  try {
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
      if (authError instanceof Error && authError.message !== 'Unauthorized') {
        console.error('Auth error in leads POST:', {
          message: authError.message,
          stack: authError.stack,
        });
      }
      // Public inquiry - no auth required
    }
    
    const body = await request.json();
    
    const { listingId, projectId, inquirerName, inquirerPhone, inquirerEmail, intent, message, source } = body;
    
    // Input sanitization and validation
    const sanitizedName = inquirerName?.toString().trim().slice(0, 100);
    const sanitizedPhone = inquirerPhone?.toString().trim().slice(0, 20);
    const sanitizedEmail = inquirerEmail?.toString().trim().toLowerCase().slice(0, 100);
    const sanitizedMessage = message?.toString().trim().slice(0, 1000);
    
    // Validate required fields
    if (!sanitizedName || !sanitizedPhone || !intent || !source) {
      return NextResponse.json(
        { error: 'inquirerName, inquirerPhone, intent, and source are required' },
        { status: 400 }
      );
    }
    
    // Validate phone format (basic international format check)
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    if (!phoneRegex.test(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    // Validate email format if provided
    if (sanitizedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }
    
    // Validate enum fields
    const ALLOWED_INTENTS = ['BUY', 'RENT', 'DAILY'];
    if (!ALLOWED_INTENTS.includes(intent)) {
      return NextResponse.json(
        { error: `Invalid intent. Must be one of: ${ALLOWED_INTENTS.join(', ')}` },
        { status: 400 }
      );
    }
    
    const ALLOWED_SOURCES = ['LISTING_INQUIRY', 'PROJECT_INQUIRY', 'WHATSAPP', 'PHONE_CALL', 'WALK_IN', 'REFERRAL', 'OTHER'];
    if (!ALLOWED_SOURCES.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${ALLOWED_SOURCES.join(', ')}` },
        { status: 400 }
      );
    }
    
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
      const listing = await AqarListing.findById(listingId);
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
        await incrementAnalyticsWithRetry({
          model: AqarListing,
          id: listingId as Types.ObjectId,
          updateOp: {
            $inc: { 'analytics.inquiries': 1 },
            $set: { 'analytics.lastInquiryAt': new Date() }
          },
          entityType: 'listing'
        });
      })();
    } else if (projectId) {
      const { AqarProject } = await import('@/models/aqar');
      const project = await AqarProject.findById(projectId);
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
        await incrementAnalyticsWithRetry({
          model: AqarProject,
          id: projectId as Types.ObjectId,
          updateOp: { 
            $inc: { inquiries: 1 },
            $set: { lastInquiryAt: new Date() }
          },
          entityType: 'project'
        });
      })();
    }
    
    const lead = new AqarLead({
      orgId: userOrgId || recipientId,
      listingId,
      projectId,
      source,
      inquirerId: userId,
      inquirerName: sanitizedName,
      inquirerPhone: sanitizedPhone,
      inquirerEmail: sanitizedEmail,
      recipientId,
      intent,
      message: sanitizedMessage,
    });
    
    await lead.save();
    
    // TODO: Send notification to recipient (email/SMS/push)
    
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

// GET /api/aqar/leads
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const skip = (page - 1) * limit;
    
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
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
