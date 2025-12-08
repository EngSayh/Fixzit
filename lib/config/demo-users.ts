/**
 * 🔧 Centralized Demo User Configuration
 *
 * This file contains all demo user credentials for development and testing.
 * All demo users are configurable via environment variables to support white-label deployments.
 *
 * ⚠️ SECURITY NOTE (SEC-051):
 * These passwords are ONLY for local development and should NEVER be used in production.
 * In production environments:
 * - Set DEMO_SUPERADMIN_PASSWORD and DEMO_DEFAULT_PASSWORD environment variables
 * - Or disable demo user seeding entirely
 * - The passwords below are intentional defaults for developer convenience only
 *
 * @module lib/config/demo-users
 *
 * Usage:
 * ```ts
 * import { DEMO_EMAILS, DEMO_USERS, isDemoEmail, getDemoUserByEmail } from "@/lib/config/demo-users";
 * ```
 *
 * Environment Variables:
 * - EMAIL_DOMAIN: The domain for demo user emails (default: "fixzit.co")
 * - DEMO_SUPERADMIN_PASSWORD: Override super admin demo password
 * - DEMO_DEFAULT_PASSWORD: Override default demo password
 * - NEXT_PUBLIC_SHOW_DEMO_CREDS: Show demo credentials in UI (default: false in production)
 */

// Use the same domain as EMAIL_DOMAINS for consistency
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

// SEC-051: Make demo passwords configurable via environment (no hardcoded fallbacks)
const DEMO_SUPERADMIN_PASSWORD = process.env.DEMO_SUPERADMIN_PASSWORD;
const DEMO_DEFAULT_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD;

if (!DEMO_SUPERADMIN_PASSWORD || !DEMO_DEFAULT_PASSWORD) {
  throw new Error(
    "DEMO_SUPERADMIN_PASSWORD and DEMO_DEFAULT_PASSWORD must be set (no defaults) for demo user config.",
  );
}

/**
 * Demo user role definitions with email prefixes
 * The email is constructed as: `${prefix}@${EMAIL_DOMAIN}`
 */
export interface DemoUser {
  prefix: string;
  role: string;
  displayRole: string;
  description: string;
  password: string;
  category: "core" | "corporate" | "vendor" | "property" | "hr";
}

/**
 * All demo users with their configuration
 * Emails are derived dynamically from EMAIL_DOMAIN env var
 */
export const DEMO_USER_DEFINITIONS: readonly DemoUser[] = [
  // Core roles
  {
    prefix: "superadmin",
    role: "SUPER_ADMIN",
    displayRole: "Super Admin",
    description: "Full system access",
    password: DEMO_SUPERADMIN_PASSWORD,
    category: "core",
  },
  {
    prefix: "admin",
    role: "ADMIN",
    displayRole: "Admin",
    description: "Administrative access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "core",
  },
  {
    prefix: "manager",
    role: "MANAGER",
    displayRole: "Property Manager",
    description: "Property management",
    password: DEMO_DEFAULT_PASSWORD,
    category: "property",
  },
  {
    prefix: "tenant",
    role: "TENANT",
    displayRole: "Tenant",
    description: "Tenant portal access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "property",
  },
  {
    prefix: "vendor",
    role: "VENDOR",
    displayRole: "Vendor",
    description: "Vendor marketplace access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "vendor",
  },
  {
    prefix: "owner",
    role: "OWNER",
    displayRole: "Property Owner",
    description: "Property owner access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "property",
  },
  // Corporate roles
  {
    prefix: "corp.admin",
    role: "CORP_ADMIN",
    displayRole: "Corporate Admin",
    description: "Corporate administrative access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "corporate",
  },
  {
    prefix: "property.manager",
    role: "PROPERTY_MANAGER",
    displayRole: "Property Manager (Corporate)",
    description: "Corporate property management",
    password: DEMO_DEFAULT_PASSWORD,
    category: "corporate",
  },
  // Operations roles
  {
    prefix: "dispatcher",
    role: "DISPATCHER",
    displayRole: "Dispatcher",
    description: "Work order dispatch",
    password: DEMO_DEFAULT_PASSWORD,
    category: "property",
  },
  {
    prefix: "supervisor",
    role: "SUPERVISOR",
    displayRole: "Supervisor",
    description: "Team supervision",
    password: DEMO_DEFAULT_PASSWORD,
    category: "property",
  },
  {
    prefix: "technician",
    role: "TECHNICIAN",
    displayRole: "Technician",
    description: "Field technician access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "vendor",
  },
  // Vendor roles
  {
    prefix: "vendor.admin",
    role: "VENDOR_ADMIN",
    displayRole: "Vendor Admin",
    description: "Vendor administration",
    password: DEMO_DEFAULT_PASSWORD,
    category: "vendor",
  },
  {
    prefix: "vendor.tech",
    role: "VENDOR_TECH",
    displayRole: "Vendor Technician",
    description: "Vendor technician access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "vendor",
  },
  // HR/Finance roles
  {
    prefix: "finance",
    role: "FINANCE",
    displayRole: "Finance",
    description: "Financial access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "hr",
  },
  {
    prefix: "hr",
    role: "HR",
    displayRole: "HR Manager",
    description: "Human resources access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "hr",
  },
  {
    prefix: "helpdesk",
    role: "HELPDESK",
    displayRole: "Help Desk",
    description: "Support desk access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "hr",
  },
  {
    prefix: "auditor",
    role: "AUDITOR",
    displayRole: "Auditor",
    description: "Audit and compliance",
    password: DEMO_DEFAULT_PASSWORD,
    category: "hr",
  },
  // Corporate employees (for corporate login)
  {
    prefix: "emp001",
    role: "EMPLOYEE",
    displayRole: "Employee 1",
    description: "Corporate employee access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "corporate",
  },
  {
    prefix: "emp002",
    role: "EMPLOYEE",
    displayRole: "Employee 2",
    description: "Corporate employee access",
    password: DEMO_DEFAULT_PASSWORD,
    category: "corporate",
  },
] as const;

/**
 * Get a demo user's full email address
 */
export function getDemoEmail(prefix: string): string {
  return `${prefix}@${EMAIL_DOMAIN}`;
}

/**
 * Generate the set of all demo emails (dynamically from EMAIL_DOMAIN)
 */
export function generateDemoEmailsSet(): Set<string> {
  return new Set(DEMO_USER_DEFINITIONS.map((user) => getDemoEmail(user.prefix)));
}

/**
 * Set of all demo user emails for quick lookup
 * Note: This is evaluated at module load time with the current EMAIL_DOMAIN
 */
export const DEMO_EMAILS: Set<string> = generateDemoEmailsSet();

/**
 * Array of all demo emails for iteration
 */
export const DEMO_EMAIL_LIST: string[] = Array.from(DEMO_EMAILS);

/**
 * Check if an email is a demo user email
 */
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_EMAILS.has(email.toLowerCase());
}

/**
 * Get demo user by email
 */
export function getDemoUserByEmail(
  email: string
): (DemoUser & { email: string }) | undefined {
  const normalizedEmail = email.toLowerCase();
  const user = DEMO_USER_DEFINITIONS.find(
    (u) => getDemoEmail(u.prefix).toLowerCase() === normalizedEmail
  );
  if (!user) return undefined;
  return { ...user, email: getDemoEmail(user.prefix) };
}

/**
 * Get demo user by prefix (e.g., "superadmin", "admin")
 */
export function getDemoUserByPrefix(
  prefix: string
): (DemoUser & { email: string }) | undefined {
  const user = DEMO_USER_DEFINITIONS.find(
    (u) => u.prefix.toLowerCase() === prefix.toLowerCase()
  );
  if (!user) return undefined;
  return { ...user, email: getDemoEmail(user.prefix) };
}

/**
 * Demo employee IDs for corporate login
 */
export const DEMO_EMPLOYEE_IDS: Set<string> = new Set([
  "EMP001",
  "EMP002",
  "SA001",
  "SA-001",
  "SUPER-001",
  "MGR-001",
  "TENANT-001",
  "VENDOR-001",
]);

/**
 * Check if an employee ID is a demo employee
 */
export function isDemoEmployeeId(empId: string | null | undefined): boolean {
  if (!empId) return false;
  return DEMO_EMPLOYEE_IDS.has(empId.toUpperCase());
}

/**
 * Demo credentials for UI display (personal login)
 * Only includes the main demo accounts shown in login UI
 */
export const DEMO_CREDENTIALS_PERSONAL = DEMO_USER_DEFINITIONS.filter((u) =>
  ["superadmin", "admin", "manager", "tenant", "vendor"].includes(u.prefix)
).map((u) => ({
  role: u.displayRole,
  email: getDemoEmail(u.prefix),
  password: u.password,
  description: u.description,
}));

/**
 * Demo credentials for corporate login UI
 */
export const DEMO_CREDENTIALS_CORPORATE = [
  {
    role: "Property Manager (Corporate)",
    employeeNumber: "EMP001",
    password: DEMO_DEFAULT_PASSWORD,
    description: "Corporate account access",
  },
  {
    role: "Admin (Corporate)",
    employeeNumber: "EMP002",
    password: DEMO_DEFAULT_PASSWORD,
    description: "Corporate administrative access",
  },
];

/**
 * Special emails used in specific contexts
 */
export const SPECIAL_DEMO_EMAILS = {
  superadmin: getDemoEmail("superadmin"),
  admin: getDemoEmail("admin"),
  testAdmin: getDemoEmail("admin"),
};

/**
 * Get the current email domain (for display purposes)
 */
export function getEmailDomain(): string {
  return EMAIL_DOMAIN;
}

/**
 * Build a demo email from a prefix and custom domain
 * Useful for testing with different domains
 */
export function buildDemoEmail(prefix: string, domain?: string): string {
  return `${prefix}@${domain || EMAIL_DOMAIN}`;
}

/**
 * Default test user for unit tests
 */
export const TEST_USER_DEFAULT = {
  id: "test-user-id",
  email: getDemoEmail("admin"),
  name: "Test Admin",
  role: "SUPER_ADMIN",
  orgId: "test-org-id",
};
