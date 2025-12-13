/**
 * @fileoverview Test and demo user configuration for OTP authentication
 * @description Handles test user resolution, demo user building, and password matching
 * @module lib/auth/otp/test-users
 */

import { randomBytes, randomUUID } from "crypto";
import { normalizeCompanyCode } from "@/lib/otp-utils";
import {
  DEMO_EMAILS,
  DEMO_EMPLOYEE_IDS,
} from "@/lib/config/demo-users";

export interface UserDocument {
  _id?: { toString: () => string };
  orgId?: { toString: () => string } | string;
  email: string;
  username?: string;
  employeeId?: string;
  password?: string;
  isActive?: boolean;
  status?: string;
  __isDemoUser?: boolean;
  __isTestUser?: boolean;
  contact?: { phone?: string };
  personal?: { phone?: string };
  phone?: string;
  role?: string;
  professional?: { role?: string };
  roles?: string[];
  [key: string]: unknown;
}

// Environment configuration
const TEST_USERS_FALLBACK_PHONE =
  process.env.NEXTAUTH_TEST_USERS_FALLBACK_PHONE ||
  process.env.TEST_USERS_FALLBACK_PHONE ||
  "";

// SECURITY: Demo passwords are ONLY for local development/testing
// In production (NODE_ENV=production), demo auth is completely disabled
export const DEMO_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" &&
  (process.env.ALLOW_DEMO_LOGIN === "true" || process.env.NODE_ENV === "development");

// SECURITY: Demo passwords are not hardcoded - must be set via environment variable
const CUSTOM_DEMO_PASSWORDS = (
  process.env.NEXTAUTH_DEMO_PASSWORDS ||
  process.env.DEMO_LOGIN_PASSWORDS ||
  ""
)
  .split(",")
  .map((pwd) => pwd.trim())
  .filter(Boolean);

// Only use demo passwords if explicitly configured via environment
const DEMO_PASSWORD_WHITELIST = DEMO_AUTH_ENABLED ? CUSTOM_DEMO_PASSWORDS : [];

/**
 * Test user configuration from environment variables
 */
export const TEST_USER_CONFIG = [
  {
    identifier: process.env.TEST_SUPERADMIN_IDENTIFIER,
    password: process.env.TEST_SUPERADMIN_PASSWORD,
    phone: process.env.TEST_SUPERADMIN_PHONE,
    role: "SUPER_ADMIN",
  },
  {
    identifier: process.env.TEST_ADMIN_IDENTIFIER,
    password: process.env.TEST_ADMIN_PASSWORD,
    phone: process.env.TEST_ADMIN_PHONE,
    role: "ADMIN",
  },
  {
    identifier: process.env.TEST_MANAGER_IDENTIFIER,
    password: process.env.TEST_MANAGER_PASSWORD,
    phone: process.env.TEST_MANAGER_PHONE,
    role: "MANAGER",
  },
  {
    identifier: process.env.TEST_TECHNICIAN_IDENTIFIER,
    password: process.env.TEST_TECHNICIAN_PASSWORD,
    phone: process.env.TEST_TECHNICIAN_PHONE,
    role: "TECHNICIAN",
  },
  {
    identifier: process.env.TEST_TENANT_IDENTIFIER,
    password: process.env.TEST_TENANT_PASSWORD,
    phone: process.env.TEST_TENANT_PHONE,
    role: "TENANT",
  },
  {
    identifier: process.env.TEST_VENDOR_IDENTIFIER,
    password: process.env.TEST_VENDOR_PASSWORD,
    phone: process.env.TEST_VENDOR_PHONE,
    role: "VENDOR",
  },
] as const;

/**
 * Check if an identifier is a demo identifier
 */
export function isDemoIdentifier(identifier: string | undefined | null): boolean {
  if (!identifier) return false;
  if (identifier.includes("@")) {
    return DEMO_EMAILS.has(identifier.toLowerCase());
  }
  return DEMO_EMPLOYEE_IDS.has(identifier.toUpperCase());
}

/**
 * Check if password matches a demo password
 */
export function matchesDemoPassword(password: string): boolean {
  if (!DEMO_AUTH_ENABLED) return false;
  return DEMO_PASSWORD_WHITELIST.some((allowed) => password === allowed);
}

/**
 * Build a synthetic demo user object
 */
export function buildDemoUser(
  identifier: string,
  loginType: "personal" | "corporate",
  companyCode?: string | null,
): UserDocument {
  const normalizedEmail =
    loginType === "personal"
      ? identifier.toLowerCase()
      : `${identifier.toLowerCase()}@demo.fixzit`;

  return {
    _id: `demo-${randomUUID()}` as unknown as { toString: () => string },
    email: normalizedEmail,
    username:
      loginType === "personal" ? normalizedEmail.split("@")[0] : identifier,
    employeeId: loginType === "corporate" ? identifier : undefined,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    isActive: true,
    ...(TEST_USERS_FALLBACK_PHONE
      ? {
          contact: { phone: TEST_USERS_FALLBACK_PHONE },
          personal: { phone: TEST_USERS_FALLBACK_PHONE },
        }
      : {}),
    professional: { role: "SUPER_ADMIN" },
    code: companyCode ?? "DEMO-ORG",
    __isDemoUser: true,
  };
}

/**
 * Build a synthetic test user object
 */
export function buildTestUser(
  identifier: string,
  loginType: "personal" | "corporate",
  role: string,
  phone?: string,
  companyCode?: string | null,
): UserDocument {
  const normalizedEmail =
    loginType === "personal"
      ? identifier.toLowerCase()
      : `${identifier.toLowerCase()}@test.fixzit`;

  return {
    _id: randomBytes(12).toString("hex") as unknown as { toString: () => string },
    email: normalizedEmail,
    username:
      loginType === "corporate" ? identifier : normalizedEmail.split("@")[0],
    employeeId: loginType === "corporate" ? identifier : undefined,
    role,
    status: "ACTIVE",
    isActive: true,
    contact: { phone: phone ?? TEST_USERS_FALLBACK_PHONE },
    personal: { phone: phone ?? TEST_USERS_FALLBACK_PHONE },
    professional: { role },
    code: companyCode ?? "TEST-ORG",
    __isDemoUser: true,
    __isTestUser: true,
  };
}

/**
 * Resolve a test user from environment configuration
 */
export function resolveTestUser(
  identifier: string,
  password: string | undefined,
  loginType: "personal" | "corporate",
  companyCode?: string | null,
): UserDocument | null {
  if (!password) {
    return null;
  }
  const normalized =
    loginType === "personal"
      ? identifier.toLowerCase()
      : identifier.toUpperCase();
  const normalizedCompanyCode = normalizeCompanyCode(
    companyCode || process.env.TEST_COMPANY_CODE,
  );
  
  for (const config of TEST_USER_CONFIG) {
    if (!config.identifier || !config.password) continue;
    const configIdentifier =
      loginType === "personal"
        ? config.identifier.toLowerCase()
        : config.identifier.toUpperCase();
    const configCompanyCode = normalizeCompanyCode(
      (config as { companyCode?: string }).companyCode ||
        process.env.TEST_COMPANY_CODE,
    );
    const companyCodeMatches =
      loginType === "corporate"
        ? !configCompanyCode ||
          !normalizedCompanyCode ||
          configCompanyCode === normalizedCompanyCode
        : true;
    if (
      normalized === configIdentifier &&
      password === config.password &&
      companyCodeMatches
    ) {
      return buildTestUser(
        normalized,
        loginType,
        config.role,
        config.phone,
        normalizedCompanyCode ?? configCompanyCode,
      );
    }
  }
  return null;
}
