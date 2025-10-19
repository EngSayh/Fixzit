import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

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
      // Implement access control - restrict to authorized users
      // Option 1: Email domain whitelist (recommended for quick setup)
      // Uncomment and configure allowed domains:
      // const allowedDomains = ['yourdomain.com', 'partnerdomain.com'];
      // if (_user?.email) {
      //   const emailDomain = _user.email.split('@')[1];
      //   if (!allowedDomains.includes(emailDomain)) {
      //     return false; // Reject sign-in
      //   }
      // }

      // Option 2: Database verification (recommended for production)
      // Uncomment to check user exists in your database:
      // if (_user?.email) {
      //   const dbUser = await getUserByEmail(_user.email);
      //   if (!dbUser || !dbUser.isActive) {
      //     return false; // Reject sign-in
      //   }
      // }

      // TEMPORARY: Allow all sign-ins during development
      // TODO: Remove this and enable one of the options above before production
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
