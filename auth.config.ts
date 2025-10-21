import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

// Privacy-preserving email hash helper for secure logging (Edge-compatible)
async function hashEmail(email: string): Promise<string> {
  // Use Web Crypto API instead of Node.js crypto for Edge Runtime compatibility
  const msgUint8 = new TextEncoder().encode(email);
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

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables for NextAuth: ${missingVars.join(', ')}. ` +
    'Please add these to your .env.local file or GitHub Secrets.'
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
      // Configure allowed email domains for OAuth sign-in
      const allowedDomains = ['fixzit.com', 'fixzit.co'];
      
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
        console.warn('OAuth sign-in rejected: Domain not whitelisted', { 
          emailHash, 
          domain: emailDomain,
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
          const response = await fetch(`${baseUrl}/api/auth/user/${encodedEmail}`, {
            headers: { 'x-internal-auth': process.env.NEXTAUTH_SECRET || '' },
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
