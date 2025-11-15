import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { logger } from '@/lib/logger';
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
// NOTE: signIn() from next-auth/react sends all values as strings, so we need to handle string-to-boolean conversion
const LoginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Email or employee number is required'),
    password: z.string().min(1, 'Password is required'),
    // rememberMe comes as string "true"/"false" from signIn(), coerce to boolean
    rememberMe: z.union([z.boolean(), z.string()]).transform(val => {
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === '1';
    }).optional().default(false),
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
            logger.error('[NextAuth] Credentials validation failed:', { error: parsed.error.flatten() });
            return null;
          }

          const { loginIdentifier, loginType, password, rememberMe } = parsed.data;

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
            logger.error('[NextAuth] User not found:', { loginIdentifier });
            return null;
          }

          // 5. Verify password (inline to avoid importing @/lib/auth)
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            logger.error('[NextAuth] Invalid password for:', { loginIdentifier });
            return null;
          }

          // 6. Check if user is active
          const isUserActive = user.isActive !== undefined ? user.isActive : (user.status === 'ACTIVE');
          if (!isUserActive) {
            logger.error('[NextAuth] Inactive user attempted login:', { loginIdentifier });
            return null;
          }

          // 7. Update last login timestamp
          // Use updateOne to bypass Mongoose validation (some demo users may not have all required fields)
          await User.updateOne(
            { _id: user._id },
            { $set: { 'security.lastLogin': new Date() } }
          );

          // 8. Return user object for NextAuth session
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
          logger.error('[NextAuth] Authorize error:', { error });
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

      // Load RBAC data from database on every token refresh
      // This ensures permissions are always up-to-date
      if (token?.id) {
        try {
          // Dynamic imports to avoid Edge Runtime issues
          const { connectToDatabase } = await import('@/lib/mongodb-unified');
          const userModelModule = await import('@/server/models/User');
          const User = userModelModule.User;
          
          // Check if User model loaded successfully
          if (!User) {
            throw new Error('User model not loaded');
          }
          
          await connectToDatabase();
          
          // Load user with populated roles
          const dbUser = (await User.findById(token.id)
            .populate('roles')
            .select('isSuperAdmin roles')
            .lean()) as {
              isSuperAdmin?: boolean;
              roles?: Array<{
                slug?: string;
                name?: string;
                permissions?: Array<string | { key: string }>;
                wildcard?: boolean;
              }>;
            } | null;
          
          if (dbUser) {
            // Set Super Admin flag
            token.isSuperAdmin = dbUser.isSuperAdmin || false;
            
            // Extract role slugs
            token.roles = Array.isArray(dbUser.roles)
              ? dbUser.roles.map((r) => r.slug || r.name).filter((s): s is string => typeof s === 'string')
              : [];
            
            // Extract permissions from roles
            const permissionSet = new Set<string>();
            
            // Super Admin gets wildcard permission
            if (dbUser.isSuperAdmin) {
              permissionSet.add('*');
            }
            
            // Collect permissions from all roles
            if (Array.isArray(dbUser.roles)) {
              for (const role of dbUser.roles) {
                if (role && Array.isArray(role.permissions)) {
                  for (const perm of role.permissions) {
                    if (typeof perm === 'string') {
                      permissionSet.add(perm);
                    } else if (perm && typeof perm === 'object' && 'key' in perm) {
                      permissionSet.add(perm.key);
                    }
                  }
                }
                // If role has wildcard flag, add wildcard
                if (role && role.wildcard) {
                  permissionSet.add('*');
                }
              }
            }
            
            token.permissions = Array.from(permissionSet);
          } else {
            // User not found, clear RBAC data
            token.isSuperAdmin = false;
            token.roles = [];
            token.permissions = [];
          }
        } catch (error) {
          logger.error('[NextAuth] Failed to load RBAC data:', { error });
          // On error, keep previous RBAC data or set defaults
          if (token.isSuperAdmin === undefined) {
            token.isSuperAdmin = false;
            token.roles = [];
            token.permissions = [];
          }
        }
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
