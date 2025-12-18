/**
 * @fileoverview Custom ESLint rules for Fixzit codebase
 * @description Local rules to enforce tenant isolation, RBAC, and other domain invariants
 */

/**
 * Rule: require-tenant-scope
 * Detects MongoDB/Mongoose queries that may be missing tenant scope filters
 * 
 * Flags queries like:
 * - Model.find({}) without org_id or property_owner_id
 * - Model.findOne({ field: value }) missing tenant filter
 * - Model.updateMany({}) without tenant scope
 * 
 * Exceptions:
 * - Platform-wide models (Category, Brand, Job listings)
 * - Queries with explicit tenant fields in filter
 * - SuperAdmin contexts (when documented)
 * - Test files (uses different enforcement)
 */
export const requireTenantScope = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce tenant scope filters on database queries",
      category: "Security",
      recommended: true,
    },
    messages: {
      missingTenantScope: "Database query may be missing tenant scope filter (org_id or property_owner_id). Add tenant filter or document why it's platform-wide.",
    },
    schema: [],
  },

  create(context) {
    // Models that are intentionally platform-wide (no tenant scope)
    const PLATFORM_WIDE_MODELS = new Set([
      "Category",
      "Brand", 
      "Job",
      "HelpArticle",
      "KnowledgeBaseArticle",
      "Template",
      "GlobalSetting",
      "SystemAuditLog",
      "RateLimitBucket",
    ]);

    // Query methods that modify data and MUST be tenant-scoped
    const WRITE_METHODS = new Set([
      "create",
      "insertMany",
      "updateOne",
      "updateMany",
      "findOneAndUpdate",
      "findByIdAndUpdate",
      "deleteOne",
      "deleteMany",
      "findOneAndDelete",
      "findByIdAndDelete",
      "replaceOne",
    ]);

    // Read methods that should also be tenant-scoped
    const READ_METHODS = new Set([
      "find",
      "findOne",
      "findById",
      "count",
      "countDocuments",
      "estimatedDocumentCount",
      "aggregate",
    ]);

    const ALL_METHODS = new Set([...WRITE_METHODS, ...READ_METHODS]);

    return {
      // Detect Model.method(filter) patterns
      MemberExpression(node) {
        // Skip non-identifier properties (e.g., Model['find'])
        if (node.property.type !== "Identifier") return;

        const methodName = node.property.name;
        if (!ALL_METHODS.has(methodName)) return;

        // Get the model name (e.g., "WorkOrder" from WorkOrder.find)
        const objectName = node.object.name;
        if (!objectName) return;

        // Skip platform-wide models
        if (PLATFORM_WIDE_MODELS.has(objectName)) return;

        // Get the parent call expression
        const parent = node.parent;
        if (parent.type !== "CallExpression" || parent.callee !== node) return;

        // Get the first argument (filter object)
        const filterArg = parent.arguments[0];
        if (!filterArg) {
          // No filter provided - definitely missing tenant scope
          context.report({
            node,
            messageId: "missingTenantScope",
          });
          return;
        }

        // Check if filter is an object literal
        if (filterArg.type !== "ObjectExpression") {
          // Filter is a variable - can't statically analyze, skip
          return;
        }

        // Check if any property in the filter is org_id or property_owner_id
        const hasTenantScope = filterArg.properties.some((prop) => {
          if (prop.type !== "Property") return false;
          if (prop.key.type !== "Identifier") return false;
          const keyName = prop.key.name;
          return keyName === "org_id" || keyName === "property_owner_id" || keyName === "orgId" || keyName === "propertyOwnerId";
        });

        if (!hasTenantScope) {
          // Check if there's a comment indicating this is intentional
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getCommentsBefore(node);
          const hasExemptComment = comments.some((comment) => 
            comment.value.includes("PLATFORM-WIDE") || 
            comment.value.includes("SUPER_ADMIN") ||
            comment.value.includes("NO_TENANT_SCOPE")
          );

          if (!hasExemptComment) {
            context.report({
              node,
              messageId: "missingTenantScope",
            });
          }
        }
      },
    };
  },
};

export default {
  rules: {
    "require-tenant-scope": requireTenantScope,
  },
};
