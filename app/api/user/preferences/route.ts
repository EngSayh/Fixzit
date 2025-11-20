import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { User } from '@/server/models/User';
import { connectDb } from '@/lib/mongo';
import { APP_DEFAULTS } from '@/config/constants';
import { logger } from '@/lib/logger';

type ThemePreference = 'light' | 'dark' | 'system';

const DEFAULT_NOTIFICATIONS = {
  email: true,
  push: true,
  sms: false,
};

const DEFAULT_PREFERENCES = {
  language: APP_DEFAULTS.language,
  theme: APP_DEFAULTS.theme,
  notifications: DEFAULT_NOTIFICATIONS,
};

const normalizeThemePreference = (value?: unknown): ThemePreference | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'light') return 'light';
  if (normalized === 'dark') return 'dark';
  if (normalized === 'system' || normalized === 'auto') return 'system';
  return null;
};

const mapThemeFromStorage = (value?: unknown): ThemePreference =>
  normalizeThemePreference(value) ?? APP_DEFAULTS.theme;

const mapThemeToStorage = (value: ThemePreference): string => {
  switch (value) {
    case 'dark':
      return 'DARK';
    case 'system':
      return 'SYSTEM';
    default:
      return 'LIGHT';
  }
};

const normalizePreferencesResponse = (prefs?: Record<string, unknown>) => {
  const language = typeof prefs?.language === 'string' ? prefs.language : DEFAULT_PREFERENCES.language;
  const notificationsObject =
    prefs?.notifications && typeof prefs.notifications === 'object' && !Array.isArray(prefs.notifications)
      ? { ...DEFAULT_NOTIFICATIONS, ...(prefs.notifications as Record<string, unknown>) }
      : { ...DEFAULT_NOTIFICATIONS };

  return {
    ...prefs,
    language,
    notifications: notificationsObject,
    theme: mapThemeFromStorage(prefs?.theme),
  };
};
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDb();
    const user = await User.findById(session.user.id).select('preferences');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const normalized = normalizePreferencesResponse(user.preferences ?? DEFAULT_PREFERENCES);

    return NextResponse.json({
      preferences: normalized,
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

    const sanitizedUpdates: Record<string, unknown> = {};

    if (Object.prototype.hasOwnProperty.call(body, 'language')) {
      if (typeof body.language !== 'string') {
        return NextResponse.json({ error: 'Language must be a string' }, { status: 400 });
      }
      sanitizedUpdates.language = body.language.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'timezone')) {
      if (typeof body.timezone !== 'string') {
        return NextResponse.json({ error: 'Timezone must be a string' }, { status: 400 });
      }
      sanitizedUpdates.timezone = body.timezone.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'currency')) {
      if (typeof body.currency !== 'string') {
        return NextResponse.json({ error: 'Currency must be a string' }, { status: 400 });
      }
      sanitizedUpdates.currency = body.currency.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'dateFormat')) {
      if (typeof body.dateFormat !== 'string') {
        return NextResponse.json({ error: 'dateFormat must be a string' }, { status: 400 });
      }
      sanitizedUpdates.dateFormat = body.dateFormat.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, 'notifications')) {
      if (
        typeof body.notifications !== 'object' ||
        body.notifications === null ||
        Array.isArray(body.notifications)
      ) {
        return NextResponse.json({ error: 'Notifications must be an object' }, { status: 400 });
      }
      sanitizedUpdates.notifications = body.notifications;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'theme')) {
      const normalizedTheme = normalizeThemePreference(body.theme);
      if (!normalizedTheme) {
        return NextResponse.json(
          { error: 'Invalid theme value', allowedValues: ['light', 'dark', 'system'] },
          { status: 400 }
        );
      }
      sanitizedUpdates.theme = mapThemeToStorage(normalizedTheme);
    }
    
    await connectDb();

    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const currentPreferences = user.preferences || {};
    user.preferences = deepMerge({}, currentPreferences, sanitizedUpdates);
    
    await user.save();

    const normalized = normalizePreferencesResponse(user.preferences ?? undefined);
    
    return NextResponse.json({
      success: true,
      preferences: normalized,
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
