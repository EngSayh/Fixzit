/**
 * Dynamic TopBar Types
 * Supports module-aware search, RBAC quick actions, and app switching
 */

export type ModuleId = 'fm' | 'fixzit-souq' | 'aqar-souq';
export type LangCode = 'ar' | 'en';
export type Dir = 'rtl' | 'ltr';
export type Role = 'admin' | 'manager' | 'technician' | 'tenant' | 'vendor';

export interface TenantContext {
  id: string;
  name: string;
  logo?: string;
}

export interface UserContext {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  permissions: string[];
}

export interface TopBarPrefs {
  lang: LangCode;
  dir: Dir;
  currency: string;
  megaMenuExpanded: boolean;
}

export interface SearchScopeConfig {
  label: { en: string; ar: string };
  entityTypes: string[];
  apiPath: string;
}

export interface NotificationFilter {
  unread?: boolean;
  type?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface QuickAction {
  id: string;
  labelKey: string;
  icon: string;
  path: string;
  requiredPermissions?: string[];
}
