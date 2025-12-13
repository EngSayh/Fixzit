/**
 * @fileoverview Owner Portal API - Owner Statements
 * @description Generates comprehensive financial statements for property owners.
 * Similar to bank statements showing all income and expenses with filtering.
 * @route GET /api/owner/statements - Generate owner financial statement
 * @access Protected - Requires BASIC subscription
 * @module owner
 */

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { requireSubscription } from "@/server/middleware/subscriptionCheck";
import {
  clearTenantContext,
  setTenantContext,
} from "@/server/plugins/tenantIsolation";
import { logger } from "@/lib/logger";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

interface StatementLine {
  date: Date;
  description: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  reference: string;
  propertyName?: string;
  unitNumber?: string;
}

// Lean query result interface
interface PropertyLean {
  _id: Types.ObjectId;
  name: string;
  code: string;
}

// Type definitions for Mongoose query results
interface PaymentResponse {
  propertyId?: { toString(): string };
  paymentDate: Date;
  tenantName?: string;
  amount: number;
  reference?: string;
  _id?: { toString(): string };
  unitNumber?: string;
}

interface WorkOrderResponse {
  property?: {
    propertyId?: { toString(): string };
    unitNumber?: string;
  };
  completedDate?: Date;
  title?: string;
  cost?: { total: number };
  workOrderNumber?: string;
}

interface UtilityBillResponse {
  propertyId?: { toString(): string };
  payment?: {
    paidDate?: Date;
    amount?: number;
  };
  period?: {
    endDate?: Date;
  };
  utilityType?: string;
  reference?: string;
}

interface AgentContractResponse {
  commissionPayments?: {
    paymentDate?: Date;
    amount?: number;
    reference?: string;
  };
  agentName?: string;
  contractNumber?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per IP (financial data is heavier)
    const clientIp = getClientIP(req);
    const rl = await smartRateLimit(`owner:statements:${clientIp}`, 30, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Check subscription
    const subCheck = await requireSubscription(req, {
      requirePlan: "BASIC",
    });

    if (subCheck.error) {
      return subCheck.error;
    }

    const { ownerId, orgId } = subCheck;

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") || "MTD";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const propertyIdParam = searchParams.get("propertyId");
    const format = searchParams.get("format") || "json";

    // Determine date range
    let startDate: Date;
    let endDate: Date = new Date();
    const now = new Date();

    switch (periodParam) {
      case "MTD": // Month to date
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "QTD": {
        // Quarter to date
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case "YTD": // Year to date
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "CUSTOM":
        if (!startDateParam || !endDateParam) {
          return NextResponse.json(
            { error: "startDate and endDate required for CUSTOM period" },
            { status: 400 },
          );
        }
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid period parameter" },
          { status: 400 },
        );
    }

    // Connect to database and set tenant context
    await connectToDatabase();
    setTenantContext({ orgId });

    try {
      // Import Mongoose models
      const { Property } = await import("@/server/models/Property");
      const { Payment } = await import("@/server/models/finance/Payment");
      const { WorkOrder } = await import("@/server/models/WorkOrder");
      const { UtilityBillModel: UtilityBill } = await import(
        "@/server/models/owner/UtilityBill"
      );
      const { AgentContractModel: AgentContract } = await import(
        "@/server/models/owner/AgentContract"
      );

    // Build property filter
    const propertyFilter: Record<string, unknown> = {
      "ownerPortal.ownerId": ownerId,
    };

    if (propertyIdParam) {
      propertyFilter._id = new Types.ObjectId(propertyIdParam);
    }

    // Get properties using Mongoose model
    const properties = (await Property.find(propertyFilter)
      .select("_id name code")
      .lean()) as PropertyLean[];
    const propertyIds = properties.map((p) => p._id);
    const propertyMap = new Map(properties.map((p) => [p._id.toString(), p]));

    // Collect all statement lines
    const statementLines: StatementLine[] = [];

    // 1. INCOME - Rent Payments (using Mongoose model)
    const payments = await Payment.find({
      propertyId: { $in: propertyIds },
      paymentDate: { $gte: startDate, $lte: endDate },
      status: "PAID",
    }).lean();

    payments.forEach((payment: unknown) => {
      const p = payment as PaymentResponse;
      const property = propertyMap.get(p.propertyId?.toString() || "");
      statementLines.push({
        date: p.paymentDate,
        description: `Rent Payment - ${p.tenantName || "Unknown"}`,
        type: "INCOME",
        category: "RENTAL_INCOME",
        amount: p.amount,
        reference: p.reference || p._id?.toString() || "N/A",
        propertyName: property?.name || "Unknown",
        unitNumber: p.unitNumber,
      });
    });

    // 2. EXPENSES - Maintenance (Work Orders using Mongoose model)
    const workOrders = await WorkOrder.find({
      "property.propertyId": { $in: propertyIds },
      status: "COMPLETED",
      completedDate: { $gte: startDate, $lte: endDate },
      "cost.total": { $gt: 0 },
    }).lean();

    workOrders.forEach((wo: unknown) => {
      const w = wo as WorkOrderResponse;
      // Skip work orders without valid completion dates
      if (!w.completedDate) {
        logger.warn(
          "Work order missing completedDate, skipping from statement",
          { workOrderNumber: w.workOrderNumber },
        );
        return;
      }
      const property = propertyMap.get(
        w.property?.propertyId?.toString() || "",
      );
      statementLines.push({
        date: w.completedDate,
        description: `Maintenance - ${w.title || "Work Order"}`,
        type: "EXPENSE",
        category: "MAINTENANCE",
        amount: w.cost?.total || 0,
        reference: w.workOrderNumber || "N/A",
        propertyName: property?.name,
        unitNumber: w.property?.unitNumber,
      });
    });

    // 3. EXPENSES - Utilities (using Mongoose model)
    const utilityBills = await UtilityBill.find({
      propertyId: { $in: propertyIds },
      "responsibility.ownerId": ownerId,
      "period.endDate": { $gte: startDate, $lte: endDate },
      "payment.status": "PAID",
    }).lean();

    utilityBills.forEach((bill: unknown) => {
      const b = bill as UtilityBillResponse;
      // Require at least one valid date
      const billDate = b.payment?.paidDate || b.period?.endDate;
      if (!billDate) {
        logger.warn(
          "Utility bill missing both paidDate and period.endDate, skipping from statement",
          { reference: b.reference },
        );
        return;
      }
      const property = propertyMap.get(b.propertyId?.toString() || "");
      statementLines.push({
        date: billDate,
        description: `Utility - ${b.utilityType || "Utility Bill"}`,
        type: "EXPENSE",
        category: "UTILITIES",
        amount: b.payment?.amount || 0,
        reference: b.reference || "N/A",
        propertyName: property?.name,
      });
    }); // 4. EXPENSES - Agent Commissions (using Mongoose model aggregate)
    const agentPayments = await AgentContract.aggregate([
      {
        $match: {
          ownerId,
          status: "ACTIVE",
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "_id",
          foreignField: "agentContractId",
          as: "commissionPayments",
        },
      },
      {
        $unwind: "$commissionPayments",
      },
      {
        $match: {
          "commissionPayments.paymentDate": { $gte: startDate, $lte: endDate },
          "commissionPayments.type": "COMMISSION",
        },
      },
    ]);

    agentPayments.forEach((contract: unknown) => {
      const c = contract as AgentContractResponse;
      // Skip entries without valid commission payment dates
      if (!c.commissionPayments?.paymentDate) {
        logger.warn(
          "Agent commission missing paymentDate, skipping from statement",
          { contractNumber: c.contractNumber },
        );
        return;
      }
      statementLines.push({
        date: c.commissionPayments.paymentDate,
        description: `Agent Commission - ${c.agentName || "Agent"}`,
        type: "EXPENSE",
        category: "AGENT_COMMISSION",
        amount: c.commissionPayments?.amount || 0,
        reference: c.commissionPayments?.reference || c.contractNumber || "N/A",
        propertyName: undefined,
      });
    });

    // Sort by date (most recent first)
    statementLines.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate totals
    const totalIncome = statementLines
      .filter((l) => l.type === "INCOME")
      .reduce((sum, l) => sum + l.amount, 0);

    const totalExpenses = statementLines
      .filter((l) => l.type === "EXPENSE")
      .reduce((sum, l) => sum + l.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    // Breakdown by category
    const incomeByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};

    statementLines.forEach((line) => {
      if (line.type === "INCOME") {
        incomeByCategory[line.category] =
          (incomeByCategory[line.category] || 0) + line.amount;
      } else {
        expensesByCategory[line.category] =
          (expensesByCategory[line.category] || 0) + line.amount;
      }
    });

    const statement = {
      period: {
        start: startDate,
        end: endDate,
        label: periodParam,
      },
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        profitMargin: totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
      },
      breakdown: {
        income: incomeByCategory,
        expenses: expensesByCategory,
      },
      lines: statementLines,
      generatedAt: new Date(),
    };

    // Handle different output formats
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: statement,
        subscription: subCheck.status,
      });
    } else {
      // PDF and Excel would require additional libraries
      return NextResponse.json(
        { error: "PDF and Excel formats not yet implemented" },
        { status: 501 }, // Not Implemented
      );
    }
    } finally {
      // Ensure tenant context is always cleared, even on error paths
      clearTenantContext();
    }
  } catch (error) {
    logger.error("Error generating owner statement", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate statement",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
