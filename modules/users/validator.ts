import { z } from "zod";

const roleEnum = z.enum([
  "super_admin",
  "corporate_admin",
  "management",
  "finance",
  "hr",
  "employee",
  "property_owner",
  "technician",
  "tenant",
  "vendor",
  "guest",
]);

export const createUserSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().trim().min(2).max(100),
    role: roleEnum,
    employeeId: z.string().trim().max(50).optional(),
    permissions: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateUserSchema = z
  .object({
    email: z.string().email().toLowerCase().optional(),
    name: z.string().trim().min(2).max(100).optional(),
    role: roleEnum.optional(),
    employeeId: z.string().trim().max(50).optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const queryUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: roleEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["name", "email", "createdAt", "lastLoginAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type QueryUsersInput = z.infer<typeof queryUsersSchema>;
