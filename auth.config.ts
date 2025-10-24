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
  const salt = process.env.LOG_HASH_SALT;
  
  // Production salt requirement enforced by startup validation (see missingVars check below)
  // Dev fallback allowed only in development for testing (never reaches production)
  const finalSalt = salt || 'dev-only-salt-REPLACE-IN-PROD';
  
  // Use delimiter to prevent length-extension attacks
  const msgUint8 = new TextEncoder().encode(`${finalSalt}|${email}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 64 bits for better collision resistance
}

// Validate required environment variables at startup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;
const LOG_HASH_SALT = process.env.LOG_HASH_SALT;

const missingVars: string[] = [];
if (!GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
if (!GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
if (!NEXTAUTH_SECRET) missingVars.push('NEXTAUTH_SECRET');
if (!INTERNAL_API_SECRET) missingVars.push('INTERNAL_API_SECRET');
if (process.env.NODE_ENV === 'production' && !LOG_HASH_SALT) {
  missingVars.push('LOG_HASH_SALT (required in production for secure email hashing)');
}

// Validate LOG_HASH_SALT in production (fail-fast at module initialization)
// Skip during CI build (secrets not needed for build, only for runtime)
if (process.env.NODE_ENV === 'production' && process.env.CI !== 'true') {
  const salt = process.env.LOG_HASH_SALT;
  if (!salt || salt.trim().length === 0) {
    throw new Error(
      'FATAL: LOG_HASH_SALT is required in production environment. ' +
      'Generate with: openssl rand -hex 32'
    );
  }
  if (salt.length < 32) {
    throw new Error(
      `FATAL: LOG_HASH_SALT must be at least 32 characters in production. Current length: ${salt.length}. ` +
      'Generate with: openssl rand -hex 32'
    );
  }
}

// Validate INTERNAL_API_SECRET in production (fail-fast)
// Skip during CI build (secrets not needed for build, only for runtime)
if (process.env.NODE_ENV === 'production' && process.env.CI !== 'true') {
  if (!INTERNAL_API_SECRET || INTERNAL_API_SECRET.trim().length === 0) {
    throw new Error(
      'FATAL: INTERNAL_API_SECRET is required in production. ' +
      'Generate a secure secret: openssl rand -hex 32'
    );
  }
  if (INTERNAL_API_SECRET.trim().length < 32) {
    throw new Error(
      `FATAL: INTERNAL_API_SECRET must be at least 32 characters in production. Current length: ${INTERNAL_API_SECRET.trim().length}. ` +
      'Generate a secure secret: openssl rand -hex 32'
    );
  }
}

// Skip validation during CI build (secrets not needed for build, only for runtime)
if (missingVars.length > 0 && process.env.CI !== 'true') {
  throw new Error(
    `Missing required environment variables for NextAuth: ${missingVars.join(', ')}. ` +
    'Please add these to your .env.local file or GitHub Secrets.'
  );
}
// In CI, log warning but allow build to continue
if (missingVars.length > 0 && process.env.CI === 'true') {
  console.warn(
    `⚠️  Warning: Missing environment variables (will be required at runtime): ${missingVars.join(', ')}`
  );
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
      // OAuth Access Control - Email Domain Whitelist
      // Environment-driven configuration for OAuth allowed domains
      // Format: OAUTH_ALLOWED_DOMAINS="fixzit.com,fixzit.co,example.com"
      const domainsEnv = process.env.OAUTH_ALLOWED_DOMAINS || 'fixzit.com,fixzit.co';
      const allowedDomains = domainsEnv.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
      
      // Safely check email and extract domain
      if (!_user?.email) {
        console.warn('OAuth sign-in rejected: No email provided');
        return false; // Reject sign-ins without email
      }

      const emailHash = await hashEmail(_user.email);
      const emailParts = _user.email.split('@');
      if (emailParts.length !== 2) {
        console.warn('OAuth sign-in rejected: Invalid email format', { emailHash });
        return false; // Reject malformed emails
      }

      const emailDomain = emailParts[1].toLowerCase();
      if (!allowedDomains.includes(emailDomain)) {
        // Hash domain for privacy in logs
        const domainHash = await hashEmail(emailDomain);
        console.warn('OAuth sign-in rejected: Domain not whitelisted', { 
          emailHash, 
          domainHash,
          provider: _account?.provider 
        });
        return false; // Reject unauthorized domains
      }

      // User provisioning: Check if user exists in database, create if needed
      // This ensures OAuth users are registered in the system
      try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/auth/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: _user.email,
            name: _user.name,
            image: _user.image,
            provider: _account?.provider,
          }),
        });

        if (!response.ok) {
          console.error('User provisioning failed', { 
            emailHash, 
            status: response.status 
          });
          // Allow sign-in to proceed even if provisioning fails (graceful degradation)
          // User will be created on first middleware access if needed
        }
      } catch (error) {
        console.error('User provisioning error', { emailHash, error });
        // Allow sign-in to proceed (graceful degradation)
      }

      // Allow sign-in for whitelisted domains
      console.log('OAuth sign-in allowed', { emailHash, provider: _account?.provider });
      return true;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Redirect to dashboard after successful login
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }) {
      // Add user ID and role to session from token
      // Validate token.sub exists (required for session.user.id)
      if (!token?.sub) {
        throw new Error('JWT token missing required sub claim');
      }
      
      session.user.id = token.sub;
      
      if (token?.role) {
        session.user.role = token.role as string;
      }
      if (token?.orgId) {
        session.user.orgId = token.orgId as string;
      }
      return session;
    },
    async jwt({ token, user, account: _account }) {
      // Propagate user info from database to token on first sign-in
      if (user) {
        token.id = user.id;
        // Fetch user role from database via provision API
        try {
          // Guard against undefined/null email and URL-encode for safety
          if (!user.email) {
            token.role = 'USER';
            return token;
          }
          
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const encodedEmail = encodeURIComponent(user.email);
          
          // Use validated INTERNAL_API_SECRET (validated at startup, no fallback)
          if (!INTERNAL_API_SECRET) {
            throw new Error('INTERNAL_API_SECRET not available - startup validation failed');
          }
          
          const response = await fetch(`${baseUrl}/api/auth/user/${encodedEmail}`, {
            headers: { 
              // Use dedicated internal API secret instead of reusing NEXTAUTH_SECRET
              // This follows security best practice of not reusing signing secrets for authentication
              'x-internal-auth': INTERNAL_API_SECRET
            },
          });
          if (response.ok) {
            const userData = await response.json();
            token.role = userData.role || 'USER';
            token.orgId = userData.orgId;
          } else {
            // Default to USER role if lookup fails
            token.role = 'USER';
          }
        } catch (_error) {
          // Default to USER role on error
          token.role = 'USER';
        }
      }
      // DO NOT store OAuth access tokens in JWT for security
      // Tokens should be stored server-side if needed for API calls
      return token;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
