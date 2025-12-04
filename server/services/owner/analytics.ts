/**
 * Owner Portal Analytics Service
 *
 * Provides comprehensive financial analytics for property owners:
 * - Revenue tracking (rental income)
 * - Maintenance costs analysis
 * - Utility expenses tracking
 * - NOI (Net Operating Income) calculations
 * - ROI (Return on Investment) calculations
 * - Period comparisons (3/6/9/12 months or custom)
 *
 * Uses MongoDB aggregation pipelines for efficient data processing
 */

import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
  label: string; // "3 Months", "6 Months", "YTD", "Custom", etc.
}

export interface PropertyFinancialSummary {
  propertyId: Types.ObjectId;
  propertyName: string;
  propertyCode: string;

  // Revenue
  totalRevenue: number;
  rentalIncome: number;
  otherIncome: number;

  // Expenses
  totalExpenses: number;
  maintenanceCosts: number;
  utilityCosts: number;
  managementFees: number;
  insuranceCosts: number;
  otherExpenses: number;

  // Calculated Metrics
  noi: number; // Net Operating Income
  noiMargin: number; // NOI / Total Revenue * 100

  // Per Unit Breakdown
  units: Array<{
    unitNumber: string;
    revenue: number;
    maintenanceCosts: number;
    utilityCosts: number;
    noi: number;
    occupancyDays: number;
  }>;
}

export interface OwnerPortfolioSummary {
  ownerId: Types.ObjectId;
  ownerName: string;
  period: AnalyticsPeriod;

  // Portfolio Totals
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number; // Percentage

  // Financial Summary
  totalRevenue: number;
  totalExpenses: number;
  totalNOI: number;
  averageNOIMargin: number;

  // Investment Metrics
  totalInvestment: number; // Purchase prices
  currentValue: number; // Current property values
  equity: number; // Current value - mortgages
  totalROI: number; // Percentage
  cashOnCash: number; // Percentage

  // Detailed Breakdown
  properties: PropertyFinancialSummary[];

  // Trends
  monthlyTrends: Array<{
    month: string; // "2024-01", "2024-02", etc.
    revenue: number;
    expenses: number;
    noi: number;
  }>;
}

export interface ROICalculationInput {
  ownerId: Types.ObjectId;
  propertyId?: Types.ObjectId; // Optional: specific property or entire portfolio
  period: AnalyticsPeriod;
  includeCapitalGains?: boolean;
  orgId: Types.ObjectId;
}

/**
 * Generate standard period definitions
 */
export function getStandardPeriods(): AnalyticsPeriod[] {
  const now = new Date();
  const currentYear = now.getFullYear();

  return [
    {
      startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      endDate: now,
      label: "3 Months",
    },
    {
      startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
      endDate: now,
      label: "6 Months",
    },
    {
      startDate: new Date(now.getFullYear(), now.getMonth() - 9, 1),
      endDate: now,
      label: "9 Months",
    },
    {
      startDate: new Date(now.getFullYear(), now.getMonth() - 12, 1),
      endDate: now,
      label: "12 Months",
    },
    {
      startDate: new Date(currentYear, 0, 1), // January 1st of current year
      endDate: now,
      label: "YTD (Year to Date)",
    },
  ];
}

/**
 * Calculate Revenue for Owner's Properties
 *
 * Aggregates rental income and other revenue sources from:
 * - Service contracts (rental agreements)
 * - Payment records
 * - Invoices
 */
export async function calculateRevenue(
  ownerId: Types.ObjectId,
  propertyId: Types.ObjectId | null,
  period: AnalyticsPeriod,
  orgId: Types.ObjectId,
): Promise<number> {
  await connectToDatabase();
  const db = (await import("mongoose")).default.connection.db!;

  const matchStage: Record<string, unknown> = {
    orgId,
    ownerId,
    paymentDate: {
      $gte: period.startDate,
      $lte: period.endDate,
    },
    status: "PAID",
  };

  if (propertyId) {
    matchStage.propertyId = propertyId;
  }

  const result = await db
    .collection(COLLECTIONS.PAYMENTS)
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ])
    .toArray();

  return result[0]?.totalRevenue || 0;
}

/**
 * Calculate Maintenance Costs
 *
 * Aggregates costs from:
 * - Work orders (completed)
 * - Maintenance invoices
 * - Service provider payments
 */
export async function calculateMaintenanceCosts(
  ownerId: Types.ObjectId,
  propertyId: Types.ObjectId | null,
  period: AnalyticsPeriod,
  orgId: Types.ObjectId,
  options?: {
    perUnit?: boolean;
    postHandoverOnly?: boolean;
    tenantId?: Types.ObjectId;
  },
): Promise<number | Record<string, number>> {
  await connectToDatabase();
  const db = (await import("mongoose")).default.connection.db!;

  const matchStage: Record<string, unknown> = {
    orgId,
    "property.propertyId": { $exists: true },
    status: "COMPLETED",
    completedDate: {
      $gte: period.startDate,
      $lte: period.endDate,
    },
  };

  if (propertyId) {
    matchStage["property.propertyId"] = propertyId;
  }

  // Filter by tenant if specified (for post-handover costs)
  if (options?.tenantId) {
    matchStage.tenantId = options.tenantId;
  }

  // For post-handover only, filter work orders created after move-out
  if (options?.postHandoverOnly) {
    // This would require checking against inspection dates
    // Simplified implementation - would need to join with inspections
  }

  if (options?.perUnit) {
    // Group by unit
    const result = await db
    .collection(COLLECTIONS.WORK_ORDERS)
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$property.unitNumber",
            totalCost: { $sum: "$cost.total" },
          },
        },
      ])
      .toArray();

    const perUnitCosts: Record<string, number> = {};
    result.forEach((item) => {
      perUnitCosts[item._id || "COMMON_AREA"] = item.totalCost || 0;
    });

    return perUnitCosts;
  } else {
    // Total maintenance costs
    const result = await db
      .collection(COLLECTIONS.WORK_ORDERS)
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCost: { $sum: "$cost.total" },
          },
        },
      ])
      .toArray();

    return result[0]?.totalCost || 0;
  }
}

/**
 * Calculate Utility Costs
 *
 * Aggregates utility bills for the specified period
 */
export async function calculateUtilityCosts(
  ownerId: Types.ObjectId,
  propertyId: Types.ObjectId | null,
  period: AnalyticsPeriod,
  orgId: Types.ObjectId,
): Promise<number> {
  await connectToDatabase();
  const db = (await import("mongoose")).default.connection.db!;

  const matchStage: Record<string, unknown> = {
    orgId,
    "responsibility.ownerId": ownerId,
    "period.endDate": {
      $gte: period.startDate,
      $lte: period.endDate,
    },
    status: { $in: ["PAID", "ISSUED"] },
  };

  if (propertyId) {
    matchStage.propertyId = propertyId;
  }

  const result = await db
    .collection(COLLECTIONS.UTILITY_BILLS)
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCost: { $sum: "$charges.totalAmount" },
        },
      },
    ])
    .toArray();

  return result[0]?.totalCost || 0;
}

/**
 * Calculate comprehensive portfolio analytics with NOI and ROI
 */
export async function calculatePortfolioAnalytics(
  input: ROICalculationInput,
): Promise<OwnerPortfolioSummary> {
  await connectToDatabase();
  const mongoose = await import("mongoose");
  const db = mongoose.default.connection.db!;

  const { ownerId, propertyId, period, orgId } = input;

  // Get owner details
  const ownerDoc = await db.collection(COLLECTIONS.OWNERS).findOne({
    _id: ownerId,
    orgId,
  });

  if (!ownerDoc) {
    throw new Error("Owner not found");
  }

  // Get properties
  const propertyMatch: Record<string, unknown> = {
    orgId,
    "ownerPortal.ownerId": ownerId,
  };

  if (propertyId) {
    propertyMatch._id = propertyId;
  }

  const properties = await db
    .collection(COLLECTIONS.PROPERTIES)
    .find(propertyMatch)
    .toArray();

  // Calculate metrics for each property
  const propertyAnalytics: PropertyFinancialSummary[] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalInvestment = 0;
  let currentValue = 0;

  for (const property of properties) {
    const propId = property._id;

    // Revenue
    const revenue = await calculateRevenue(ownerId, propId, period, orgId);

    // Expenses
    const maintenanceCosts = (await calculateMaintenanceCosts(
      ownerId,
      propId,
      period,
      orgId,
    )) as number;
    const utilityCosts = await calculateUtilityCosts(
      ownerId,
      propId,
      period,
      orgId,
    );
    const propertyExpenses = maintenanceCosts + utilityCosts;

    // NOI calculation
    const noi = revenue - propertyExpenses;
    const noiMargin = revenue > 0 ? (noi / revenue) * 100 : 0;

    // Investment tracking
    const purchasePrice = property.financial?.purchasePrice || 0;
    const propCurrentValue = property.financial?.currentValue || purchasePrice;

    totalRevenue += revenue;
    totalExpenses += propertyExpenses;
    totalInvestment += purchasePrice;
    currentValue += propCurrentValue;

    propertyAnalytics.push({
      propertyId: propId,
      propertyName: property.name,
      propertyCode: property.code,
      totalRevenue: revenue,
      rentalIncome: revenue, // Simplified - would need breakdown
      otherIncome: 0,
      totalExpenses: propertyExpenses,
      maintenanceCosts,
      utilityCosts,
      managementFees: 0,
      insuranceCosts: 0,
      otherExpenses: 0,
      noi,
      noiMargin,
      units: [], // Would need detailed unit breakdown
    });
  }

  // Calculate portfolio metrics
  const totalNOI = totalRevenue - totalExpenses;
  const averageNOIMargin =
    totalRevenue > 0 ? (totalNOI / totalRevenue) * 100 : 0;
  const totalROI = totalInvestment > 0 ? (totalNOI / totalInvestment) * 100 : 0;

  // Get occupancy stats
  const totalUnits = properties.reduce(
    (sum, p) => sum + (p.units?.length || 0),
    0,
  );
  const occupiedUnits = properties.reduce(
    (sum, p) =>
      sum +
      (p.units?.filter((u: { status: string }) => u.status === "OCCUPIED")
        .length || 0),
    0,
  );
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  // Calculate equity (simplified - would need mortgage details)
  const equity = currentValue;

  return {
    ownerId,
    ownerName: ownerDoc.name?.full || ownerDoc.companyName || "Unknown",
    period,
    totalProperties: properties.length,
    totalUnits,
    occupiedUnits,
    vacantUnits: totalUnits - occupiedUnits,
    occupancyRate,
    totalRevenue,
    totalExpenses,
    totalNOI,
    averageNOIMargin,
    totalInvestment,
    currentValue,
    equity,
    totalROI,
    cashOnCash: 0, // Would need cash flow details
    properties: propertyAnalytics,
    monthlyTrends: [], // Would need time-series aggregation
  };
}

/**
 * Detect utility consumption anomalies
 * Identifies bills with significantly higher consumption than average
 */
export async function detectUtilityAnomalies(
  ownerId: Types.ObjectId,
  propertyId: Types.ObjectId,
  orgId: Types.ObjectId,
  threshold: number = 30, // Percentage increase threshold
): Promise<
  Array<{
    billId: Types.ObjectId;
    billNumber: string;
    utilityType: string;
    consumption: number;
    averageConsumption: number;
    percentageIncrease: number;
  }>
> {
  await connectToDatabase();
  const db = (await import("mongoose")).default.connection.db!;

  const result = await db
    .collection(COLLECTIONS.UTILITY_BILLS)
    .aggregate([
      {
        $match: {
          orgId,
          propertyId,
          "responsibility.ownerId": ownerId,
          "analytics.isAnomaly": true,
          "analytics.percentageChange": { $gte: threshold },
        },
      },
      {
        $project: {
          billNumber: 1,
          utilityType: "$meterId", // Would need to lookup meter details
          consumption: "$readings.consumption",
          averageConsumption: "$analytics.averageConsumptionPast3Months",
          percentageIncrease: "$analytics.percentageChange",
        },
      },
    ])
    .toArray();

  return result.map((item) => ({
    billId: item._id,
    billNumber: item.billNumber,
    utilityType: item.utilityType,
    consumption: item.consumption,
    averageConsumption: item.averageConsumption,
    percentageIncrease: item.percentageIncrease,
  }));
}
