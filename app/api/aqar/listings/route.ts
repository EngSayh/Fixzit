/**
 * Aqar Souq - Create Listing API
 * 
 * POST /api/aqar/listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/mongo';
import { AqarListing, AqarPackage } from '@/models/aqar';
import { getSessionUser } from '@/server/middleware/withAuthRbac';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    
    const user = await getSessionUser(request);
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'intent',
      'propertyType',
      'title',
      'description',
      'city',
      'price',
      'areaSqm',
      'geo',
      'source',
    ];
    
    const missingFields = requiredFields.filter((field) => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if user has active package (for agents/developers)
    if (body.source === 'AGENT' || body.source === 'DEVELOPER') {
      const activePackage = await AqarPackage.findOne({
        userId: user.id,
        active: true,
        expiresAt: { $gt: new Date() },
        $expr: { $lt: ['$listingsUsed', '$listingsAllowed'] },
      });
      
      if (!activePackage) {
        return NextResponse.json(
          { error: 'No active listing package. Please purchase a package first.' },
          { status: 402 }
        );
      }
      
      // Consume package listing
      await (activePackage as unknown as { consumeListing: () => Promise<void> }).consumeListing();
    }
    
    // Create listing
    const listing = new AqarListing({
      ...body,
      listerId: user.id,
      orgId: user.orgId || user.id, // Fallback to user ID
      status: 'DRAFT', // Start as draft
    });
    
    await listing.save();
    
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error('Error creating listing:', error);
    
    if (error instanceof Error && error.message.includes('Package')) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    
    if (error instanceof Error && error.message.includes('Broker ads require')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
