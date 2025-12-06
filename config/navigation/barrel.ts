// Central navigation barrel to standardize imports across the app.
// Exposes the shared Work Orders module identifier and commonly used navigation constructs.

export { WORK_ORDERS_MODULE_ID } from "./constants";

export {
  MODULE_PATHS,
  MODULES,
  MODULE_SUB_VIEWS,
  SUBSCRIPTION_PLANS,
  ROLE_PERMISSIONS,
} from "./index";
export type {
  ModuleId,
  ModuleCategory,
  NavigationItem,
  NavigationSection,
  NavigationConfig,
} from "./index";

export { APPS, DEFAULT_SCOPE } from "./topbar";
export type { AppKey, SearchEntity, ModuleScope, SidebarModuleKey } from "./topbar";

export { SIDEBAR_ITEMS } from "./sidebar";
