// TypeScript module augmentation for NextAuth
// Extends the built-in session and JWT types with custom fields

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      orgId: string | null;
      sessionId: string | null;
    };
  }

  interface User {
    id: string;
    role: string;
    orgId: string | null;
    sessionId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    orgId: string | null;
  }
}
