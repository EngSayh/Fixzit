/**
 * Combined tenant isolation + audit trail plugin
 * Consolidates tenantIsolation and auditPlugin functionality
 * Now uses AsyncLocalStorage from authContext for thread safety
 */

import { logger } from '@/lib/logger';
import { Schema } from 'mongoose';
import { getRequestContext } from '../../lib/authContext';

export interface TenantAuditFields {
  orgId: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean; // System-generated records (e.g., reversals)
}

// System context flag (thread-local storage would be ideal, using simple flag for now)
let isSystemContext: boolean = false;

/**
 * Set tenant context (DEPRECATED - use runWithContext from authContext)
 * @deprecated Context should be set via authContext.runWithContext()
 */
 
export function setTenantContext(_context: { orgId: string }): void {
  logger.warn('setTenantContext is deprecated. Use authContext.runWithContext() instead.');
}

/**
 * Set audit context (DEPRECATED - use runWithContext from authContext)
 * @deprecated Context should be set via authContext.runWithContext()
 */
 
export function setAuditContext(_context: { userId: string; userEmail?: string }): void {
  logger.warn('setAuditContext is deprecated. Use authContext.runWithContext() instead.');
}

/**
 * Set system context for automated operations
 */
export function setSystemContext(isSystem: boolean): void {
  isSystemContext = isSystem;
}

/**
 * Get tenant context (DEPRECATED - use getRequestContext from authContext)
 * @deprecated Use authContext.getRequestContext() instead
 */
export function getTenantContext(): { orgId: string | null } {
  const context = getRequestContext();
  return { orgId: context?.orgId ?? null };
}

/**
 * Clear context (NO-OP with AsyncLocalStorage)
 * @deprecated No longer needed with AsyncLocalStorage
 */
export function clearContext(): void {
  isSystemContext = false;
}

/**
 * Combined plugin that adds tenant + audit fields and hooks
 */
export function tenantAuditPlugin(schema: Schema): void {
  // Add fields
  // ⚡ FIXED: Removed index: true from orgId to avoid duplicate index warnings
  // Individual schemas should define their own compound indexes with orgId
  schema.add({
    orgId: { type: String, required: true },
    createdBy: { type: String },
    updatedBy: { type: String },
    isSystem: { type: Boolean, default: false },
  });

  // Auto-set orgId from context on save
  schema.pre('save', function (next) {
    const context = getRequestContext();
    
    if (this.isNew) {
      if (!this.orgId && context?.orgId) {
        this.orgId = context.orgId;
      }
      if (!this.createdBy && context?.userId) {
        this.createdBy = context.userId;
      }
      if (isSystemContext) {
        this.isSystem = true;
      }
    } else {
      if (context?.userId) {
        this.updatedBy = context.userId;
      }
    }
    next();
  });

  // Enforce tenant isolation on queries
  schema.pre(/^find/, function (next) {
    const context = getRequestContext();
    const query = this.getQuery() as Record<string, unknown>;
    if (context?.orgId && !query.orgId) {
      this.where({ orgId: context.orgId });
    }
    next();
  });

  // Enforce tenant isolation on updates
  schema.pre(/^update/, function (next) {
    const context = getRequestContext();
    const query = this.getQuery() as Record<string, unknown>;
    if (context?.orgId && !query.orgId) {
      this.where({ orgId: context.orgId });
    }
    if (context?.userId) {
      const update = this.getUpdate() as { $set?: Record<string, unknown> };
      if (!update.$set) {
        (this as any).set({ updatedBy: context.userId });
      } else {
        update.$set.updatedBy = context.userId;
      }
    }
    next();
  });
}

export default tenantAuditPlugin;
