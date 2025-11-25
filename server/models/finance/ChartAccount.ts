/**
 * ChartAccount Model
 *
 * Defines the Chart of Accounts (COA) structure for double-entry bookkeeping.
 * Tailored for Saudi Arabian FM/Aqar marketplace with VAT compliance.
 *
 * Account Types:
 * - ASSET: Cash, AR, inventory, prepaid, fixed assets
 * - LIABILITY: AP, accrued expenses, deposits, loans
 * - EQUITY: Owner capital, retained earnings
 * - REVENUE: Rent income, service fees, commissions
 * - EXPENSE: Maintenance, utilities, salaries, depreciation
 *
 * Features:
 * - Multi-tenant isolation (orgId)
 * - Hierarchical structure (parent/child accounts)
 * - Active/inactive control
 * - Opening balance support
 * - Audit trail
 */

import { Schema, model, models, Types } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import { ensureMongoConnection } from "@/server/lib/db";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

ensureMongoConnection();

type LocalizedName = { en?: string; ar?: string };

export interface IChartAccount {
  _id: Types.ObjectId;
  orgId: Types.ObjectId; // Added by tenantIsolationPlugin
  accountCode: string; // e.g., "1100", "4200", "6300"
  accountName: string; // e.g., "Cash - Operating Account"
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  // Add aliases for common property names
  code: string; // Alias for accountCode
  name?: string | LocalizedName; // Alias for accountName
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"; // Alias for accountType
  parentId?: Types.ObjectId; // For hierarchical COA (e.g., 1100 under 1000)
  description?: string;
  isActive: boolean;
  isSystemAccount: boolean; // Cannot be deleted if true (e.g., Cash, AR, AP)
  normalBalance: "DEBIT" | "CREDIT"; // Natural balance side
  balance: number; // Current balance (calculated from ledger)
  openingBalance?: number; // Opening balance for fiscal year
  currency: string;
  taxable?: boolean; // Subject to VAT
  vatRate?: number; // Default VAT rate (e.g., 15 for Saudi Arabia)
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChartAccountSchema = new Schema<IChartAccount>(
  {
    // orgId will be added by tenantIsolationPlugin
    accountCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[0-9]{4,6}$/, // e.g., "1100", "420001"
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^[0-9]{4,6}$/,
    },
    accountName: { type: String, required: true, trim: true },
    name: {
      en: { type: String, trim: true },
      ar: { type: String, trim: true },
    },
    accountType: {
      type: String,
      required: true,
      enum: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
      index: true,
    },
    parentId: { type: Schema.Types.ObjectId, ref: "ChartAccount" },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true, alias: "active" },
    isSystemAccount: { type: Boolean, default: false },
    normalBalance: {
      type: String,
      required: true,
      enum: ["DEBIT", "CREDIT"],
    },
    balance: { type: Number, default: 0 },
    openingBalance: { type: Number },
    currency: { type: String, default: "SAR" },
    taxable: { type: Boolean, default: false },
    vatRate: { type: Number, default: 0 }, // 0-100 percentage
  },
  { timestamps: true },
);

ChartAccountSchema.pre("validate", function (next) {
  if (!this.code && this.accountCode) {
    this.code = this.accountCode;
  }
  if (!this.accountCode && this.code) {
    this.accountCode = this.code;
  }

  const normalizeName = (): LocalizedName => {
    if (!this.name) return {};
    if (typeof this.name === "string") {
      return { en: this.name };
    }
    return this.name;
  };

  const name = normalizeName();

  if (!this.accountName && name.en) {
    this.accountName = name.en;
  }

  if (!name.en && this.accountName) {
    name.en = this.accountName;
  }

  this.name = name;

  next();
});

// Apply plugins BEFORE indexes
ChartAccountSchema.plugin(tenantIsolationPlugin);
ChartAccountSchema.plugin(auditPlugin);

// All indexes MUST be tenant-scoped
ChartAccountSchema.index({ orgId: 1, accountCode: 1 }, { unique: true }); // Unique per org
ChartAccountSchema.index({ orgId: 1, code: 1 }, { unique: true, sparse: true });
ChartAccountSchema.index({ orgId: 1, accountType: 1, isActive: 1 });
ChartAccountSchema.index({ orgId: 1, parentId: 1 });
ChartAccountSchema.index({ orgId: 1, accountName: "text" }); // For search

// Virtual: Is parent account
ChartAccountSchema.virtual("isParent").get(function (this: IChartAccount) {
  return !this.parentId;
});

ChartAccountSchema.virtual("type").get(function (this: IChartAccount) {
  return this.accountType;
});

// Method: Get full account path (e.g., "1000 › 1100 › 1110")
ChartAccountSchema.methods.getAccountPath = async function (): Promise<string> {
  const path: string[] = [this.accountCode];
  type AccountDoc = { accountCode: string; parentId?: unknown };
  let current = this as unknown as AccountDoc;

  while (current.parentId) {
    const parent = (await model("ChartAccount").findById(
      current.parentId,
    )) as AccountDoc | null;
    if (!parent) break;
    path.unshift(parent.accountCode);
    current = parent;
  }

  return path.join(" › ");
};

// Static: Get account hierarchy tree
ChartAccountSchema.statics.getHierarchy = async function (
  orgId: Types.ObjectId,
) {
  const accounts = await this.find({ orgId, isActive: true }).sort({
    accountCode: 1,
  });

  interface AccountTreeNode {
    _id: Types.ObjectId;
    accountCode: string;
    accountName: string;
    accountType: string;
    parentId?: Types.ObjectId;
    children: AccountTreeNode[];
    [key: string]: unknown;
  }

  const tree: AccountTreeNode[] = [];
  const map: Map<string, AccountTreeNode> = new Map();

  interface ChartAccountDoc extends IChartAccount {
    _id: Types.ObjectId;
    toObject: () => Record<string, unknown>;
  }

  // First pass: Create map
  accounts.forEach((acc: ChartAccountDoc) => {
    const node = {
      ...acc.toObject(),
      children: [],
    } as unknown as AccountTreeNode;
    map.set(acc._id.toString(), node);
  });

  // Second pass: Build tree
  accounts.forEach((acc: ChartAccountDoc) => {
    const node = map.get(acc._id.toString());
    if (acc.parentId) {
      const parent = map.get(acc.parentId.toString());
      if (parent && node) {
        parent.children.push(node);
      } else if (node) {
        tree.push(node); // Orphan account (parent deleted)
      }
    } else if (node) {
      tree.push(node); // Root account
    }
  });

  return tree;
};

// Pre-save validation: Normal balance must match account type
ChartAccountSchema.pre("save", function (next) {
  const expectedBalance: Record<string, "DEBIT" | "CREDIT"> = {
    ASSET: "DEBIT",
    EXPENSE: "DEBIT",
    LIABILITY: "CREDIT",
    EQUITY: "CREDIT",
    REVENUE: "CREDIT",
  };

  if (this.isNew && this.normalBalance !== expectedBalance[this.accountType]) {
    return next(
      new Error(
        `Account type ${this.accountType} must have normal balance ${expectedBalance[this.accountType]}`,
      ),
    );
  }

  next();
});

// Pre-remove validation: Cannot delete system accounts or accounts with children
ChartAccountSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    if (this.isSystemAccount) {
      return next(new Error("Cannot delete system account"));
    }

    const childCount = await model("ChartAccount").countDocuments({
      orgId: this.orgId,
      parentId: this._id,
    });

    if (childCount > 0) {
      return next(new Error("Cannot delete account with child accounts"));
    }

    next();
  },
);

const ChartAccountModel = getModel<IChartAccount>(
  "ChartAccount",
  ChartAccountSchema,
);

export default ChartAccountModel;
