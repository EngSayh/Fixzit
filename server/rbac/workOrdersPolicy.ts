export type Role =
  | "SUPER_ADMIN" | "CORPORATE_ADMIN" | "FM_MANAGER" | "DISPATCHER"
  | "TECHNICIAN" | "VENDOR" | "TENANT" | "OWNER"
  | "FINANCE" | "SUPPORT" | "AUDITOR";

export type Ability =
  | "VIEW" | "CREATE" | "EDIT" | "ASSIGN" | "STATUS" | "VERIFY" | "CLOSE" | "DELETE" | "EXPORT" | "COMMENT";

const ROLE_ABILITIES: Record<Role, Ability[]> = {
  SUPER_ADMIN: ["VIEW","CREATE","EDIT","ASSIGN","STATUS","VERIFY","CLOSE","DELETE","EXPORT","COMMENT"],
  CORPORATE_ADMIN: ["VIEW","CREATE","EDIT","ASSIGN","STATUS","VERIFY","CLOSE","DELETE","EXPORT","COMMENT"],
  FM_MANAGER: ["VIEW","CREATE","EDIT","ASSIGN","STATUS","VERIFY","CLOSE","EXPORT","COMMENT"],
  DISPATCHER: ["VIEW","CREATE","EDIT","ASSIGN","STATUS","COMMENT"],
  TECHNICIAN: ["VIEW","STATUS","COMMENT"],
  VENDOR: ["VIEW","STATUS","COMMENT"],
  TENANT: ["VIEW","CREATE","COMMENT"],
  OWNER: ["VIEW","COMMENT"],
  FINANCE: ["VIEW","EXPORT","COMMENT"],
  SUPPORT: ["VIEW","COMMENT"],
  AUDITOR: ["VIEW"]
};

export function can(role: Role, ability: Ability) {
  return ROLE_ABILITIES[role]?.includes(ability) ?? false;
}

// Re-export Role for middleware compatibility
export type { Role as default };

