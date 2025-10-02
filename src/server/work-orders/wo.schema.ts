import { z } from "zod";

export const WOPriority = z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]);
export const WOStatus   = z.enum(["NEW","ASSIGNED","IN_PROGRESS","ON_HOLD","COMPLETED","CANCELLED"]);

export const WoCreate = z.object({
  tenantId: z.string().cuid(),
  title: z.string().min(3),
  description: z.string().min(3),
  priority: WOPriority.default("MEDIUM"),
  propertyId: z.string().cuid().optional(),
  requesterId: z.string().cuid().optional(),
  slaHours: z.number().int().min(1).max(720).default(72),
});

export const WoUpdate = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  priority: WOPriority.optional(),
  status: WOStatus.optional(),
  assigneeId: z.string().cuid().optional(),
  scheduledAt: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  slaHours: z.number().int().min(1).max(720).optional()
});

export type WoCreateInput = z.infer<typeof WoCreate>;
export type WoUpdateInput = z.infer<typeof WoUpdate>;


