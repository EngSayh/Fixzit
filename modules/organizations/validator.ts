import { z } from "zod";

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    nameAr: z.string().trim().max(100).optional(),
    subscriptionPlan: z
      .enum(["Standard", "Premium", "Enterprise"])
      .default("Standard"),
    status: z
      .enum(["active", "inactive", "suspended", "trial"])
      .default("active"),
    logoUrl: z.string().url().optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    website: z.string().url().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
    billingEmail: z.string().email().optional(),
    taxId: z.string().max(50).optional(),
    settings: z
      .object({
        timezone: z.string().optional(),
        language: z.enum(["en", "ar"]).optional(),
        currency: z.enum(["SAR", "USD", "EUR", "AED"]).optional(),
      })
      .optional(),
  })
  .strict();

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const queryOrganizationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  subscriptionPlan: z.enum(["Standard", "Premium", "Enterprise"]).optional(),
  status: z.enum(["active", "inactive", "suspended", "trial"]).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type QueryOrganizationsInput = z.infer<typeof queryOrganizationsSchema>;
