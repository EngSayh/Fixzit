export type Role =
  | "super_admin" | "corporate_admin" | "property_manager" | "operations_dispatcher"
  | "supervisor" | "technician_internal" | "vendor_admin" | "vendor_technician"
  | "tenant_resident" | "owner_landlord" | "finance_manager" | "hr_manager"
  | "helpdesk_agent" | "auditor_compliance";

export type Ability =
  | "VIEW" | "CREATE" | "EDIT" | "ASSIGN" | "STATUS" | "VERIFY" | "CLOSE" | "DELETE" | "EXPORT" | "COMMENT";

const ROLE_ABILITIES: Record<Role, Ability[]> = {
  super_admin:           ["VIEW","CREATE","EDIT","ASSIGN","STATUS","VERIFY","CLOSE","DELETE","EXPORT","COMMENT"],
  corporate_admin:       ["VIEW","CREATE","EDIT","ASSIGN","STATUS","VERIFY","CLOSE","DELETE","EXPORT","COMMENT"],
  property_manager:      ["VIEW","CREATE","EDIT","ASSIGN","STATUS","VERIFY","CLOSE","EXPORT","COMMENT"],
  operations_dispatcher: ["VIEW","CREATE","EDIT","ASSIGN","STATUS","COMMENT"],
  supervisor:            ["VIEW","EDIT","ASSIGN","STATUS","VERIFY","COMMENT"],
  technician_internal:   ["VIEW","STATUS","COMMENT"],
  vendor_admin:          ["VIEW","ASSIGN","STATUS","EXPORT","COMMENT"],
  vendor_technician:     ["VIEW","STATUS","COMMENT"],
  tenant_resident:       ["VIEW","CREATE","COMMENT"],
  owner_landlord:        ["VIEW","COMMENT","EXPORT"],
  finance_manager:       ["VIEW","EXPORT","COMMENT"],
  hr_manager:            ["VIEW","COMMENT"],
  helpdesk_agent:        ["VIEW","COMMENT"],
  auditor_compliance:    ["VIEW","EXPORT"]
};

export function can(role: Role, ability: Ability) {
  return ROLE_ABILITIES[role]?.includes(ability) ?? false;
}
