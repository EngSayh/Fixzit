import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Export authOptions for compatibility with files expecting this name
export const authOptions = authConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
