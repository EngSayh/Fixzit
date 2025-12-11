/**
 * @description Manages Chart of Accounts with hierarchical structure.
 * GET lists accounts with parent-child relationships.
 * POST creates new accounts (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE).
 * @route GET /api/finance/accounts
 * @route POST /api/finance/accounts
 * @access Private - Users with FINANCE:VIEW/CREATE permission
 * @param {Object} body - accountCode, accountName, accountType, normalBalance, parentId
 * @returns {Object} accounts: array with hierarchy
 * @throws {401} If not authenticated
 * @throws {403} If lacking FINANCE permission
 * @throws {400} If account code already exists
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { dbConnect } from "@/lib/mongodb-unified";
import ChartAccount from "@/server/models/finance/ChartAccount";
import { runWithContext } from "@/server/lib/authContext";
import { requirePermission } from "@/config/rbac.config";
import { Types } from "mongoose";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { forbiddenError, handleApiError, isForbidden, unauthorizedError } from "@/server/utils/errorResponses";
// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateAccountSchema = z.object({
  accountCode: z.string().min(1, "Account code is required").max(20),
  accountName: z.string().min(1, "Account name is required").max(200),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  parentId: z
    .string()
    .refine((val) => !val || Types.ObjectId.isValid(val), "Invalid parent ID")
    .optional(),
  description: z.string().optional(),
  taxable: z.boolean().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// HELPER: Get User Session
// ============================================================================

async function getUserSession(_req: NextRequest) {
  const user = await getSessionUser(_req);

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
  };
}

// ============================================================================
// GET /api/finance/accounts - List accounts with hierarchy
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.accounts.read");

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const accountType = searchParams.get("accountType");
        const parentId = searchParams.get("parentId");
        const includeInactive = searchParams.get("includeInactive") === "true";
        const flat = searchParams.get("flat") === "true"; // If true, return flat list instead of hierarchy

        // Build query
        const query: Record<string, unknown> = {
          orgId: new Types.ObjectId(user.orgId),
        };

        if (accountType) {
          query.accountType = accountType;
        }

        if (parentId) {
          if (parentId === "null") {
            query.parentId = null;
          } else if (Types.ObjectId.isValid(parentId)) {
            query.parentId = new Types.ObjectId(parentId);
          }
        }

        if (!includeInactive) {
          query.isActive = true;
        }

        // Get accounts
        if (flat) {
          // Return flat list
          const accounts = await ChartAccount.find(query)
            .sort({ accountCode: 1 })
            .lean();

          return NextResponse.json({
            success: true,
            data: accounts,
          });
        } else {
          // Return hierarchical structure
          const allAccounts = await ChartAccount.find(query)
            .sort({ accountCode: 1 })
            .lean();

          // Build actual hierarchy tree
          const hierarchy = buildAccountTree(allAccounts);

          // Filter by account type if specified
          let filteredHierarchy = hierarchy;
          if (accountType) {
            filteredHierarchy = filterTreeByAccountType(hierarchy, accountType);
          }

          return NextResponse.json({
            success: true,
            data: filteredHierarchy,
          });
        }
      },
    );
  } catch (error) {
    logger.error("GET /api/finance/accounts error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to accounts");
    }

    return handleApiError(error);
  }
}

// ============================================================================
// HELPER: Build Account Tree
// ============================================================================

interface IAccountNode {
  id: Types.ObjectId;
  accountCode: string;
  accountName: string;
  accountType: string;
  normalBalance: string;
  parentId?: Types.ObjectId | null;
  description?: string;
  isActive: boolean;
  currentBalance: number;
  children?: IAccountNode[];
  [key: string]: unknown;
}

function buildAccountTree(accounts: unknown[]): IAccountNode[] {
  const typedAccounts = accounts as IAccountNode[];
  const accountMap = new Map<string, IAccountNode>();
  const roots: IAccountNode[] = [];

  // First pass: create map with children arrays
  typedAccounts.forEach((account) => {
    accountMap.set(account.id.toString(), { ...account, children: [] });
  });

  // Second pass: build tree
  typedAccounts.forEach((account) => {
    const node = accountMap.get(account.id.toString());
    if (!node) return;

    if (account.parentId) {
      const parent = accountMap.get(account.parentId.toString());
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Remove empty children arrays for cleaner output
  const cleanTree = (nodes: IAccountNode[]): IAccountNode[] => {
    return nodes.map((node) => {
      const cleaned = { ...node };
      if (cleaned.children && cleaned.children.length === 0) {
        delete cleaned.children;
      } else if (cleaned.children) {
        cleaned.children = cleanTree(cleaned.children);
      }
      return cleaned;
    });
  };

  return cleanTree(roots);
}

function filterTreeByAccountType(
  tree: IAccountNode[],
  accountType: string,
): IAccountNode[] {
  return tree
    .filter((node) => node.accountType === accountType)
    .map((node) => ({
      ...node,
      children: node.children
        ? filterTreeByAccountType(node.children, accountType)
        : undefined,
    }));
}

// ============================================================================
// POST /api/finance/accounts - Create new account
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // Auth check
    const user = await getUserSession(req);
    if (!user) {
      return unauthorizedError();
    }

    // Authorization check
    requirePermission(user.role, "finance.accounts.create");

    // Parse and validate request body
    const body = await req.json();
    const validated = CreateAccountSchema.parse(body);

    // Execute with proper context
    return await runWithContext(
      {
        userId: user.userId,
        orgId: user.orgId,
        role: user.role,
        timestamp: new Date(),
      },
      async () => {
        // Check if account code already exists
        const existingAccount = await ChartAccount.findOne({
          orgId: new Types.ObjectId(user.orgId),
          accountCode: validated.accountCode,
        });

        if (existingAccount) {
          return NextResponse.json(
            {
              error: `Account code ${validated.accountCode} already exists`,
            },
            { status: 400 },
          );
        }

        // Validate parent account if provided
        if (validated.parentId) {
          const parent = await ChartAccount.findOne({
            _id: new Types.ObjectId(validated.parentId),
            orgId: new Types.ObjectId(user.orgId),
          });

          if (!parent) {
            return NextResponse.json(
              {
                error: "Parent account not found",
              },
              { status: 400 },
            );
          }

          // Validate account type matches parent
          if (parent.accountType !== validated.accountType) {
            return NextResponse.json(
              {
                error: `Child account type (${validated.accountType}) must match parent account type (${parent.accountType})`,
              },
              { status: 400 },
            );
          }
        }

        // Create new account
        const account = await ChartAccount.create({
          orgId: new Types.ObjectId(user.orgId),
          accountCode: validated.accountCode,
          accountName: validated.accountName,
          accountType: validated.accountType,
          normalBalance: validated.normalBalance,
          parentId: validated.parentId
            ? new Types.ObjectId(validated.parentId)
            : undefined,
          description: validated.description,
          taxable: validated.taxable ?? false,
          taxRate: validated.taxRate,
          isActive: validated.isActive ?? true,
          currentBalance: 0,
          year: new Date().getFullYear(),
          period: new Date().getMonth() + 1,
        });

        return NextResponse.json(
          {
            success: true,
            data: account,
          },
          { status: 201 },
        );
      },
    );
  } catch (error) {
    logger.error("POST /api/finance/accounts error:", error);

    if (isForbidden(error)) {
      return forbiddenError("Access denied to create account");
    }

    return handleApiError(error);
  }
}
