// Copy to dev/credentials.server.ts and fill with real values.
// Do NOT commit dev/credentials.server.ts (keep gitignored).

export type DemoCredential =
  | { role: string; description?: string; color?: string; icon?: 'User'|'Shield'|'Building2'|'Users'; loginType: 'personal'; email: string; password: string }
  | { role: string; description?: string; color?: string; icon?: 'User'|'Shield'|'Building2'|'Users'; loginType: 'corporate'; employeeNumber: string; password: string };

export const DEMO_CREDENTIALS: DemoCredential[] = [
  { 
    role: 'SuperAdmin', 
    loginType: 'personal', 
    email: 'superadmin@example.com', 
    password: 'change_me_123',
    description: 'Full system access',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: 'Shield'
  },
  {
    role: 'Admin',
    loginType: 'personal',
    email: 'admin@example.com',
    password: 'change_me_123',
    description: 'Administrative access',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'User'
  },
  {
    role: 'Manager',
    loginType: 'personal',
    email: 'manager@example.com',
    password: 'change_me_123',
    description: 'Property management',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'Building2'
  },
  {
    role: 'Tenant',
    loginType: 'personal',
    email: 'tenant@example.com',
    password: 'change_me_123',
    description: 'Tenant portal access',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: 'Users'
  },
  {
    role: 'Vendor',
    loginType: 'personal',
    email: 'vendor@example.com',
    password: 'change_me_123',
    description: 'Vendor marketplace access',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'Users'
  }
];

export const CORPORATE_CREDENTIALS: DemoCredential[] = [
  {
    role: 'Manager (Corporate)',
    loginType: 'corporate',
    employeeNumber: 'EMP001',
    password: 'change_me_123',
    description: 'Corporate account access',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: 'Building2'
  },
  {
    role: 'Admin (Corporate)',
    loginType: 'corporate',
    employeeNumber: 'EMP002',
    password: 'change_me_123',
    description: 'Corporate administrative access',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'User'
  }
];
