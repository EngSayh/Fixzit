/**
 * Dashboard-specific types for analytics and KPI management
 */

import { BaseEntity, User, DateFilter } from './api';

export interface DashboardStats {
  totalProperties: StatMetric;
  activeWorkOrders: StatMetric;
  monthlyRevenue: CurrencyMetric;
  occupancyRate: PercentageMetric;
  maintenanceCosts: CurrencyMetric;
  tenantSatisfaction: RatingMetric;
  overduePayments: CurrencyMetric;
  energyConsumption: StatMetric;
  completionRate: PercentageMetric;
  responseTime: DurationMetric;
}

export interface StatMetric {
  value: number;
  change: MetricChange;
  trend?: TrendData[];
  target?: number;
  unit?: string;
}

export interface CurrencyMetric {
  value: string | number;
  currency: string;
  change: MetricChange;
  trend?: TrendData[];
  target?: number;
}

export interface PercentageMetric {
  value: number;
  change: MetricChange;
  trend?: TrendData[];
  target?: number;
  maxValue: number;
}

export interface RatingMetric {
  value: number;
  maxValue: number;
  change: MetricChange;
  distribution?: RatingDistribution[];
  target?: number;
}

export interface DurationMetric {
  value: number;
  unit: 'minutes' | 'hours' | 'days';
  change: MetricChange;
  trend?: TrendData[];
  target?: number;
}

export interface MetricChange {
  value: number;
  type: 'increase' | 'decrease' | 'none';
  period: string;
  isPositive?: boolean;
}

export interface TrendData {
  label: string;
  value: number;
  date?: string;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface ChartData {
  workOrdersLastWeek: ChartDataPoint[];
  propertyTypes: PieChartData[];
  revenueMonthly: ChartDataPoint[];
  maintenanceByCategory: ChartDataPoint[];
  occupancyTrend: ChartDataPoint[];
  expenseBreakdown: PieChartData[];
  responseTimeByPriority: ChartDataPoint[];
  satisfactionByProperty: ChartDataPoint[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  category?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface PieChartData {
  label: string;
  value: number;
  color: string;
  percentage?: number;
}

export interface DashboardFilter {
  dateRange?: DateFilter;
  propertyIds?: string[];
  categories?: string[];
  status?: string[];
  assignedTo?: string[];
  priority?: string[];
  customFilters?: Record<string, any>;
}

export interface DashboardAlert extends BaseEntity {
  type: 'threshold' | 'anomaly' | 'target' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  thresholdValue?: number;
  propertyId?: string;
  workOrderId?: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface KPIConfiguration {
  id: string;
  name: string;
  description: string;
  metric: keyof DashboardStats;
  visible: boolean;
  order: number;
  thresholds: {
    warning?: number;
    critical?: number;
  };
  target?: number;
  format: 'number' | 'currency' | 'percentage' | 'duration' | 'rating';
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  permissions: string[];
}

export interface AnalyticsEvent extends BaseEntity {
  eventType: string;
  eventName: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  timestamp: string;
  source: 'web' | 'mobile' | 'api' | 'system';
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  page?: string;
}

export interface BusinessMetric extends BaseEntity {
  name: string;
  category: string;
  description: string;
  formula: string;
  value: number;
  unit?: string;
  frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  lastCalculated: string;
  trend: 'up' | 'down' | 'stable';
  benchmarks?: {
    industry?: number;
    internal?: number;
    target?: number;
  };
  dependencies: string[];
}

export interface ReportSchedule extends BaseEntity {
  name: string;
  description?: string;
  reportType: 'dashboard' | 'kpi' | 'analytics' | 'operational';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: {
    dayOfWeek?: number; // 0-6, Sunday = 0
    dayOfMonth?: number; // 1-31
    time: string; // HH:MM format
    timezone: string;
  };
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'email';
  filters?: DashboardFilter;
  includeCharts: boolean;
  includeData: boolean;
  isActive: boolean;
  lastRun?: string;
  nextRun: string;
}

export interface DashboardExport {
  id: string;
  type: 'pdf' | 'excel' | 'png' | 'svg';
  title: string;
  description?: string;
  filters: DashboardFilter;
  includeCharts: boolean;
  includeData: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  generatedAt?: string;
  expiresAt: string;
  requestedBy: string;
  error?: string;
}

export interface PropertyPerformance {
  propertyId: string;
  propertyName: string;
  metrics: {
    occupancyRate: number;
    revenue: number;
    expenses: number;
    netIncome: number;
    workOrderCount: number;
    avgResponseTime: number;
    tenantSatisfaction: number;
    maintenanceScore: number;
  };
  trends: {
    occupancy: TrendData[];
    revenue: TrendData[];
    expenses: TrendData[];
    satisfaction: TrendData[];
  };
  rank: number;
  benchmarks: {
    market: number;
    portfolio: number;
  };
}

export interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  metrics: {
    completionRate: number;
    avgResponseTime: number;
    qualityScore: number;
    costEfficiency: number;
    reliability: number;
    customerSatisfaction: number;
  };
  workOrderStats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  financials: {
    totalSpent: number;
    avgJobCost: number;
    paymentHistory: {
      onTime: number;
      late: number;
      disputed: number;
    };
  };
}

export interface TenantSatisfactionSurvey extends BaseEntity {
  tenantId: string;
  propertyId: string;
  surveyType: 'annual' | 'move_in' | 'move_out' | 'maintenance' | 'general';
  responses: {
    questionId: string;
    question: string;
    answer: string | number;
    type: 'rating' | 'text' | 'multiple_choice' | 'boolean';
  }[];
  overallRating: number;
  npsScore?: number; // Net Promoter Score
  completedAt: string;
  followUpRequired: boolean;
  comments?: string;
  metadata?: Record<string, any>;
}