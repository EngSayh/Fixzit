// ⚡ PERFORMANCE OPTIMIZATION: Demo credentials split into separate component
// This component is lazy-loaded and only shown in development
// Reduces initial login page bundle by ~5-10KB

import { ArrowRight, Shield, User, Building2, Users } from 'lucide-react';

interface DemoCredential {
  role: string;
  email?: string;
  employeeNumber?: string;
  password: string;
  description: string;
  icon: typeof Shield | typeof User | typeof Building2 | typeof Users;
  color: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    role: 'Super Admin',
    email: 'superadmin@fixzit.co',
    password: 'admin123',
    description: 'Full system access',
    icon: Shield,
    color: 'bg-destructive/10 text-destructive-foreground border-destructive/20'
  },
  {
    role: 'Admin',
    email: 'admin@fixzit.co',
    password: 'password123',
    description: 'Administrative access',
    icon: User,
    color: 'bg-primary/10 text-primary-foreground border-primary/20'
  },
  {
    role: 'Property Manager',
    email: 'manager@fixzit.co',
    password: 'password123',
    description: 'Property management',
    icon: Building2,
    color: 'bg-success/10 text-success-foreground border-success/20'
  },
  {
    role: 'Tenant',
    email: 'tenant@fixzit.co',
    password: 'password123',
    description: 'Tenant portal access',
    icon: Users,
    color: 'bg-secondary/10 text-secondary-foreground border-secondary/20'
  },
  {
    role: 'Vendor',
    email: 'vendor@fixzit.co',
    password: 'password123',
    description: 'Vendor marketplace access',
    icon: Users,
    color: 'bg-warning/10 text-warning-foreground border-warning/20'
  }
];

const CORPORATE_CREDENTIALS: DemoCredential[] = [
  {
    role: 'Property Manager (Corporate)',
    employeeNumber: 'EMP001',
    password: 'password123',
    description: 'Corporate account access',
    icon: Building2,
    color: 'bg-success/10 text-success-foreground border-success/20'
  },
  {
    role: 'Admin (Corporate)',
    employeeNumber: 'EMP002',
    password: 'password123',
    description: 'Corporate administrative access',
    icon: User,
    color: 'bg-primary/10 text-primary-foreground border-primary/20'
  }
];

interface DemoCredentialsSectionProps {
  isRTL: boolean;
  loginMethod: 'personal' | 'corporate' | 'sso';
  quickLogin: (cred: DemoCredential) => void;
  t: (key: string, fallback: string) => string;
}

export default function DemoCredentialsSection({
  isRTL,
  loginMethod,
  quickLogin,
  t
}: DemoCredentialsSectionProps) {
  if (loginMethod === 'sso') return null;

  return (
    <div className="mt-6 space-y-4">
      {/* Personal Email Credentials */}
      {loginMethod === 'personal' && (
        <div className="p-4 bg-muted rounded-2xl text-start">
          <h3 className="text-sm font-medium text-foreground mb-3">
            {t('login.personalEmailAccounts', 'Personal Email Accounts:')}
          </h3>
          <div className="space-y-2">
            {DEMO_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              return (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => quickLogin(cred)}
                  className={`w-full p-3 rounded-2xl border transition-colors hover:shadow-md ${cred.color}`}
                >
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Icon size={18} />
                    <div className="flex-1 text-start">
                      <div className="font-medium text-sm">{cred.role}</div>
                      <div className="text-xs opacity-80">{cred.description}</div>
                    </div>
                    <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {cred.email} / {cred.password}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Corporate Account Credentials */}
      {loginMethod === 'corporate' && (
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-start">
          <h3 className="text-sm font-medium text-primary mb-3">
            {t('login.corporateAccountEmployee', 'Corporate Account (Employee Number):')}
          </h3>
          <div className="space-y-2">
            {CORPORATE_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              return (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() => quickLogin(cred)}
                  className={`w-full p-3 rounded-2xl border transition-colors hover:shadow-md ${cred.color}`}
                >
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Icon size={18} />
                    <div className="flex-1 text-start">
                      <div className="font-medium text-sm">{cred.role}</div>
                      <div className="text-xs opacity-80">{cred.description}</div>
                    </div>
                    <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {t('login.employeeHash', 'Employee #:')} {cred.employeeNumber} / {cred.password}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
