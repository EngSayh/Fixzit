import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { User } from '@/server/models/User';
import { connectDb } from '@/lib/mongo';

import { logger } from '@/lib/logger';
/**
 * Deep merge utility to recursively merge nested objects.
 * Non-mutating: call with an empty object as first arg to avoid mutating inputs.
 * Usage: deepMerge({}, existingPreferences, updates)
 */
function deepMerge(...objects: Array<Record<string, unknown> | undefined>) {
  const result: Record<string, unknown> = {};

  const isPlainObject = (val: unknown): val is Record<string, unknown> =>
    typeof val === 'object' && val !== null && !Array.isArray(val);

  for (const obj of objects) {
    if (!obj) continue;
    for (const key of Object.keys(obj)) {
      const sourceValue = obj[key] as unknown;
      const existing = result[key];

      if (isPlainObject(existing) && isPlainObject(sourceValue)) {
        result[key] = deepMerge(existing, sourceValue as Record<string, unknown>);
      } else {
        // clone arrays and primitives directly
        if (Array.isArray(sourceValue)) {
          result[key] = (sourceValue as unknown[]).slice();
        } else if (isPlainObject(sourceValue)) {
          result[key] = deepMerge({}, sourceValue as Record<string, unknown>);
        } else {
          result[key] = sourceValue;
        }
      }
    }
  }

  return result;
}

/**
 * GET /api/user/preferences
 *
 * Get current user's preferences (language, theme, notifications, etc.)
 */
export async function GET() {
  try {
    const session = await auth();    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
  await connectDb();

  const user = (await User.findById(session.user.id).select('preferences'));
    
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
    logger.error('Failed to fetch user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/preferences
 *
 * Update current user's preferences with deep merge
 * Preserves nested properties (e.g., partial notifications object won't wipe other notification settings)
 *
 * 🔒 TYPE SAFETY: Body accepts Record<string, unknown> for flexible preferences
 * Body: { language?: string, theme?: string, notifications?: object, [key: string]: unknown }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input: body must be a non-array object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request body: must be a non-array object' },
        { status: 400 }
      );
    }
    
    // Whitelist expected preference keys
    const allowedKeys = ['language', 'theme', 'notifications', 'timezone', 'currency', 'dateFormat'];
    const bodyKeys = Object.keys(body);
    const invalidKeys = bodyKeys.filter(key => !allowedKeys.includes(key));
    
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid preference keys',
          invalidKeys,
          allowedKeys
        },
        { status: 400 }
      );
    }
    
    await connectDb();

  const user = (await User.findById(session.user.id));
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
  // Deep merge new preferences with existing ones to preserve nested properties.
  // Use an empty object as the first param to avoid mutating stored preferences.
  // Example: updating { notifications: { email: false } } won't delete { notifications: { push: true, sms: false } }
  const currentPreferences = user.preferences || {};
  user.preferences = deepMerge({}, currentPreferences, body);
    
    await user.save();
    
    return NextResponse.json({
      success: true,
      preferences: user.preferences,
    });
  } catch (error) {
    logger.error('Failed to update user preferences:', error);
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
