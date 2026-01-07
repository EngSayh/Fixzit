/**
 * Shared types for Superadmin User Detail page
 * @module app/superadmin/users/[id]/components/types
 */

export interface UserDetail {
  _id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
  role?: string;
  professional?: {
    role?: string;
    subRole?: string;
    department?: string;
    title?: string;
  };
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
  };
  employment?: {
    orgId?: string;
    position?: string;
    hireDate?: string;
  };
  orgId?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  code?: string;
  userType?: "individual" | "company";
  loginCount?: number;
  failedLoginAttempts?: number;
  mfaEnabled?: boolean;
  emailVerified?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  ipAddress?: string; // Can be at root or in context
  userAgent?: string; // Can be at root or in context
  context?: {
    method?: string;
    endpoint?: string;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
  };
  changes?: Record<string, unknown>; // Changed from Array to Record for JSON.stringify
  result?: {
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
  };
  metadata?: {
    reason?: string;
    comment?: string;
    source?: string;
    tags?: string[];
  };
}

export interface ErrorLogEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  timestamp: string;
  context?: {
    endpoint?: string;
    method?: string;
    ipAddress?: string;
  };
  result: {
    success: false;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
  };
}

export interface ActivityStats {
  totalActions: number;
  todayActions: number;
  errorCount: number;
  lastActiveDate?: string;
  topActions: Array<{ action: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface ModuleAccessItem {
  module: string;
  subModule: string;
  hasAccess: boolean;
  actions?: string[];
}

// Status badge colors
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INACTIVE: "bg-muted text-muted-foreground border-input",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};
