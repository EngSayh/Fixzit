import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Privacy-preserving email hash helper for secure logging (Edge-compatible)
async function hashEmail(email: string): Promise<string> {
  // Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility
  const salt = process.env.LOG_HASH_SALT ?? '';
  const msgUint8 = new TextEncoder().encode(email + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 12);
}

// Validate required environment variables at startup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

const missingVars: string[] = [];
if (!GOOGLE_CLIENT_ID) missingVars.push('GOOGLE_CLIENT_ID');
if (!GOOGLE_CLIENT_SECRET) missingVars.push('GOOGLE_CLIENT_SECRET');
if (!NEXTAUTH_SECRET) missingVars.push('NEXTAUTH_SECRET');
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
  missingVars.push('NEXTAUTH_URL');
}

if (missingVars.length > 0) {
  throw new Error(
    'Missing required authentication configuration. See README env section.'
  );
}

// Environment-driven OAuth allowed domains
const allowedDomains = (process.env.OAUTH_ALLOWED_DOMAINS ?? 'fixzit.com,fixzit.co')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

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
      
      // Safely check email and extract domain
      if (!_user?.email) {
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('OAuth sign-in rejected: No email provided');
        }
        return false; // Reject sign-ins without email
      }

      const emailHash = await hashEmail(_user.email);
      const emailParts = _user.email.split('@');
      if (emailParts.length !== 2) {
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('OAuth sign-in rejected: Invalid email format', { emailHash });
        }
        return false; // Reject malformed emails
      }

      const emailDomain = emailParts[1].toLowerCase();
      if (!allowedDomains.includes(emailDomain)) {
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug('OAuth sign-in rejected: Domain not whitelisted', { 
            domain: emailDomain
          });
        }
        return false; // Reject unauthorized domains
      }

      // Database verification is handled by middleware.ts after successful OAuth
      // The middleware checks User.findOne({ email }) and validates isActive status
      // This separation ensures Edge Runtime compatibility (auth.config.ts cannot access MongoDB)

      // Allow sign-in for whitelisted domains
      console.log('OAuth sign-in allowed', { emailHash, provider: _account?.provider });
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
    async jwt({ token, user, account }) {
      // Add user info to token
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
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
