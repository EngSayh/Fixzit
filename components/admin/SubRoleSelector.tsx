/**
 * SubRoleSelector Component (STRICT v4.1)
 *
 * Dropdown for selecting sub-role specialization for eligible roles.
 *
 * Features:
 * - Displays module access for each sub-role
 * - Validates selection (only eligible roles can have sub-roles)
 * - RTL support
 * - WCAG 2.1 AA compliant
 */

"use client";

import React from "react";
import {
  SubRole,
  Role,
  ModuleKey,
  computeAllowedModules,
  normalizeRole,
} from "@/lib/rbac/client-roles";
import { useTranslation } from "@/contexts/TranslationContext";

interface SubRoleSelectorProps {
  role: Role | string;
  value?: SubRole | string | null;
  onChange: (subRole: SubRole | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

// Sub-role metadata
const SUB_ROLE_INFO: Record<SubRole, { label: string; description: string; icon: string }> = {
  [SubRole.FINANCE_OFFICER]: {
    label: "Finance Officer",
    description: "Manages budgets, invoices, and financial reports",
    icon: "💰",
  },
  [SubRole.HR_OFFICER]: {
    label: "HR Officer",
    description: "Manages employee records, payroll, and PII data",
    icon: "👥",
  },
  [SubRole.SUPPORT_AGENT]: {
    label: "Support Agent",
    description: "Handles customer inquiries and tickets",
    icon: "🎧",
  },
  [SubRole.OPERATIONS_MANAGER]: {
    label: "Operations Manager",
    description: "Oversees work orders and property operations",
    icon: "⚙️",
  },
};

// Module display names
const MODULE_NAMES: Record<ModuleKey, string> = {
  [ModuleKey.DASHBOARD]: "Dashboard",
  [ModuleKey.WORK_ORDERS]: "Work Orders",
  [ModuleKey.PROPERTIES]: "Properties",
  [ModuleKey.FINANCE]: "Finance",
  [ModuleKey.HR]: "HR",
  [ModuleKey.ADMINISTRATION]: "Administration",
  [ModuleKey.CRM]: "CRM",
  [ModuleKey.MARKETPLACE]: "Marketplace",
  [ModuleKey.SUPPORT]: "Support",
  [ModuleKey.COMPLIANCE]: "Compliance",
  [ModuleKey.REPORTS]: "Reports",
  [ModuleKey.SYSTEM_MANAGEMENT]: "System",
};

export default function SubRoleSelector({
  role,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className = "",
}: SubRoleSelectorProps) {
  const { t } = useTranslation();

  const normalizedRole = normalizeRole(role);
  const eligibleRoles = new Set<Role>([
    Role.FINANCE,
    Role.HR,
    Role.SUPPORT,
    Role.OPERATIONS_MANAGER,
    Role.FINANCE_OFFICER,
    Role.HR_OFFICER,
    Role.SUPPORT_AGENT,
  ]);

  if (!normalizedRole || !eligibleRoles.has(normalizedRole)) {
    return null;
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue ? (selectedValue as SubRole) : null);
  };
  
  // Get allowed modules for selected sub-role
  const allowedModules = value
    ? computeAllowedModules(normalizedRole, value as SubRole)
    : computeAllowedModules(normalizedRole);
  
  return (
    <div className={`space-y-2 ${className}`}>
      <label
        htmlFor="subRole"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {t("admin.users.form.subRole", "Sub-Role (Specialization)")}
        {required && <span className="text-red-500 ms-1" aria-label="required">*</span>}
      </label>
      
      <select
        id="subRole"
        name="subRole"
        value={value || ""}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        }`}
        aria-describedby={error ? "subRole-error" : "subRole-help"}
        aria-invalid={error ? "true" : "false"}
      >
        <option value="">
          {t("admin.users.form.subRole.none", "— No specialization (general access) —")}
        </option>
        
        {Object.values(SubRole).map((subRole) => (
          <option key={subRole} value={subRole}>
            {SUB_ROLE_INFO[subRole].icon} {SUB_ROLE_INFO[subRole].label}
          </option>
        ))}
      </select>
      
      {/* Sub-role description */}
      {value && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {SUB_ROLE_INFO[value as SubRole]?.description}
        </p>
      )}
      
      {/* Module access preview */}
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("admin.users.form.moduleAccess", "Module Access:")}
        </p>
        <div className="flex flex-wrap gap-1">
          {allowedModules.map((module) => (
            <span
              key={module}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
            >
              {MODULE_NAMES[module]}
            </span>
          ))}
        </div>
      </div>
      
      {/* Help text */}
      {!error && (
        <p id="subRole-help" className="text-xs text-gray-500 dark:text-gray-400">
          {t(
            "admin.users.form.subRole.help",
            "Sub-roles grant access to specialized modules. Leave empty for general Team Member access."
          )}
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p id="subRole-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
