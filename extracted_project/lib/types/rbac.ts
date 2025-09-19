/**
 * Enhanced Role-Based Access Control (RBAC) Types
 * Production-ready RBAC system with server-side enforcement
 */

export interface EnhancedUser extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  timezone: string;
  language: string;
  preferences: UserPreferences;
  roles: UserRole[];
  permissions: Permission[];
  organizationId: string;
  organization?: Organization;
  // Security fields
  lastPasswordChange?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  sessionTokens: SessionToken[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: PermissionAction;
  description: string;
  isActive: boolean;
  conditions?: PermissionCondition[];
}

export type PermissionAction = 
  | 'create' | 'read' | 'update' | 'delete' 
  | 'approve' | 'reject' | 'assign' | 'manage'
  | 'export' | 'import' | 'configure' | '*';

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with';
  value: any;
}

export interface UserRole extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  isActive: boolean;
  hierarchy: number; // Higher number = more permissions
  constraints?: RoleConstraint[];
}

export interface RoleConstraint {
  type: 'time_based' | 'location_based' | 'property_based' | 'department_based';
  config: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'ar';
  timezone: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
  accessibility: AccessibilityPreferences;
}

export interface NotificationPreferences {
  workOrders: NotificationChannel;
  payments: NotificationChannel;
  maintenance: NotificationChannel;
  marketing: NotificationChannel;
  system: NotificationChannel;
  security: NotificationChannel;
}

export interface NotificationChannel {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  digest: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface DashboardPreferences {
  layout: 'classic' | 'modern' | 'compact';
  widgets: string[];
  refreshInterval: number; // seconds
  autoRefresh: boolean;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface SessionToken extends BaseEntity {
  userId: string;
  token: string;
  type: 'access' | 'refresh' | 'api';
  expiresAt: string;
  lastUsedAt: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  revokedAt?: string;
  revokedReason?: string;
}

// RBAC Helper Types
export interface RBACContext {
  user: EnhancedUser;
  resource: string;
  action: PermissionAction;
  resourceId?: string;
  conditions?: Record<string, any>;
}

export interface RBACDecision {
  allowed: boolean;
  reason?: string;
  conditions?: PermissionCondition[];
  auditLog?: {
    action: string;
    resource: string;
    decision: boolean;
    timestamp: string;
  };
}

// Role-based menu configuration
export interface MenuConfiguration {
  sections: MenuSection[];
  actions: string[];
  widgets: string[];
  features: Record<string, boolean>;
}

export interface MenuSection {
  id: string;
  name: string;
  order: number;
  items: MenuItem[];
  roles: string[];
  permissions: string[];
}

export interface MenuItem {
  id: string;
  href: string;
  labelKey: string;
  icon: string;
  color?: string;
  badge?: string;
  roles: string[];
  permissions: string[];
  children?: MenuItem[];
}

// Import base types
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  orgId: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}