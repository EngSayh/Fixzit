import { z } from "zod";
import type { EscrowEventName } from "./escrow-service";

export const baseEscrowEventSchema = z
  .object({
    escrowAccountId: z.string().min(1),
    orgId: z.string().min(1),
    idempotencyKey: z.string().optional(),
    amount: z.number().nonnegative().optional(),
    currency: z.string().min(1).optional(),
    transactionId: z.string().optional(),
    releaseId: z.string().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

const eventRequiredFields: Record<EscrowEventName, z.ZodType<unknown>> = {
  "escrow.created": baseEscrowEventSchema,
  "escrow.funded": baseEscrowEventSchema.extend({
    amount: z.number().nonnegative(),
    currency: z.string().min(1),
    transactionId: z.string().optional(),
  }),
  "escrow.release.requested": baseEscrowEventSchema.extend({
    releaseId: z.string().optional(),
    amount: z.number().nonnegative(),
  }),
  "escrow.released": baseEscrowEventSchema.extend({
    amount: z.number().nonnegative(),
    transactionId: z.string().optional(),
  }),
  "escrow.refunded": baseEscrowEventSchema.extend({
    amount: z.number().nonnegative(),
    transactionId: z.string().optional(),
  }),
  "escrow.failed": baseEscrowEventSchema.extend({
    reason: z.string().optional(),
  }),
};

export function validateEscrowEventPayload(
  event: EscrowEventName,
  payload: Record<string, unknown>,
): z.infer<typeof baseEscrowEventSchema> {
  const schema = eventRequiredFields[event] ?? baseEscrowEventSchema;
  const parsed = schema.parse(payload);
  // Parsed payload always contains the base fields; cast to a stable return type for callers.
  return parsed as z.infer<typeof baseEscrowEventSchema>;
}
