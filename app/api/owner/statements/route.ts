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
import { rateLimitError, handleApiError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
import PDFDocument from "pdfkit";

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

/**
 * Generate PDF statement using PDFKit
 * @param statement - The statement data to render
 * @returns Buffer containing the PDF document
 */
async function generateStatementPDF(statement: {
  period: { start: Date; end: Date; label: string };
  summary: { totalIncome: number; totalExpenses: number; netIncome: number; profitMargin: number };
  breakdown: { income: Record<string, number>; expenses: Record<string, number> };
  lines: StatementLine[];
  generatedAt: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Header
    doc.fontSize(20).fillColor("#0061A8").text("Owner Financial Statement", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666666").text(`Generated: ${statement.generatedAt.toLocaleDateString()}`, { align: "center" });
    doc.moveDown();

    // Period
    doc.fontSize(12).fillColor("black");
    doc.text(`Period: ${statement.period.start.toLocaleDateString()} - ${statement.period.end.toLocaleDateString()}`);
    doc.moveDown();

    // Summary Box
    doc.rect(50, doc.y, 495, 80).stroke("#0061A8");
    const summaryY = doc.y + 10;
    doc.fontSize(14).fillColor("#0061A8").text("Summary", 60, summaryY);
    doc.fontSize(11).fillColor("black");
    doc.text(`Total Income: SAR ${statement.summary.totalIncome.toLocaleString()}`, 60, summaryY + 20);
    doc.text(`Total Expenses: SAR ${statement.summary.totalExpenses.toLocaleString()}`, 60, summaryY + 35);
    doc.text(`Net Income: SAR ${statement.summary.netIncome.toLocaleString()}`, 300, summaryY + 20);
    doc.text(`Profit Margin: ${statement.summary.profitMargin.toFixed(1)}%`, 300, summaryY + 35);
    doc.y = summaryY + 70;
    doc.moveDown();

    // Income Breakdown
    if (Object.keys(statement.breakdown.income).length > 0) {
      doc.fontSize(12).fillColor("#25935F").text("Income by Category", { underline: true });
      doc.fontSize(10).fillColor("black");
      Object.entries(statement.breakdown.income).forEach(([category, amount]) => {
        doc.text(`  ${category}: SAR ${amount.toLocaleString()}`);
      });
      doc.moveDown();
    }

    // Expense Breakdown
    if (Object.keys(statement.breakdown.expenses).length > 0) {
      doc.fontSize(12).fillColor("#DC2626").text("Expenses by Category", { underline: true });
      doc.fontSize(10).fillColor("black");
      Object.entries(statement.breakdown.expenses).forEach(([category, amount]) => {
        doc.text(`  ${category}: SAR ${amount.toLocaleString()}`);
      });
      doc.moveDown();
    }

    // Transaction Lines (limited to first 50 for PDF size)
    doc.addPage();
    doc.fontSize(14).fillColor("#0061A8").text("Transaction Details", { align: "center" });
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(9).fillColor("#666666");
    doc.text("Date", 50, tableTop);
    doc.text("Description", 110, tableTop);
    doc.text("Type", 320, tableTop);
    doc.text("Amount (SAR)", 380, tableTop);
    doc.moveTo(50, tableTop + 12).lineTo(545, tableTop + 12).stroke("#cccccc");

    // Table Rows
    let rowY = tableTop + 18;
    const linesToShow = statement.lines.slice(0, 50);
    linesToShow.forEach((line) => {
      if (rowY > 750) {
        doc.addPage();
        rowY = 50;
      }
      doc.fontSize(8).fillColor("black");
      doc.text(line.date.toLocaleDateString(), 50, rowY);
      doc.text(line.description.substring(0, 40), 110, rowY);
      doc.fillColor(line.type === "INCOME" ? "#25935F" : "#DC2626");
      doc.text(line.type, 320, rowY);
      doc.fillColor("black");
      doc.text(line.amount.toLocaleString(), 380, rowY);
      rowY += 14;
    });

    if (statement.lines.length > 50) {
      doc.moveDown();
      doc.fontSize(9).fillColor("#666666").text(`... and ${statement.lines.length - 50} more transactions`);
    }

    // Footer
    doc.fontSize(8).fillColor("#999999");
    doc.text("Generated by Fixzit Enterprise", 50, 780, { align: "center" });

    doc.end();
  });
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
    // eslint-disable-next-line local/require-tenant-scope -- Scoped by propertyId (owner's properties from above)
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
    // eslint-disable-next-line local/require-tenant-scope -- Scoped by propertyId (owner's properties from above)
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
    // eslint-disable-next-line local/require-tenant-scope -- Scoped by propertyId + ownerId (owner's own bills)
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
    // AUDIT-2025-12-19: Added maxTimeMS for safety
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
      // PERF-AGG-001: Limit to prevent memory exhaustion on large datasets
      { $limit: 500 },
    ], { maxTimeMS: 10_000 });

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
    } else if (format === "pdf") {
      // Generate PDF using PDFKit
      try {
        const pdfBuffer = await generateStatementPDF(statement);
        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="statement-${periodParam}-${new Date().toISOString().split("T")[0]}.pdf"`,
            "Content-Length": pdfBuffer.length.toString(),
          },
        });
      } catch (pdfError) {
        logger.error("Error generating PDF statement", pdfError as Error);
        return NextResponse.json(
          { error: "Failed to generate PDF" },
          { status: 500 }
        );
      }
    } else if (format === "excel") {
      // Excel export requires exceljs library - return CSV as fallback
      // Generate CSV content
      const csvLines = ["Date,Description,Type,Category,Amount,Reference,Property"];
      statementLines.forEach((line) => {
        csvLines.push([
          line.date.toISOString().split("T")[0],
          `"${line.description.replace(/"/g, '""')}"`,
          line.type,
          line.category,
          line.amount.toString(),
          `"${line.reference.replace(/"/g, '""')}"`,
          `"${line.propertyName || ""}"`,
        ].join(","));
      });
      const csvContent = csvLines.join("\n");
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="statement-${periodParam}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported format. Use: json, pdf, or excel" },
        { status: 400 }
      );
    }
    } finally {
      // Ensure tenant context is always cleared, even on error paths
      clearTenantContext();
    }
  } catch (error) {
    logger.error("Error generating owner statement", error as Error);
    return handleApiError(error);
  }
}
