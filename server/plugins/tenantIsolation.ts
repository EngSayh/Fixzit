import { Schema, Query, Types } from "mongoose";
import { AsyncLocalStorage } from "async_hooks";
import { logger } from "@/lib/logger";

// Context interface for tenant isolation
// STRICT v4.1: Enhanced with Super Admin cross-tenant support
export interface TenantContext {
  orgId?: string | Types.ObjectId;
  skipTenantFilter?: boolean;
  // PHASE-2 FIX: Super Admin tracking for audit trail
  isSuperAdmin?: boolean;
  userId?: string;
  assumedOrgId?: string; // Org assumed by Super Admin (for audit)
}

// Request-scoped tenant context (avoids process-global leakage across requests)
const tenantStorage = new AsyncLocalStorage<TenantContext>();
let currentTenantContext: TenantContext = {};

const getStoredContext = () => tenantStorage.getStore();

// Function to set tenant context
// PHASE-2 FIX: Enhanced with Super Admin audit trail
export function setTenantContext(context: TenantContext) {
  // AUDIT: Log Super Admin cross-tenant access
  if (context.isSuperAdmin && context.assumedOrgId && context.userId) {
    logger.info('superadmin_tenant_context', {
      action: 'set_tenant_context',
      userId: context.userId,
      assumedOrgId: context.assumedOrgId,
      skipTenantFilter: context.skipTenantFilter ?? false,
      timestamp: new Date().toISOString(),
    });
  }

  const merged = { ...getTenantContext(), ...context };
  tenantStorage.enterWith(merged);
  currentTenantContext = merged;
}

/**
 * PHASE-2 FIX: Set tenant context for Super Admin with mandatory audit
 * Super Admin can operate cross-tenant but MUST be logged
 */
export function setSuperAdminTenantContext(
  orgId: string,
  userId: string,
  options?: { skipTenantFilter?: boolean }
) {
  logger.info('superadmin_access', {
    action: 'assume_org',
    userId,
    assumedOrgId: orgId,
    skipTenantFilter: options?.skipTenantFilter ?? false,
    timestamp: new Date().toISOString(),
  });
  
  setTenantContext({
    orgId,
    isSuperAdmin: true,
    userId,
    assumedOrgId: orgId,
    skipTenantFilter: options?.skipTenantFilter ?? false,
  });
}

// Function to get current tenant context
export function getTenantContext(): TenantContext {
  return getStoredContext() ?? currentTenantContext;
}

// Function to clear tenant context
export function clearTenantContext() {
  currentTenantContext = {};
  tenantStorage.enterWith({});
}

interface TenantIsolationOptions {
  excludeModels?: string[];
  uniqueTenantFields?: string[];
}

// Plugin function
export function tenantIsolationPlugin(
  schema: Schema,
  options: TenantIsolationOptions = {},
) {
  const excludeModels = options.excludeModels || ["Organization"];
  const uniqueTenantFields = options.uniqueTenantFields ?? [];

  const orgFieldName = schema.path("orgId")
    ? "orgId"
    : schema.path("org_id")
      ? "org_id"
      : "orgId";

  if (!schema.path(orgFieldName)) {
    schema.add({
      [orgFieldName]: {
        type: Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
      },
    });
  }

  // Pre-save middleware to ensure orgId is set
  schema.pre("save", function (next) {
    if (this.isNew && !(this as Record<string, unknown>)[orgFieldName]) {
      const context = getTenantContext();
      if (context.orgId) {
        (this as Record<string, unknown>)[orgFieldName] = context.orgId;
      } else {
        const modelName = (this.constructor as { modelName?: string })
          .modelName;
        if (modelName && !excludeModels.includes(modelName)) {
          return next(new Error(`orgId is required for ${modelName}`));
        }
      }
    }
    next();
  });

  if (uniqueTenantFields.length > 0) {
    schema.pre("save", async function (next) {
      if (!this.isNew) {
        return next();
      }

      const docOrgId = (this as Record<string, unknown>)[orgFieldName];
      const context = getTenantContext();
      const tenantId = docOrgId ?? context.orgId;

      if (!tenantId) {
        return next();
      }

      try {
        const ModelCtor = this.constructor as unknown as {
          exists(
            filter: Record<string, unknown>,
          ): Promise<{ _id: unknown } | null>;
        };

        for (const field of uniqueTenantFields) {
          const value = (this as Record<string, unknown>)[field];
          if (value === undefined || value === null || value === "") {
            continue;
          }

          const existing = await ModelCtor.exists({
            [orgFieldName]: tenantId,
            [field]: value,
          });

          if (existing) {
            return next(
              Object.assign(
                new Error(
                  `E11000 duplicate key error: ${String(field)} already exists for this organization`,
                ),
                { code: 11000 },
              ),
            );
          }
        }

        next();
      } catch (error) {
        next(error as Error);
      }
    });
  }

  // Pre-validate middleware to ensure orgId is set
  schema.pre("validate", function (next) {
    if (this.isNew && !(this as Record<string, unknown>)[orgFieldName]) {
      const context = getTenantContext();
      if (context.orgId) {
        (this as Record<string, unknown>)[orgFieldName] = context.orgId;
      }
    }
    next();
  });

  schema.pre(/^find/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    // PHASE-2 FIX: Skip filtering only when explicitly requested AND Super Admin
    // Regular users cannot bypass tenant filter even with skipTenantFilter flag
    if (context.skipTenantFilter && context.isSuperAdmin) {
      logger.debug('tenant_filter_bypassed', {
        userId: context.userId,
        isSuperAdmin: true,
        assumedOrgId: context.assumedOrgId,
      });
      return;
    }

    // Apply orgId filter if context is available
    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre(/^count/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    // SECURITY FIX: Require Super Admin for skipTenantFilter bypass
    // Non-super admin users CANNOT bypass tenant isolation
    if (context.skipTenantFilter && context.isSuperAdmin) {
      logger.debug('tenant_count_filter_bypassed', {
        userId: context.userId,
        isSuperAdmin: true,
        assumedOrgId: context.assumedOrgId,
      });
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre("distinct", function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    // SECURITY FIX: Require Super Admin for skipTenantFilter bypass
    if (context.skipTenantFilter && context.isSuperAdmin) {
      logger.debug('tenant_distinct_filter_bypassed', {
        userId: context.userId,
        isSuperAdmin: true,
        assumedOrgId: context.assumedOrgId,
      });
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre(/^update/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    // SECURITY FIX: Require Super Admin for skipTenantFilter bypass
    if (context.skipTenantFilter && context.isSuperAdmin) {
      logger.debug('tenant_update_filter_bypassed', {
        userId: context.userId,
        isSuperAdmin: true,
        assumedOrgId: context.assumedOrgId,
      });
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre(/^delete/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    // SECURITY FIX: Require Super Admin for skipTenantFilter bypass
    if (context.skipTenantFilter && context.isSuperAdmin) {
      logger.debug('tenant_delete_filter_bypassed', {
        userId: context.userId,
        isSuperAdmin: true,
        assumedOrgId: context.assumedOrgId,
      });
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  // NOTE: Index is now added inline with the field definition above
  // No need for schema.index({ orgId: 1 }) here

  // Instance method to check if document belongs to current tenant
  schema.methods.belongsToCurrentTenant = function () {
    const context = getTenantContext();
    return context.orgId
      ? (this as Record<string, unknown>)[orgFieldName] === context.orgId
      : true;
  };
}

// Utility function to execute operations within tenant context
export async function withTenantContext<T>(
  orgId: string | Types.ObjectId,
  operation: () => Promise<T>,
): Promise<T> {
  const originalContext = getTenantContext();
  const nextContext = { ...originalContext, orgId };

  return tenantStorage.run(nextContext, async () => {
    currentTenantContext = nextContext;
    try {
      return await operation();
    } finally {
      currentTenantContext = originalContext;
    }
  });
}

// Utility function to execute operations without tenant filtering
export async function withoutTenantFilter<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const originalContext = getTenantContext();
  const nextContext = { ...originalContext, skipTenantFilter: true };

  return tenantStorage.run(nextContext, async () => {
    currentTenantContext = nextContext;
    try {
      return await operation();
    } finally {
      currentTenantContext = originalContext;
    }
  });
}
