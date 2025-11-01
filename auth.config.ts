import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Privacy-preserving email hash for secure logging (Edge Runtime compatible)
 * 
 * Hashes email addresses to prevent PII leakage in logs while maintaining uniqueness for debugging.
 * Uses SHA-256 with salting and delimiter to prevent length-extension attacks.
 * 
 * Security model:
 * - Production: Requires LOG_HASH_SALT (enforced at startup, see missingVars check below)
 * - Development: Uses dev-only salt for local testing convenience (unsafe for production)
 * 
 * Returns 64-bit hash (16 hex chars) for collision resistance while keeping logs concise.
 */
async function hashEmail(email: string): Promise<string> {
  // Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility
  // Add salt to prevent rainbow table attacks (REQUIRED in production)
  const salt = process.env.LOG_HASH_SALT;

  // Enforce salt requirement in production
  if (process.env.NODE_ENV === 'production') {
    if (!salt || salt.trim().length === 0) {
      throw new Error('FATAL: LOG_HASH_SALT is required in production environment. Generate with: openssl rand -hex 32');
    }
    if (salt.length < 32) {
      throw new Error('FATAL: LOG_HASH_SALT must be at least 32 characters. Current length: ' + salt.length);
    }
  }

  // Use delimiter to prevent length-extension attacks
  const finalSalt = salt || 'dev-only-salt-REPLACE-IN-PROD';
  const msgUint8 = new TextEncoder().encode(`${finalSalt}|${email}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 64 bits for better collision resistance
}

// Note: No domain whitelist - all OAuth providers allowed for B2B SaaS customers

// Validate required environment variables at startup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const LOG_HASH_SALT = process.env.LOG_HASH_SALT;

// Validate non-secret variables always (fail-fast at startup), but allow CI builds
const missingNonSecrets: string[] = [];
const isCI = process.env.CI === 'true' || process.env.SKIP_ENV_VALIDATION === 'true';

if (process.env.NODE_ENV === 'production' && !isCI) {
  if (!process.env.NEXTAUTH_URL) missingNonSecrets.push('NEXTAUTH_URL');
  if (!LOG_HASH_SALT) missingNonSecrets.push('LOG_HASH_SALT (required in production for secure email hashing)');
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
  if (!INTERNAL_API_SECRET) missingSecrets.push('INTERNAL_API_SECRET');

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

      const emailHash = await hashEmail(_user.email);
      
      // Only provision OAuth users (not credentials provider)
      if (_account?.provider && _account.provider !== 'credentials') {
        try {
          // Call internal API to provision user (this is database write)
          // Use internal API secret for authentication
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const response = await fetch(`${baseUrl}/api/auth/provision-oauth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({
              email: _user.email,
              name: _user.name,
              image: _user.image,
              provider: _account.provider,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            console.error('OAuth provisioning failed', { emailHash, error });
            return false;
          }

          console.log('OAuth user provisioned successfully', { emailHash, provider: _account.provider });
        } catch (error) {
          console.error('OAuth provisioning error', {
            emailHash,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          return false;
        }
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
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
