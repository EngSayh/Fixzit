import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { AqarLead } from '@/src/server/models/AqarLead';
import { z } from 'zod';

const leadUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'interested', 'not_interested', 'converted', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  notes: z.array(z.object({
    text: z.string(),
    createdBy: z.string()
  })).optional(),
  nextFollowUp: z.string().datetime().optional()
});

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    
    const query: any = { tenantId };
    
    if (status) {
      query.status = status;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    const skip = (page - 1) * limit;
    
    const [leads, total] = await Promise.all([
      AqarLead.find(query)
        .populate('listingId', 'title slug price location')
        .populate('propertyId', 'name address type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AqarLead.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching Aqar leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Lead ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const validatedData = leadUpdateSchema.parse(body);
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    const updateData: any = {
      ...validatedData,
      updatedBy: userId
    };
    
    if (validatedData.assignedTo) {
      updateData.assignedAt = new Date();
    }
    
    if (validatedData.nextFollowUp) {
      updateData.nextFollowUp = new Date(validatedData.nextFollowUp);
    }
    
    const lead = await AqarLead.findOneAndUpdate(
      { _id: id, tenantId },
      updateData,
      { new: true }
    )
    .populate('listingId', 'title slug price location')
    .populate('propertyId', 'name address type');
    
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: lead
    });
    
  } catch (error) {
    console.error('Error updating Aqar lead:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}