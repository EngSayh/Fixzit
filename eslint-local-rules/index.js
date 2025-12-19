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
      "ComplianceAudit",
      "BacklogIssue",
      "PriceBook",
      "DiscountRule",
      "NotificationLogModel",
      "VerificationLog",
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

    const TENANT_KEYS = new Set([
      "org_id",
      "orgId",
      "tenant_id",
      "tenantId",
      "property_owner_id",
      "propertyOwnerId",
      "owner_user_id",
      "ownerUserId",
      "userId",
      "user_id",
      "_id",
    ]);

    const isTenantKey = (keyNode) => {
      if (keyNode.type === "Identifier") {
        return TENANT_KEYS.has(keyNode.name);
      }
      if (keyNode.type === "Literal" && typeof keyNode.value === "string") {
        return TENANT_KEYS.has(keyNode.value);
      }
      return false;
    };

    const objectHasTenantScope = (objectExpression) => {
      // Direct tenant key on the same level
      for (const prop of objectExpression.properties) {
        if (prop.type === "Property" && isTenantKey(prop.key)) {
          return true;
        }
      }

      // Support $or/$and with scoped branches (avoid false positives on OR queries)
      for (const prop of objectExpression.properties) {
        if (prop.type !== "Property") continue;

        const keyName =
          prop.key.type === "Identifier"
            ? prop.key.name
            : typeof prop.key.value === "string"
              ? prop.key.value
              : undefined;

        if (!keyName || (keyName !== "$or" && keyName !== "$and")) continue;
        if (prop.value.type !== "ArrayExpression") continue;

        const branchObjects = prop.value.elements.filter(
          (element) => element && element.type === "ObjectExpression",
        );

        if (!branchObjects.length) continue;

        if (
          (keyName === "$or" && branchObjects.every(objectHasTenantScope)) ||
          (keyName === "$and" && branchObjects.some(objectHasTenantScope))
        ) {
          return true;
        }
      }

      return false;
    };

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

        // Helper to check for exempt comments
        const sourceCode = context.getSourceCode();
        const exemptKeywords = ["PLATFORM-WIDE", "SUPER_ADMIN", "NO_TENANT_SCOPE", "TENANT_SCOPED"];
        const hasKeyword = (comment) =>
          exemptKeywords.some(kw => comment.value.includes(kw));

        const hasExemptComment = (target) => {
          // Check comments before the node
          const commentsBefore = sourceCode.getCommentsBefore(target);
          if (commentsBefore.some(hasKeyword)) return true;

          // Check comments after the node (inline comments like /* NO_TENANT_SCOPE */)
          const commentsAfter = sourceCode.getCommentsAfter(target);
          if (commentsAfter.some(hasKeyword)) return true;

          // Check if any comment in the node's range or nearby contains exempt keyword
          // This handles cases like:
          //   Model  // or:  await model
          //     // NO_TENANT_SCOPE: reason
          //     .findOne({ ... })
          const startLine = target.loc.start.line;
          const endLine = target.parent?.loc?.end?.line ?? target.loc.end.line;
          const allComments = sourceCode.getAllComments();
          for (const comment of allComments) {
            // Check comments from one line before to the end of the call expression
            if (comment.loc.start.line >= startLine - 1 && comment.loc.start.line <= endLine) {
              if (hasKeyword(comment)) return true;
            }
          }

          // Also check parent nodes so statement-level comments are honored.
          let current = target.parent;
          while (current) {
            const parentCommentsBefore = sourceCode.getCommentsBefore(current);
            if (parentCommentsBefore.some(hasKeyword)) return true;
            // Also check inline comments in parent expressions
            const parentCommentsAfter = sourceCode.getCommentsAfter(current);
            if (parentCommentsAfter.some(hasKeyword)) return true;
            // Check if this is a statement-level node - check its comments before breaking
            if (
              current.type === "ExpressionStatement" ||
              current.type === "VariableDeclaration" ||
              current.type === "ReturnStatement"
            ) {
              // Check comments on the statement itself before breaking
              const stmtComments = sourceCode.getCommentsBefore(current);
              if (stmtComments.some(hasKeyword)) return true;
              break;
            }
            if (current.type === "BlockStatement") {
              break;
            }
            current = current.parent;
          }
          return false;
        };

        // Get the first argument (filter object)
        const filterArg = parent.arguments[0];
        if (!filterArg) {
          // No filter provided - check for exempt comments before flagging
          // This handles instance methods like doc.deleteOne() with NO_TENANT_SCOPE comment
          if (!hasExemptComment(node)) {
            context.report({
              node,
              messageId: "missingTenantScope",
            });
          }
          return;
        }

        // Check if filter is an object literal
        if (filterArg.type !== "ObjectExpression") {
          // Filter is a variable - can't statically analyze, skip
          return;
        }

        // Check if filter includes tenant scope (direct or in scoped logical operators)
        const hasTenantScope = objectHasTenantScope(filterArg);

        if (!hasTenantScope) {
          if (!hasExemptComment(node)) {
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

/**
 * Rule: require-lean
 * Warns when read-only Mongoose queries omit .lean()
 */
export const requireLean = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Suggest .lean() on read-only Mongoose queries",
      category: "Performance",
      recommended: false,
    },
    messages: {
      missingLean:
        "Read-only query should call .lean() to avoid hydration overhead. Add .lean() or document why documents are required (// NO_LEAN).",
    },
    schema: [],
  },

  create(context) {
    const READ_METHODS = new Set([
      "find",
      "findOne",
      "findById",
      "findMany",
    ]);

    const sourceCode = context.getSourceCode();

    const hasNoLeanComment = (node) => {
      // Check immediate node comments
      const comments = [
        ...sourceCode.getCommentsBefore(node),
        ...sourceCode.getCommentsAfter(node),
      ];
      if (comments.some((comment) => comment.value.includes("NO_LEAN"))) {
        return true;
      }
      
      // Also check parent nodes (AwaitExpression, VariableDeclaration, ExpressionStatement, ReturnStatement)
      // because comments like "// NO_LEAN" are typically placed before the statement, not the inner call
      let current = node.parent;
      while (current) {
        const parentComments = [
          ...sourceCode.getCommentsBefore(current),
        ];
        if (parentComments.some((comment) => comment.value.includes("NO_LEAN"))) {
          return true;
        }
        // Stop at statement level
        if (current.type === "ExpressionStatement" || 
            current.type === "VariableDeclaration" ||
            current.type === "ReturnStatement" ||
            current.type === "BlockStatement") {
          break;
        }
        current = current.parent;
      }
      return false;
    };

    const hasLeanInChain = (callExpression) => {
      let current = callExpression;
      let parent = current.parent;

      while (parent) {
        if (
          parent.type === "MemberExpression" &&
          parent.property.type === "Identifier" &&
          parent.property.name === "lean"
        ) {
          const leanCall = parent.parent;
          if (
            leanCall &&
            leanCall.type === "CallExpression" &&
            leanCall.callee === parent
          ) {
            return true;
          }
        }

        if (
          parent.type === "CallExpression" &&
          parent.callee &&
          parent.callee.type === "MemberExpression"
        ) {
          current = parent;
          parent = parent.parent;
          continue;
        }

        if (parent.type === "MemberExpression") {
          parent = parent.parent;
          continue;
        }

        break;
      }

      return false;
    };

    return {
      CallExpression(node) {
        if (!node.callee || node.callee.type !== "MemberExpression") return;
        if (node.callee.property.type !== "Identifier") return;

        const methodName = node.callee.property.name;
        if (!READ_METHODS.has(methodName)) return;

        const objectName = node.callee.object?.name;
        if (!objectName) return;
        
        // Skip non-Mongoose patterns (lowercase object names like collection.findOne are MongoDB native driver)
        // Mongoose models are always PascalCase (e.g., User, WorkOrder, Invoice)
        if (objectName[0] !== objectName[0].toUpperCase()) return;

        const parent = node.parent;
        const isAwaited =
          parent && parent.type === "AwaitExpression" && parent.argument === node;
        const isReturned = parent && parent.type === "ReturnStatement";

        if (!isAwaited && !isReturned) return;

        if (hasNoLeanComment(node) || hasLeanInChain(node)) return;

        context.report({
          node,
          messageId: "missingLean",
        });
      },
    };
  },
};

export default {
  rules: {
    "require-tenant-scope": requireTenantScope,
    "require-lean": requireLean,
  },
};
