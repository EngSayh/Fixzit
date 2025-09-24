// Protected API for contact actions (requires authentication)
// Implements contact protection with rate limiting and OTP

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/src/lib/auth';
import { antiFraudService, nafathService } from '@/src/lib/ksa-compliance';

const ContactSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(['property', 'material']),
  message: z.string().min(10).max(1000),
  contactMethod: z.enum(['phone', 'email', 'whatsapp']).default('phone')
});

const OTPVerificationSchema = z.object({
  phoneNumber: z.string().regex(/^(\+966|966|0)?[5-9]\d{8}$/, 'Invalid Saudi phone number'),
  otp: z.string().length(6)
});

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `contact_${identifier}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession(req);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          redirectTo: '/login'
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { itemId, itemType, message, contactMethod } = ContactSchema.parse(body);

    // Rate limiting
    const clientId = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Check if user has verified phone number
    if (!session.user.phoneVerified) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone verification required',
          requiresOTP: true,
          phoneNumber: session.user.phone
        },
        { status: 400 }
      );
    }

    // TODO: Get actual contact information from database
    const contactInfo = await getContactInfo(itemId, itemType);
    if (!contactInfo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact information not available' 
        },
        { status: 404 }
      );
    }

    // Log the contact attempt for audit
    await antiFraudService.logSuspiciousActivity('contact_attempt', session.user.id, {
      itemId,
      itemType,
      contactMethod,
      timestamp: new Date()
    });

    // TODO: Send notification to seller
    // TODO: Store contact request in database

    return NextResponse.json({
      success: true,
      data: {
        message: 'Contact request sent successfully',
        contactInfo: {
          phone: contactInfo.phone,
          email: contactInfo.email,
          whatsapp: contactInfo.whatsapp
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: error.issues 
        },
        { status: 400 }
      );
    }
    
    console.error('Contact API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// OTP verification endpoint
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phoneNumber, otp } = OTPVerificationSchema.parse(body);

    // Verify OTP
    const isValid = await nafathService.verifyOTP(phoneNumber, otp);
    if (!isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid OTP' 
        },
        { status: 400 }
      );
    }

    // TODO: Update user's phone verification status in database
    // TODO: Mark phone as verified

    return NextResponse.json({
      success: true,
      data: {
        message: 'Phone number verified successfully',
        phoneVerified: true
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: error.issues 
        },
        { status: 400 }
      );
    }
    
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Send OTP endpoint
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone number is required' 
        },
        { status: 400 }
      );
    }

    // Rate limiting for OTP requests
    const clientId = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    if (!checkRateLimit(`otp_${clientId}`, 3, 300000)) { // 3 requests per 5 minutes
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many OTP requests. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Send OTP
    const sent = await nafathService.sendOTP(phoneNumber);
    if (!sent) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send OTP' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'OTP sent successfully',
        phoneNumber: phoneNumber.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      }
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Helper function to get contact information
async function getContactInfo(itemId: string, itemType: 'property' | 'material'): Promise<{
  phone: string;
  email: string;
  whatsapp: string;
} | null> {
  // TODO: Implement actual database query
  // For now, return mock data
  return {
    phone: '+966 50 123 4567',
    email: 'contact@example.com',
    whatsapp: '+966 50 123 4567'
  };
}