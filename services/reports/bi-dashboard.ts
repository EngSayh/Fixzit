/**
 * @fileoverview Business Intelligence Dashboard Service
 * @module services/reports/bi-dashboard
 * 
 * Real-time business intelligence and analytics:
 * - Multi-dimensional KPI tracking
 * - Cross-module data aggregation
 * - Trend analysis and forecasting
 * - Drill-down analytics
 * - Custom dashboard widgets
 * - Role-based dashboard views
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Error Logging Helper
// ============================================================================

function logError(action: string, error: unknown): void {
  logger.error(`Failed to ${action}`, {
    component: "bi-dashboard",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Dashboard module
 */
export enum DashboardModule {
  EXECUTIVE = "executive",
  FINANCE = "finance",
  OPERATIONS = "operations",
  PROPERTY = "property",
  HR = "hr",
  SALES = "sales",
  COMPLIANCE = "compliance",
  MAINTENANCE = "maintenance",
  TENANT = "tenant",
}

/**
 * Widget type
 */
export enum WidgetType {
  KPI_CARD = "kpi_card",
  LINE_CHART = "line_chart",
  BAR_CHART = "bar_chart",
  PIE_CHART = "pie_chart",
  DONUT_CHART = "donut_chart",
  AREA_CHART = "area_chart",
  GAUGE = "gauge",
  TABLE = "table",
  MAP = "map",
  HEATMAP = "heatmap",
  TREND = "trend",
  COMPARISON = "comparison",
  FUNNEL = "funnel",
  TREE_MAP = "tree_map",
  SCATTER = "scatter",
}

/**
 * Time range
 */
export enum TimeRange {
  TODAY = "today",
  YESTERDAY = "yesterday",
  THIS_WEEK = "this_week",
  LAST_WEEK = "last_week",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_QUARTER = "this_quarter",
  LAST_QUARTER = "last_quarter",
  THIS_YEAR = "this_year",
  LAST_YEAR = "last_year",
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  LAST_365_DAYS = "last_365_days",
  CUSTOM = "custom",
}

/**
 * KPI category
 */
export enum KPICategory {
  REVENUE = "revenue",
  OCCUPANCY = "occupancy",
  MAINTENANCE = "maintenance",
  COLLECTION = "collection",
  SATISFACTION = "satisfaction",
  OPERATIONAL = "operational",
  COMPLIANCE = "compliance",
  WORKFORCE = "workforce",
  GROWTH = "growth",
}

/**
 * Dashboard configuration
 */
export interface Dashboard {
  _id?: ObjectId;
  orgId: string;
  
  // Identification
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  module: DashboardModule;
  
  // Layout
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  
  // Access
  isDefault: boolean;
  visibility: "public" | "role_based" | "private";
  allowedRoles?: string[];
  ownerId?: string;
  
  // Settings
  settings: DashboardSettings;
  
  // Timestamps
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  lastAccessedAt?: Date;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  columns: number;
  rows?: number;
  responsive: boolean;
  breakpoints?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  titleAr: string;
  
  // Position
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Data source
  dataSource: DataSource;
  
  // Display
  display: WidgetDisplay;
  
  // Interactivity
  drillDown?: DrillDownConfig;
  filters?: WidgetFilter[];
  
  // Refresh
  refreshInterval?: number; // seconds
  lastRefresh?: Date;
}

/**
 * Data source
 */
export interface DataSource {
  type: "aggregation" | "api" | "calculated";
  collection?: string;
  aggregation?: Record<string, unknown>[];
  apiEndpoint?: string;
  calculation?: string;
  dependencies?: string[];
}

/**
 * Widget display
 */
export interface WidgetDisplay {
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showTrend?: boolean;
  trendComparison?: "previous_period" | "same_period_last_year";
  format?: "number" | "currency" | "percentage" | "duration";
  currency?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  thresholds?: Threshold[];
}

/**
 * Threshold
 */
export interface Threshold {
  value: number;
  color: string;
  label?: string;
}

/**
 * Drill down config
 */
export interface DrillDownConfig {
  enabled: boolean;
  targetDashboard?: string;
  targetWidget?: string;
  filterKey?: string;
}

/**
 * Widget filter
 */
export interface WidgetFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "between";
  value: unknown;
}

/**
 * Dashboard settings
 */
export interface DashboardSettings {
  defaultTimeRange: TimeRange;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  theme?: "light" | "dark" | "auto";
  locale?: "ar" | "en";
}

/**
 * KPI definition
 */
export interface KPIDefinition {
  _id?: ObjectId;
  orgId: string;
  
  // Identification
  code: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  category: KPICategory;
  
  // Calculation
  calculation: KPICalculation;
  
  // Display
  format: "number" | "currency" | "percentage" | "duration" | "ratio";
  currency?: string;
  unit?: string;
  unitAr?: string;
  
  // Targets
  targets?: KPITarget[];
  
  // Benchmarks
  benchmarks?: KPIBenchmark[];
  
  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KPI calculation
 */
export interface KPICalculation {
  type: "simple" | "ratio" | "aggregate" | "formula";
  
  // Simple aggregation
  collection?: string;
  field?: string;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
  
  // Ratio
  numerator?: KPICalculation;
  denominator?: KPICalculation;
  
  // Custom formula
  formula?: string;
  
  // Filters
  filters?: Record<string, unknown>;
}

/**
 * KPI target
 */
export interface KPITarget {
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  value: number;
  type: "minimum" | "maximum" | "target";
  effectiveFrom: Date;
  effectiveTo?: Date;
}

/**
 * KPI benchmark
 */
export interface KPIBenchmark {
  source: "industry" | "historical" | "competitor";
  value: number;
  description?: string;
  year?: number;
}

/**
 * KPI value
 */
export interface KPIValue {
  _id?: ObjectId;
  orgId: string;
  kpiCode: string;
  
  // Time
  date: Date;
  period: "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  
  // Value
  value: number;
  previousValue?: number;
  changePercent?: number;
  
  // Context
  dimensions?: Record<string, string>; // e.g., { propertyId: "xxx", category: "residential" }
  
  // Comparison
  targetValue?: number;
  targetAchievement?: number;
  
  // Timestamp
  calculatedAt: Date;
}

/**
 * Analytics query
 */
export interface AnalyticsQuery {
  orgId: string;
  module?: DashboardModule;
  kpis?: string[];
  timeRange: TimeRange;
  customDateRange?: { start: Date; end: Date };
  dimensions?: string[];
  filters?: Record<string, unknown>;
  granularity?: "hourly" | "daily" | "weekly" | "monthly";
}

// ============================================================================
// Constants
// ============================================================================

const DASHBOARDS_COLLECTION = "dashboards";
const _KPI_DEFINITIONS_COLLECTION = "kpi_definitions";
const KPI_VALUES_COLLECTION = "kpi_values";

// ============================================================================
// KPI Calculation Functions
// ============================================================================

/**
 * Calculate executive KPIs
 */
export async function getExecutiveKPIs(
  orgId: string,
  timeRange: TimeRange = TimeRange.THIS_MONTH
): Promise<{
  revenue: KPIResult;
  occupancy: KPIResult;
  collections: KPIResult;
  profitMargin: KPIResult;
  maintenanceCost: KPIResult;
  tenantSatisfaction: KPIResult;
}> {
  try {
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    const previousRange = getPreviousPeriodRange(timeRange);
    
    const [revenue, occupancy, collections, maintenance, satisfaction] = await Promise.all([
      calculateRevenueKPI(orgId, dateRange, previousRange),
      calculateOccupancyKPI(orgId, dateRange),
      calculateCollectionKPI(orgId, dateRange, previousRange),
      calculateMaintenanceCostKPI(orgId, dateRange, previousRange),
      calculateSatisfactionKPI(orgId, dateRange),
    ]);
    
    // Calculate profit margin with proper previous period comparison
    const currentMargin = revenue.value > 0 
      ? ((revenue.value - maintenance.value) / revenue.value) * 100 
      : 0;
    const previousMargin = revenue.previousValue > 0 
      ? ((revenue.previousValue - maintenance.previousValue) / revenue.previousValue) * 100 
      : 0;
    const marginChange = currentMargin - previousMargin;
    const marginChangePercent = previousMargin > 0 
      ? (marginChange / Math.abs(previousMargin)) * 100 
      : (currentMargin !== 0 ? 100 : 0);
    
    const profitMargin = {
      value: currentMargin,
      previousValue: previousMargin,
      change: marginChange,
      changePercent: marginChangePercent,
      trend: (marginChange > 0.5 ? "up" : marginChange < -0.5 ? "down" : "stable") as "up" | "down" | "stable",
      target: 25,
      targetAchievement: 0,
    };
    profitMargin.targetAchievement = (profitMargin.value / profitMargin.target) * 100;
    
    return {
      revenue,
      occupancy,
      collections,
      profitMargin,
      maintenanceCost: maintenance,
      tenantSatisfaction: satisfaction,
    };
  } catch (error) {
    logError("get executive KPIs", error);
    throw error;
  }
}

/**
 * Calculate finance KPIs
 */
export async function getFinanceKPIs(
  orgId: string,
  timeRange: TimeRange = TimeRange.THIS_MONTH
): Promise<{
  totalRevenue: KPIResult;
  outstandingReceivables: KPIResult;
  cashFlow: KPIResult;
  expenseRatio: KPIResult;
  revenuePerUnit: KPIResult;
  vatCollected: KPIResult;
}> {
  try {
    const db = await getDatabase();
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    const previousRange = getPreviousPeriodRange(timeRange);
    
    // Total revenue
    const revenuePipeline = [
      {
        $match: {
          org_id: orgId,
          date: { $gte: dateRange.start, $lte: dateRange.end },
          type: "income",
          status: "completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ];
    
    const prevRevenuePipeline = [
      {
        $match: {
          org_id: orgId,
          date: { $gte: previousRange.start, $lte: previousRange.end },
          type: "income",
          status: "completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ];
    
    const [revenueResult, prevRevenueResult] = await Promise.all([
      db.collection("transactions").aggregate(revenuePipeline).toArray(),
      db.collection("transactions").aggregate(prevRevenuePipeline).toArray(),
    ]);
    
    const totalRevenueValue = revenueResult[0]?.total || 0;
    const prevRevenueValue = prevRevenueResult[0]?.total || 0;
    
    // Outstanding receivables
    const receivablesPipeline = [
      {
        $match: {
          org_id: orgId,
          status: { $in: ["pending", "overdue"] },
          type: "income",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ];
    
    const receivablesResult = await db.collection("invoices")
      .aggregate(receivablesPipeline).toArray();
    
    // Unit count for per-unit calculation
    const unitCount = await db.collection("units").countDocuments({
      org_id: orgId,
      status: "active",
    });
    
    return {
      totalRevenue: createKPIResult(totalRevenueValue, prevRevenueValue),
      outstandingReceivables: createKPIResult(receivablesResult[0]?.total || 0, 0, "lower_better"),
      // TODO: [BI-KPI-001] cashFlow is a placeholder estimate (80% of revenue).
      // SSOT: FEAT-BI-CASHFLOW-001 (P2 - BI Dashboard Real Metrics)
      // Replace with actual cash flow calculation from transactions collection.
      // Implementation: Query payments collection for inflows/outflows by period
      cashFlow: createKPIResult(totalRevenueValue * 0.8, prevRevenueValue * 0.8),
      // TODO: [BI-KPI-002] expenseRatio is hardcoded (35%).
      // SSOT: FEAT-BI-EXPENSE-001 (P2 - BI Dashboard Real Metrics)
      // Replace with actual expense/revenue ratio from finance ledger.
      // Implementation: Query expenses collection and divide by revenue
      expenseRatio: createKPIResult(35, 38, "lower_better", 30),
      revenuePerUnit: createKPIResult(
        unitCount > 0 ? totalRevenueValue / unitCount : 0,
        unitCount > 0 ? prevRevenueValue / unitCount : 0
      ),
      vatCollected: createKPIResult(totalRevenueValue * 0.15 / 1.15, prevRevenueValue * 0.15 / 1.15),
    };
  } catch (error) {
    logError("get finance KPIs", error);
    throw error;
  }
}

/**
 * Calculate operations KPIs
 */
export async function getOperationsKPIs(
  orgId: string,
  timeRange: TimeRange = TimeRange.THIS_MONTH
): Promise<{
  workOrdersCreated: KPIResult;
  workOrdersCompleted: KPIResult;
  avgResolutionTime: KPIResult;
  slaCompliance: KPIResult;
  preventiveMaintenance: KPIResult;
  firstTimeFixRate: KPIResult;
}> {
  try {
    const db = await getDatabase();
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    const previousRange = getPreviousPeriodRange(timeRange);
    
    // Work orders created
    const [createdCount, prevCreatedCount] = await Promise.all([
      db.collection("work_orders").countDocuments({
        org_id: orgId,
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      }),
      db.collection("work_orders").countDocuments({
        org_id: orgId,
        createdAt: { $gte: previousRange.start, $lte: previousRange.end },
      }),
    ]);
    
    // Work orders completed
    const [completedCount, prevCompletedCount] = await Promise.all([
      db.collection("work_orders").countDocuments({
        org_id: orgId,
        status: "completed",
        completedAt: { $gte: dateRange.start, $lte: dateRange.end },
      }),
      db.collection("work_orders").countDocuments({
        org_id: orgId,
        status: "completed",
        completedAt: { $gte: previousRange.start, $lte: previousRange.end },
      }),
    ]);
    
    // Average resolution time
    const resolutionPipeline = [
      {
        $match: {
          org_id: orgId,
          status: "completed",
          completedAt: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $project: {
          resolutionTime: { $subtract: ["$completedAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$resolutionTime" },
        },
      },
    ];
    
    const resolutionResult = await db.collection("work_orders")
      .aggregate(resolutionPipeline).toArray();
    
    const avgResolutionHours = (resolutionResult[0]?.avgTime || 0) / (1000 * 60 * 60);
    
    // SLA compliance
    const slaCompletedOnTime = await db.collection("work_orders").countDocuments({
      org_id: orgId,
      status: "completed",
      completedAt: { $gte: dateRange.start, $lte: dateRange.end },
      slaBreached: { $ne: true },
    });
    
    const slaCompliance = completedCount > 0 ? (slaCompletedOnTime / completedCount) * 100 : 0;
    
    // Preventive maintenance
    const preventiveCount = await db.collection("work_orders").countDocuments({
      org_id: orgId,
      type: "preventive",
      completedAt: { $gte: dateRange.start, $lte: dateRange.end },
    });
    
    const preventiveRatio = completedCount > 0 ? (preventiveCount / completedCount) * 100 : 0;
    
    return {
      workOrdersCreated: createKPIResult(createdCount, prevCreatedCount),
      workOrdersCompleted: createKPIResult(completedCount, prevCompletedCount),
      avgResolutionTime: createKPIResult(avgResolutionHours, 0, "lower_better", 24),
      slaCompliance: createKPIResult(slaCompliance, 0, "higher_better", 95),
      preventiveMaintenance: createKPIResult(preventiveRatio, 0, "higher_better", 30),
      // TODO: [BI-KPI-003] firstTimeFixRate is hardcoded (85%).
      // SSOT: FEAT-BI-FTFR-001 (P2 - BI Dashboard Real Metrics)
      // Replace with actual calculation from work_orders collection:
      // Implementation: (work orders resolved on first visit / total work orders) * 100
      // Query: workorders where resolution_attempts = 1 / total workorders
      firstTimeFixRate: createKPIResult(85, 82, "higher_better", 90),
    };
  } catch (error) {
    logError("get operations KPIs", error);
    throw error;
  }
}

/**
 * Calculate property KPIs
 */
export async function getPropertyKPIs(
  orgId: string,
  timeRange: TimeRange = TimeRange.THIS_MONTH
): Promise<{
  totalProperties: KPIResult;
  totalUnits: KPIResult;
  occupancyRate: KPIResult;
  vacancyDays: KPIResult;
  turnoverRate: KPIResult;
  avgRentPerSqm: KPIResult;
}> {
  try {
    const db = await getDatabase();
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    
    // Property counts
    const propertyCount = await db.collection("properties").countDocuments({
      org_id: orgId,
      status: "active",
    });
    
    const unitCount = await db.collection("units").countDocuments({
      org_id: orgId,
      status: "active",
    });
    
    const occupiedCount = await db.collection("units").countDocuments({
      org_id: orgId,
      status: "active",
      occupancy_status: "occupied",
    });
    
    const occupancyRate = unitCount > 0 ? (occupiedCount / unitCount) * 100 : 0;
    
    // Vacancy days
    const vacantUnits = await db.collection("units").find({
      org_id: orgId,
      status: "active",
      occupancy_status: "vacant",
    }).toArray();
    
    const totalVacancyDays = vacantUnits.reduce((sum, unit) => {
      const vacantSince = (unit as unknown as { vacantSince?: Date }).vacantSince || new Date();
      const days = Math.floor((dateRange.end.getTime() - new Date(vacantSince).getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);
    
    const avgVacancyDays = vacantUnits.length > 0 ? totalVacancyDays / vacantUnits.length : 0;
    
    // Turnover rate (leases ended in period)
    const leasesEnded = await db.collection("leases").countDocuments({
      org_id: orgId,
      endDate: { $gte: dateRange.start, $lte: dateRange.end },
      status: "ended",
    });
    
    const turnoverRate = occupiedCount > 0 ? (leasesEnded / occupiedCount) * 100 : 0;
    
    // Average rent per sqm
    const rentPipeline = [
      {
        $match: {
          org_id: orgId,
          status: "active",
        },
      },
      {
        $group: {
          _id: null,
          totalRent: { $sum: "$monthlyRent" },
          totalArea: { $sum: "$area" },
        },
      },
    ];
    
    const rentResult = await db.collection("units")
      .aggregate(rentPipeline).toArray();
    
    const avgRentPerSqm = rentResult[0]?.totalArea > 0 
      ? rentResult[0].totalRent / rentResult[0].totalArea 
      : 0;
    
    return {
      totalProperties: createKPIResult(propertyCount, 0),
      totalUnits: createKPIResult(unitCount, 0),
      occupancyRate: createKPIResult(occupancyRate, 0, "higher_better", 95),
      vacancyDays: createKPIResult(avgVacancyDays, 0, "lower_better", 30),
      turnoverRate: createKPIResult(turnoverRate, 0, "lower_better", 10),
      avgRentPerSqm: createKPIResult(avgRentPerSqm, 0),
    };
  } catch (error) {
    logError("get property KPIs", error);
    throw error;
  }
}

/**
 * Get HR KPIs
 */
export async function getHRKPIs(
  orgId: string,
  timeRange: TimeRange = TimeRange.THIS_MONTH
): Promise<{
  totalEmployees: KPIResult;
  attendanceRate: KPIResult;
  turnoverRate: KPIResult;
  avgTenure: KPIResult;
  trainingHours: KPIResult;
  payrollCost: KPIResult;
}> {
  try {
    const db = await getDatabase();
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    
    // Employee count
    const employeeCount = await db.collection("employees").countDocuments({
      org_id: orgId,
      status: "active",
    });
    
    // Attendance
    const attendancePipeline = [
      {
        $match: {
          org_id: orgId,
          date: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ];
    
    const attendanceResult = await db.collection("attendance")
      .aggregate(attendancePipeline).toArray();
    
    const attendanceRate = attendanceResult[0]?.total > 0 
      ? (attendanceResult[0].present / attendanceResult[0].total) * 100 
      : 0;
    
    // Turnover
    const terminated = await db.collection("employees").countDocuments({
      org_id: orgId,
      terminatedAt: { $gte: dateRange.start, $lte: dateRange.end },
    });
    
    const turnoverRate = employeeCount > 0 ? (terminated / employeeCount) * 100 : 0;
    
    // Average tenure
    const tenurePipeline = [
      {
        $match: {
          org_id: orgId,
          status: "active",
        },
      },
      {
        $project: {
          tenure: { $subtract: ["$$NOW", "$joiningDate"] },
        },
      },
      {
        $group: {
          _id: null,
          avgTenure: { $avg: "$tenure" },
        },
      },
    ];
    
    const tenureResult = await db.collection("employees")
      .aggregate(tenurePipeline).toArray();
    
    const avgTenureYears = (tenureResult[0]?.avgTenure || 0) / (1000 * 60 * 60 * 24 * 365);
    
    // Payroll
    const payrollPipeline = [
      {
        $match: {
          org_id: orgId,
          period: {
            $gte: dateRange.start.toISOString().slice(0, 7),
            $lte: dateRange.end.toISOString().slice(0, 7),
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ];
    
    const payrollResult = await db.collection("payroll_runs")
      .aggregate(payrollPipeline).toArray();
    
    return {
      totalEmployees: createKPIResult(employeeCount, 0),
      attendanceRate: createKPIResult(attendanceRate, 0, "higher_better", 95),
      turnoverRate: createKPIResult(turnoverRate, 0, "lower_better", 10),
      avgTenure: createKPIResult(avgTenureYears, 0),
      // TODO: [BI-KPI-004] trainingHours is hardcoded placeholder (40 hours).
      // SSOT: FEAT-BI-TRAINING-001 (P2 - BI Dashboard Real Metrics)
      // Replace with actual training hours from HR training module.
      // Implementation: Query employee training records for total hours
      trainingHours: createKPIResult(40, 35),
      payrollCost: createKPIResult(payrollResult[0]?.total || 0, 0),
    };
  } catch (error) {
    logError("get HR KPIs", error);
    throw error;
  }
}

// ============================================================================
// Dashboard Management
// ============================================================================

/**
 * Create dashboard
 */
export async function createDashboard(
  dashboard: Omit<Dashboard, "_id" | "createdAt" | "updatedAt">
): Promise<{ success: boolean; dashboardId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    const fullDashboard: Omit<Dashboard, "_id"> = {
      ...dashboard,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(DASHBOARDS_COLLECTION).insertOne(fullDashboard);
    
    logger.info("Dashboard created", {
      component: "bi-dashboard",
      action: "createDashboard",
    });
    
    return { success: true, dashboardId: result.insertedId.toString() };
  } catch (error) {
    logError("create dashboard", error);
    return { success: false, error: "Failed to create dashboard" };
  }
}

/**
 * Get dashboard
 */
export async function getDashboard(
  orgId: string,
  dashboardId: string
): Promise<Dashboard | null> {
  try {
    const db = await getDatabase();
    
    if (!ObjectId.isValid(dashboardId)) {
      logger.warn("Invalid dashboardId format", {
        component: "bi-dashboard",
        dashboardId,
      });
      return null;
    }
    
    const dashboard = await db.collection(DASHBOARDS_COLLECTION).findOne({
      _id: new ObjectId(dashboardId),
      orgId,
    }) as WithId<Document> | null;
    
    if (dashboard) {
      // Update last accessed
      await db.collection(DASHBOARDS_COLLECTION).updateOne(
        { _id: new ObjectId(dashboardId) },
        { $set: { lastAccessedAt: new Date() } }
      );
    }
    
    return dashboard as unknown as Dashboard | null;
  } catch (error) {
    logError("get dashboard", error);
    return null;
  }
}

/**
 * List dashboards
 */
export async function listDashboards(
  orgId: string,
  filters?: {
    module?: DashboardModule;
    visibility?: string;
    userId?: string;
    userRoles?: string[]; // For role-based access control
  }
): Promise<Dashboard[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters?.module) {
      query.module = filters.module;
    }
    
    // Include public, role-based (if user has role), or owned by user
    // Note: visibility filter and userId filter are mutually exclusive
    // If userId is provided, use $or for access control; otherwise use direct visibility filter
    if (filters?.userId) {
      const accessConditions: object[] = [
        { visibility: "public" },
        { ownerId: filters.userId },
      ];
      // Add role-based access if userRoles is provided
      if (filters?.userRoles && Array.isArray(filters.userRoles) && filters.userRoles.length > 0) {
        accessConditions.push({
          visibility: "role_based",
          allowedRoles: { $in: filters.userRoles },
        });
      }
      // If specific visibility requested, add it to the conditions
      if (filters?.visibility) {
        accessConditions.push({ visibility: filters.visibility, ownerId: filters.userId });
      }
      query.$or = accessConditions;
    } else if (filters?.visibility) {
      query.visibility = filters.visibility;
    }
    
    const dashboards = await db.collection(DASHBOARDS_COLLECTION)
      .find(query)
      .sort({ isDefault: -1, lastAccessedAt: -1 })
      .toArray();
    
    return dashboards as unknown as Dashboard[];
  } catch (error) {
    logError("list dashboards", error);
    return [];
  }
}

/**
 * Get default dashboard
 */
export async function getDefaultDashboard(
  orgId: string,
  module: DashboardModule
): Promise<Dashboard | null> {
  try {
    const db = await getDatabase();
    
    const dashboard = await db.collection(DASHBOARDS_COLLECTION).findOne({
      orgId,
      module,
      isDefault: true,
    }) as WithId<Document> | null;
    
    return dashboard as unknown as Dashboard | null;
  } catch (error) {
    logError("get default dashboard", error);
    return null;
  }
}

/**
 * Add widget to dashboard
 */
export async function addWidget(
  orgId: string,
  dashboardId: string,
  widget: DashboardWidget
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Check for duplicate widget ID
    const existingDashboard = await db.collection(DASHBOARDS_COLLECTION).findOne(
      { _id: new ObjectId(dashboardId), orgId, "widgets.id": widget.id }
    );
    
    if (existingDashboard) {
      return { success: false, error: "Widget with this ID already exists" };
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $push: { widgets: widget },
      $set: { updatedAt: new Date() },
    };
    
    const result = await db.collection(DASHBOARDS_COLLECTION).updateOne(
      { _id: new ObjectId(dashboardId), orgId },
      updateOp
    );
    
    // Verify update was successful
    if (result.matchedCount === 0) {
      return { success: false, error: "Dashboard not found" };
    }
    
    return { success: true };
  } catch (error) {
    logError("add widget", error);
    return { success: false, error: "Failed to add widget" };
  }
}

/**
 * Remove widget from dashboard
 */
export async function removeWidget(
  orgId: string,
  dashboardId: string,
  widgetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $pull: { widgets: { id: widgetId } },
      $set: { updatedAt: new Date() },
    };
    
    const result = await db.collection(DASHBOARDS_COLLECTION).updateOne(
      { _id: new ObjectId(dashboardId), orgId },
      updateOp
    );
    
    // Verify update was successful
    if (result.matchedCount === 0) {
      return { success: false, error: "Dashboard not found" };
    }
    
    // Check if widget was actually removed
    if (result.modifiedCount === 0) {
      return { success: false, error: "Widget not found" };
    }
    
    return { success: true };
  } catch (error) {
    logError("remove widget", error);
    return { success: false, error: "Failed to remove widget" };
  }
}

// ============================================================================
// Trend Analysis
// ============================================================================

/**
 * Get trend data
 */
export async function getTrendData(
  orgId: string,
  metric: string,
  timeRange: TimeRange,
  granularity: "daily" | "weekly" | "monthly" = "daily"
): Promise<TrendDataPoint[]> {
  try {
    const db = await getDatabase();
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    
    const dateFormat = granularity === "monthly" 
      ? "%Y-%m" 
      : granularity === "weekly"
        ? "%Y-W%V"
        : "%Y-%m-%d";
    
    const pipeline = [
      {
        $match: {
          org_id: orgId,
          kpiCode: metric,
          date: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$date" } },
          value: { $avg: "$value" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    
    const results = await db.collection(KPI_VALUES_COLLECTION)
      .aggregate(pipeline).toArray();
    
    return results.map(r => ({
      date: r._id,
      value: r.value,
      count: r.count,
    }));
  } catch (error) {
    logError("get trend data", error);
    return [];
  }
}

/**
 * Get comparison data
 */
export async function getComparisonData(
  orgId: string,
  metrics: string[],
  timeRange: TimeRange
): Promise<Record<string, { current: number; previous: number; change: number }>> {
  try {
    const dateRange = getDateRange(timeRange);
    if (!dateRange) {
      throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
    }
    const previousRange = getPreviousPeriodRange(timeRange);
    
    const results: Record<string, { current: number; previous: number; change: number }> = {};
    
    for (const metric of metrics) {
      const [current, previous] = await Promise.all([
        getMetricValue(orgId, metric, dateRange),
        getMetricValue(orgId, metric, previousRange),
      ]);
      
      results[metric] = {
        current,
        previous,
        change: previous > 0 ? ((current - previous) / previous) * 100 : 0,
      };
    }
    
    return results;
  } catch (error) {
    logError("get comparison data", error);
    return {};
  }
}

// ============================================================================
// Helper Types
// ============================================================================

interface KPIResult {
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
  target?: number;
  targetAchievement?: number;
}

interface TrendDataPoint {
  date: string;
  value: number;
  count?: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date range for predefined time ranges.
 * Returns null for TimeRange.CUSTOM; callers should use AnalyticsQuery.customDateRange.
 */
function getDateRange(timeRange: TimeRange): DateRange | null {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  
  switch (timeRange) {
    case TimeRange.TODAY:
      start.setHours(0, 0, 0, 0);
      break;
    case TimeRange.YESTERDAY:
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case TimeRange.THIS_WEEK: {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case TimeRange.LAST_WEEK: {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - end.getDay() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case TimeRange.THIS_MONTH:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case TimeRange.LAST_MONTH:
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0); // Last day of previous month
      end.setHours(23, 59, 59, 999);
      break;
    case TimeRange.THIS_QUARTER: {
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case TimeRange.LAST_QUARTER: {
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth((quarter - 1) * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(quarter * 3, 0); // Last day of previous quarter
      end.setHours(23, 59, 59, 999);
      break;
    }
    case TimeRange.THIS_YEAR:
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case TimeRange.LAST_YEAR:
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case TimeRange.LAST_7_DAYS:
      start.setDate(start.getDate() - 7);
      break;
    case TimeRange.LAST_30_DAYS:
      start.setDate(start.getDate() - 30);
      break;
    case TimeRange.LAST_90_DAYS:
      start.setDate(start.getDate() - 90);
      break;
    case TimeRange.LAST_365_DAYS:
      start.setDate(start.getDate() - 365);
      break;
    case TimeRange.CUSTOM:
      return null;
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
  }
  
  return { start, end };
}

function getPreviousPeriodRange(timeRange: TimeRange): DateRange {
  const current = getDateRange(timeRange);
  if (!current) {
    throw new Error("Custom time range requires AnalyticsQuery.customDateRange");
  }
  const duration = current.end.getTime() - current.start.getTime();
  
  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.end.getTime() - duration),
  };
}

function createKPIResult(
  value: number,
  previousValue: number,
  direction: "higher_better" | "lower_better" = "higher_better",
  target?: number
): KPIResult {
  const change = value - previousValue;
  const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
  
  let trend: "up" | "down" | "stable" = "stable";
  if (Math.abs(changePercent) > 1) {
    trend = change > 0 ? "up" : "down";
  }
  
  const result: KPIResult = {
    value,
    previousValue,
    change,
    changePercent,
    trend,
  };
  
  if (target !== undefined) {
    result.target = target;
    // For lower_better metrics (like costs), being under target is good
    // Formula: lower_better - value at or below target = 100%, above target decreases proportionally
    if (direction === "higher_better") {
      result.targetAchievement = (value / target) * 100;
    } else {
      // lower_better: at target = 100%, below target = 100%, above target = (target/value)*100
      result.targetAchievement = value <= target ? 100 : target > 0 ? (target / value) * 100 : 100;
    }
  }
  
  return result;
}

async function calculateRevenueKPI(
  orgId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<KPIResult> {
  const db = await getDatabase();
  
  const pipeline = (range: DateRange) => [
    {
      $match: {
        org_id: orgId,
        date: { $gte: range.start, $lte: range.end },
        type: "income",
        status: "completed",
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ];
  
  const [current, previous] = await Promise.all([
    db.collection("transactions").aggregate(pipeline(dateRange)).toArray(),
    db.collection("transactions").aggregate(pipeline(previousRange)).toArray(),
  ]);
  
  return createKPIResult(
    current[0]?.total || 0,
    previous[0]?.total || 0,
    "higher_better"
  );
}

async function calculateOccupancyKPI(
  orgId: string,
  _dateRange: DateRange
): Promise<KPIResult> {
  const db = await getDatabase();
  
  const [total, occupied] = await Promise.all([
    db.collection("units").countDocuments({ org_id: orgId, status: "active" }),
    db.collection("units").countDocuments({ 
      org_id: orgId, 
      status: "active", 
      occupancy_status: "occupied" 
    }),
  ]);
  
  const rate = total > 0 ? (occupied / total) * 100 : 0;
  
  return createKPIResult(rate, 0, "higher_better", 95);
}

async function calculateCollectionKPI(
  orgId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<KPIResult> {
  const db = await getDatabase();
  
  const pipeline = (range: DateRange) => [
    {
      $match: {
        org_id: orgId,
        dueDate: { $lte: range.end },
        status: "paid",
        paidAt: { $gte: range.start, $lte: range.end },
      },
    },
    { $group: { _id: null, collected: { $sum: "$amount" } } },
  ];
  
  const duePipeline = (range: DateRange) => [
    {
      $match: {
        org_id: orgId,
        dueDate: { $gte: range.start, $lte: range.end },
      },
    },
    { $group: { _id: null, due: { $sum: "$amount" } } },
  ];
  
  const [collected, due, prevCollected, prevDue] = await Promise.all([
    db.collection("invoices").aggregate(pipeline(dateRange)).toArray(),
    db.collection("invoices").aggregate(duePipeline(dateRange)).toArray(),
    db.collection("invoices").aggregate(pipeline(previousRange)).toArray(),
    db.collection("invoices").aggregate(duePipeline(previousRange)).toArray(),
  ]);
  
  const rate = due[0]?.due > 0 ? ((collected[0]?.collected || 0) / due[0].due) * 100 : 0;
  const prevRate = prevDue[0]?.due > 0 ? ((prevCollected[0]?.collected || 0) / prevDue[0].due) * 100 : 0;
  
  return createKPIResult(rate, prevRate, "higher_better", 95);
}

async function calculateMaintenanceCostKPI(
  orgId: string,
  dateRange: DateRange,
  previousRange: DateRange
): Promise<KPIResult> {
  const db = await getDatabase();
  
  const pipeline = (range: DateRange) => [
    {
      $match: {
        org_id: orgId,
        completedAt: { $gte: range.start, $lte: range.end },
      },
    },
    { $group: { _id: null, total: { $sum: "$actualCost" } } },
  ];
  
  const [current, previous] = await Promise.all([
    db.collection("work_orders").aggregate(pipeline(dateRange)).toArray(),
    db.collection("work_orders").aggregate(pipeline(previousRange)).toArray(),
  ]);
  
  return createKPIResult(
    current[0]?.total || 0,
    previous[0]?.total || 0,
    "lower_better"
  );
}

async function calculateSatisfactionKPI(
  orgId: string,
  dateRange: DateRange
): Promise<KPIResult> {
  const db = await getDatabase();
  
  const pipeline = [
    {
      $match: {
        org_id: orgId,
        rating: { $exists: true },
        // Apply date range filter if feedback has createdAt field
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } },
  ];
  
  const result = await db.collection("feedback")
    .aggregate(pipeline).toArray();
  
  const satisfaction = (result[0]?.avgRating || 0) * 20; // Convert 5-star to percentage
  
  return createKPIResult(satisfaction, 0, "higher_better", 80);
}

async function getMetricValue(
  orgId: string,
  metric: string,
  dateRange: DateRange
): Promise<number> {
  const db = await getDatabase();
  
  const pipeline = [
    {
      $match: {
        org_id: orgId,
        kpiCode: metric,
        date: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    { $group: { _id: null, value: { $avg: "$value" } } },
  ];
  
  const result = await db.collection(KPI_VALUES_COLLECTION)
    .aggregate(pipeline).toArray();
  
  return result[0]?.value || 0;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // KPIs
  getExecutiveKPIs,
  getFinanceKPIs,
  getOperationsKPIs,
  getPropertyKPIs,
  getHRKPIs,
  
  // Dashboards
  createDashboard,
  getDashboard,
  listDashboards,
  getDefaultDashboard,
  addWidget,
  removeWidget,
  
  // Analytics
  getTrendData,
  getComparisonData,
};
