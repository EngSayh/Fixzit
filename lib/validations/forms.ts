/**
 * Zod Validation Schemas for Forms
 *
 * Centralized validation schemas for all form inputs across the platform.
 * Provides type-safe validation with detailed error messages.
 */

import { z } from "zod";

/**
 * Common validation patterns
 */

// Saudi Arabia phone number: +966XXXXXXXXX (9 digits after +966)
const saudiPhoneRegex = /^\+966[0-9]{9}$/;

// Email validation (with common patterns)
const emailSchema = z.string().email("Invalid email format");

// Optional email (allows undefined or valid email, but not empty string)
const optionalEmailSchema = z
  .string()
  .optional()
  .refine((val) => !val || z.string().email().safeParse(val).success, {
    message: "Invalid email format",
  });

// Saudi phone validation
const saudiPhoneSchema = z
  .string()
  .regex(
    saudiPhoneRegex,
    "Phone must be in +966XXXXXXXXX format (e.g., +966501234567)",
  );

// Optional Saudi phone (allows undefined or valid phone, but not empty string)
const optionalSaudiPhoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || saudiPhoneRegex.test(val), {
    message: "Phone must be in +966XXXXXXXXX format",
  });

/**
 * User Management Schemas
 */

export const CreateUserSchema = z.object({
  email: emailSchema,
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  role: z.enum(["user", "admin", "manager", "super_admin", "tenant", "vendor"]),
  phone: optionalSaudiPhoneSchema,
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.string().min(1, "User ID is required"),
});

/**
 * Vendor Management Schemas
 */

export const CreateVendorSchema = z.object({
  name: z
    .string()
    .min(2, "Vendor name must be at least 2 characters")
    .max(100, "Vendor name must not exceed 100 characters"),
  code: z
    .string()
    .min(2, "Vendor code must be at least 2 characters")
    .max(20, "Vendor code must not exceed 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Vendor code must be uppercase letters, numbers, or hyphens",
    ),
  type: z.string().min(1, "Vendor type is required"),
  status: z.enum([
    "PENDING",
    "APPROVED",
    "SUSPENDED",
    "REJECTED",
    "BLACKLISTED",
  ]),
  contact: z
    .object({
      primary: z.object({
        name: z.string().min(1, "Contact name is required"),
        email: optionalEmailSchema,
        phone: optionalSaudiPhoneSchema,
        mobile: optionalSaudiPhoneSchema,
      }),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  business: z
    .object({
      specializations: z.array(z.string()).optional(),
      crNumber: z.string().optional(),
      taxNumber: z.string().optional(),
      licenseNumber: z.string().optional(),
      licenseExpiry: z.string().optional(), // ISO date string
      insuranceExpiry: z.string().optional(), // ISO date string
      description: z
        .string()
        .max(500, "Description must not exceed 500 characters")
        .optional(),
    })
    .optional(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  id: z.string().min(1, "Vendor ID is required"),
});

/**
 * Project Management Schemas
 */

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Project name must be at least 3 characters")
    .max(150, "Project name must not exceed 150 characters"),
  code: z
    .string()
    .min(2, "Project code must be at least 2 characters")
    .max(20, "Project code must not exceed 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Project code must be uppercase letters, numbers, or hyphens",
    ),
  description: z
    .string()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  propertyId: z.string().min(1, "Property selection is required"),
  type: z.string().min(1, "Project type is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum([
    "DRAFT",
    "PLANNED",
    "IN_PROGRESS",
    "ON_HOLD",
    "COMPLETED",
    "CANCELLED",
  ]),
  budget: z.object({
    estimated: z.number().min(0, "Estimated budget must be a positive number"),
    approved: z
      .number()
      .min(0, "Approved budget must be a positive number")
      .optional(),
    spent: z
      .number()
      .min(0, "Spent amount must be a positive number")
      .optional(),
    currency: z.string().default("SAR"),
  }),
  schedule: z.object({
    startDate: z.string().min(1, "Start date is required"), // ISO date string
    endDate: z.string().min(1, "End date is required"), // ISO date string
    actualStartDate: z.string().optional(),
    actualEndDate: z.string().optional(),
  }),
  team: z
    .object({
      projectManager: z.string().optional(),
      members: z.array(z.string()).optional(),
      vendors: z.array(z.string()).optional(),
    })
    .optional(),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1, "Milestone name is required"),
        description: z.string().optional(),
        dueDate: z.string().min(1, "Due date is required"),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"]),
        progress: z.number().min(0).max(100).default(0),
      }),
    )
    .optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: z.string().min(1, "Project ID is required"),
});

/**
 * RFQ (Request for Quotation) Schemas
 */

export const CreateRFQSchema = z.object({
  title: z
    .string()
    .min(5, "RFQ title must be at least 5 characters")
    .max(200, "RFQ title must not exceed 200 characters"),
  code: z
    .string()
    .min(2, "RFQ code must be at least 2 characters")
    .max(20, "RFQ code must not exceed 20 characters")
    .regex(
      /^RFQ-[A-Z0-9-]+$/,
      'RFQ code must start with "RFQ-" followed by uppercase letters/numbers',
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must not exceed 2000 characters"),
  propertyId: z.string().min(1, "Property selection is required"),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "IN_REVIEW",
    "AWARDED",
    "CLOSED",
    "CANCELLED",
  ]),
  budget: z
    .object({
      min: z
        .number()
        .min(0, "Minimum budget must be a positive number")
        .optional(),
      max: z
        .number()
        .min(0, "Maximum budget must be a positive number")
        .optional(),
      currency: z.string().default("SAR"),
    })
    .refine(
      (budget) => {
        // Only validate min <= max if both are provided
        if (budget.min !== undefined && budget.max !== undefined) {
          return budget.min <= budget.max;
        }
        return true;
      },
      {
        message: "Minimum budget must be less than or equal to maximum budget",
        path: ["min"], // Attach error to the min field
      },
    ),
  timeline: z.object({
    submissionDeadline: z.string().min(1, "Submission deadline is required"),
    projectStartDate: z.string().optional(),
    projectDuration: z
      .number()
      .min(1, "Project duration must be at least 1 day")
      .optional(),
  }),
  requirements: z
    .array(
      z.object({
        item: z.string().min(1, "Requirement item is required"),
        description: z.string().optional(),
        quantity: z.number().min(1, "Quantity must be at least 1").optional(),
        specifications: z.string().optional(),
      }),
    )
    .min(1, "At least one requirement is needed"),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url("Invalid attachment URL"),
        type: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
});

export const UpdateRFQSchema = CreateRFQSchema.partial().extend({
  id: z.string().min(1, "RFQ ID is required"),
});

/**
 * Property Management Schemas
 */

export const CreatePropertySchema = z.object({
  name: z
    .string()
    .min(3, "Property name must be at least 3 characters")
    .max(150, "Property name must not exceed 150 characters"),
  code: z
    .string()
    .min(2, "Property code must be at least 2 characters")
    .max(20, "Property code must not exceed 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Property code must be uppercase letters, numbers, or hyphens",
    ),
  type: z.string().min(1, "Property type is required"),
  subtype: z.string().optional(),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    region: z.string().min(1, "Region is required"),
    postalCode: z.string().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
  details: z
    .object({
      totalArea: z
        .number()
        .min(0, "Total area must be a positive number")
        .optional(),
      builtArea: z
        .number()
        .min(0, "Built area must be a positive number")
        .optional(),
      yearBuilt: z
        .number()
        .min(1900, "Year built must be after 1900")
        .optional(),
      floors: z
        .number()
        .min(1, "Number of floors must be at least 1")
        .optional(),
    })
    .optional(),
  units: z
    .array(
      z.object({
        unitNumber: z.string().min(1, "Unit number is required"),
        type: z.string().min(1, "Unit type is required"),
        area: z.number().min(0, "Unit area must be positive"),
        bedrooms: z.number().min(0).optional(),
        bathrooms: z.number().min(0).optional(),
        status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"]),
      }),
    )
    .optional(),
});

export const UpdatePropertySchema = CreatePropertySchema.partial().extend({
  id: z.string().min(1, "Property ID is required"),
});

/**
 * Budget Management Schemas
 */

export const CreateBudgetSchema = z.object({
  name: z
    .string()
    .min(3, "Budget name must be at least 3 characters")
    .max(100, "Budget name must not exceed 100 characters"),
  fiscalYear: z
    .number()
    .min(2020, "Fiscal year must be 2020 or later")
    .max(2100, "Fiscal year must be before 2100"),
  period: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]),
  propertyId: z.string().min(1, "Property selection is required"),
  ownerId: z.string().min(1, "Budget owner is required"),
  totalAmount: z.number().min(0, "Total amount must be a positive number"),
  currency: z.string().default("SAR"),
  categories: z
    .array(
      z.object({
        name: z.string().min(1, "Category name is required"),
        allocatedAmount: z.number().min(0, "Allocated amount must be positive"),
        percentage: z.number().min(0).max(100),
      }),
    )
    .min(1, "At least one category is required"),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "CLOSED"]),
});

export const UpdateBudgetSchema = CreateBudgetSchema.partial().extend({
  id: z.string().min(1, "Budget ID is required"),
});

/**
 * Tenant Management Schemas
 */

export const CreateTenantSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: emailSchema,
  phone: saudiPhoneSchema,
  mobile: optionalSaudiPhoneSchema,
  identification: z.object({
    type: z.enum(["NATIONAL_ID", "IQAMA", "PASSPORT"]),
    number: z.string().min(1, "ID number is required"),
    expiryDate: z.string().optional(),
  }),
  emergencyContact: z
    .object({
      name: z.string().min(1, "Emergency contact name is required"),
      phone: saudiPhoneSchema,
      relationship: z.string().optional(),
    })
    .optional(),
  preferences: z
    .object({
      language: z.enum(["en", "ar"]).default("en"),
      notifications: z
        .object({
          email: z.boolean().default(true),
          sms: z.boolean().default(true),
          push: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),
});

export const UpdateTenantSchema = CreateTenantSchema.partial().extend({
  id: z.string().min(1, "Tenant ID is required"),
});

/**
 * Login/Auth Schemas
 */

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const SignupSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: optionalSaudiPhoneSchema,
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Type exports for use in components
 */

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateRFQInput = z.infer<typeof CreateRFQSchema>;
export type UpdateRFQInput = z.infer<typeof UpdateRFQSchema>;
export type CreatePropertyInput = z.infer<typeof CreatePropertySchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
