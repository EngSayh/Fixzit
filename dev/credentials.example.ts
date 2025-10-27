/**
 * Server-only demo credentials for Dev Login Helpers.
 * NEVER commit real values. Keep this file gitignored.
 * 
 * Copy to dev/credentials.server.ts and fill with real values.
 */

export const ENABLED =
  process.env.ENABLE_DEMO_LOGIN === 'true' ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' ||
  process.env.NODE_ENV === 'development';

// Optional default org for all demo users (tenant scoping in tests).
const DEFAULT_ORG_ID = process.env.SEED_ORG_ID; // 24-char hex ObjectId string (optional)

export type DemoIcon = 'User' | 'Shield' | 'Building2' | 'Users';

export type DemoCredentialBase = {
  /** Display label for the card (kept as-is for your UI) */
  role: string;
  /** Optional nicer subtitle */
  description?: string;
  /** Tailwind classes for the card */
  color?: string;
  /** Which icon to render (lucide-react map lives in the client component) */
  icon?: DemoIcon;
  /** Optional tenant to attach (x-org-id) in tests/routes */
  orgId?: string;
  /** Optional landing path after login (client can use or ignore) */
  preferredPath?: string;
};

export type DemoCredential =
  | (DemoCredentialBase & {
      loginType: 'personal';
      email: string;
      password: string;
    })
  | (DemoCredentialBase & {
      loginType: 'corporate';
      employeeNumber: string;
      password: string;
    });

/** Personal accounts (email/password) */
export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  {
    role: 'SuperAdmin',
    loginType: 'personal',
    email: 'superadmin@example.com',
    password: 'change_me_123',
    description: 'Full system access',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'Shield',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/dashboard',
  },
  {
    role: 'Admin',
    loginType: 'personal',
    email: 'admin@example.com',
    password: 'change_me_123',
    description: 'Administrative access',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'User',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/dashboard',
  },
  {
    role: 'Manager',
    loginType: 'personal',
    email: 'manager@example.com',
    password: 'change_me_123',
    description: 'Property management',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'Building2',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/properties',
  },
  {
    role: 'Tenant',
    loginType: 'personal',
    email: 'tenant@example.com',
    password: 'change_me_123',
    description: 'Tenant portal access',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: 'Users',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/properties',
  },
  {
    role: 'Vendor',
    loginType: 'personal',
    email: 'vendor@example.com',
    password: 'change_me_123',
    description: 'Vendor marketplace access',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'Users',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/marketplace',
  },
] as const;

/** Corporate accounts (employeeNumber/password) */
export const CORPORATE_CREDENTIALS: readonly DemoCredential[] = [
  {
    role: 'Manager (Corporate)',
    loginType: 'corporate',
    employeeNumber: 'EMP001',
    password: 'change_me_123',
    description: 'Corporate account access',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'Building2',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/properties',
  },
  {
    role: 'Admin (Corporate)',
    loginType: 'corporate',
    employeeNumber: 'EMP002',
    password: 'change_me_123',
    description: 'Corporate administrative access',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'User',
    orgId: DEFAULT_ORG_ID,
    preferredPath: '/fm/dashboard',
  },
] as const;

/* ---------------- Helper utilities (server-only) ---------------- */

/** Return sanitized lists (no passwords) for the client API. */
export function listSanitized() {
  const sanitize = (c: DemoCredential) => ({
    role: c.role,
    description: c.description,
    color: c.color,
    icon: c.icon,
    loginType: c.loginType,
    email: c.loginType === 'personal' ? c.email : undefined,
    employeeNumber: c.loginType === 'corporate' ? c.employeeNumber : undefined,
    preferredPath: c.preferredPath,
  });
  return {
    demo: DEMO_CREDENTIALS.map(sanitize),
    corporate: CORPORATE_CREDENTIALS.map(sanitize),
  };
}

/** Resolve a role to a server-side login payload (used by /api/dev/demo-login). */
export function findLoginPayloadByRole(role: string) {
  const all: readonly DemoCredential[] = [...DEMO_CREDENTIALS, ...CORPORATE_CREDENTIALS];
  const found = all.find((c) => c.role.toLowerCase() === role.toLowerCase());
  if (!found) return null;

  if (found.loginType === 'personal') {
    return {
      loginType: 'personal' as const,
      email: found.email,
      password: found.password,
      orgId: found.orgId,
      preferredPath: found.preferredPath,
      role: found.role,
    };
  }
  return {
    loginType: 'corporate' as const,
    employeeNumber: found.employeeNumber,
    password: found.password,
    orgId: found.orgId,
    preferredPath: found.preferredPath,
    role: found.role,
  };
}

/** Light sanity checks — logs warnings in dev if placeholders remain. */
export function assertDemoConfig() {
  if (!ENABLED) return;
  const weakSet = new Set(['change_me_123', 'password', '123456', 'admin']);
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const c of [...DEMO_CREDENTIALS, ...CORPORATE_CREDENTIALS]) {
    if (weakSet.has(c.password)) {
      // eslint-disable-next-line no-console
      console.warn(`[DevLogin] Weak placeholder password for role "${c.role}". Replace in dev/credentials.server.ts.`);
    }
    if (c.loginType === 'personal' && !emailRx.test(c.email)) {
      // eslint-disable-next-line no-console
      console.warn(`[DevLogin] Invalid email for role "${c.role}": ${c.email}`);
    }
    if (c.loginType === 'corporate' && !c.employeeNumber) {
      // eslint-disable-next-line no-console
      console.warn(`[DevLogin] Missing employeeNumber for "${c.role}".`);
    }
  }
}
