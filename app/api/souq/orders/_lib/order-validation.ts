/**
 * @fileoverview Souq Order Validation
 * @description Zod schemas and validation helpers for order creation
 * @module api/souq/orders/_lib/order-validation
 */

import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid identifier format");

export const shippingAddressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string(),
  postalCode: z.string().min(5),
});

export const billingAddressSchema = z
  .object({
    name: z.string(),
    phone: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string(),
  })
  .optional();

export const orderItemSchema = z.object({
  listingId: objectIdSchema,
  quantity: z.number().int().positive(),
});

export const orderCreateSchema = z.object({
  customerId: objectIdSchema,
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item is required"),
  shippingAddress: shippingAddressSchema,
  billingAddress: billingAddressSchema,
  paymentMethod: z.enum(["card", "cod", "wallet", "installment"]),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type BillingAddress = z.infer<typeof billingAddressSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;

/**
 * Calculate order pricing
 */
export function calculateOrderPricing(subtotal: number): {
  subtotal: number;
  tax: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: string;
} {
  const tax = subtotal * 0.15; // 15% VAT
  const shippingFee = 0;
  const discount = 0;
  const total = subtotal + tax + shippingFee - discount;

  return {
    subtotal,
    tax,
    shippingFee,
    discount,
    total,
    currency: "SAR",
  };
}
