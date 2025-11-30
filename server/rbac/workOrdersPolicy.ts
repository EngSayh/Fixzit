/**
 * Work Orders RBAC Policy
 * Re-exports Role from canonical source for backward compatibility.
 * @see domain/fm/fm.behavior.ts for the canonical STRICT v4.1 Role enum
 */
import { Role } from "@/domain/fm/fm.behavior";

// Re-export for backward compatibility with existing imports
export { Role };

/**
 * @deprecated Use Role enum values directly instead of this type.
 * Maintained for backward compatibility with existing code.
 */
export type RoleString = `${Role}`;

export type Ability =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "ASSIGN"
  | "STATUS"
  | "VERIFY"
  | "CLOSE"
  | "DELETE"
  | "EXPORT"
  | "COMMENT";

const ROLE_ABILITIES: Partial<Record<Role, Ability[]>> = {
  [Role.SUPER_ADMIN]: [
    "VIEW",
    "CREATE",
    "EDIT",
    "ASSIGN",
    "STATUS",
    "VERIFY",
    "CLOSE",
    "DELETE",
    "EXPORT",
    "COMMENT",
  ],
  [Role.ADMIN]: [
    "VIEW",
    "CREATE",
    "EDIT",
    "ASSIGN",
    "STATUS",
    "VERIFY",
    "CLOSE",
    "DELETE",
    "EXPORT",
    "COMMENT",
  ],
  [Role.CORPORATE_OWNER]: [
    "VIEW",
    "CREATE",
    "EDIT",
    "ASSIGN",
    "STATUS",
    "VERIFY",
    "CLOSE",
    "EXPORT",
    "COMMENT",
  ],
  [Role.PROPERTY_MANAGER]: [
    "VIEW",
    "CREATE",
    "EDIT",
    "ASSIGN",
    "STATUS",
    "VERIFY",
    "CLOSE",
    "EXPORT",
    "COMMENT",
  ],
  [Role.TEAM_MEMBER]: ["VIEW", "CREATE", "EDIT", "ASSIGN", "STATUS", "COMMENT"],
  [Role.TECHNICIAN]: ["VIEW", "STATUS", "COMMENT"],
  [Role.VENDOR]: ["VIEW", "STATUS", "COMMENT"],
  [Role.TENANT]: ["VIEW", "CREATE", "COMMENT"],
  [Role.GUEST]: ["VIEW"],
};

export function can(role: Role | string, ability: Ability): boolean {
  // Normalize string roles to Role enum
  const normalizedRole = typeof role === "string" ? (role as Role) : role;
  return ROLE_ABILITIES[normalizedRole]?.includes(ability) ?? false;
}

// Re-export Role for middleware compatibility
export type { Role as default };
