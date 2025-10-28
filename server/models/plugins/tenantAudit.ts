/**
 * Combined tenant isolation + audit trail plugin
 * Consolidates tenantIsolation and auditPlugin functionality
 */

import { Schema } from 'mongoose';

export interface TenantAuditFields {
  orgId: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  isSystem?: boolean; // System-generated records (e.g., reversals)
}

// Thread-local storage for tenant context (simplified for now)
let currentOrgId: string | null = null;
let currentUserId: string | null = null;
let isSystemContext: boolean = false;

export function setTenantContext(context: { orgId: string }): void {
  currentOrgId = context.orgId;
}

export function setAuditContext(context: { userId: string; userEmail?: string }): void {
  currentUserId = context.userId;
}

export function setSystemContext(isSystem: boolean): void {
  isSystemContext = isSystem;
}

export function getTenantContext(): { orgId: string | null } {
  return { orgId: currentOrgId };
}

export function clearContext(): void {
  currentOrgId = null;
  currentUserId = null;
  isSystemContext = false;
}

/**
 * Combined plugin that adds tenant + audit fields and hooks
 */
export function tenantAuditPlugin(schema: Schema): void {
  // Add fields
  schema.add({
    orgId: { type: String, required: true, index: true },
    createdBy: { type: String },
    updatedBy: { type: String },
    isSystem: { type: Boolean, default: false },
  });

  // Auto-set orgId from context on save
  schema.pre('save', function (next) {
    if (this.isNew) {
      if (!this.orgId && currentOrgId) {
        this.orgId = currentOrgId;
      }
      if (!this.createdBy && currentUserId) {
        this.createdBy = currentUserId;
      }
      if (isSystemContext) {
        this.isSystem = true;
      }
    } else {
      if (currentUserId) {
        this.updatedBy = currentUserId;
      }
    }
    next();
  });

  // Enforce tenant isolation on queries
  schema.pre(/^find/, function (next) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hookThis = this as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = hookThis.getQuery() as Record<string, any>;
    if (currentOrgId && !query.orgId) {
      hookThis.where({ orgId: currentOrgId });
    }
    next();
  });

  // Enforce tenant isolation on updates
  schema.pre(/^update/, function (next) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hookThis = this as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = hookThis.getQuery() as Record<string, any>;
    if (currentOrgId && !query.orgId) {
      hookThis.where({ orgId: currentOrgId });
    }
    if (currentUserId) {
      hookThis.set({ updatedBy: currentUserId });
    }
    next();
  });
}

export default tenantAuditPlugin;
