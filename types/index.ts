/**
 * Central export for all Fixzit types
 */

// Re-export property types
export * from "./properties";

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
