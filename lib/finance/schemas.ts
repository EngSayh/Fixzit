/**
 * Finance Module - Zod Validation Schemas
 * Ensures data integrity for budgets, invoices, and payments
 * Uses Decimal.js for precise money calculations
 */

import { z } from "zod";

/**
 * Budget Category Schema
 * Represents a single category within a budget
 */
export const budgetCategorySchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1, "Category name is required"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  percentage: z
    .number()
    .min(0)
    .max(100, "Percentage must be between 0 and 100"),
});

export type BudgetCategory = z.infer<typeof budgetCategorySchema>;

/**
 * Budget Creation Schema
 * Validates complete budget data before submission
 */
export const createBudgetSchema = z
  .object({
    budgetName: z.string().min(1, "Budget name is required").max(100),
    periodType: z.enum(["monthly", "quarterly", "semi-annual", "annual"]),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid start date",
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid end date",
    }),
    propertyId: z.string().nullable(),
    budgetOwner: z.string().optional(),
    categories: z
      .array(budgetCategorySchema)
      .min(1, "At least one category is required"),
    settings: z.object({
      enableAlerts: z.boolean(),
      requireApprovals: z.boolean(),
      allowCarryover: z.boolean(),
    }),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "closed"]),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type CreateBudget = z.infer<typeof createBudgetSchema>;

/**
 * Invoice Line Item Schema
 */
export const invoiceLineItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  rate: z.number().nonnegative("Rate must be non-negative"),
  amount: z.number().nonnegative("Amount must be non-negative"),
  taxable: z.boolean().optional().default(false),
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

/**
 * Invoice Creation Schema
 */
export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Invalid email address").optional(),
  invoiceDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid invoice date",
  }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid due date",
  }),
  propertyId: z.string().nullable(),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, "At least one line item is required"),
  subtotal: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100, "Tax rate must be between 0 and 100"),
  taxAmount: z.number().nonnegative(),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  currency: z.string().length(3).default("OMR"),
});

export type CreateInvoice = z.infer<typeof createInvoiceSchema>;

/**
 * Payment Method Schemas
 */
const cashPaymentSchema = z.object({
  method: z.literal("cash"),
  receiptNumber: z.string().optional(),
});

const chequePaymentSchema = z.object({
  method: z.literal("cheque"),
  chequeNumber: z.string().min(1, "Cheque number is required"),
  chequeDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid cheque date",
  }),
  bankName: z.string().min(1, "Bank name is required"),
  drawerName: z.string().optional(),
});

const bankTransferSchema = z.object({
  method: z.literal("bank_transfer"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountHolder: z.string().min(1, "Account holder is required"),
  bankName: z.string().min(1, "Bank name is required"),
  referenceNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
});

const cardPaymentSchema = z.object({
  method: z.literal("card"),
  cardType: z.enum(["visa", "mastercard", "amex", "other"]),
  last4Digits: z.string().length(4, "Must be 4 digits"),
  transactionId: z.string().optional(),
  authorizationCode: z.string().optional(),
});

export const paymentMethodSchema = z.discriminatedUnion("method", [
  cashPaymentSchema,
  chequePaymentSchema,
  bankTransferSchema,
  cardPaymentSchema,
]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/**
 * Payment Creation Schema
 */
export const createPaymentSchema = z.object({
  paymentType: z.enum(["received", "made"]),
  paymentDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid payment date",
  }),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("OMR"),
  propertyId: z.string().nullable(),
  paymentMethod: paymentMethodSchema,
  invoiceId: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "completed", "failed", "cancelled"]),
});

export type CreatePayment = z.infer<typeof createPaymentSchema>;

/**
 * Helper function to safely parse numbers that might be strings
 * Note: This function strips non-numeric characters (except . and -) which may not handle
 * all locale-specific number formats (e.g., comma as decimal separator).
 * For production use with international locales, consider using Intl.NumberFormat
 * or the Decimal.js constructor directly with proper locale handling.
 * @throws {Error} if input is invalid and cannot be parsed to a valid number
 */
export function parseDecimalInput(value: string | number): number {
  if (typeof value === "number") {
    if (isNaN(value)) {
      throw new Error("Invalid number: NaN provided");
    }
    return value;
  }

  // Remove non-numeric characters except . and -
  // WARNING: This assumes dot (.) as decimal separator (US/UK format)
  // Comma-based locales (e.g., European "1.234,56") will be incorrectly parsed
  const cleaned = value.replace(/[^0-9.-]/g, "");

  // Check if result is empty or invalid pattern
  if (!cleaned || cleaned === "-" || cleaned === ".") {
    throw new Error(`Invalid monetary input: "${value}"`);
  }

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    throw new Error(
      `Invalid monetary input: "${value}" could not be parsed to a number`,
    );
  }

  return parsed;
}

/**
 * Helper function to format currency for display
 */
export function formatCurrency(amount: number, currency = "OMR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
