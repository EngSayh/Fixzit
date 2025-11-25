/**
 * Chart of Accounts Seed Script
 *
 * Seeds the Chart of Accounts (COA) structure for Saudi Arabian FM/Aqar operations.
 * Based on standard accounting principles with FM/property management focus.
 *
 * Account Numbering:
 * - 1000-1999: Assets
 * - 2000-2999: Liabilities
 * - 3000-3999: Equity
 * - 4000-4999: Revenue
 * - 5000-5999: Cost of Revenue
 * - 6000-6999: Operating Expenses
 * - 7000-7999: Other Income/Expense
 *
 * Usage:
 *   pnpm tsx scripts/seed-chart-of-accounts.ts --orgId <org_id>
 */

import mongoose, { Types } from "mongoose";
import { dbConnect } from "../db/mongoose";
import ChartAccountModel from "../server/models/finance/ChartAccount";

const args = process.argv.slice(2);
const orgIdArg = args.find((arg) => arg.startsWith("--orgId="));

if (!orgIdArg) {
  console.error("❌ Missing required argument: --orgId=<organization_id>");
  console.log(
    "Usage: pnpm tsx scripts/seed-chart-of-accounts.ts --orgId=<org_id>",
  );
  process.exit(1);
}

const orgId = new Types.ObjectId(orgIdArg.split("=")[1]);

const CHART_OF_ACCOUNTS = [
  // ==================== ASSETS (1000-1999) ====================
  {
    accountCode: "1000",
    accountName: "Current Assets",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    description: "Assets expected to be converted to cash within one year",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "1100",
    accountName: "Cash and Cash Equivalents",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1000",
    description: "Cash in bank accounts and petty cash",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "1110",
    accountName: "Cash - Operating Account",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1100",
    description: "Primary operating bank account",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "1120",
    accountName: "Petty Cash",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1100",
    description: "Small cash amounts for minor expenses",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "1200",
    accountName: "Accounts Receivable",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1000",
    description: "Amounts owed by customers",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "1210",
    accountName: "Accounts Receivable - Tenants",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1200",
    description: "Rent and service charges receivable from tenants",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "1220",
    accountName: "Accounts Receivable - Property Owners",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1200",
    description: "Service fees receivable from property owners",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "1300",
    accountName: "Security Deposits Held",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1000",
    description: "Tenant security deposits held in trust",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "1400",
    accountName: "Prepaid Expenses",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1000",
    description: "Expenses paid in advance (insurance, rent)",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "1500",
    accountName: "Inventory",
    accountType: "ASSET",
    normalBalance: "DEBIT",
    parentId: "1000",
    description: "Maintenance supplies and parts inventory",
    isSystemAccount: false,
    isActive: true,
  },

  // ==================== LIABILITIES (2000-2999) ====================
  {
    accountCode: "2000",
    accountName: "Current Liabilities",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    description: "Obligations due within one year",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "2100",
    accountName: "Accounts Payable",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2000",
    description: "Amounts owed to vendors and suppliers",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "2110",
    accountName: "Accounts Payable - Vendors",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2100",
    description: "Maintenance and service vendor payables",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "2120",
    accountName: "Accounts Payable - Property Owners",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2100",
    description: "Rent payable to property owners",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "2200",
    accountName: "Security Deposits Payable",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2000",
    description: "Tenant security deposits liability",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "2300",
    accountName: "VAT Payable",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2000",
    description: "Value Added Tax payable to tax authority",
    isSystemAccount: true,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "2400",
    accountName: "Accrued Expenses",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2000",
    description: "Expenses incurred but not yet paid",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "2500",
    accountName: "Unearned Revenue",
    accountType: "LIABILITY",
    normalBalance: "CREDIT",
    parentId: "2000",
    description: "Advance payments received from tenants",
    isSystemAccount: false,
    isActive: true,
  },

  // ==================== EQUITY (3000-3999) ====================
  {
    accountCode: "3000",
    accountName: "Equity",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    description: "Owner equity and retained earnings",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "3100",
    accountName: "Owner Capital",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    parentId: "3000",
    description: "Initial and additional owner investments",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "3200",
    accountName: "Retained Earnings",
    accountType: "EQUITY",
    normalBalance: "CREDIT",
    parentId: "3000",
    description: "Cumulative net income retained in business",
    isSystemAccount: true,
    isActive: true,
  },
  {
    accountCode: "3300",
    accountName: "Owner Drawings",
    accountType: "EQUITY",
    normalBalance: "DEBIT",
    parentId: "3000",
    description: "Owner withdrawals",
    isSystemAccount: false,
    isActive: true,
  },

  // ==================== REVENUE (4000-4999) ====================
  {
    accountCode: "4000",
    accountName: "Operating Revenue",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    description: "Revenue from core business operations",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "4100",
    accountName: "Rental Income",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentId: "4000",
    description: "Rent collected from tenants",
    isSystemAccount: true,
    isActive: true,
    taxable: true,
    vatRate: 0, // Residential rent is VAT-exempt in KSA
  },
  {
    accountCode: "4200",
    accountName: "Service Fees - Property Management",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentId: "4000",
    description: "Management fees from property owners",
    isSystemAccount: true,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "4300",
    accountName: "Service Fees - Maintenance",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentId: "4000",
    description: "Revenue from maintenance services",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "4400",
    accountName: "Marketplace Commission Revenue",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentId: "4000",
    description: "Commission from marketplace transactions",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "4500",
    accountName: "Late Payment Fees",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentId: "4000",
    description: "Late payment penalties from tenants",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },

  // ==================== OPERATING EXPENSES (6000-6999) ====================
  {
    accountCode: "6000",
    accountName: "Operating Expenses",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Expenses from core business operations",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "6100",
    accountName: "Maintenance Expense",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Routine maintenance and repairs",
    isSystemAccount: true,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "6200",
    accountName: "Utilities Expense",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Electricity, water, gas",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "6300",
    accountName: "Salaries and Wages",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Employee compensation",
    isSystemAccount: false,
    isActive: true,
    taxable: false,
  },
  {
    accountCode: "6400",
    accountName: "Insurance Expense",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Property and liability insurance",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "6500",
    accountName: "Professional Fees",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Legal, accounting, consulting fees",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "6600",
    accountName: "Office Supplies",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Office supplies and equipment",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "6700",
    accountName: "Marketing and Advertising",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Marketing and promotional expenses",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 15,
  },
  {
    accountCode: "6800",
    accountName: "Bad Debt Expense",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "6000",
    description: "Uncollectible accounts receivable",
    isSystemAccount: false,
    isActive: true,
    taxable: false,
  },

  // ==================== OTHER INCOME/EXPENSE (7000-7999) ====================
  {
    accountCode: "7000",
    accountName: "Other Income and Expenses",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Non-operating income and expenses",
    isSystemAccount: false,
    isActive: true,
  },
  {
    accountCode: "7100",
    accountName: "Interest Income",
    accountType: "REVENUE",
    normalBalance: "CREDIT",
    parentId: "7000",
    description: "Interest earned on deposits",
    isSystemAccount: false,
    isActive: true,
    taxable: true,
    vatRate: 0, // Financial services are typically VAT-exempt
  },
  {
    accountCode: "7200",
    accountName: "Interest Expense",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "7000",
    description: "Interest on loans and credit",
    isSystemAccount: false,
    isActive: true,
    taxable: false,
  },
  {
    accountCode: "7300",
    accountName: "Foreign Exchange Gain/Loss",
    accountType: "EXPENSE",
    normalBalance: "DEBIT",
    parentId: "7000",
    description: "Gains or losses from currency exchange",
    isSystemAccount: false,
    isActive: true,
    taxable: false,
  },
];

async function seedChartOfAccounts() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("CHART OF ACCOUNTS SEED");
  console.log(`${"=".repeat(60)}\n`);
  console.log(`Organization ID: ${orgId}\n`);

  try {
    await dbConnect();

    // Check if COA already exists for this org
    const existingCount = await ChartAccountModel.countDocuments({ orgId });

    if (existingCount > 0) {
      console.log(
        `⚠️  Warning: ${existingCount} accounts already exist for this organization.`,
      );
      console.log("   Skipping seed to avoid duplicates.\n");
      console.log("   To re-seed, delete existing accounts first:\n");
      console.log(
        `   db.chartaccounts.deleteMany({ orgId: ObjectId("${orgId}") })\n`,
      );
      process.exit(0);
    }

    // Build parent reference map
    const accountMap = new Map<string, Types.ObjectId>();
    const stats = {
      created: 0,
      skipped: 0,
      errors: 0,
    };

    // First pass: Create accounts without parents
    for (const accountData of CHART_OF_ACCOUNTS) {
      if (!accountData.parentId) {
        try {
          const account = await ChartAccountModel.create({
            ...accountData,
            orgId,
            currency: "SAR",
            balance: 0,
            createdBy: orgId, // Placeholder - should be admin user
            updatedBy: orgId,
          });

          accountMap.set(accountData.accountCode, account._id);
          console.log(
            `✅ Created: ${accountData.accountCode} - ${accountData.accountName}`,
          );
          stats.created++;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Error creating ${accountData.accountCode}:`,
            message,
          );
          stats.errors++;
        }
      }
    }

    // Second pass: Create child accounts with parent references
    for (const accountData of CHART_OF_ACCOUNTS) {
      if (accountData.parentId) {
        const parentId = accountMap.get(accountData.parentId);

        if (!parentId) {
          console.error(
            `❌ Parent not found for ${accountData.accountCode} (parent: ${accountData.parentId})`,
          );
          stats.errors++;
          continue;
        }

        try {
          const account = await ChartAccountModel.create({
            ...accountData,
            orgId,
            parentId,
            currency: "SAR",
            balance: 0,
            createdBy: orgId,
            updatedBy: orgId,
          });

          accountMap.set(accountData.accountCode, account._id);
          console.log(
            `✅ Created: ${accountData.accountCode} - ${accountData.accountName}`,
          );
          stats.created++;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(
            `❌ Error creating ${accountData.accountCode}:`,
            message,
          );
          stats.errors++;
        }
      }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log("SEED SUMMARY");
    console.log(`${"=".repeat(60)}`);
    console.log(`Accounts created: ${stats.created}`);
    console.log(`Errors:           ${stats.errors}`);
    console.log(`${"=".repeat(60)}\n`);

    if (stats.errors > 0) {
      console.error("❌ Seed completed with errors.\n");
      process.exit(1);
    }

    console.log("✅ Chart of Accounts seeded successfully!\n");
    console.log("Next steps:");
    console.log("   1. Verify accounts in database");
    console.log("   2. Adjust opening balances if needed");
    console.log("   3. Create journal entries to post transactions\n");
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seedChartOfAccounts();
