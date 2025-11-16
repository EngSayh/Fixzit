/**
 * Centralized Fixzit AI Assistant Type Definitions
 * Based on Blueprint Bible roles matrix and Design System specifications
 */

// Role types from Blueprint Bible PDF - covers all system roles
export type Role =
  | 'SUPER_ADMIN'
  | 'CORPORATE_ADMIN'
  | 'MANAGEMENT'
  | 'FINANCE'
  | 'HR'
  | 'CORPORATE_EMPLOYEE'
  | 'PROPERTY_OWNER'
  | 'TECHNICIAN'
  | 'TENANT'
  | 'VENDOR'
  | 'GUEST'
  | 'ADMIN'
  | 'FM_MANAGER'
  | 'PROCUREMENT'
  | 'PROPERTY_MANAGER'
  | 'EMPLOYEE'
  | 'CUSTOMER'
  | 'OWNER'
  | 'AUDITOR';

// Session profile with locale and directionality for RTL support
export interface SessionProfile {
  userId: string;
  name: string;
  email: string;
  role: Role;
  orgId: string | null;
  locale: 'ar' | 'en';
  dir: 'rtl' | 'ltr';
}

// Chat message structure
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: Intent;
  dataClass?: DataClass;
  sources?: KnowledgeSource[];
}

// Intent classification for message routing
export type Intent =
  | 'GENERAL'
  | 'PERSONAL'
  | 'APARTMENT_SEARCH'
  | 'DISPATCH'
  | 'UPLOAD_PHOTO'
  | 'APPROVE_QUOTATION'
  | 'OWNER_STATEMENTS'
  | 'SCHEDULE_VISIT'
  | 'CREATE_WORK_ORDER'
  | 'LIST_MY_TICKETS';

// Data classification for RBAC enforcement
export type DataClass =
  | 'PUBLIC'
  | 'TENANT_SCOPED'
  | 'OWNER_SCOPED'
  | 'ORG_FINANCIALS'
  | 'FINANCE'
  | 'HR'
  | 'INTERNAL'
  | 'SENSITIVE';

// Session context for backend processing
export interface SessionContext {
  userId: string | null;
  orgId: string | null;
  role: Role;
  locale: 'en' | 'ar';
  tenantId?: string;
}

// Knowledge base source for RAG
export interface KnowledgeSource {
  id: string;
  title: string;
  score: number;
  source?: string;
  excerpt?: string;
}

// Policy evaluation result
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  dataClass?: DataClass;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresAuth?: boolean;
}

// Apartment search result (guest-safe)
export interface ApartmentSearchResult {
  unitId?: string; // Only for authenticated users
  bedrooms: number;
  bathrooms: number;
  area: number;
  rent: number;
  currency: string;
  city: string;
  district?: string;
  propertyName?: string;
  available: boolean;
  agentContact?: string; // Only for authenticated users
  features?: string[];
}
