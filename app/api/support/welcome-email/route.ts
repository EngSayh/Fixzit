import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const welcomeEmailSchema = z.object({
  email: z.string().email(),
  errorId: z.string(),
  subject: z.string(),
  registrationLink: z.string().url()
});

export async function POST(req: NextRequest) {
  try {
    const body = welcomeEmailSchema.parse(await req.json());

    // In a real implementation, this would integrate with an email service
    // For now, we'll log the welcome email details
    console.log('📧 Welcome Email Request:', {
      to: body.email,
      subject: body.subject,
      errorId: body.errorId,
      registrationLink: body.registrationLink,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a mock email record in the database (optional)
    // This could be stored in MongoDB for tracking

    const emailTemplate = `
🎉 Welcome to Fixzit Enterprise!

Thank you for reporting an issue with our system. We're actively working to resolve it.

**Error ID:** ${body.errorId}
**Reported:** ${new Date().toISOString()}

**Next Steps:**
1. 📝 Your support ticket has been created and assigned to our technical team
2. 🔧 Our developers are investigating the issue
3. 📧 You'll receive updates via email within 24 hours
4. 🎯 Once resolved, you'll get a notification with the fix details

**To Get Started with Fixzit:**
1. Create your account: ${body.registrationLink}
2. Complete your profile setup
3. Access the full Fixzit Enterprise platform
4. Track your support tickets in real-time

**Why Choose Fixzit Enterprise?**
- ✅ Complete Facility Management Solution
- ✅ Unified Marketplace Integration
- ✅ Real Estate Management Tools
- ✅ Advanced Analytics & Reporting
- ✅ 24/7 Support & Assistance

**Need Immediate Help?**
- Contact our support team: support@fixzit.com
- Visit our help center: https://fixzit.com/help
- Call us: +966 50 123 4567

Welcome to the Fixzit family! 🚀

Best regards,
The Fixzit Enterprise Team
    `.trim();

    return NextResponse.json({
      success: true,
      message: 'Welcome email queued for sending',
      emailId: `WEL-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
      recipient: body.email,
      subject: body.subject
    });

  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}

// GET method to check welcome email status
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const email = sp.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  // In a real implementation, this would check the database
  // For now, return mock data
  return NextResponse.json({
    email,
    welcomeEmailsSent: 1,
    lastSent: new Date().toISOString(),
    status: 'sent'
  });
}
