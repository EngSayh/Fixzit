import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { User } from '@/server/models/User';
import { connectDb } from '@/lib/mongo';
import { APP_DEFAULTS } from '@/config/constants';
import { logger } from '@/lib/logger';
import { isTruthy } from '@/lib/utils/env';
import { buildOrgAwareRateLimitKey, smartRateLimit } from '@/server/security/rateLimit';
import { rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import type { Session } from 'next-auth';

type ThemePreference = 'light' | 'dark' | 'system' | 'LIGHT' | 'DARK' | 'SYSTEM' | 'AUTO';

interface UserPreferences {
  language?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  theme?: ThemePreference;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  [key: string]: unknown;
}

const DEFAULT_NOTIFICATIONS = {
  email: true,
  push: true,
  sms: false,
};

const getSession = () => auth() as unknown as Promise<Session | null>;

const NOTIFICATION_KEYS = ['email', 'push', 'sms'] as const;

const normalizeNotifications = (value?: unknown) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATIONS };
  }
  const source = value as Record<string, unknown>;
  const normalized: Record<(typeof NOTIFICATION_KEYS)[number], boolean> = { ...DEFAULT_NOTIFICATIONS };
  for (const key of NOTIFICATION_KEYS) {
    const current = source[key];
    if (typeof current === 'boolean') {
      normalized[key] = current;
    }
  }
  return normalized;
};

const DEFAULT_PREFERENCES = {
  language: APP_DEFAULTS.language,
  timezone: APP_DEFAULTS.timezone,
  currency: APP_DEFAULTS.currency,
  dateFormat: 'YYYY-MM-DD',
  theme: APP_DEFAULTS.theme,
  notifications: DEFAULT_NOTIFICATIONS,
};

const PREFERENCES_READ_LIMIT = 60;
const PREFERENCES_WRITE_LIMIT = 30;

const enforcePreferencesRateLimit = async (
  req: NextRequest,
  session: Session | null,
  limit: number,
) => {
  const sessionUser = session?.user as { id?: string; orgId?: string } | undefined;
  const orgId = sessionUser?.orgId ?? null;
  const userId = sessionUser?.id ?? null;
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(`${key}:preferences`, limit, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }
  return null;
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
  const notificationsObject = normalizeNotifications(prefs?.notifications);

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
export async function GET(req: NextRequest) {
  const allowPlaywright =
    process.env.PLAYWRIGHT_TESTS === 'true' && process.env.NODE_ENV === 'test';
  try {
    const session = await getSession();
    const rateLimited = await enforcePreferencesRateLimit(
      req,
      session,
      PREFERENCES_READ_LIMIT,
    );
    if (rateLimited) return rateLimited;
    if (!session?.user) {
      if (allowPlaywright) {
        logger.warn('PLAYWRIGHT_TESTS=true: no session detected, returning default preferences');
        return NextResponse.json({ preferences: DEFAULT_PREFERENCES, source: 'playwright-defaults', reason: 'missing-session' });
      }
      if (process.env.PLAYWRIGHT_TESTS === 'true' && process.env.NODE_ENV !== 'test') {
        // Prevent accidental fallback in non-test environments
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isTruthy(process.env.ALLOW_OFFLINE_MONGODB)) {
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES });
    }

    await connectDb();
    const user = await User.findById(session.user.id).select('preferences').lean();

    if (!user) {
      if (allowPlaywright) {
        logger.warn(
          'PLAYWRIGHT_TESTS=true: user not found for preferences fetch, returning defaults',
          { userId: session.user.id }
        );
        return NextResponse.json({ preferences: DEFAULT_PREFERENCES, source: 'playwright-defaults', reason: 'user-not-found' });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const normalized = normalizePreferencesResponse(user.preferences ?? DEFAULT_PREFERENCES);

    return NextResponse.json({
      preferences: normalized,
    });
  } catch (error) {
    logger.error('Failed to fetch user preferences:', error);
    if (allowPlaywright) {
      logger.warn('PLAYWRIGHT_TESTS=true: returning default preferences after error');
      return NextResponse.json({ preferences: DEFAULT_PREFERENCES, source: 'playwright-defaults', reason: 'exception' });
    }
    return handleApiError(error);
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
    const session = await getSession();
    const rateLimited = await enforcePreferencesRateLimit(
      request,
      session,
      PREFERENCES_WRITE_LIMIT,
    );
    if (rateLimited) return rateLimited;
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Safely parse JSON body; return 400 for malformed or missing payloads instead of throwing
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.warn('Preferences update received invalid JSON body', { error: parseError });
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate input: body must be a non-array object
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request body: must be a non-array object' },
        { status: 400 }
      );
    }
    
    // Whitelist expected preference keys
    const payload = body as Record<string, unknown>;

    const allowedKeys = ['language', 'theme', 'notifications', 'timezone', 'currency', 'dateFormat'];
    const bodyKeys = Object.keys(payload);
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

    if (Object.prototype.hasOwnProperty.call(payload, 'language')) {
      if (typeof payload.language !== 'string') {
        return NextResponse.json({ error: 'Language must be a string' }, { status: 400 });
      }
      sanitizedUpdates.language = payload.language.trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'timezone')) {
      if (typeof payload.timezone !== 'string') {
        return NextResponse.json({ error: 'Timezone must be a string' }, { status: 400 });
      }
      sanitizedUpdates.timezone = payload.timezone.trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'currency')) {
      if (typeof payload.currency !== 'string') {
        return NextResponse.json({ error: 'Currency must be a string' }, { status: 400 });
      }
      sanitizedUpdates.currency = payload.currency.trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'dateFormat')) {
      if (typeof payload.dateFormat !== 'string') {
        return NextResponse.json({ error: 'dateFormat must be a string' }, { status: 400 });
      }
      sanitizedUpdates.dateFormat = payload.dateFormat.trim();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'notifications')) {
      const notificationsInput = payload.notifications;
      if (typeof notificationsInput !== 'object' || notificationsInput === null || Array.isArray(notificationsInput)) {
        return NextResponse.json({ error: 'Notifications must be an object' }, { status: 400 });
      }
      const notificationUpdates: Partial<Record<(typeof NOTIFICATION_KEYS)[number], boolean>> = {};
      for (const [key, value] of Object.entries(notificationsInput)) {
        if (!NOTIFICATION_KEYS.includes(key as (typeof NOTIFICATION_KEYS)[number])) {
          return NextResponse.json({ error: `Invalid notification key: ${key}` }, { status: 400 });
        }
        if (typeof value !== 'boolean') {
          return NextResponse.json(
            { error: `Notification setting '${key}' must be a boolean` },
            { status: 400 }
          );
        }
        notificationUpdates[key as (typeof NOTIFICATION_KEYS)[number]] = value;
      }
      sanitizedUpdates.notifications = notificationUpdates;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'theme')) {
      const normalizedTheme = normalizeThemePreference(payload.theme);
      if (!normalizedTheme) {
        return NextResponse.json(
          { error: 'Invalid theme value', allowedValues: ['light', 'dark', 'system'] },
          { status: 400 }
        );
      }
      const themeForStorage = mapThemeToStorage(normalizedTheme);
      // Validate that the storage format is one of the expected enum values
      if (!['LIGHT', 'DARK', 'SYSTEM'].includes(themeForStorage)) {
        logger.error('Theme mapping produced invalid storage value', { normalizedTheme, themeForStorage });
        return NextResponse.json(
          { error: 'Theme processing error' },
          { status: 500 }
        );
      }
      sanitizedUpdates.theme = themeForStorage;
    }
    
    if (isTruthy(process.env.ALLOW_OFFLINE_MONGODB)) {
      return NextResponse.json({ success: true, preferences: DEFAULT_PREFERENCES });
    }

    await connectDb();

    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const currentPreferences = user.preferences || {};
    const merged = deepMerge(
      {},
      DEFAULT_PREFERENCES,
      currentPreferences,
      sanitizedUpdates
    ) as UserPreferences;
    merged.timezone = merged.timezone ?? APP_DEFAULTS.timezone;
    merged.language = merged.language ?? APP_DEFAULTS.language;
    merged.theme = merged.theme ?? APP_DEFAULTS.theme;
    merged.notifications = merged.notifications ?? { ...DEFAULT_NOTIFICATIONS };
    // Assign merged preferences, ensuring compatibility with User model schema
    // Note: merged.theme is ThemePreference ('light' | 'dark' | 'system') 
    // but User model expects uppercase storage format ('LIGHT' | 'DARK' | 'SYSTEM')
    const themeValueRaw = typeof merged.theme === 'string' ? merged.theme.toUpperCase() : undefined;
    const themeValue =
      themeValueRaw === 'LIGHT' || themeValueRaw === 'DARK' || themeValueRaw === 'SYSTEM' || themeValueRaw === 'AUTO'
        ? (themeValueRaw as 'LIGHT' | 'DARK' | 'SYSTEM' | 'AUTO')
        : (mapThemeToStorage(APP_DEFAULTS.theme) as 'LIGHT' | 'DARK' | 'SYSTEM' | 'AUTO');

    user.preferences = {
      ...merged,
      timezone: merged.timezone ?? APP_DEFAULTS.timezone,
      language: merged.language ?? APP_DEFAULTS.language,
      theme: themeValue,
      notifications: merged.notifications ?? { ...DEFAULT_NOTIFICATIONS }
    };
    
    await user.save();

    const normalized = normalizePreferencesResponse(user.preferences ?? undefined);
    
    return NextResponse.json({
      success: true,
      preferences: normalized,
    });
  } catch (error) {
    logger.error('Failed to update user preferences:', error);
    return handleApiError(error);
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
