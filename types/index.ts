/**
 * Central export for all Fixzit types
 */

// Re-export property types
export * from "./properties";

// ============================================================================
// Phase 2: Souq Competitive Features
// ============================================================================

// Wallet & Payment types (explicit exports to avoid conflicts)
export type {
  WalletStatus,
  TransactionCategory,
  TransactionStatus,
  PaymentMethodType,
  PaymentChannel,
  IWallet,
  IWalletTransaction,
  ISavedPaymentMethod,
  TopUpRequest,
  TopUpResponse,
  TransactionFilters,
} from "./wallet.types";
// Note: TransactionType from wallet conflicts with market - use WalletTransactionType alias
export type { TransactionType as WalletTransactionType } from "./wallet.types";

// Subscription & Monetization types
export * from "./subscription.types";

// Lead & CRM types
export * from "./lead.types";

// Lease Contract (Ejar) types
export * from "./contract.types";

// Market Intelligence types (explicit exports to avoid conflicts)
export type {
  PeriodFilter,
  ILocation,
  IPriceDataPoint,
  IMarketIndicator,
  LocationsResponse,
  MarketIndicatorsRequest,
} from "./market.types";
// Note: PropertyType and TransactionType from market conflict with wallet/properties
export type { PropertyType as MarketPropertyType, TransactionType as MarketTransactionType } from "./market.types";
// Re-export constant with alias to avoid conflict
export { PROPERTY_TYPE_CONFIG as MARKET_PROPERTY_TYPE_CONFIG, SAUDI_CITIES } from "./market.types";

// AI Chat & Support types
export * from "./chat.types";

// ============================================================================
// End Phase 2
// ============================================================================

// Re-export work order types (excluding conflicts with properties)
export type {
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderCategory,
  WorkOrderUser,
  WorkOrderPhoto,
  WorkOrderComment,
  WorkOrderTimeline,
  WorkOrderProperty,
  WorkOrderUnit,
  WorkOrder,
  WorkOrderFormData,
  WorkOrderFilters,
  WorkOrderStats,
  SortOption,
} from "./work-orders";

// Tenant configuration types
export interface ITenantCopilotSettings {
  enabled: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  features?: {
    chatbot?: boolean;
    autoSuggest?: boolean;
    documentAnalysis?: boolean;
  };
}

export interface ITenantOrgSettings {
  name: string;
  domain?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  features?: {
    workOrders?: boolean;
    properties?: boolean;
    hr?: boolean;
    finance?: boolean;
    marketplace?: boolean;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}
