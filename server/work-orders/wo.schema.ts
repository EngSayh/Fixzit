import { z } from "zod";

export const WOPriority = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
  "CRITICAL",
]);

export const RequesterType = z.enum(["TENANT", "OWNER", "STAFF", "EXTERNAL"]);

export const WOStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "PENDING_APPROVAL",
  "COMPLETED",
  "VERIFIED",
  "CLOSED",
  "CANCELLED",
  "REJECTED",
]);

export const WoCreate = z.object({
  orgId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(3),
  priority: WOPriority.default("MEDIUM"),
  category: z.string().min(1).default("GENERAL"),
  type: z.string().min(1).default("MAINTENANCE"),
  subcategory: z.string().optional(),
  propertyId: z.string().min(1),
  unitNumber: z.string().optional(),
  requesterId: z.string().min(1),
  requesterName: z.string().min(1).optional(),
  requesterEmail: z.string().email().optional(),
  requesterType: RequesterType.optional(),
  assignmentUserId: z.string().min(1).optional(),
  assignmentVendorId: z.string().min(1).optional(),
  slaHours: z.number().int().min(1).max(720).default(72),
  responseMinutes: z.number().int().min(15).max(720).default(120),
});

export const WoUpdate = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  priority: WOPriority.optional(),
  status: WOStatus.optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  assignmentUserId: z.string().min(1).optional(),
  assignmentVendorId: z.string().min(1).optional(),
  scheduledAt: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  slaHours: z.number().int().min(1).max(720).optional(),
  responseMinutes: z.number().int().min(15).max(720).optional(),
});

export type WoCreateInput = z.infer<typeof WoCreate>;
export type WoUpdateInput = z.infer<typeof WoUpdate>;
