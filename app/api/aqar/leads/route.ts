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
import mongoose from 'mongoose';

export const runtime = 'nodejs';

// POST /api/aqar/leads
export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    // Auth is optional for public inquiries
    let userId: string | undefined;
    let orgId: string | undefined;
    try {
      const user = await getSessionUser(request);
      userId = user.id;
      // Use orgId for multi-tenant consistency, fallback to user.id
      orgId = user.orgId || user.id;
    } catch {
      // Public inquiry - no auth required
    }
    
    const body = await request.json();
    
    const { listingId, projectId, inquirerName, inquirerPhone, inquirerEmail, intent, message, source } = body;
    
    // Validate required fields
    if (!inquirerName || !inquirerPhone || !intent || !source) {
      return NextResponse.json(
        { error: 'inquirerName, inquirerPhone, intent, and source are required' },
        { status: 400 }
      );
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
    
    // Get recipient (listing owner or project developer)
    let recipientId;
    
    if (listingId) {
      // Validate ObjectId before querying
      if (!mongoose.Types.ObjectId.isValid(listingId)) {
        return NextResponse.json({ error: 'Invalid listingId' }, { status: 400 });
      }
      
      const listing = await AqarListing.findById(listingId);
      if (!listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }
      recipientId = listing.listerId;
      
      // Increment inquiries count (async with error logging)
      AqarListing.findByIdAndUpdate(listingId, {
        $inc: { 'analytics.inquiries': 1 },
      }).exec().catch((err: Error) => {
        console.error('Failed to update listing inquiries count:', err);
      });
    } else if (projectId) {
      // Validate ObjectId before querying
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
      }
      
      const { AqarProject } = await import('@/models/aqar');
      const project = await AqarProject.findById(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      recipientId = project.developerId;
      
      // Increment inquiries count (async with error logging)
      AqarProject.findByIdAndUpdate(projectId, { 
        $inc: { inquiries: 1 } 
      }).exec().catch((err: Error) => {
        console.error('Failed to update project inquiries count:', err);
      });
    }
    
    const lead = new AqarLead({
      orgId: orgId || recipientId,
      listingId,
      projectId,
      source,
      inquirerId: userId,
      inquirerName,
      inquirerPhone,
      inquirerEmail,
      recipientId,
      intent,
      message,
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
    
    // Validate and sanitize pagination parameters
    const safePage = !isNaN(page) && page > 0 ? page : 1;
    const safeLimit = !isNaN(limit) && limit > 0 && limit <= 100 ? limit : 20;
    const skip = (safePage - 1) * safeLimit;
    
    const query: Record<string, unknown> = {
      recipientId: user.id,
    };
    
    // Validate status against allowed values
    if (status) {
      const ALLOWED_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'VIEWING', 'NEGOTIATING', 'WON', 'LOST', 'CLOSED'];
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      query.status = status;
    }
    
    const [leads, total] = await Promise.all([
      AqarLead.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('listingId')
        .populate('projectId')
        .lean(),
      AqarLead.countDocuments(query),
    ]);
    
    return NextResponse.json({
      leads,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
