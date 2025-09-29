import { Schema, Query, Document, Model } from 'mongoose';

// Context interface for tenant isolation
export interface TenantContext {
  orgId?: string;
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

// Plugin function
export function tenantIsolationPlugin(schema: Schema, options: { excludeModels?: string[] } = {}) {
  const excludeModels = options.excludeModels || ['Organization'];

  // Add orgId field to schema (if not already present)
  if (!schema.paths.orgId) {
    schema.add({
      orgId: { 
        type: String, 
        required: true, 
        index: true 
      }
    });
  }

  // Pre-save middleware to ensure orgId is set
  schema.pre('save', function(next) {
    if (this.isNew && !this.orgId) {
      const context = getTenantContext();
      if (context.orgId) {
        this.orgId = context.orgId;
      } else {
        const modelName = (this.constructor as any).modelName;
        if (modelName && !excludeModels.includes(modelName)) {
          return next(new Error(`orgId is required for ${modelName}`));
        }
      }
    }
    next();
  });

  // Pre-validate middleware to ensure orgId is set
  schema.pre('validate', function(next) {
    if (this.isNew && !this.orgId) {
      const context = getTenantContext();
      if (context.orgId) {
        this.orgId = context.orgId;
      }
    }
    next();
  });

  // Query middleware for find operations
  schema.pre(/^find/, function(this: Query<any, any>) {
    const context = getTenantContext();
    
    // Skip filtering when explicitly requested
    if (context.skipTenantFilter) {
      return;
    }

    // Apply orgId filter if context is available
    if (context.orgId) {
      this.where({ orgId: context.orgId });
    }
  });

  // Query middleware for count operations
  schema.pre(/^count/, function(this: Query<any, any>) {
    const context = getTenantContext();
    
    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ orgId: context.orgId });
    }
  });

  // Query middleware for distinct operations
  schema.pre('distinct', function(this: Query<any, any>) {
    const context = getTenantContext();
    
    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ orgId: context.orgId });
    }
  });

  // Update middleware
  schema.pre(/^update/, function(this: Query<any, any>) {
    const context = getTenantContext();
    
    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ orgId: context.orgId });
    }
  });

  // Delete middleware
  schema.pre(/^delete/, function(this: Query<any, any>) {
    const context = getTenantContext();
    
    if (context.skipTenantFilter) {
      return;
    }

    if (context.orgId) {
      this.where({ orgId: context.orgId });
    }
  });

  // Create compound indexes with orgId
  schema.index({ orgId: 1 });

  // Instance method to check if document belongs to current tenant
  schema.methods.belongsToCurrentTenant = function() {
    const context = getTenantContext();
    return context.orgId ? this.orgId === context.orgId : true;
  };
}

// Utility function to execute operations within tenant context
export async function withTenantContext<T>(
  orgId: string, 
  operation: () => Promise<T>
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
  operation: () => Promise<T>
): Promise<T> {
  const originalContext = getTenantContext();
  
  try {
    setTenantContext({ ...originalContext, skipTenantFilter: true });
    return await operation();
  } finally {
    setTenantContext(originalContext);
  }
}