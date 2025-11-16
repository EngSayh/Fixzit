import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { sendOTP, isValidSaudiPhone } from '@/lib/sms';
import { logCommunication } from '@/lib/communication-logger';
import {
  otpStore,
  rateLimitStore,
  OTP_EXPIRY_MS,
  MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  MAX_SENDS_PER_WINDOW,
} from '@/lib/otp-store';

// Validation schema
const SendOTPSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or employee number is required'),
  password: z.string().min(1, 'Password is required'),
});

// Generate random OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check rate limit
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || now > limit.resetAt) {
    // Reset rate limit
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_SENDS_PER_WINDOW - 1 };
  }

  if (limit.count >= MAX_SENDS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  limit.count += 1;
  return { allowed: true, remaining: MAX_SENDS_PER_WINDOW - limit.count };
}

/**
 * POST /api/auth/otp/send
 * 
 * Send OTP via SMS for login verification
 * 
 * Request Body:
 * - identifier: Email or employee number
 * - password: User password (for authentication)
 * 
 * Response:
 * - 200: OTP sent successfully (includes phone last 4 digits for UI)
 * - 400: Invalid credentials or validation error
 * - 429: Rate limit exceeded
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const parsed = SendOTPSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: parsed.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { identifier: identifierRaw, password } = parsed.data;

    // 3. Determine login type (email or employee number)
    const emailOk = z.string().email().safeParse(identifierRaw).success;
    const empUpper = identifierRaw.toUpperCase();
    const empOk = /^EMP\d+$/.test(empUpper);

    let loginIdentifier = '';
    let loginType: 'personal' | 'corporate';

    if (emailOk) {
      loginIdentifier = identifierRaw.toLowerCase();
      loginType = 'personal';
    } else if (empOk) {
      loginIdentifier = empUpper;
      loginType = 'corporate';
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid email address or employee number (e.g., EMP001)',
        },
        { status: 400 }
      );
    }

    // 4. Check rate limit using normalized identifier
    const rateLimitResult = checkRateLimit(loginIdentifier);
    if (!rateLimitResult.allowed) {
      logger.warn('[OTP] Rate limit exceeded', { identifier: loginIdentifier });
      return NextResponse.json(
        {
          success: false,
          error: 'Too many OTP requests. Please try again later.',
        },
        { status: 429 }
      );
    }

    // 5. Connect to database and verify credentials
    await connectToDatabase();
    const { User } = await import('@/server/models/User');
    const bcrypt = await import('bcryptjs');

    let user;
    if (loginType === 'personal') {
      user = (await User.findOne({ email: loginIdentifier })) as any;
    } else {
      user = (await User.findOne({ username: loginIdentifier })) as any;
    }

    if (!user) {
      logger.warn('[OTP] User not found', { identifier: loginIdentifier, loginType });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // 6. Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      logger.warn('[OTP] Invalid password', { identifier: loginIdentifier });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // 7. Check if user is active
    const isUserActive = user.isActive !== undefined ? user.isActive : user.status === 'ACTIVE';
    if (!isUserActive) {
      logger.warn('[OTP] Inactive user attempted login', {
        identifier: loginIdentifier,
        status: user.status,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Account is not active',
        },
        { status: 403 }
      );
    }

    // 8. Get user's phone number
    let userPhone = user.contact?.phone || user.personal?.phone || user.phone;

    if (
      !userPhone &&
      (user.role === 'SUPER_ADMIN' || user.roles?.includes?.('SUPER_ADMIN'))
    ) {
      const fallbackPhone =
        process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE ||
        process.env.SUPER_ADMIN_FALLBACK_PHONE ||
        '';

      if (fallbackPhone) {
        userPhone = fallbackPhone;
        logger.warn('[OTP] Using fallback phone for super admin', {
          userId: user._id.toString(),
        });
      }
    }

    if (!userPhone) {
      logger.error('[OTP] User has no phone number', { userId: user._id.toString() });
      return NextResponse.json(
        {
          success: false,
          error: 'No phone number registered. Please contact support.',
        },
        { status: 400 }
      );
    }

    // 9. Validate phone number (Saudi format)
    if (!isValidSaudiPhone(userPhone)) {
      logger.error('[OTP] Invalid phone number format', {
        userId: user._id.toString(),
        phone: userPhone,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone number format. Please update your profile.',
        },
        { status: 400 }
      );
    }

    // 10. Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    // 11. Store OTP (in production, use Redis or database)
    otpStore.set(loginIdentifier, {
      otp,
      expiresAt,
      attempts: 0,
      userId: user._id.toString(),
      phone: userPhone,
    });

    // 12. Send OTP via SMS
    const smsResult = await sendOTP(userPhone, otp);

    const logResult = await logCommunication({
      userId: user._id.toString(),
      channel: 'otp',
      type: 'otp',
      recipient: userPhone,
      subject: 'Login verification OTP',
      message: `SMS OTP login requested for ${loginIdentifier}`,
      status: smsResult.success ? 'sent' : 'failed',
      errorMessage: smsResult.success ? undefined : smsResult.error,
      metadata: {
        phone: userPhone,
        otpExpiresAt: new Date(expiresAt),
        otpAttempts: MAX_ATTEMPTS,
        rateLimitRemaining: rateLimitResult.remaining,
        identifier: loginIdentifier,
      },
    });

    if (!logResult.success) {
      logger.warn('[OTP] Failed to log communication', { error: logResult.error });
    }

    if (!smsResult.success) {
      otpStore.delete(loginIdentifier);
      logger.error('[OTP] Failed to send SMS', {
        userId: user._id.toString(),
        error: smsResult.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send OTP. Please try again.',
        },
        { status: 500 }
      );
    }

    logger.info('[OTP] OTP sent successfully', {
      userId: user._id.toString(),
      identifier: loginIdentifier,
      phone: userPhone.slice(-4),
    });

    // 13. Return success response (mask phone number)
    const maskedPhone = userPhone.replace(/(\d{3})\d+(\d{4})/, '$1****$2');

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        phone: maskedPhone,
        expiresIn: OTP_EXPIRY_MS / 1000, // seconds
        attemptsRemaining: MAX_ATTEMPTS,
      },
    });
  } catch (error) {
    logger.error('[OTP] Send OTP error', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
