/**
 * Souq Reviews Validation Schemas (Zod)
 * @module lib/validations/reviews
 */

import { z } from "zod";

/**
 * Review Image Schema
 */
export const reviewImageSchema = z.object({
  url: z.string().url("Invalid image URL"),
  caption: z
    .string()
    .max(200, "Caption must be 200 characters or less")
    .optional(),
});

/**
 * Create Review Schema
 */
export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z
    .string()
    .min(2, "Customer name must be at least 2 characters"),
  orderId: z.string().optional(),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be 200 characters or less"),
  content: z
    .string()
    .min(20, "Review must be at least 20 characters")
    .max(5000, "Review must be 5000 characters or less"),
  pros: z.array(z.string().max(200)).max(10, "Maximum 10 pros").optional(),
  cons: z.array(z.string().max(200)).max(10, "Maximum 10 cons").optional(),
  images: z.array(reviewImageSchema).max(5, "Maximum 5 images").optional(),
});

/**
 * Update Review Schema
 */
export const updateReviewSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  content: z
    .string()
    .min(20, "Review must be at least 20 characters")
    .max(5000, "Review must be 5000 characters or less")
    .optional(),
  pros: z.array(z.string().max(200)).max(10, "Maximum 10 pros").optional(),
  cons: z.array(z.string().max(200)).max(10, "Maximum 10 cons").optional(),
  images: z.array(reviewImageSchema).max(5, "Maximum 5 images").optional(),
});

/**
 * Seller Response Schema
 */
export const sellerResponseSchema = z.object({
  content: z
    .string()
    .min(10, "Response must be at least 10 characters")
    .max(1000, "Response must be 1000 characters or less"),
});

/**
 * Report Review Schema
 */
export const reportReviewSchema = z.object({
  reason: z
    .string()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason must be 500 characters or less"),
});

/**
 * Review Filters Schema
 */
export const reviewFiltersSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  verifiedOnly: z.boolean().optional(),
  sortBy: z.enum(["recent", "helpful", "rating"]).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.enum(["pending", "published", "rejected", "flagged"]).optional(),
});

/**
 * Review Status Schema
 */
export const reviewStatusSchema = z.enum([
  "pending",
  "published",
  "rejected",
  "flagged",
]);

/**
 * Type exports for TypeScript
 */
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type SellerResponseInput = z.infer<typeof sellerResponseSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
export type ReviewFiltersInput = z.infer<typeof reviewFiltersSchema>;
export type ReviewStatusInput = z.infer<typeof reviewStatusSchema>;
