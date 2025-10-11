import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

const welcomeEmailSchema = z.object({
  email: z.string().email(),
  errorId: z.string(),
  subject: z.string(),
  registrationLink: z.string().url()
});

/**
 * @openapi
 * /api/support/welcome-email:
 *   get:
 *     summary: support/welcome-email operations
 *     tags: [support]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

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

    // Email template for future use when email service is integrated
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

    /**
     * Email Service Integration Point
     * 
     * TODO: Integrate actual email service (SendGrid, AWS SES, or Mailgun)
     * 
     * Implementation steps:
     * 1. Install email provider SDK: `pnpm add @sendgrid/mail` or `aws-sdk`
     * 2. Add credentials to environment variables:
     *    - SENDGRID_API_KEY or AWS_SES_ACCESS_KEY
     *    - FROM_EMAIL (verified sender email)
     * 3. Uncomment and configure the sendEmail function below:
     * 
     * @example
     * ```typescript
     * import sgMail from '@sendgrid/mail';
     * sgMail.setApiKey(process.env.SENDGRID_API_KEY);
     * 
     * await sgMail.send({
     *   to: body.email,
     *   from: process.env.FROM_EMAIL,
     *   subject: body.subject,
     *   html: emailTemplate
     * });
     * ```
     * 
     * @see https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs
     * @see https://docs.aws.amazon.com/ses/latest/dg/send-email-nodejs.html
     */
    // await sendEmail({ to: body.email, subject: body.subject, html: emailTemplate });

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
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const sp = new URL(req.url).searchParams;
  const email = sp.get('email');

  if (!email) {
    return createSecureResponse({ error: 'Email parameter required' }, 400, req);
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
