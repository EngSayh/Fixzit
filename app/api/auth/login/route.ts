import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import User from '@/src/server/models/User';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    await db();

    // Find user and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.isLocked) {
      return NextResponse.json(
        { error: 'Account is locked. Please try again later.' },
        { status: 423 }
      );
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      await user.incLoginAttempts();
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    await user.updateOne({ lastLogin: new Date() });

    // Issue JWT and set cookie for session (24h)
    const token = jwt.sign({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: String(user.org_id)
    }, process.env.JWT_SECRET || 'fixzit-enterprise-secret-2024', { expiresIn: '24h' });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.org_id,
        modules: user.modules,
        language: user.language
      }
    });

    // Set cookie (HTTPOnly)
    res.cookies.set('fixzit_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    // Also set role/lang cookies used by UI & tests
    try {
      res.cookies.set('fxz_role', user.role, { path: '/' });
      if (user.language) {
        res.cookies.set('fxz_lang', user.language, { path: '/' });
      }
    } catch {}

    return res;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}