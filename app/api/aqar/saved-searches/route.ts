import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import { AqarSavedSearch } from '@/src/server/models/AqarSavedSearch';
import { z } from 'zod';

const savedSearchSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  criteria: z.object({
    purpose: z.enum(['sale', 'rent', 'daily']).optional(),
    propertyType: z.array(z.string()).optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minArea: z.number().optional(),
    maxArea: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    furnished: z.boolean().optional(),
    features: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional()
  }),
  notifications: z.object({
    enabled: z.boolean().default(true),
    frequency: z.enum(['instant', 'daily', 'weekly']).default('daily'),
    channels: z.array(z.enum(['email', 'sms', 'push', 'whatsapp'])).default(['email'])
  }).optional()
});

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    const searches = await AqarSavedSearch.find({
      tenantId,
      userId,
      isActive: true
    })
    .sort({ updatedAt: -1 })
    .lean();
    
    return NextResponse.json({
      success: true,
      data: searches
    });
    
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const validatedData = savedSearchSchema.parse(body);
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    // Check if search with same name exists
    const existingSearch = await AqarSavedSearch.findOne({
      tenantId,
      userId,
      name: validatedData.name
    });
    
    if (existingSearch) {
      return NextResponse.json(
        { success: false, error: 'A saved search with this name already exists' },
        { status: 409 }
      );
    }
    
    const savedSearch = new AqarSavedSearch({
      ...validatedData,
      tenantId,
      userId,
      createdBy: userId,
      notifications: validatedData.notifications || {
        enabled: true,
        frequency: 'daily',
        channels: ['email']
      }
    });
    
    await savedSearch.save();
    
    return NextResponse.json({
      success: true,
      data: savedSearch
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating saved search:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create saved search' },
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
        { success: false, error: 'Search ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const validatedData = savedSearchSchema.partial().parse(body);
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    const savedSearch = await AqarSavedSearch.findOneAndUpdate(
      { _id: id, tenantId, userId },
      { ...validatedData, updatedBy: userId },
      { new: true }
    );
    
    if (!savedSearch) {
      return NextResponse.json(
        { success: false, error: 'Saved search not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: savedSearch
    });
    
  } catch (error) {
    console.error('Error updating saved search:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update saved search' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Search ID is required' },
        { status: 400 }
      );
    }
    
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const userId = req.headers.get('x-user-id') || 'system';
    
    const savedSearch = await AqarSavedSearch.findOneAndUpdate(
      { _id: id, tenantId, userId },
      { isActive: false, updatedBy: userId },
      { new: true }
    );
    
    if (!savedSearch) {
      return NextResponse.json(
        { success: false, error: 'Saved search not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Saved search deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete saved search' },
      { status: 500 }
    );
  }
}