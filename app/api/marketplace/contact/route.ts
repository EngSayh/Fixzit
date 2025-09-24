// app/api/marketplace/contact/route.ts - Protected contact reveal with KSA compliance
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/src/lib/auth/session';
import { dbConnect } from '@/src/db/mongoose';
import Listing from '@/src/server/models/Listing';
import { KSAComplianceService } from '@/src/lib/ksa-compliance';

const contactRequestSchema = z.object({
  listingId: z.string(),
  action: z.enum(['reveal_contact', 'send_message', 'schedule_viewing']),
  message: z.string().optional(),
  preferredDate: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = contactRequestSchema.parse(body);

    await dbConnect();

    // Get listing
    const listing = await Listing.findById(data.listingId);
    if (!listing || listing.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Check rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = await KSAComplianceService.checkContactRevealLimit(user.id, ipAddress);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded', 
          resetAt: rateLimit.resetAt 
        },
        { status: 429 }
      );
    }

    // For high-value properties or certain actions, require Nafath authentication
    if (listing.price > 1000000 || data.action === 'schedule_viewing') {
      const nafathCheck = await KSAComplianceService.requireNafathAuth(
        user.id, 
        'property_contact'
      );
      
      if (!nafathCheck.authenticated) {
        return NextResponse.json(
          { 
            success: false, 
            error: nafathCheck.error,
            requireNafath: true 
          },
          { status: 403 }
        );
      }
    }

    // Log the contact reveal for audit
    await logContactReveal({
      userId: user.id,
      listingId: listing._id,
      action: data.action,
      ipAddress,
      timestamp: new Date()
    });

    // Update listing stats
    await Listing.findByIdAndUpdate(listing._id, {
      $inc: { 'stats.inquiries': 1 }
    });

    // Prepare response based on action
    let response: any = { success: true };

    switch (data.action) {
      case 'reveal_contact':
        // Return actual contact info
        response.contact = {
          phone: listing.seller.contact.phone,
          email: listing.seller.contact.email,
          whatsapp: listing.seller.contact.whatsapp,
          name: listing.seller.name,
          company: listing.seller.company?.name
        };
        
        // Add broker license info if applicable
        if (listing.seller.type === 'broker' && listing.seller.falLicense?.valid) {
          response.broker = {
            licensed: true,
            licenseHolder: listing.seller.falLicense.holder,
            company: listing.seller.company?.name
          };
        }
        break;

      case 'send_message':
        // Queue message for delivery
        response.messageSent = true;
        response.referenceId = `MSG-${Date.now()}`;
        // TODO: Actually send the message via email/SMS
        break;

      case 'schedule_viewing':
        // Create viewing request
        response.viewingRequested = true;
        response.referenceId = `VIEW-${Date.now()}`;
        // TODO: Create actual viewing appointment
        break;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Contact reveal error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: (error as any).issues || (error as any).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process contact request' },
      { status: 500 }
    );
  }
}

// Audit logging function
async function logContactReveal(data: any) {
  // In production, store in audit collection
  console.log('Contact reveal audit:', data);
}
