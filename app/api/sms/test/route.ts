/**
 * SMS Test API Endpoint
 * POST /api/sms/test
 * 
 * Test SMS functionality with Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, testSMSConfiguration } from '@/lib/sms';
import { logger } from '@/lib/logger';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { phone, message, testConfig } = body;

    // If testing configuration only
    if (testConfig) {
      const isConfigured = await testSMSConfiguration();
      return NextResponse.json({
        success: isConfigured,
        message: isConfigured 
          ? 'Twilio configuration is valid' 
          : 'Twilio configuration is invalid or missing'
      });
    }

    // Validate required fields
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: phone and message' },
        { status: 400 }
      );
    }

    // Send SMS
    const result = await sendSMS(phone, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageSid: result.messageSid,
        message: 'SMS sent successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    logger.error('[API] SMS test failed', { error: error.message });
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
