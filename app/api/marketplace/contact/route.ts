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

/**
 * Handle POST requests to reveal contact or perform contact-related actions for a listing.
 *
 * Validates the request body, requires an authenticated user, connects to the database,
 * enforces rate limits and Nafath authentication where required, logs the action for audit,
 * increments the listing's inquiry count, and returns an action-specific JSON response.
 *
 * Possible responses (status codes):
 * - 200: { success: true, ...action-specific fields } for successful actions:
 *   - reveal_contact: returns `contact` (phone, email, whatsapp, name, company) and optional `broker` license info.
 *   - send_message: returns `messageSent: true` and `referenceId` (MSG-<timestamp>).
 *   - schedule_viewing: returns `viewingRequested: true` and `referenceId` (VIEW-<timestamp>).
 * - 400: Invalid request payload (Zod validation errors) with `details`.
 * - 401: Authentication required.
 * - 403: Nafath authentication required for high-value listings or scheduling (response includes `requireNafath: true` and `error`).
 * - 404: Listing not found or not active.
 * - 429: Rate limit exceeded (response includes `resetAt`).
 * - 500: Generic failure processing the request.
 *
 * Note: This handler does not itself send messages or create viewing appointments — those are marked TODO and currently only return reference IDs.
 *
 * @returns A NextResponse containing a JSON object describing success or error and any action-specific data.
 */
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

/**
 * Records an audit entry for contact-related actions.
 *
 * The function accepts an audit payload and persists or logs it for compliance and tracking.
 * In production this should store the record in a persistent audit collection; currently it logs to console.
 *
 * @param data - Audit payload; expected properties include `userId`, `listingId`, `action` (e.g., `'reveal_contact'`), `ipAddress`, and `timestamp`. Additional fields (e.g., message, referenceId) may be included.
 */
async function logContactReveal(data: any) {
  // In production, store in audit collection
  console.log('Contact reveal audit:', data);
}
