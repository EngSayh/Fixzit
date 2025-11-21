/**
 * Work Order Ability Constants
 * 
 * Used with requireAbility() middleware for RBAC enforcement
 * These match the uppercase string literals expected by lib/auth-middleware.ts
 */

export const WOAbility = {
  /** View/read work orders */
  READ: 'READ',
  /** Create new work orders */
  CREATE: 'CREATE',
  /** Edit/update work orders */
  EDIT: 'EDIT',
  /** Update work order fields */
  UPDATE: 'UPDATE',
  /** Delete work orders */
  DELETE: 'DELETE',
  /** Assign work orders to users/vendors */
  ASSIGN: 'ASSIGN',
  /** Export work order data */
  EXPORT: 'EXPORT',
} as const;

export type WOAbilityType = typeof WOAbility[keyof typeof WOAbility];
