import { z } from "zod";
import mongoose from "mongoose";

type JsonRequest = { json: () => Promise<unknown> };

export const initiateSchema = z.object({
  orderId: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        listingId: z.string().trim().min(1),
        quantity: z.coerce.number().int().positive(),
        reason: z.enum([
          "damaged",
          "defective",
          "wrong_item",
          "not_as_described",
          "changed_mind",
          "better_price",
          "other",
        ]),
        comments: z.string().trim().min(1).optional(),
      }),
    )
    .min(1, "At least one item is required"),
  buyerPhotos: z.array(z.string().trim().min(1)).optional(),
});

export const approveSchema = z
  .object({
    rmaId: z.string().trim().min(1),
    approve: z.coerce.boolean(),
    approvalNotes: z.string().trim().optional(),
    rejectionReason: z.string().trim().optional(),
    targetOrgId: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.approve && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason is required when approve is false",
        path: ["rejectionReason"],
      });
    }
  });

export const inspectSchema = z.object({
  rmaId: z.string().trim().min(1),
  condition: z.enum(["like_new", "good", "acceptable", "damaged", "defective"]),
  restockable: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean(),
  ),
  inspectionNotes: z.string().trim().optional(),
  inspectionPhotos: z.array(z.string().trim()).optional(),
});

export const refundSchema = z.object({
  rmaId: z.string().trim().min(1),
  refundAmount: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().positive(),
  ),
  refundMethod: z.enum(["original_payment", "wallet", "bank_transfer"]),
});

export const listQuerySchema = z.object({
  type: z.enum(["buyer", "seller", "admin"]).default("buyer"),
  status: z
    .enum([
      "initiated",
      "approved",
      "rejected",
      "label_generated",
      "in_transit",
      "received",
      "inspecting",
      "inspected",
      "refund_processing",
      "completed",
      "cancelled",
    ])
    .optional(),
  targetOrgId: z.string().trim().min(1).optional(),
  page: z
    .preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().int().positive())
    .default(1),
  limit: z
    .preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().int().positive())
    .default(100),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const parseJsonBody = async <T>(
  request: JsonRequest,
  schema: z.ZodSchema<T>
) => schema.safeParse(await request.json());

export const parseQueryParams = <T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
) =>
  schema.safeParse({
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    targetOrgId: searchParams.get("targetOrgId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    sortDir: searchParams.get("sortDir") ?? undefined,
  });

// Simple helper for consistent invalid response payloads
export const formatZodError = (error: z.ZodError) =>
  ({ error: "Invalid payload", details: error.flatten() });

export const ensureValidObjectId = (id: string) =>
  mongoose.Types.ObjectId.isValid(id);
