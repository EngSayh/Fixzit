import { UserRole, type UserRoleType } from "@/types/user";
import { normalizeRole as normalizeFmRole } from "@/domain/fm/fm.behavior";

type RoleChecker = (_role?: string | null) => boolean;

const normalizeRole = (role?: string | null): string | null => {
  const canonical = normalizeFmRole(role);
  if (canonical) return canonical;
  return typeof role === "string" ? role.trim().toUpperCase() : null;
};

const buildRoleChecker = (
  allowed: readonly UserRoleType[],
  legacy: readonly string[] = [],
): RoleChecker => {
  const allowedSet = new Set(allowed.map((role) => role.toUpperCase()));
  const legacySet = new Set(legacy.map((role) => role.toUpperCase()));

  return (role?: string | null) => {
    const normalized = normalizeRole(role);
    if (!normalized) {
      return false;
    }
    return allowedSet.has(normalized) || legacySet.has(normalized);
  };
};

export const canManageSubscriptions = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.FINANCE,
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Finance access limited to Finance Officer + Corporate Admin
// NOTE: Finance Officer (FINANCE role) is granted view access for daily operations
// Per least-privilege principle, view-only access is appropriate for routine work
export const canViewInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE, // Finance Officer role
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Finance edit limited to Finance Officer + Corporate Admin
// SECURITY NOTE: Finance Officer (FINANCE role) can edit but NOT delete invoices
// Delete operations require SUPER_ADMIN or CORPORATE_ADMIN approval
// This guards against accidental/malicious deletion by standard finance staff
export const canEditInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE, // Finance Officer role
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Invoice DELETE restricted to admin-level roles only
// Finance Officer intentionally EXCLUDED - requires manager approval for deletions
export const canDeleteInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    // NOTE: FINANCE role intentionally NOT included (least-privilege principle)
  ],
  ["BILLING_ADMIN"], // Legacy admin roles may have delete access
);

export const canManageOwnerGroups = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.FM_MANAGER,
    UserRole.PROPERTY_MANAGER,
  ],
  ["PROPERTY_ADMIN"],
);
