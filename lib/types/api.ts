/**
 * Core API Types for type-safe communication across the entire system
 */

// Re-export the API response type from api-handler
export type { ApiResponse, ApiContext, ApiHandler } from '../api-handler';

/**
 * Common Base Types
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  orgId: string;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: string;
  updatedBy?: string;
}

/**
 * Pagination Types
 */
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Filter Types
 */
export interface DateFilter {
  from?: string;
  to?: string;
}

export interface StatusFilter {
  status?: string | string[];
}

export interface SearchFilter {
  search?: string;
  fields?: string[];
}

/**
 * User and Authentication Types
 */
export interface User extends AuditableEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  timezone?: string;
  language: string;
  preferences: Record<string, any>;
}

export interface UserRole extends BaseEntity {
  name: string;
  description: string;
  permissions: Permission[];
  isActive: boolean;
}

export interface Permission extends BaseEntity {
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Organization Types
 */
export interface Organization extends AuditableEntity {
  name: string;
  slug: string;
  description?: string;
  type: 'property_management' | 'real_estate' | 'facility_management' | 'other';
  industry?: string;
  size?: 'small' | 'medium' | 'large' | 'enterprise';
  country: string;
  currency: string;
  timezone: string;
  language: string;
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: Address;
  settings: OrganizationSettings;
  isActive: boolean;
  subscription?: Subscription;
}

export interface OrganizationSettings {
  features: Record<string, boolean>;
  limits: Record<string, number>;
  integrations: Record<string, any>;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    favicon?: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface Subscription extends BaseEntity {
  plan: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  features: string[];
  limits: Record<string, number>;
  startsAt: string;
  endsAt: string;
  trialEndsAt?: string;
}

/**
 * Common Address Type
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/**
 * File and Media Types
 */
export interface FileUpload {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnail?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MediaGallery {
  images: FileUpload[];
  documents: FileUpload[];
  videos: FileUpload[];
  other: FileUpload[];
}

/**
 * Notification Types
 */
export interface Notification extends BaseEntity {
  type: 'info' | 'success' | 'warning' | 'error' | 'system';
  title: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipient: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  scheduledFor?: string;
  sentAt?: string;
  expiresAt?: string;
}

export interface NotificationPreferences extends BaseEntity {
  userId: string;
  workOrders: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  payments: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  maintenance: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  marketing: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  system: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}

/**
 * Activity and Audit Types
 */
export interface ActivityLog extends BaseEntity {
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

/**
 * Comment and Communication Types
 */
export interface Comment extends AuditableEntity {
  entityType: string;
  entityId: string;
  content: string;
  authorId: string;
  author?: User;
  parentId?: string;
  replies?: Comment[];
  attachments?: FileUpload[];
  isInternal: boolean;
  mentions?: string[];
  tags?: string[];
}

export interface Message extends AuditableEntity {
  conversationId: string;
  senderId: string;
  sender?: User;
  recipientId: string;
  recipient?: User;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  status: 'sent' | 'delivered' | 'read';
  readAt?: string;
  attachments?: FileUpload[];
  metadata?: Record<string, any>;
}

/**
 * Search and Filter Types
 */
export interface SearchRequest {
  query: string;
  filters?: Record<string, any>;
  facets?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  took: number;
}

/**
 * Integration Types
 */
export interface Integration extends BaseEntity {
  name: string;
  type: string;
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  configuration: Record<string, any>;
  credentials?: Record<string, any>;
  lastSyncAt?: string;
  syncStatus?: 'success' | 'error' | 'in_progress';
  syncError?: string;
  webhook?: {
    url: string;
    secret: string;
    events: string[];
  };
}

/**
 * Report Types
 */
export interface ReportTemplate extends AuditableEntity {
  name: string;
  description?: string;
  category: string;
  type: 'table' | 'chart' | 'dashboard' | 'pdf';
  query: string;
  parameters: ReportParameter[];
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'table' | 'metric';
    config: Record<string, any>;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    time: string;
    recipients: string[];
  };
  isPublic: boolean;
  tags?: string[];
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface ReportExecution extends BaseEntity {
  templateId: string;
  template?: ReportTemplate;
  parameters: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  resultUrl?: string;
  error?: string;
  executedBy: string;
}

/**
 * Dashboard and Analytics Types
 */
export interface Dashboard extends AuditableEntity {
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  permissions: {
    view: string[];
    edit: string[];
  };
  isDefault: boolean;
  isPublic: boolean;
  tags?: string[];
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  padding: [number, number];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'list' | 'map';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  configuration: Record<string, any>;
  dataSource: {
    type: 'api' | 'query' | 'static';
    endpoint?: string;
    query?: string;
    data?: any;
    refreshInterval?: number;
  };
}

/**
 * Task and Workflow Types
 */
export interface Task extends AuditableEntity {
  title: string;
  description?: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assignee?: User;
  dueDate?: string;
  completedAt?: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  tags?: string[];
  parentId?: string;
  dependencies?: string[];
  attachments?: FileUpload[];
  checklist?: TaskChecklistItem[];
  watchers?: string[];
}

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

/**
 * Error and Validation Types
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ErrorDetails {
  code: string;
  message: string;
  field?: string;
  value?: any;
  context?: Record<string, any>;
}

/**
 * Export all types for easy importing
 */
export * from './dashboard';
export * from './work-orders';
export * from './properties';
export * from './finances';
export * from './crm';
export * from './marketplace';
export * from './hr';
export * from './compliance';
export * from './support';