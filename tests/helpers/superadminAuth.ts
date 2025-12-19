import { getSuperadminSession } from "@/lib/superadmin/auth";
import { vi } from "vitest";

export type SuperadminSession = {
  username: string;
  role: "super_admin";
  orgId: string;
  issuedAt: number;
  expiresAt: number;
};

const defaultSession: SuperadminSession = {
  username: "superadmin",
  role: "super_admin",
  orgId: "507f1f77bcf86cd799439011",
  issuedAt: Date.now(),
  expiresAt: Date.now() + 8 * 60 * 60 * 1000,
};

/**
 * Mocks getSuperadminSession to return a valid session for API route tests.
 */
export function mockSuperadmin(session: Partial<SuperadminSession> = {}) {
  const merged = { ...defaultSession, ...session };
  vi.mocked(getSuperadminSession).mockResolvedValue(merged as any);
  return merged;
}
