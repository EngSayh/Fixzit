export type ATSRole = string;
export type ATSPermission = string;
export const hasAnyPermission = () => true;
export const hasPermission = () => true;
export const mapUserRoleToATSRole = (role: string) => role as ATSRole;
