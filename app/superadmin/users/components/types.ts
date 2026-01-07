/**
 * Shared types for Superadmin Users module
 * @module app/superadmin/users/components/types
 */

import type { ModulePermissions } from "@/config/rbac.matrix";
import type { UserRoleType } from "@/types/user";

export interface UserData {
  _id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
  role?: string;
  professional?: {
    role?: string;
    subRole?: string;
    department?: string;
  };
  personal?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  orgId?: string;
  orgName?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  lastLogin?: string;
  code?: string;
  userType?: "individual" | "company";
}

export interface Organization {
  _id: string;
  name: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type GroupByOption = "none" | "organization" | "role" | "status";

export interface CreateUserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRoleType | "";
  orgId: string;
}

export interface PermissionOverrides {
  [subModuleId: string]: Partial<ModulePermissions>;
}

// Status badge colors
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400 border-green-500/30",
  PENDING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INACTIVE: "bg-muted text-muted-foreground border-input",
  SUSPENDED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const USER_TYPES = [
  { value: "all", label: "All Types" },
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
];
