import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { User } from '@/server/models/User';
import { connectDb } from '@/lib/mongo';

/**
 * GET /api/user/preferences
 *
 * Get current user's preferences (language, theme, notifications, etc.)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
  await connectDb();

  const user = await User.findById(session.user.id).select('preferences');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      preferences: user.preferences || {
        language: 'en',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/preferences
 *
 * Update current user's preferences
 *
 * Body: { language?: string, theme?: string, notifications?: object, [key: string]: any }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
  await connectDb();

  const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Merge new preferences with existing ones
    user.preferences = {
      ...user.preferences,
      ...body,
    };
    
    await user.save();
    
    return NextResponse.json({
      success: true,
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/preferences
 * 
 * Partially update current user's preferences (alternative to PUT for smaller updates)
 */
export async function PATCH(request: NextRequest) {
  return PUT(request); // Same logic as PUT for now
}
