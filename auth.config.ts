// Import from symbols path to align with NextAuth v5 typings (prevents mismatched symbol versions)
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { otpSessionStore } from '@/lib/otp-store';
import type { UserRoleType } from '@/types/user';
import type { SubscriptionPlan } from '@/config/navigation';
// CRITICAL FIX: Use auth-specific types to prevent mongoose from bundling into client
// See: https://github.com/vercel/next.js/issues/57792
import type { AuthUserDoc } from '@/types/auth.types';
// NOTE: Mongoose imports MUST be dynamic inside authorize() to avoid Edge Runtime issues
// import { User } from '@/server/models/User'; // ❌ Breaks Edge Runtime
// import { verifyPassword } from '@/lib/auth'; // ❌ Imports User model

// Extended user type for auth callbacks
type ExtendedUser = {
  id: string;
  email?: string | null;
  role?: string;
  orgId?: string | null;
  sessionId?: string | null;
  rememberMe?: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
  roles?: string[];
};
type SessionPlan = SubscriptionPlan | 'STARTER' | 'PROFESSIONAL';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Validate required environment variables at startup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Derive NEXTAUTH_URL when missing (helps preview builds)
const vercelHost =
  process.env.VERCEL_BRANCH_URL ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL;

const derivedNextAuthUrl =
  (vercelHost ? `https://${vercelHost}` : undefined) ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.BASE_URL;

// Use local constant instead of mutating process.env at runtime
// This prevents race conditions where NextAuth may initialize before the mutation
const resolvedNextAuthUrl = process.env.NEXTAUTH_URL || derivedNextAuthUrl;

if (!process.env.NEXTAUTH_URL && resolvedNextAuthUrl) {
  if (process.env.NODE_ENV === 'production') {
    logger.warn(`⚠️  NEXTAUTH_URL not provided. Using derived value: ${resolvedNextAuthUrl}`);
  }
}

// Validate non-secret variables always (fail-fast at startup), but allow CI builds
const missingNonSecrets: string[] = [];
const isCI =
  process.env.CI === 'true' ||
  process.env.CI === '1' ||
  process.env.SKIP_ENV_VALIDATION === 'true';
const vercelEnv = process.env.VERCEL_ENV;
const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build';
const isVercelPreview = vercelEnv === 'preview' || (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'preview');
const allowMissingNextAuthUrl =
  isCI ||
  isBuildPhase ||
  isVercelPreview ||
  process.env.ALLOW_MISSING_NEXTAUTH_URL === 'true';
const suppressEnvWarnings =
  process.env.SUPPRESS_ENV_WARNINGS === 'true' ||
  process.env.SKIP_ENV_VALIDATION === 'true' ||
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PHASE === 'phase-production-build';
const shouldEnforceNextAuthUrl =
  process.env.NODE_ENV === 'production' &&
  vercelEnv !== 'preview' &&
  !allowMissingNextAuthUrl;

// Only validate NEXTAUTH_URL in production runtime (not during builds)
if (shouldEnforceNextAuthUrl) {
  if (!resolvedNextAuthUrl) {
    missingNonSecrets.push('NEXTAUTH_URL');
  }
} else if (!resolvedNextAuthUrl && !isCI && !isBuildPhase) {
  logger.warn('⚠️  NEXTAUTH_URL not set; continuing with derived/default value for non-production build.');
}

if (missingNonSecrets.length > 0) {
  throw new Error(
    `Missing required runtime configuration: ${missingNonSecrets.join(', ')}. These are required for production runtime.`
  );
}

// Validate secrets only when not in CI and not explicitly skipped
const skipSecretValidation =
  isCI ||
  process.env.SKIP_ENV_VALIDATION === 'true' ||
  process.env.NEXT_PHASE === 'phase-production-build';

if (!skipSecretValidation) {
  const missingSecrets: string[] = [];
  
  // NEXTAUTH_SECRET is always required (for session signing)
  if (!NEXTAUTH_SECRET) missingSecrets.push('NEXTAUTH_SECRET');
  
  // Google OAuth credentials are optional (can use credentials provider only)
  if (!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_SECRET) {
    // Both missing - credentials-only auth mode
    if (process.env.NODE_ENV === 'production') {
      logger.warn('⚠️  [PRODUCTION] Google OAuth not configured. Only credentials authentication available.');
      logger.warn('   Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable OAuth login.');
    } else {
      logger.info('ℹ️  Google OAuth not configured (optional). Using credentials-only authentication.');
      logger.info('   To enable Google OAuth: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local');
    }
  } else if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    // One is set, other is missing - configuration error
    if (!GOOGLE_CLIENT_ID) missingSecrets.push('GOOGLE_CLIENT_ID');
    if (!GOOGLE_CLIENT_SECRET) missingSecrets.push('GOOGLE_CLIENT_SECRET');
    logger.error('❌ Google OAuth partial configuration detected!');
    logger.error('   Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together.');
  } else {
    // Both are set - OAuth enabled
    logger.info('✅ Google OAuth configured successfully.');
  }

  // Apple OAuth credentials are optional; warn if partial
  if ((APPLE_CLIENT_ID && !APPLE_CLIENT_SECRET) || (!APPLE_CLIENT_ID && APPLE_CLIENT_SECRET)) {
    missingSecrets.push(!APPLE_CLIENT_ID ? 'APPLE_CLIENT_ID' : 'APPLE_CLIENT_SECRET');
    logger.warn('⚠️  Apple OAuth partial configuration detected. Buttons will be disabled.');
  }

  if (missingSecrets.length > 0) {
    const errorMsg = `Missing required authentication secrets: ${missingSecrets.join(', ')}.`;
    logger.error(`❌ ${errorMsg}`);
    logger.error('   Solutions:');
    logger.error('   1. Add missing secrets to .env.local (development) or .env.test (tests)');
    logger.error('   2. Set SKIP_ENV_VALIDATION=true to bypass (not recommended for production)');
    logger.error('   3. For CI builds: Set CI=true environment variable');
    throw new Error(
      `${errorMsg} See console logs above for resolution steps.`
    );
  }
} else if (isCI) {
  logger.info('ℹ️  CI environment detected: Secret validation skipped for build.');
  logger.info('   Secrets will be validated at runtime from GitHub Secrets.');
} else {
  const msg1 = '⚠️  SKIP_ENV_VALIDATION=true: Secret validation bypassed.';
  const msg2 = '   Ensure secrets are properly configured before production deployment.';
  if (suppressEnvWarnings) {
    logger.info(msg1);
    logger.info(msg2);
  } else {
    logger.warn(msg1);
    logger.warn(msg2);
  }
}

// Helper functions for OAuth provisioning (reserved for future use)
// These will be used when auto-provisioning OAuth users from Google/Apple profiles

/* eslint-disable @typescript-eslint/no-unused-vars -- Reserved for OAuth auto-provisioning */
function _sanitizeName(name?: string | null): string {
  if (!name) return 'Unknown User';
  return name.trim().substring(0, 100);
}

function _sanitizeImage(image?: string | null): string | undefined {
  if (!image) return undefined;
  try {
    const url = new URL(image);
    // Only allow HTTPS (secure) or data URIs (inline images)
    if (url.protocol === 'https:') {
      return image;
    } else if (url.protocol === 'data:' && url.pathname.startsWith('image/')) {
      return image;
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// Validation schema for credentials login (unified identifier field)
// NOTE: signIn() from next-auth/react sends checkbox values as 'on' when checked, undefined when unchecked
const REQUIRE_SMS_OTP = process.env.NEXTAUTH_REQUIRE_SMS_OTP !== 'false';

const EMPLOYEE_ID_REGEX = /^EMP[-A-Z0-9]+$/;

// Secure by default: trustHost requires explicit environment variable opt-in
// For development, set AUTH_TRUST_HOST=true or NEXTAUTH_TRUST_HOST=true in .env.local
// Production and staging should NOT set these variables (defaults to false for security)
const trustHost =
  process.env.AUTH_TRUST_HOST === 'true' ||
  process.env.NEXTAUTH_TRUST_HOST === 'true';

const LoginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Email, phone, or employee number is required'),
    password: z.string().min(0, 'Password is required').optional(),
    // ✅ FIX: Make OTP fully optional (validation happens after user lookup)
    otpToken: z.string().trim().optional(),
    // ✅ FIXED: Handle HTML checkbox behavior ('on' when checked, undefined when unchecked)
    rememberMe: z.union([z.boolean(), z.string(), z.undefined()]).transform(val => {
      if (typeof val === 'boolean') return val;
      if (val === 'on' || val === 'true' || val === '1') return true;
      return false;
    }).optional().default(false),
    companyCode: z.string().trim().optional(),
  })
  // ✅ FIX: Remove OTP validation from schema - will be checked after user lookup
  // This allows super admin bypass to work properly
  .transform((data, ctx) => {
    const idRaw = data.identifier.trim();
    const emailOk = z.string().email().safeParse(idRaw).success;
    const phoneOk = /^\+?[0-9\-()\s]{6,20}$/.test(idRaw);
    const empUpper = idRaw.toUpperCase();
    const empOk = EMPLOYEE_ID_REGEX.test(empUpper);

    let loginIdentifier = '';
    let loginType: 'personal' | 'corporate';

    if (emailOk) {
      loginIdentifier = idRaw.toLowerCase();
      loginType = 'personal';
    } else if (phoneOk) {
      loginIdentifier = idRaw;
      loginType = 'personal';
    } else if (empOk) {
      loginIdentifier = empUpper;
      loginType = 'corporate';
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identifier'],
        message: 'Enter a valid email, phone number, or employee number (e.g., EMP-001)',
      });
      return z.NEVER;
    }

    const normalizedCompanyCode = data.companyCode?.trim()
      ? data.companyCode.trim().toUpperCase()
      : null;

    if (loginType === 'corporate' && !normalizedCompanyCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyCode'],
        message: 'Company number is required for corporate login',
      });
      return z.NEVER;
    }

    const passwordProvided = typeof data.password === 'string' && data.password.length > 0;
    if (!passwordProvided && !data.otpToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password or OTP token is required',
      });
      return z.NEVER;
    }

    return {
      loginIdentifier,
      loginType,
      password: passwordProvided ? data.password : null,
      otpToken: data.otpToken || null,
      rememberMe: data.rememberMe,
      companyCode: normalizedCompanyCode,
    };
  });

export const authConfig = {
  providers: [
    // Only add Google provider if both credentials are present
    ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
    ...(APPLE_CLIENT_ID && APPLE_CLIENT_SECRET
      ? [
          Apple({
            clientId: APPLE_CLIENT_ID,
            clientSecret: APPLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Employee Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' },
        companyCode: { label: 'Company Code', type: 'text' },
      },
       
      async authorize(credentials, _request) {
        try {
          // 1. Validate credentials schema
          const parsed = LoginSchema.safeParse(credentials);
          if (!parsed.success) {
            // ✅ FIXED: Pass Error as 2nd arg, metadata as 3rd for proper Sentry/Datadog integration
            const validationError = new Error('Credentials validation failed');
            logger.error('[NextAuth] Credentials validation failed', validationError, { 
              issues: parsed.error.flatten() 
            });
            return null;
          }

          const { loginIdentifier, loginType, password, rememberMe, otpToken, companyCode } = parsed.data;
          const otpIdentifier =
            loginType === 'corporate' && companyCode
              ? `${loginIdentifier}::${companyCode}`
              : loginIdentifier;

          // 2. Dynamic imports (Edge Runtime compatible)
          const { connectToDatabase } = await import('@/lib/mongodb-unified');
          const { User } = await import('@/server/models/User');
          const bcrypt = await import('bcryptjs');

          // 3. Connect to database
          await connectToDatabase();

          // 4. Find user based on login type
          // CRITICAL FIX: Use AuthUserDoc instead of UserDoc to avoid mongoose bundling
          type LeanUser = AuthUserDoc & {
            _id: string;
            subscriptionPlan?: string;
            orgId?: string | { toString(): string };
            roles?: Array<string | { toString(): string }>;
            role?: string;
          };
          let user: LeanUser | null;
          if (loginType === 'personal') {
            user = await User.findOne({ email: loginIdentifier }).lean<LeanUser>();
          } else {
            if (!companyCode) {
              logger.warn('[NextAuth] Corporate login missing company code', { loginIdentifier });
              return null;
            }
            // Corporate login uses employee number (stored in username field) + company code
            user = await User.findOne({ username: loginIdentifier, code: companyCode }).lean<LeanUser>();
          }

      if (!user) {
        // ✅ FIXED: Pass Error as 2nd arg, metadata as 3rd
        const notFoundError = new Error(`User not found: ${loginIdentifier}`);
        logger.error('[NextAuth] User not found', notFoundError, { loginIdentifier, loginType });
        return null;
      }

          // 4.5 Account lockout check
          const locked = (user as { security?: { locked?: boolean; lockReason?: string; lockTime?: Date; loginAttempts?: number } }).security;
          if (locked?.locked) {
            const lockTime = locked.lockTime ? new Date(locked.lockTime).getTime() : 0;
            const stillLocked = lockTime && Date.now() - lockTime < LOCK_WINDOW_MS;
            if (stillLocked) {
              logger.warn('[NextAuth] Locked account login attempt', { loginIdentifier });
              throw new Error('ACCOUNT_LOCKED');
            }
          }

          // 5. Verify password unless otpToken provided (passwordless OTP flow)
          if (password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
              const attempts = (user.security?.loginAttempts || 0) + 1;
              if (attempts >= MAX_LOGIN_ATTEMPTS) {
                await User.updateOne(
                  { _id: user._id },
                  {
                    $set: {
                      'security.locked': true,
                      'security.lockReason': 'Too many failed logins',
                      'security.lockTime': new Date(),
                    },
                  },
                );
              } else {
                await User.updateOne(
                  { _id: user._id },
                  {
                    $inc: { 'security.loginAttempts': 1 },
                  },
                );
              }
              const passwordError = new Error(`Invalid password for: ${loginIdentifier}`);
              logger.error('[NextAuth] Invalid password', passwordError, { loginIdentifier, loginType });
              throw new Error('INVALID_CREDENTIALS');
            }
            // Reset attempts on success
            await User.updateOne(
              { _id: user._id },
              {
                $set: {
                  'security.loginAttempts': 0,
                  'security.locked': false,
                  'security.lockReason': null,
                  'security.lockTime': null,
                },
              },
            );
          }

          // Reset attempts on success

          // 6. Check if user is active
          const isUserActive = user.status === 'ACTIVE';
          if (!isUserActive) {
            // ✅ FIXED: Pass Error as 2nd arg, metadata as 3rd
            const inactiveError = new Error(`Inactive user attempted login: ${loginIdentifier}`);
            logger.error('[NextAuth] Inactive user attempted login', inactiveError, { 
              loginIdentifier, 
              loginType,
              status: user.status,
            });
            return null;
          }

          // 6.5 Enforce email verification if required
          const emailVerifiedAt = (user as { emailVerifiedAt?: Date }).emailVerifiedAt;
          const requireEmailVerification =
            process.env.NEXTAUTH_REQUIRE_EMAIL_VERIFICATION !== 'false';
          if (requireEmailVerification && !emailVerifiedAt) {
            logger.warn('[NextAuth] Email not verified', { loginIdentifier });
            throw new Error('EMAIL_NOT_VERIFIED');
          }

          // 7. Update last login timestamp
          // Use updateOne to bypass Mongoose validation (some demo users may not have all required fields)
          await User.updateOne(
            { _id: user._id },
            { $set: { 'security.lastLogin': new Date() } }
          );

          // 7.5. ✅ FIX: Validate orgId for non-superadmin users (tenant isolation)
          const isSuperAdmin = Boolean((user as { isSuperAdmin?: boolean }).isSuperAdmin);
          if (!user.orgId && !isSuperAdmin) {
            logger.error('[NextAuth] Credentials login rejected: Missing orgId for non-superadmin user', { 
              loginIdentifier,
              userId: user._id.toString()
            });
            return null;
          }

          // 8. Enforce OTP session usage unless explicitly disabled, or OTP token provided for passwordless flow
          const isDevelopment = process.env.NODE_ENV !== 'production';
          const explicitBypass = process.env.NEXTAUTH_SUPERADMIN_BYPASS_OTP === 'true';
          const bypassOTP = isSuperAdmin && isDevelopment && explicitBypass;
          const otpProvided = Boolean(otpToken);

          if (REQUIRE_SMS_OTP && !bypassOTP) {
            if (!otpProvided) {
              logger.warn('[NextAuth] Missing OTP token for credentials login', { loginIdentifier });
              return null;
            }

            const session = otpSessionStore.get(otpToken!);
            if (!session) {
              logger.warn('[NextAuth] OTP session not found or already used', { loginIdentifier });
              return null;
            }

            const now = Date.now();
            if (now > session.expiresAt) {
              otpSessionStore.delete(otpToken!);
              logger.warn('[NextAuth] OTP session expired', { loginIdentifier });
              return null;
            }

            if (
              session.userId !== user._id.toString() ||
              session.identifier !== otpIdentifier
            ) {
              otpSessionStore.delete(otpToken!);
              logger.error('[NextAuth] OTP session mismatch', new Error('OTP session mismatch'), {
                loginIdentifier,
                sessionIdentifier: session.identifier,
              });
              return null;
            }

            otpSessionStore.delete(otpToken!);
          } else if (bypassOTP) {
            logger.info('[NextAuth] OTP bypassed for super admin', { loginIdentifier });
          }

          // 9. Return user object for NextAuth session
          const derivedRole =
            user.professional?.role ||
            user.role ||
            (Array.isArray(user.roles)
              ? (typeof user.roles[0] === 'string'
                  ? user.roles[0]
                  : user.roles[0]?.toString())
              : undefined);
          const sessionRole: UserRoleType | 'GUEST' =
            (derivedRole as UserRoleType | undefined) ?? 'GUEST';

          const sessionPlan: SessionPlan =
            (user.subscriptionPlan as SubscriptionPlan | undefined) ?? 'STARTER';

          const authUser = {
            id: user._id.toString(),
            email: user.email,
            name: `${user.personal?.firstName || ''} ${user.personal?.lastName || ''}`.trim() || user.email,
            role: sessionRole,
            subscriptionPlan: sessionPlan,
            orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || null),
            sessionId: null, // NextAuth will generate session ID
            rememberMe, // Pass rememberMe to session callbacks
            isSuperAdmin: Boolean((user as { isSuperAdmin?: boolean }).isSuperAdmin),
          };
          return authUser;
        } catch (error) {
          // ✅ FIXED: Pass actual Error as 2nd arg for proper stack traces in Sentry/Datadog
          logger.error('[NextAuth] Authorize error', error as Error, { 
            credentials: credentials ? 'present' : 'missing' 
          });
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user: _user, account: _account }) {
      // Handle Credentials provider (email/employee login)
      if (_account?.provider === 'credentials') {
        // User is already validated in authorize() function
        return true;
      }

      // Handle OAuth providers (Google, etc.)
      // Validate email exists
      if (!_user?.email) {
        if (process.env.LOG_LEVEL === 'debug') {
          logger.debug('OAuth sign-in rejected: No email provided');
        }
        return false;
      }
      
      // ✅ FIX: OAuth user lookup and validation (SECURITY)
      // Import User model dynamically to avoid edge runtime issues
      const { User } = await import('@/server/models/User');
      
      try {
        const dbUser = (await User.findOne({ email: _user.email })
          .lean()
          .exec()) as {
            orgId?: { toString(): string } | string | null;
            professional?: { role?: string | null };
            role?: string | null;
            isSuperAdmin?: boolean;
            permissions?: string[];
            roles?: string[];
            status?: string;
          } | null;
        
        // Block sign-in if user doesn't exist
        if (!dbUser) {
          logger.warn('[NextAuth] OAuth sign-in rejected: User not found in database', { 
            email: _user.email.substring(0, 3) + '***' // Privacy: partial email
          });
          return false;
        }
        
        // Block sign-in if user is not ACTIVE
        if (dbUser.status !== 'ACTIVE') {
          logger.warn('[NextAuth] OAuth sign-in rejected: User status not ACTIVE', { 
            email: _user.email.substring(0, 3) + '***',
            status: dbUser.status
          });
          return false;
        }
        
        // Block sign-in if non-superadmin user lacks orgId (tenant isolation)
        if (!dbUser.orgId && !dbUser.isSuperAdmin) {
          logger.error('[NextAuth] OAuth sign-in rejected: Missing orgId for non-superadmin user', { 
            email: _user.email.substring(0, 3) + '***'
          });
          return false;
        }
        
        // ✅ Attach role and orgId for jwt() callback to propagate to session
        const userWithMeta = _user as typeof _user & { 
          role?: string; 
          orgId?: string | null; 
          isSuperAdmin?: boolean; 
          permissions?: string[];
          roles?: string[];
        };
        const dbUserMeta = dbUser ?? {};
        userWithMeta.role = (dbUserMeta.professional?.role ||
          dbUserMeta.role ||
          'GUEST') as UserRoleType;
        userWithMeta.orgId = dbUserMeta.orgId
          ? dbUserMeta.orgId.toString()
          : null;
        userWithMeta.isSuperAdmin = Boolean(dbUserMeta.isSuperAdmin);
        userWithMeta.permissions = dbUserMeta.permissions || [];
        userWithMeta.roles = dbUserMeta.roles || [];
        
        logger.info('[NextAuth] OAuth sign-in allowed', { 
          email: _user.email.substring(0, 3) + '***',
          role: userWithMeta.role,
          hasOrgId: !!userWithMeta.orgId
        });
        
        return true;
      } catch (error) {
        logger.error('[NextAuth] OAuth sign-in error during user lookup', { error });
        return false; // Fail closed on errors
      }
    },
    async redirect({ url, baseUrl }) {
      // Handle callbackUrl properly
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl; // Fallback to homepage (not /fm/dashboard to avoid redirect loops)
    },
    async session({ session, token }) {
      // Add custom user data to session
      if (token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.role) {
        (session.user as ExtendedUser).role = token.role as UserRoleType;
      }
      if (token?.orgId) {
        (session.user as ExtendedUser).orgId = token.orgId as string | null;
      }
      // Add RBAC fields to session
      if (token?.isSuperAdmin !== undefined) {
        (session.user as ExtendedUser).isSuperAdmin = token.isSuperAdmin as boolean;
      }
      if (token?.permissions) {
        (session.user as ExtendedUser).permissions = token.permissions as string[];
      }
      if (token?.roles) {
        (session.user as ExtendedUser).roles = token.roles as string[];
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Add user info to token on first sign-in
      if (user) {
        token.id = user.id;
        const normalizedRole = (user as ExtendedUser).role?.toUpperCase() as UserRoleType | undefined;
        token.role = normalizedRole ?? (token.role as UserRoleType | 'GUEST') ?? 'GUEST';
        token.orgId = (user as ExtendedUser).orgId || null;

        // Handle rememberMe for credentials provider
        if (account?.provider === 'credentials' && (user as ExtendedUser).rememberMe) {
          // Extend token lifetime for "remember me"
          // This is handled by session.maxAge, but we can flag it here
          token.rememberMe = true;
        }
      }

      // ⚠️ RBAC data cannot be loaded here - JWT callback runs in Edge Runtime
      // Edge Runtime does not support Mongoose connections
      // RBAC data is loaded in API routes (Node.js runtime) using getSessionUser()
      // Set default empty values for RBAC fields in token
      if (token?.id && token.isSuperAdmin === undefined) {
        // Initialize RBAC fields to empty (will be populated by API routes)
        token.isSuperAdmin = false;
        token.roles = [];
        token.permissions = [];
      }
      
      return token;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // 15 minutes access token
    updateAge: 5 * 60,
    generateSessionToken: () => {
      // Short-lived session token; actual refresh handled via /api/auth/refresh cookies
      return crypto.randomUUID();
    },
  },
  secret: NEXTAUTH_SECRET,
  trustHost,
} satisfies NextAuthConfig;
