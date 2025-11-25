import { Schema, Query, Types } from "mongoose";

// Context interface for tenant isolation
export interface TenantContext {
  orgId?: string | Types.ObjectId;
  skipTenantFilter?: boolean;
}

// Global context to store current tenant information
let currentTenantContext: TenantContext = {};

// Function to set tenant context
export function setTenantContext(context: TenantContext) {
  currentTenantContext = { ...context };
}

// Function to get current tenant context
export function getTenantContext(): TenantContext {
  return currentTenantContext;
}

// Function to clear tenant context
export function clearTenantContext() {
  currentTenantContext = {};
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

    // Skip filtering when explicitly requested
    if (context.skipTenantFilter) {
      return;
    }

    // Apply orgId filter if context is available
    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre(/^count/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre("distinct", function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre(/^update/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ [orgFieldName]: context.orgId });
    }
  });

  schema.pre(/^delete/, function (this: Query<unknown, unknown>) {
    const context = getTenantContext();

    if (context.skipTenantFilter) {
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

  try {
    setTenantContext({ ...originalContext, orgId });
    return await operation();
  } finally {
    setTenantContext(originalContext);
  }
}

// Utility function to execute operations without tenant filtering
export async function withoutTenantFilter<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const originalContext = getTenantContext();

  try {
    setTenantContext({ ...originalContext, skipTenantFilter: true });
    return await operation();
  } finally {
    setTenantContext(originalContext);
  }
}
