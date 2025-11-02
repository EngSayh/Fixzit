import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { User } from '@/server/models/User';
import { connectDB } from '@/lib/db';

/**
 * POST /api/auth/credentials
 * 
 * Validates user credentials for NextAuth Credentials provider.
 * This endpoint must run in Node.js runtime (not Edge) to use Mongoose.
 */
export async function POST(req: NextRequest) {
  try {
    const { identifier, type, password } = await req.json();

    if (!identifier || !password || !type) {
      return NextResponse.json(
        { error: 'Identifier, type, and password are required' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Find user based on login type
    let user;
    if (type === 'personal') {
      user = await User.findOne({ email: identifier.toLowerCase() }).select('+password');
    } else {
      // Corporate login uses employee number (stored in username field)
      user = await User.findOne({ username: identifier.toUpperCase() }).select('+password');
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    const isUserActive = user.isActive !== undefined ? user.isActive : (user.status === 'ACTIVE');
    if (!isUserActive) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    // Update last login timestamp
    await User.updateOne(
      { _id: user._id },
      { $set: { 'security.lastLogin': new Date() } }
    );

    // Return user data that NextAuth expects
    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      name: `${user.personal?.firstName || ''} ${user.personal?.lastName || ''}`.trim() || user.email,
      role: user.professional?.role || user.role || 'USER',
      orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || null),
    });
  } catch (error) {
    console.error('Credentials validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Force this route to run in Node.js runtime
export const runtime = 'nodejs';
