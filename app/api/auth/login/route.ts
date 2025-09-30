import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, employeeNumber, password, loginType = 'personal' } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (loginType === 'personal' && !email) {
      return NextResponse.json(
        { error: 'Email is required for personal login' },
        { status: 400 }
      );
    }

    if (loginType === 'corporate' && !employeeNumber) {
      return NextResponse.json(
        { error: 'Employee number is required for corporate login' },
        { status: 400 }
      );
    }

    // Authenticate user
    const result = await authenticateUser(
      loginType === 'personal' ? email : employeeNumber,
      password,
      loginType
    );
    
    // Create response
    const response = NextResponse.json({
      ok: true,
      token: result.token,
      user: result.user
    });
    
    // Set secure cookie
    response.cookies.set('fixzit_auth', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.message === 'Invalid credentials' || error.message === 'Account is not active') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
