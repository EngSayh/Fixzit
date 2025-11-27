/**
 * Zod validation schemas for Admin module forms
 * 
 * Features:
 * - Type-safe validation
 * - Custom error messages
 * - Conditional validation (sub-role required for TEAM_MEMBER)
 * - Email format validation
 * - Integration with react-hook-form
 */

import { z } from "zod";
import { SubRole } from "@/domain/fm/fm.behavior";

/**
 * User form validation schema
 * 
 * Validates:
 * - Name: Required, min 2 characters
 * - Email: Required, valid email format
 * - Role: Required
 * - SubRole: Required if role is TEAM_MEMBER
 * - Status: One of Active, Inactive, Locked
 */
export const userFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format"),
    role: z.string().min(1, "Role is required"),
    subRole: z.nativeEnum(SubRole).nullable().optional(),
    status: z.enum(["Active", "Inactive", "Locked"]).optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (data) => {
      // If role is TEAM_MEMBER, subRole is required
      const normalizedRole = data.role?.toUpperCase().replace(/\s+/g, "_");
      if (normalizedRole === "TEAM_MEMBER") {
        return data.subRole !== null && data.subRole !== undefined;
      }
      return true;
    },
    {
      message: "Sub-role is required for Team Members",
      path: ["subRole"],
    }
  );

export type UserFormSchema = z.infer<typeof userFormSchema>;

/**
 * Organization settings validation schema
 */
export const orgSettingsSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  timezone: z.string().optional(),
  language: z.string().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

export type OrgSettingsSchema = z.infer<typeof orgSettingsSchema>;
