/**
 * Wallet & Payment Types
 * @module types/wallet
 * @description Digital wallet, transactions, and payment methods for Fixzit Souq Phase 2
 */

import type { ObjectId } from "mongodb";

// ============================================================================
// Wallet Core Types
// ============================================================================

export type WalletStatus = "active" | "frozen" | "closed";
export type TransactionType = "credit" | "debit";
export type TransactionCategory = "topup" | "subscription" | "service_fee" | "refund" | "purchase" | "commission";
export type TransactionStatus = "pending" | "completed" | "failed" | "reversed";
export type PaymentMethodType = "mada" | "visa" | "mastercard" | "apple_pay";
export type PaymentChannel = "card" | "bank_transfer" | "apple_pay";

export interface IWallet {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  user_id: ObjectId | string;
  balance: number; // In halalas (1 SAR = 100 halalas)
  currency: string; // "SAR"
  status: WalletStatus;
  created_at: Date;
  updated_at: Date;
}

export interface IWalletTransaction {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  wallet_id: ObjectId | string;
  type: TransactionType;
  amount: number; // In halalas
  description: string;
  description_ar: string;
  category: TransactionCategory;
  reference_type?: "subscription" | "listing" | "contract" | "order" | "refund";
  reference_id?: ObjectId | string;
  status: TransactionStatus;
  payment_method?: PaymentChannel;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface ISavedPaymentMethod {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  user_id: ObjectId | string;
  type: PaymentMethodType;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  card_holder_name?: string;
  token: string; // Payment gateway token (encrypted)
  is_default: boolean;
  status: "active" | "expired" | "deleted";
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// API Request/Response DTOs
// ============================================================================

export interface TopUpRequest {
  amount: number; // In SAR (will be converted to halalas)
  payment_method: PaymentChannel;
  card_token?: string;
  save_card?: boolean;
}

export interface TopUpResponse {
  transaction_id: string;
  payment_url?: string; // For redirect-based payments
  status: TransactionStatus;
  amount: number;
}

export interface WalletBalanceResponse {
  balance: number; // In halalas
  balance_sar: number; // In SAR for display
  currency: string;
  status: WalletStatus;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: TransactionCategory;
  status?: TransactionStatus;
  start_date?: Date;
  end_date?: Date;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  transactions: IWalletTransaction[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AddCardRequest {
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  card_holder_name?: string;
  save_card: boolean;
}

export interface AddCardResponse {
  payment_method_id: string;
  last_four: string;
  type: PaymentMethodType;
  is_default: boolean;
}

export interface PaymentMethodListResponse {
  payment_methods: ISavedPaymentMethod[];
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface WalletBalanceProps {
  balance: number;
  currency?: string;
  onTopUp: () => void;
  showHistory?: boolean;
  className?: string;
}

export interface TransactionCardProps {
  transaction: IWalletTransaction;
  onClick?: () => void;
  className?: string;
}

export interface CardPaymentFormProps {
  amount: number;
  onSubmit: (data: AddCardRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  showSaveCard?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const CURRENCY_HALALAS_MULTIPLIER = 100;
export const DEFAULT_CURRENCY = "SAR";
export const MIN_TOPUP_AMOUNT = 10; // 10 SAR
export const MAX_TOPUP_AMOUNT = 50000; // 50,000 SAR
