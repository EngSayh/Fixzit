/**
 * RoleBadge Component (STRICT v4.1)
 * 
 * Displays role name with proper badge styling.
 * Automatically normalizes legacy role names to canonical names.
 * Shows sub-role as secondary badge if present.
 * 
 * Features:
 * - Color-coded by role type
 * - Displays sub-role badge for Team Members
 * - Tooltips with role descriptions
 * - RTL support
 */

"use client";

import React from "react";
// Import from client-safe roles module (no mongoose)
import { Role, SubRole, normalizeRole } from "@/lib/rbac/client-roles";
import { useTranslation } from "@/contexts/TranslationContext";

interface RoleBadgeProps {
  role: Role | string;
  subRole?: SubRole | string | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

// Role display configuration
// Note: Only canonical STRICT v4.1 roles are defined here.
// Legacy role aliases (CORPORATE_ADMIN, MANAGER, etc.) are mapped via normalizeRole()
const ROLE_CONFIG: Partial<Record<Role, { label: string; color: string; description: string }>> = {
  [Role.SUPER_ADMIN]: {
    label: "Super Admin",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    description: "Platform administrator with cross-organization access",
  },
  [Role.ADMIN]: {
    label: "Admin",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description: "Organization administrator with full tenant access",
  },
  [Role.CORPORATE_OWNER]: {
    label: "Corporate Owner",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    description: "Portfolio owner managing multiple properties",
  },
  [Role.TEAM_MEMBER]: {
    label: "Team Member",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Corporate staff member with operational access",
  },
  [Role.TECHNICIAN]: {
    label: "Technician",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "Field worker handling work orders",
  },
  [Role.PROPERTY_MANAGER]: {
    label: "Property Manager",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    description: "Manages assigned properties and units",
  },
  [Role.TENANT]: {
    label: "Tenant",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    description: "Property tenant with unit access",
  },
  [Role.VENDOR]: {
    label: "Vendor",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    description: "External service provider",
  },
  [Role.GUEST]: {
    label: "Guest",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    description: "Public visitor with limited access",
  },
};

const SUB_ROLE_CONFIG: Record<SubRole, { label: string; icon: string }> = {
  [SubRole.FINANCE_OFFICER]: { label: "Finance Officer", icon: "💰" },
  [SubRole.HR_OFFICER]: { label: "HR Officer", icon: "👥" },
  [SubRole.SUPPORT_AGENT]: { label: "Support Agent", icon: "🎧" },
  [SubRole.OPERATIONS_MANAGER]: { label: "Operations Manager", icon: "⚙️" },
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

export default function RoleBadge({
  role,
  subRole,
  size = "md",
  showTooltip = true,
  className = "",
}: RoleBadgeProps) {
  const { t } = useTranslation();
  
  // Normalize legacy role names
  const normalizedRole = normalizeRole(role) || Role.GUEST;
  const config = ROLE_CONFIG[normalizedRole];
  
  if (!config) {
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        {role}
      </span>
    );
  }
  
  // Localize role label and description with fallbacks
  const roleKey = normalizedRole.toLowerCase().replace(/_/g, "");
  const label = t(`admin.roles.${roleKey}.label`, config.label);
  const description = t(`admin.roles.${roleKey}.description`, config.description);
  
  const sizeClass = SIZE_CLASSES[size];
  
  // Localize sub-role if present
  const subRoleConfig = subRole ? SUB_ROLE_CONFIG[subRole as SubRole] : null;
  const subRoleKey = subRole ? (subRole as string).toLowerCase().replace(/_/g, "") : "";
  const subRoleLabel = subRoleConfig 
    ? t(`admin.subRoles.${subRoleKey}.label`, subRoleConfig.label)
    : "";
  
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* Main role badge */}
      <span
        className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClass}`}
        title={showTooltip ? description : undefined}
        role="status"
        aria-label={t("admin.roles.ariaLabel", `Role: ${label}`, { role: label })}
      >
        {label}
      </span>
      
      {/* Sub-role badge (for Team Members) */}
      {subRole && normalizedRole === Role.TEAM_MEMBER && subRoleConfig && (
        <span
          className={`inline-flex items-center rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 ${sizeClass}`}
          title={showTooltip ? t("admin.subRoles.specializationTooltip", `Specialization: ${subRoleLabel}`, { subRole: subRoleLabel }) : undefined}
          role="status"
          aria-label={t("admin.subRoles.ariaLabel", `Sub-role: ${subRoleLabel}`, { subRole: subRoleLabel })}
        >
          <span className="me-1">{subRoleConfig.icon}</span>
          {subRoleLabel}
        </span>
      )}
    </div>
  );
}
