/**
 * Expense Form Types
 * Shared type definitions for expense forms
 */

export interface IExpenseLineItem {
  id: string;
  description: string;
  category: string;
  accountId: string;
  accountCode: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable: boolean;
  taxRate: number;
  taxAmount: number;
}

export interface IReceipt {
  id: string;
  file: File;
  preview: string;
}

export interface IBudgetInfo {
  budgetId: string;
  category: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
}

export interface IVendor {
  id: string;
  name: string;
  type: string;
}

export interface IChartAccount {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  type: string;
}

export const EXPENSE_CATEGORY_LABELS: Record<
  string,
  { key: string; fallback: string }
> = {
  MAINTENANCE_REPAIR: {
    key: "finance.category.maintenance",
    fallback: "Maintenance & Repair",
  },
  UTILITIES: { key: "finance.category.utilities", fallback: "Utilities" },
  OFFICE_SUPPLIES: {
    key: "finance.category.officeSupplies",
    fallback: "Office Supplies",
  },
  HVAC: { key: "finance.category.hvac", fallback: "HVAC" },
  PLUMBING: { key: "finance.category.plumbing", fallback: "Plumbing" },
  ELECTRICAL: { key: "finance.category.electrical", fallback: "Electrical" },
  OTHER: { key: "finance.category.other", fallback: "Other" },
};

export type ExpenseType =
  | "OPERATIONAL"
  | "MAINTENANCE"
  | "CAPITAL"
  | "UTILITY"
  | "ADMINISTRATIVE"
  | "OTHER";

export type PaymentMethod =
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD";
