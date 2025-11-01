import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { User } from '@/server/models/User';

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
    if (url.protocol === 'https:') return image;
  } catch {
    // Invalid URL
  }
  return undefined;
}

async function getNextUserCode(): Promise<string> {
  const count = await User.countDocuments();
  return `USR${String(count + 1).padStart(6, '0')}`;
}

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
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user: _user, account: _account, profile: _profile }) {
      // OAuth user provisioning - create/update user in database
      
      // Validate email exists
      if (!_user?.email) {
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('OAuth sign-in rejected: No email provided');
        }
        return false;
      }
      
      // Only provision OAuth users (not credentials provider)
      if (_account?.provider && _account.provider !== 'credentials') {
        try {
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
            
            if (image) {
              user.customFields = user.customFields || {};
              (user.customFields as any).image = image;
            }

            user.security = user.security || {};
            user.security.lastLogin = new Date();

            await user.save();
            console.log('OAuth user updated successfully', { email, provider });
          } else {
            // Create new user with nested schema
            const code = await getNextUserCode();
            const username = email.split('@')[0];

            user = await User.create({
              code,
              username,
              email,
              password: '', // OAuth users don't have passwords
              personal: {
                firstName,
                lastName,
                middleName: '',
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
              customFields: image ? { image } : {},
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
      return `${baseUrl}/fm/dashboard`;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      // Add user info to token
      if (user) {
        token.id = user.id;
      }
      // Don't persist provider access tokens in long-lived JWT (security risk)
      // If needed for server-to-server calls, fetch on-demand using backend credential
      // or store a short-lived opaque reference instead
      return token;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
