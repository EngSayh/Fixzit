/**
 * Saudi Arabia Chart of Accounts Seeder
 * Creates 22 standard accounts for property management with Arabic names
 */

import mongoose from "mongoose";
import ChartAccount from "../server/models/finance/ChartAccount";
import {
  setTenantContext,
  setAuditContext,
} from "../server/models/plugins/tenantAudit";

interface AccountSeed {
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
  parentCode?: string;
  description?: string;
  taxable?: boolean;
  taxRate?: number;
}

const SAUDI_COA: AccountSeed[] = [
  // ASSETS (1000-1999)
  {
    accountCode: "1000",
    accountName: "Assets",
    accountNameAr: "الأصول",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    description: "All company assets",
  },
  {
    accountCode: "1100",
    accountName: "Current Assets",
    accountNameAr: "الأصول المتداولة",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
  },
  {
    accountCode: "1110",
    accountName: "Cash",
    accountNameAr: "النقد",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1100",
    description: "Cash on hand and in bank",
  },
  {
    accountCode: "1120",
    accountName: "Accounts Receivable",
    accountNameAr: "الحسابات المدينة",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1100",
    description: "Amounts owed by tenants",
  },
  {
    accountCode: "1130",
    accountName: "Tenant Security Deposits Held",
    accountNameAr: "الودائع التأمينية للمستأجرين",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1100",
    description: "Security deposits held in escrow",
  },
  {
    accountCode: "1200",
    accountName: "Fixed Assets",
    accountNameAr: "الأصول الثابتة",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1000",
  },
  {
    accountCode: "1210",
    accountName: "Properties",
    accountNameAr: "العقارات",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentCode: "1200",
    description: "Investment properties",
  },

  // LIABILITIES (2000-2999)
  {
    accountCode: "2000",
    accountName: "Liabilities",
    accountNameAr: "الخصوم",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    description: "All company liabilities",
  },
  {
    accountCode: "2100",
    accountName: "Current Liabilities",
    accountNameAr: "الخصوم المتداولة",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2000",
  },
  {
    accountCode: "2110",
    accountName: "Accounts Payable",
    accountNameAr: "الحسابات الدائنة",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2100",
    description: "Amounts owed to vendors",
  },
  {
    accountCode: "2120",
    accountName: "Tenant Security Deposits",
    accountNameAr: "التزامات الودائع التأمينية",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2100",
    description: "Obligation to return tenant deposits",
  },
  {
    accountCode: "2130",
    accountName: "VAT Payable",
    accountNameAr: "ضريبة القيمة المضافة المستحقة",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2100",
    description: "VAT owed to ZATCA (15%)",
    taxable: true,
    taxRate: 15,
  },
  {
    accountCode: "2140",
    accountName: "Commission Payable",
    accountNameAr: "العمولات المستحقة",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentCode: "2100",
    description: "Commission owed to property owners",
  },

  // EQUITY (3000-3999)
  {
    accountCode: "3000",
    accountName: "Equity",
    accountNameAr: "حقوق الملكية",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    description: "Owner equity",
  },
  {
    accountCode: "3100",
    accountName: "Retained Earnings",
    accountNameAr: "الأرباح المحتجزة",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    parentCode: "3000",
  },

  // REVENUE (4000-4999)
  {
    accountCode: "4000",
    accountName: "Revenue",
    accountNameAr: "الإيرادات",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    description: "All revenue accounts",
  },
  {
    accountCode: "4100",
    accountName: "Rental Income",
    accountNameAr: "إيرادات الإيجار",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentCode: "4000",
    description: "Rent collected from tenants",
    taxable: false, // Residential rent exempt in KSA
  },
  {
    accountCode: "4200",
    accountName: "Management Fees",
    accountNameAr: "رسوم الإدارة",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentCode: "4000",
    description: "Property management fees",
    taxable: true,
    taxRate: 15,
  },

  // EXPENSES (5000-5999)
  {
    accountCode: "5000",
    accountName: "Expenses",
    accountNameAr: "المصروفات",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    description: "All expense accounts",
  },
  {
    accountCode: "5100",
    accountName: "Property Expenses",
    accountNameAr: "مصروفات العقارات",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentCode: "5000",
  },
  {
    accountCode: "5110",
    accountName: "Maintenance & Repairs",
    accountNameAr: "الصيانة والإصلاحات",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentCode: "5100",
    description: "Property maintenance costs",
    taxable: true,
    taxRate: 15,
  },
  {
    accountCode: "5120",
    accountName: "Utilities",
    accountNameAr: "المرافق",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentCode: "5100",
    description: "Electricity, water, etc.",
    taxable: false, // Utilities often exempt or zero-rated
  },
];

/**
 * Seed Chart of Accounts for an organization
 * @param orgId - Organization ID to seed accounts for
 * @param userId - User ID performing the seed (defaults to 'system')
 */
export async function seedChartOfAccounts(
  orgId: string,
  userId: string = "system",
): Promise<void> {
  try {
    // Set context for tenant isolation
    setTenantContext({ orgId });
    setAuditContext({ userId });

    console.log(`🌱 Seeding Chart of Accounts for org: ${orgId}`);

    // Check if accounts already exist
    const existingCount = await ChartAccount.countDocuments({ orgId });
    if (existingCount > 0) {
      console.log(
        `⚠️  Found ${existingCount} existing accounts. Skipping seed.`,
      );
      return;
    }

    // Build parent references map
    const accountMap = new Map<string, mongoose.Types.ObjectId>();

    // First pass: Create all accounts without parent references
    for (const seed of SAUDI_COA) {
      const account = await ChartAccount.create({
        orgId,
        accountCode: seed.accountCode,
        accountName: seed.accountName,
        accountNameAr: seed.accountNameAr,
        accountType: seed.accountType,
        normalBalance: seed.normalBalance,
        description: seed.description,
        taxable: seed.taxable || false,
        taxRate: seed.taxRate || 0,
        balance: 0,
        isActive: true,
        createdBy: userId,
      });

      accountMap.set(seed.accountCode, account._id as mongoose.Types.ObjectId);
      console.log(`  ✅ Created: ${seed.accountCode} - ${seed.accountName}`);
    }

    // Second pass: Update parent references
    for (const seed of SAUDI_COA) {
      if (seed.parentCode) {
        const accountId = accountMap.get(seed.accountCode);
        const parentId = accountMap.get(seed.parentCode);

        if (accountId && parentId) {
          await ChartAccount.findByIdAndUpdate(accountId, { parentId });
          console.log(`  🔗 Linked: ${seed.accountCode} → ${seed.parentCode}`);
        }
      }
    }

    console.log(
      `✅ Successfully seeded ${SAUDI_COA.length} accounts for org: ${orgId}`,
    );
  } catch (error) {
    console.error("❌ Error seeding Chart of Accounts:", error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const orgId = process.argv[2];
  const userId = process.argv[3] || "system";

  if (!orgId) {
    console.error("Usage: ts-node seed-chart-accounts.ts <orgId> [userId]");
    process.exit(1);
  }

  // Connect to MongoDB
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit";
  mongoose
    .connect(MONGODB_URI)
    .then(() => seedChartOfAccounts(orgId, userId))
    .then(() => {
      console.log("✅ Seed complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}

export default seedChartOfAccounts;
