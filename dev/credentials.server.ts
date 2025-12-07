/**
 * Demo Credentials Stub for Production Builds
 *
 * This file provides disabled defaults for production builds.
 * It allows the codebase to compile without exposing real credentials.
 *
 * For LOCAL DEVELOPMENT with real demo accounts:
 * 1. Create a file: dev/credentials.local.ts
 * 2. Export ENABLED = true and your demo credentials
 * 3. This file will be overridden by the local version
 *
 * SECURITY: Never commit real credentials to the repository.
 */

export interface DemoCredential {
  role: string;
  email?: string;
  employeeNumber?: string;
  password: string;
  loginType: "personal" | "corporate";
  orgId?: string;
  preferredPath?: string;
}

// Demo accounts are DISABLED by default
// Override in credentials.local.ts for development
export const ENABLED: boolean = false;

// Stub implementations that return empty data
export function findLoginPayloadByRole(_role: string): DemoCredential | null {
  // Demo accounts disabled in production builds
  return null;
}

export function listSanitized(): {
  demo: Array<Omit<DemoCredential, "password">>;
  corporate: Array<Omit<DemoCredential, "password">>;
} {
  // Demo accounts disabled in production builds
  return { demo: [], corporate: [] };
}

export function assertDemoConfig(): void {
  // No-op in production builds
}
