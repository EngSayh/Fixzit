import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
// NOTE: Mongoose imports MUST be dynamic inside authorize() to avoid Edge Runtime issues
// import { User } from '@/server/models/User'; // ❌ Breaks Edge Runtime
// import { verifyPassword } from '@/lib/auth'; // ❌ Imports User model

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
  if (!GOOGLE_CLIENT_ID) missingSecrets.push('GOOGLE_CLIENT_ID');
  if (!GOOGLE_CLIENT_SECRET) missingSecrets.push('GOOGLE_CLIENT_SECRET');
  if (!NEXTAUTH_SECRET) missingSecrets.push('NEXTAUTH_SECRET');

  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing required authentication secrets: ${missingSecrets.join(', ')}. See README env section. Set SKIP_ENV_VALIDATION=true to skip secret checks during build (NOT recommended for production).`
    );
  }
} else if (isCI) {
  console.warn('⚠️  CI=true: Secret validation skipped for CI build. Secrets will be required at runtime.');
} else {
  console.warn('⚠️  SKIP_ENV_VALIDATION=true: Secret validation skipped. Secrets will be required at runtime.');
}

// Helper functions for OAuth provisioning
function sanitizeName(name?: string | null): string {
  if (!name) return 'Unknown User';
  return name.trim().substring(0, 100);
}

function sanitizeImage(image?: string | null): string | undefined {
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
const LoginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Email or employee number is required'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
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
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Employee Number', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' },
      },
      async authorize(credentials) {
        try {
          // 1. Validate credentials schema
          const parsed = LoginSchema.safeParse(credentials);
          if (!parsed.success) {
            console.error('[NextAuth] Credentials validation failed:', parsed.error.flatten());
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
            user = await User.findOne({ email: loginIdentifier });
          } else {
            // Corporate login uses employee number (stored in username field)
            user = await User.findOne({ username: loginIdentifier });
          }

          if (!user) {
            console.error('[NextAuth] User not found:', loginIdentifier);
            return null;
          }

          // 5. Verify password (inline to avoid importing @/lib/auth)
          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            console.error('[NextAuth] Invalid password for:', loginIdentifier);
            return null;
          }

          // 6. Check if user is active
          const isUserActive = user.isActive !== undefined ? user.isActive : (user.status === 'ACTIVE');
          if (!isUserActive) {
            console.error('[NextAuth] Inactive user attempted login:', loginIdentifier);
            return null;
          }

          // 7. Update last login timestamp
          user.security = user.security || {};
          user.security.lastLogin = new Date();
          await user.save();

          // 8. Return user object for NextAuth session
          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.personal?.firstName || ''} ${user.personal?.lastName || ''}`.trim() || user.email,
            role: user.professional?.role || user.role || 'USER',
            orgId: typeof user.orgId === 'string' ? user.orgId : (user.orgId?.toString() || null),
            sessionId: null, // NextAuth will generate session ID
          } as any; // Type assertion to bypass rememberMe field
        } catch (error) {
          console.error('[NextAuth] Authorize error:', error);
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
    async signIn({ user: _user, account: _account, profile: _profile }) {
      // Handle Credentials provider (email/employee login)
      if (_account?.provider === 'credentials') {
        // User is already validated in authorize() function
        return true;
      }

      // Handle OAuth providers (Google, etc.)
      // Validate email exists
      if (!_user?.email) {
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('OAuth sign-in rejected: No email provided');
        }
        return false;
      }
      
      // Provision OAuth users (not credentials provider)
      if (_account?.provider && _account.provider !== 'credentials') {
        try {
          // Dynamic imports (Edge Runtime compatible)
          const { connectToDatabase } = await import('@/lib/mongodb-unified');
          const { User } = await import('@/server/models/User');
          const { getNextAtomicUserCode } = await import('@/lib/mongoUtils');

          // Connect to database and provision user directly
          await connectToDatabase();

          const email = _user.email.toLowerCase();
          const name = sanitizeName(_user.name);
          const image = sanitizeImage(_user.image);
          const provider = _account.provider;

          // Split name into first/last
          const nameParts = name.split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';
          const fullName = `${firstName} ${lastName}`.trim();

          // Check if user already exists
          let user = await User.findOne({ email });

          if (user) {
            // Update existing user
            user.personal = user.personal || {};
            user.personal.firstName = user.personal.firstName || firstName;
            user.personal.lastName = user.personal.lastName || lastName;
            
            // Use $set to preserve other customFields (no data loss)
            if (image) {
              user.set('customFields.image', image);
            }

            user.security = user.security || {};
            user.security.lastLogin = new Date();

            await user.save();
            console.log('OAuth user updated successfully', { email, provider });
          } else {
            // Create new user with nested schema
            const code = await getNextAtomicUserCode();
            const username = code; // Use unique code as username (no conflicts)

            user = await User.create({
              code,
              username,
              email,
              password: '', // OAuth users don't have passwords
              personal: {
                firstName,
                lastName,
                fullName,
              },
              professional: {
                role: 'TENANT', // Default role for OAuth sign-ups
              },
              security: {
                lastLogin: new Date(),
                accessLevel: 'READ',
                permissions: [],
              },
              preferences: {
                language: 'ar',
                timezone: 'Asia/Riyadh',
                notifications: {
                  email: true,
                  sms: false,
                  app: true,
                },
              },
              status: 'ACTIVE',
              customFields: {
                image,
                authProvider: provider,
              },
            });

            console.log('OAuth user created successfully', { email, provider, code });
          }

          // Store user ID in the session
          if (user._id) {
            _user.id = user._id.toString();
          }
        } catch (error) {
          console.error('OAuth provisioning error', {
            email: _user.email,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          return false;
        }
      }

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
        (session.user as any).role = token.role;
      }
      if (token?.orgId) {
        (session.user as any).orgId = token.orgId;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Add user info to token on first sign-in
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'USER';
        token.orgId = (user as any).orgId || null;
        
        // Handle rememberMe for credentials provider
        if (account?.provider === 'credentials' && (user as any).rememberMe) {
          // Extend token lifetime for "remember me"
          // This is handled by session.maxAge, but we can flag it here
          token.rememberMe = true;
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
