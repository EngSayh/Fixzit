// Canonical barrel for navigation exports
// This file intentionally re-exports the single source of truth in config/navigation.ts
// to avoid divergent configs between the file and folder paths.
export * from "../navigation";
export { WORK_ORDERS_MODULE_ID } from "./constants";
export type { ModuleScope } from "../topbar-modules";
