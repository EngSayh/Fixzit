/**
 * SubRoleSelector Component (STRICT v4.1)
 * 
 * Dropdown for selecting Team Member sub-role specialization.
 * Only visible when user role is TEAM_MEMBER.
 * 
 * Features:
 * - Displays module access for each sub-role
 * - Validates selection (only TEAM_MEMBER can have sub-roles)
 * - RTL support
 * - WCAG 2.1 AA compliant
 */

"use client";

import React from "react";
// Import from fm.types (client-safe, no mongoose)
import { SubRole, Role, ModuleKey, computeAllowedModules, normalizeRole, PLAN_GATES, Plan, SubmoduleKey } from "@/domain/fm/fm.types";
import { useTranslation } from "@/contexts/TranslationContext";
import { useCurrentOrg } from "@/contexts/CurrentOrgContext";

interface SubRoleSelectorProps {
  role: Role | string;
  value?: SubRole | string | null;
  onChange: (subRole: SubRole | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  /** Optional plan override; defaults to org context plan */
  orgPlan?: Plan;
}

// Sub-role metadata (i18n keys with fallbacks)
const SUB_ROLE_INFO_KEYS: Record<SubRole, { labelKey: string; descKey: string; labelFallback: string; descFallback: string; icon: string }> = {
  [SubRole.FINANCE_OFFICER]: {
    labelKey: "admin.subRoles.financeOfficer.label",
    descKey: "admin.subRoles.financeOfficer.description",
    labelFallback: "Finance Officer",
    descFallback: "Manages budgets, invoices, and financial reports",
    icon: "💰",
  },
  [SubRole.HR_OFFICER]: {
    labelKey: "admin.subRoles.hrOfficer.label",
    descKey: "admin.subRoles.hrOfficer.description",
    labelFallback: "HR Officer",
    descFallback: "Manages employee records, payroll, and PII data",
    icon: "👥",
  },
  [SubRole.SUPPORT_AGENT]: {
    labelKey: "admin.subRoles.supportAgent.label",
    descKey: "admin.subRoles.supportAgent.description",
    labelFallback: "Support Agent",
    descFallback: "Handles customer inquiries and tickets",
    icon: "🎧",
  },
  [SubRole.OPERATIONS_MANAGER]: {
    labelKey: "admin.subRoles.operationsManager.label",
    descKey: "admin.subRoles.operationsManager.description",
    labelFallback: "Operations Manager",
    descFallback: "Oversees work orders and property operations",
    icon: "⚙️",
  },
};

// Module display names (i18n keys with fallbacks)
const MODULE_NAME_KEYS: Record<ModuleKey, { key: string; fallback: string }> = {
  [ModuleKey.DASHBOARD]: { key: "admin.modules.dashboard", fallback: "Dashboard" },
  [ModuleKey.WORK_ORDERS]: { key: "admin.modules.workOrders", fallback: "Work Orders" },
  [ModuleKey.PROPERTIES]: { key: "admin.modules.properties", fallback: "Properties" },
  [ModuleKey.FINANCE]: { key: "admin.modules.finance", fallback: "Finance" },
  [ModuleKey.HR]: { key: "admin.modules.hr", fallback: "HR" },
  [ModuleKey.ADMINISTRATION]: { key: "admin.modules.administration", fallback: "Administration" },
  [ModuleKey.CRM]: { key: "admin.modules.crm", fallback: "CRM" },
  [ModuleKey.MARKETPLACE]: { key: "admin.modules.marketplace", fallback: "Marketplace" },
  [ModuleKey.SUPPORT]: { key: "admin.modules.support", fallback: "Support" },
  [ModuleKey.COMPLIANCE]: { key: "admin.modules.compliance", fallback: "Compliance" },
  [ModuleKey.REPORTS]: { key: "admin.modules.reports", fallback: "Reports" },
  [ModuleKey.SYSTEM_MANAGEMENT]: { key: "admin.modules.system", fallback: "System" },
};

/**
 * Map ModuleKey → SubmoduleKey for plan-aware filtering.
 * If a module has no corresponding submodule in PLAN_GATES, it's always allowed.
 */
const MODULE_TO_SUBMODULE: Partial<Record<ModuleKey, SubmoduleKey>> = {
  [ModuleKey.WORK_ORDERS]: SubmoduleKey.WO_CREATE,
  [ModuleKey.PROPERTIES]: SubmoduleKey.PROP_LIST,
};

export default function SubRoleSelector({
  role,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  className = "",
  orgPlan,
}: SubRoleSelectorProps) {
  const { t } = useTranslation();
  const { org } = useCurrentOrg();
  
  // Use provided plan or fall back to org context, default to STARTER (fail-safe)
  const effectivePlan = orgPlan ?? org?.plan ?? Plan.STARTER;
  
  // Normalize role to handle case-sensitivity and legacy aliases (EMPLOYEE, MANAGEMENT, etc.)
  const normalizedRole = normalizeRole(role as string);
  const isTeamMember = normalizedRole === Role.TEAM_MEMBER;
  
  if (!isTeamMember) {
    return null;
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue ? (selectedValue as SubRole) : null);
  };
  
  // Get allowed modules for selected sub-role, filtered by plan gates
  const baseModules = value
    ? computeAllowedModules(Role.TEAM_MEMBER, value as SubRole)
    : computeAllowedModules(Role.TEAM_MEMBER);
  
  // Filter modules by plan gates to avoid overpromising
  const planGates = PLAN_GATES[effectivePlan];
  const allowedModules = baseModules.filter((module) => {
    const submodule = MODULE_TO_SUBMODULE[module];
    // If no corresponding submodule in plan gates, module is always allowed
    if (!submodule) return true;
    // Check if plan allows this submodule
    return planGates[submodule] !== false;
  });
  
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
        
        {Object.values(SubRole).map((subRole) => {
          const info = SUB_ROLE_INFO_KEYS[subRole];
          return (
            <option key={subRole} value={subRole}>
              {info.icon} {t(info.labelKey, info.labelFallback)}
            </option>
          );
        })}
      </select>
      
      {/* Sub-role description */}
      {value && SUB_ROLE_INFO_KEYS[value as SubRole] && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t(
            SUB_ROLE_INFO_KEYS[value as SubRole].descKey,
            SUB_ROLE_INFO_KEYS[value as SubRole].descFallback
          )}
        </p>
      )}
      
      {/* Module access preview */}
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("admin.users.form.moduleAccess", "Module Access:")}
        </p>
        <div className="flex flex-wrap gap-1">
          {allowedModules.map((module) => {
            const nameInfo = MODULE_NAME_KEYS[module];
            return (
              <span
                key={module}
                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
              >
                {t(nameInfo.key, nameInfo.fallback)}
              </span>
            );
          })}
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
