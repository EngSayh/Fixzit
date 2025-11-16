import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { otpSessionStore } from '@/lib/otp-store';
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

// Validate required environment variables at startup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Validate non-secret variables always (fail-fast at startup), but allow CI builds
const missingNonSecrets: string[] = [];
const isCI = process.env.CI === 'true' || process.env.SKIP_ENV_VALIDATION === 'true';

if (process.env.NODE_ENV === 'production' && !isCI) {
  if (!process.env.NEXTAUTH_URL) missingNonSecrets.push('NEXTAUTH_URL');
}

if (missingNonSecrets.length > 0) {
  throw new Error(
    `Missing required runtime configuration: ${missingNonSecrets.join(', ')}. These are required for production runtime.`
  );
}

// Validate secrets only when not in CI and not explicitly skipped
const skipSecretValidation = isCI || process.env.SKIP_ENV_VALIDATION === 'true';

if (!skipSecretValidation) {
  const missingSecrets: string[] = [];
  
  // NEXTAUTH_SECRET is always required (for session signing)
  if (!NEXTAUTH_SECRET) missingSecrets.push('NEXTAUTH_SECRET');
  
  // Google OAuth credentials are optional (can use credentials provider only)
  if (!GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_SECRET) {
    logger.warn('⚠️  Google OAuth not configured. Only credentials authentication will be available.');
  } else if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    // If one is set, both must be set
    if (!GOOGLE_CLIENT_ID) missingSecrets.push('GOOGLE_CLIENT_ID');
    if (!GOOGLE_CLIENT_SECRET) missingSecrets.push('GOOGLE_CLIENT_SECRET');
  }

  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required authentication secrets: ${missingSecrets.join(', ')}. See README env section. Set SKIP_ENV_VALIDATION=true to skip secret checks during build (NOT recommended for production).`
    );
  }
} else if (isCI) {
  logger.warn('⚠️  CI=true: Secret validation skipped for CI build. Secrets will be required at runtime.');
} else {
  logger.warn('⚠️  SKIP_ENV_VALIDATION=true: Secret validation skipped. Secrets will be required at runtime.');
}

// Helper functions for OAuth provisioning (reserved for future use)
 
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

// Validation schema for credentials login (unified identifier field)
// NOTE: signIn() from next-auth/react sends checkbox values as 'on' when checked, undefined when unchecked
const REQUIRE_SMS_OTP = process.env.NEXTAUTH_REQUIRE_SMS_OTP !== 'false';

const LoginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Email or employee number is required'),
    password: z.string().min(1, 'Password is required'),
    otpToken: z.string().trim().min(1, 'OTP verification token is required').optional(),
    // ✅ FIXED: Handle HTML checkbox behavior ('on' when checked, undefined when unchecked)
    rememberMe: z.union([z.boolean(), z.string(), z.undefined()]).transform(val => {
      if (typeof val === 'boolean') return val;
      if (val === 'on' || val === 'true' || val === '1') return true;
      return false;
    }).optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (REQUIRE_SMS_OTP && !data.otpToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otpToken'],
        message: 'OTP verification is required. Please enter the latest code.',
      });
    }
  })
  .transform((data, ctx) => {
    const idRaw = data.identifier.trim();
    const emailOk = z.string().email().safeParse(idRaw).success;
    const empUpper = idRaw.toUpperCase();
    const empOk = /^EMP\d+$/.test(empUpper);

    let loginIdentifier = '';
    let loginType: 'personal' | 'corporate';

    if (emailOk) {
      loginIdentifier = idRaw.toLowerCase();
      loginType = 'personal';
    } else if (empOk) {
      loginIdentifier = empUpper;
      loginType = 'corporate';
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identifier'],
        message: 'Enter a valid email address or employee number (e.g., EMP001)',
      });
      return z.NEVER;
    }

    return {
      loginIdentifier,
      loginType,
      password: data.password,
      otpToken: data.otpToken || null,
      rememberMe: data.rememberMe,
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
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Employee Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' },
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

          const { loginIdentifier, loginType, password, rememberMe, otpToken } = parsed.data;

          // 2. Dynamic imports (Edge Runtime compatible)
          const { connectToDatabase } = await import('@/lib/mongodb-unified');
          const { User } = await import('@/server/models/User');
          const bcrypt = await import('bcryptjs');

          // 3. Connect to database
          await connectToDatabase();

          // 4. Find user based on login type
          let user;
          if (loginType === 'personal') {
            user = (await User.findOne({ email: loginIdentifier })) as any;
          } else {
            // Corporate login uses employee number (stored in username field)
            user = (await User.findOne({ username: loginIdentifier })) as any;
          }

          if (!user) {
            // ✅ FIXED: Pass Error as 2nd arg, metadata as 3rd
            const notFoundError = new Error(`User not found: ${loginIdentifier}`);
            logger.error('[NextAuth] User not found', notFoundError, { loginIdentifier, loginType });
            return null;
          }

          // 5. Verify password (inline to avoid importing @/lib/auth)
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            // ✅ FIXED: Pass Error as 2nd arg, metadata as 3rd
            const passwordError = new Error(`Invalid password for: ${loginIdentifier}`);
            logger.error('[NextAuth] Invalid password', passwordError, { loginIdentifier, loginType });
            return null;
          }

          // 6. Check if user is active
          const isUserActive = user.isActive !== undefined ? user.isActive : (user.status === 'ACTIVE');
          if (!isUserActive) {
            // ✅ FIXED: Pass Error as 2nd arg, metadata as 3rd
            const inactiveError = new Error(`Inactive user attempted login: ${loginIdentifier}`);
            logger.error('[NextAuth] Inactive user attempted login', inactiveError, { 
              loginIdentifier, 
              loginType,
              status: user.status,
              isActive: user.isActive 
            });
            return null;
          }

          // 7. Update last login timestamp
          // Use updateOne to bypass Mongoose validation (some demo users may not have all required fields)
          await User.updateOne(
            { _id: user._id },
            { $set: { 'security.lastLogin': new Date() } }
          );

          // 8. Enforce OTP session usage unless explicitly disabled
          if (REQUIRE_SMS_OTP) {
            if (!otpToken) {
              logger.warn('[NextAuth] Missing OTP token for credentials login', { loginIdentifier });
              return null;
            }

            const session = otpSessionStore.get(otpToken);
            if (!session) {
              logger.warn('[NextAuth] OTP session not found or already used', { loginIdentifier });
              return null;
            }

            const now = Date.now();
            if (now > session.expiresAt) {
              otpSessionStore.delete(otpToken);
              logger.warn('[NextAuth] OTP session expired', { loginIdentifier });
              return null;
            }

            if (
              session.userId !== user._id.toString() ||
              session.identifier !== loginIdentifier
            ) {
              otpSessionStore.delete(otpToken);
              logger.error('[NextAuth] OTP session mismatch', new Error('OTP session mismatch'), {
                loginIdentifier,
                sessionIdentifier: session.identifier,
              });
              return null;
            }

            otpSessionStore.delete(otpToken);
          }

          // 9. Return user object for NextAuth session
          const authUser = {
            id: user._id.toString(),
            email: user.email,
            name: `${user.personal?.firstName || ''} ${user.personal?.lastName || ''}`.trim() || user.email,
            role: user.professional?.role || user.role || 'GUEST',
            subscriptionPlan: user.subscriptionPlan || 'FREE',
            orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || null),
            sessionId: null, // NextAuth will generate session ID
            rememberMe, // Pass rememberMe to session callbacks
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
      
      // ⚡ OAuth user provisioning moved to auth.ts (Node.js runtime)
      // This callback just validates the sign-in attempt
      // Actual user creation happens in the jwt() callback which runs in Node.js runtime
      
      return true;
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
        (session.user as ExtendedUser).role = token.role as string;
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
        token.role = (user as ExtendedUser).role as 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'VENDOR' | 'OWNER' | 'TENANT' | 'VIEWER' | 'GUEST' || 'GUEST';
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
