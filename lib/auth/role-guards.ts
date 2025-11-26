import { UserRole, type UserRoleType } from "@/types/user";

type RoleChecker = (_role?: string | null) => boolean;

const normalizeRole = (role?: string | null): string | null =>
  typeof role === "string" ? role.trim().toUpperCase() : null;

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
export const canViewInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE, // Finance Officer role
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
);

// 🔒 STRICT v4: Finance edit limited to Finance Officer + Corporate Admin
export const canEditInvoices = buildRoleChecker(
  [
    UserRole.SUPER_ADMIN,
    UserRole.CORPORATE_ADMIN,
    UserRole.FINANCE, // Finance Officer role
  ],
  ["BILLING_ADMIN", "FINANCE_ADMIN"],
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
