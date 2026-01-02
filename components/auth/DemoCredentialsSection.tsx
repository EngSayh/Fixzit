// ⚡ PERFORMANCE OPTIMIZATION: Demo credentials split into separate component
// This component is lazy-loaded and only shown in development/preview
// Reduces initial login page bundle by ~5-10KB
// 🔒 SECURITY: Gated by NEXT_PUBLIC_SHOW_DEMO_CREDS environment variable

import { ArrowRight, Shield, User, Building2, Users } from "@/components/ui/icons";
import {
  DEMO_CREDENTIALS_PERSONAL,
  DEMO_CREDENTIALS_CORPORATE,
  DEMO_PASSWORDS_CONFIGURED,
} from "@/lib/config/demo-users";

// 🔒 SECURITY: Check if demo credentials should be shown
// Only true in development or if explicitly enabled via env var
const SHOW_DEMO_CREDS =
  (process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === "true") &&
  DEMO_PASSWORDS_CONFIGURED;

interface DemoCredential {
  role: string;
  email?: string;
  employeeNumber?: string;
  password: string;
  description: string;
  icon: typeof Shield | typeof User | typeof Building2 | typeof Users;
  color: string;
}

// Role to icon/color mapping for UI presentation
const ROLE_STYLING: Record<
  string,
  { icon: typeof Shield; color: string }
> = {
  "Super Admin": {
    icon: Shield,
    color: "bg-destructive/10 text-destructive-foreground border-destructive/20",
  },
  Admin: {
    icon: User,
    color: "bg-primary/10 text-primary-foreground border-primary/20",
  },
  "Property Manager": {
    icon: Building2,
    color: "bg-success/10 text-success-foreground border-success/20",
  },
  Tenant: {
    icon: Users,
    color: "bg-secondary/10 text-secondary-foreground border-secondary/20",
  },
  Vendor: {
    icon: Users,
    color: "bg-warning/10 text-warning-foreground border-warning/20",
  },
};

const CORPORATE_ROLE_STYLING: Record<
  string,
  { icon: typeof Shield; color: string }
> = {
  "Property Manager (Corporate)": {
    icon: Building2,
    color: "bg-success/10 text-success-foreground border-success/20",
  },
  "Admin (Corporate)": {
    icon: User,
    color: "bg-primary/10 text-primary-foreground border-primary/20",
  },
};

// Only define credentials if we're going to show them
// This ensures they're tree-shaken out of production builds when disabled
// Uses centralized demo users from lib/config/demo-users.ts
const DEMO_CREDENTIALS: DemoCredential[] = SHOW_DEMO_CREDS
  ? DEMO_CREDENTIALS_PERSONAL.map((cred) => ({
      role: cred.role,
      email: cred.email,
      password: cred.password,
      description: cred.description,
      icon: ROLE_STYLING[cred.role]?.icon || User,
      color:
        ROLE_STYLING[cred.role]?.color ||
        "bg-muted/10 text-muted-foreground border-muted/20",
    }))
  : [];

const CORPORATE_CREDENTIALS: DemoCredential[] = SHOW_DEMO_CREDS
  ? DEMO_CREDENTIALS_CORPORATE.map((cred) => ({
      role: cred.role,
      employeeNumber: cred.employeeNumber,
      password: cred.password,
      description: cred.description,
      icon: CORPORATE_ROLE_STYLING[cred.role]?.icon || User,
      color:
        CORPORATE_ROLE_STYLING[cred.role]?.color ||
        "bg-primary/10 text-primary-foreground border-primary/20",
    }))
  : [];

interface DemoCredentialsSectionProps {
  isRTL: boolean;
  loginMethod: "personal" | "corporate" | "sso";
  quickLogin: (cred: DemoCredential) => void;
  t: (key: string, fallback: string) => string;
}

export default function DemoCredentialsSection({
  isRTL,
  loginMethod,
  quickLogin,
  t,
}: DemoCredentialsSectionProps) {
  // 🔒 SECURITY: Don't render anything if demo credentials are disabled
  if (!SHOW_DEMO_CREDS) return null;
  if (loginMethod === "sso") return null;

  return (
    <div className="mt-6 space-y-4">
      {/* Personal Email Credentials */}
      {loginMethod === "personal" && (
        <div className="p-4 bg-muted rounded-2xl text-start">
          <h3 className="text-sm font-medium text-foreground mb-3">
            {t("login.personalEmailAccounts", "Personal Email Accounts:")}
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
                  aria-label={`Quick login as ${cred.role}`}
                >
                  <div
                    className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <Icon size={18} />
                    <div className="flex-1 text-start">
                      <div className="font-medium text-sm">{cred.role}</div>
                      <div className="text-xs opacity-80">
                        {cred.description}
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className={isRTL ? "rotate-180" : ""}
                    />
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
      {loginMethod === "corporate" && (
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-start">
          <h3 className="text-sm font-medium text-primary mb-3">
            {t(
              "login.corporateAccountEmployee",
              "Corporate Account (Employee Number):",
            )}
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
                  aria-label={`Quick login as ${cred.role}`}
                >
                  <div
                    className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <Icon size={18} />
                    <div className="flex-1 text-start">
                      <div className="font-medium text-sm">{cred.role}</div>
                      <div className="text-xs opacity-80">
                        {cred.description}
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className={isRTL ? "rotate-180" : ""}
                    />
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {t("login.employeeHash", "Employee #:")}{" "}
                    {cred.employeeNumber} / {cred.password}
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
