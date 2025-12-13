/**
 * @fileoverview OTP authentication helper functions
 * @description Core utilities for OTP generation, validation, and rate limiting
 * @module lib/auth/otp/helpers
 */

import { z } from "zod";
import type { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import {
  redisRateLimitStore,
  MAX_SENDS_PER_WINDOW,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/otp-store";

/**
 * Zod schema for OTP send request validation
 */
export const SendOTPSchema = z.object({
  identifier: z.string().trim().min(1, "Email, phone, or employee number is required"),
  password: z.string().trim().optional(),
  companyCode: z.string().trim().optional(),
  deliveryMethod: z.enum(["sms", "email"]).default("sms"),
});

export type SendOTPInput = z.infer<typeof SendOTPSchema>;

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check rate limit using Redis for distributed limiting
 * @param identifier - The rate limit key (usually user identifier + org scope)
 * @returns Object with allowed status and remaining count
 */
export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  return redisRateLimitStore.increment(identifier, MAX_SENDS_PER_WINDOW, RATE_LIMIT_WINDOW_MS);
}

/**
 * Resolve orgId from organization code to enforce tenant scoping for corporate logins
 * @param companyCode - The organization code to look up
 * @returns Object with orgId (null if not found) and error (if DB lookup fails)
 */
export async function resolveOrgIdFromCompanyCode(
  companyCode: string,
): Promise<{ orgId: string | null; error?: string }> {
  const { Organization } = await import("@/server/models/Organization");
  try {
    const org = await Organization.findOne({ code: companyCode })
      .select({ _id: 1, orgId: 1 })
      .lean<{
        _id?: ObjectId;
        orgId?: string;
      }>();

    if (!org) return { orgId: null };
    const orgId = org.orgId || org._id?.toString();
    return { orgId: orgId ?? null };
  } catch (error) {
    logger.error("[auth:otp:send] Organization lookup failed", {
      companyCode,
      error: error instanceof Error ? error.message : String(error),
    });
    return { orgId: null, error: "DB_ERROR" };
  }
}

/**
 * Check if user is a super admin based on role fields
 */
export function isSuperAdmin(user: {
  role?: string;
  professional?: { role?: string };
  roles?: string[];
}): boolean {
  return (
    user.role === "SUPER_ADMIN" ||
    user.professional?.role === "SUPER_ADMIN" ||
    user.roles?.includes?.("SUPER_ADMIN") ||
    false
  );
}

/**
 * Get user's phone number from various possible fields
 */
export function getUserPhone(user: {
  contact?: { phone?: string };
  personal?: { phone?: string };
  phone?: string;
}): string | undefined {
  return user.contact?.phone || user.personal?.phone || user.phone;
}

/**
 * Check if user is active
 */
export function isUserActive(user: {
  isActive?: boolean;
  status?: string;
}): boolean {
  return user.isActive !== undefined ? user.isActive : user.status === "ACTIVE";
}
