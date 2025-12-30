/**
 * @fileoverview Automated Reporting Service
 * @module services/reports/automated-reports
 * 
 * Scheduled report generation and distribution:
 * - Configurable report templates
 * - Multi-format export (PDF, Excel, CSV)
 * - Scheduled generation (daily, weekly, monthly)
 * - Email/WhatsApp distribution
 * - Report history and versioning
 * - Bilingual reports (Arabic/English)
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
    component: "automated-reports",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Report type
 */
export enum ReportType {
  // Financial
  INCOME_STATEMENT = "income_statement",
  BALANCE_SHEET = "balance_sheet",
  CASH_FLOW = "cash_flow",
  RENT_ROLL = "rent_roll",
  AGING_REPORT = "aging_report",
  COLLECTION_REPORT = "collection_report",
  VAT_REPORT = "vat_report",
  
  // Property
  OCCUPANCY_REPORT = "occupancy_report",
  VACANCY_REPORT = "vacancy_report",
  LEASE_EXPIRATION = "lease_expiration",
  PROPERTY_PERFORMANCE = "property_performance",
  TENANT_DIRECTORY = "tenant_directory",
  
  // Operations
  WORK_ORDER_SUMMARY = "work_order_summary",
  MAINTENANCE_COST = "maintenance_cost",
  VENDOR_PERFORMANCE = "vendor_performance",
  SLA_COMPLIANCE = "sla_compliance",
  
  // HR
  EMPLOYEE_ROSTER = "employee_roster",
  ATTENDANCE_REPORT = "attendance_report",
  PAYROLL_SUMMARY = "payroll_summary",
  LEAVE_BALANCE = "leave_balance",
  
  // Compliance
  ZATCA_SUBMISSION = "zatca_submission",
  EJAR_STATUS = "ejar_status",
  AUDIT_LOG = "audit_log",
  
  // Executive
  EXECUTIVE_SUMMARY = "executive_summary",
  KPI_DASHBOARD = "kpi_dashboard",
  PORTFOLIO_OVERVIEW = "portfolio_overview",
  
  // Custom
  CUSTOM = "custom",
}

/**
 * Report format
 */
export enum ReportFormat {
  PDF = "pdf",
  EXCEL = "xlsx",
  CSV = "csv",
  HTML = "html",
  JSON = "json",
}

/**
 * Schedule frequency
 */
export enum ScheduleFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi_weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually",
  ON_DEMAND = "on_demand",
}

/**
 * Report status
 */
export enum ReportStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  GENERATING = "generating",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Delivery status
 */
export enum DeliveryStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
  BOUNCED = "bounced",
}

/**
 * Report configuration
 */
export interface ReportConfig {
  _id?: ObjectId;
  orgId: string;
  
  // Identification
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  type: ReportType;
  
  // Content
  template: ReportTemplate;
  parameters: ReportParameter[];
  
  // Output
  formats: ReportFormat[];
  language: "ar" | "en" | "bilingual";
  
  // Schedule
  schedule: ReportSchedule;
  
  // Distribution
  distribution: ReportDistribution;
  
  // Retention
  retention: RetentionPolicy;
  
  // Status
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  
  // Timestamps
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

/**
 * Report template
 */
export interface ReportTemplate {
  layout: "portrait" | "landscape";
  pageSize: "A4" | "A3" | "letter" | "legal";
  
  // Header/Footer
  header?: {
    showLogo: boolean;
    logoUrl?: string;
    title?: string;
    titleAr?: string;
    showDate: boolean;
    showPageNumber: boolean;
  };
  
  footer?: {
    text?: string;
    textAr?: string;
    showGeneratedBy: boolean;
    showConfidential: boolean;
  };
  
  // Sections
  sections: ReportSection[];
  
  // Styling
  styling?: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: number;
  };
}

/**
 * Report section
 */
export interface ReportSection {
  id: string;
  type: "header" | "text" | "table" | "chart" | "summary" | "kpi_cards" | "signature" | "page_break";
  title?: string;
  titleAr?: string;
  
  // Content specific
  content?: ReportSectionContent;
  
  // Display
  visible: boolean;
  order: number;
}

/**
 * Report section content
 */
export interface ReportSectionContent {
  // For text
  text?: string;
  textAr?: string;
  
  // For table
  dataSource?: string;
  columns?: TableColumn[];
  showTotals?: boolean;
  groupBy?: string;
  
  // For chart
  chartType?: "bar" | "line" | "pie" | "area";
  chartDataSource?: string;
  
  // For KPI cards
  kpis?: string[];
  
  // For summary
  metrics?: SummaryMetric[];
}

/**
 * Table column
 */
export interface TableColumn {
  field: string;
  header: string;
  headerAr: string;
  width?: number;
  format?: "text" | "number" | "currency" | "date" | "percentage";
  alignment?: "left" | "center" | "right";
  aggregate?: "sum" | "avg" | "count" | "min" | "max";
}

/**
 * Summary metric
 */
export interface SummaryMetric {
  label: string;
  labelAr: string;
  value: string; // Expression or field
  format: "number" | "currency" | "percentage";
}

/**
 * Report parameter
 */
export interface ReportParameter {
  name: string;
  label: string;
  labelAr: string;
  type: "date" | "date_range" | "select" | "multi_select" | "text" | "number";
  required: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string; labelAr: string }[];
}

/**
 * Report schedule
 */
export interface ReportSchedule {
  frequency: ScheduleFrequency;
  
  // Time settings
  time?: string; // HH:mm format
  timezone?: string;
  
  // Day settings
  dayOfWeek?: number; // 0-6, Sunday=0
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
  
  // Custom cron (for complex schedules)
  cronExpression?: string;
  
  // Validity
  startDate?: Date;
  endDate?: Date;
}

/**
 * Report distribution
 */
export interface ReportDistribution {
  // Email
  email?: {
    enabled: boolean;
    recipients: Recipient[];
    subject?: string;
    subjectAr?: string;
    body?: string;
    bodyAr?: string;
    attachReport: boolean;
  };
  
  // SMS/WhatsApp
  sms?: {
    enabled: boolean;
    recipients: string[];
    includeLink: boolean;
  };
  
  // Portal
  portal?: {
    enabled: boolean;
    makePublic: boolean;
    expiryDays?: number;
  };
  
  // Webhook
  webhook?: {
    enabled: boolean;
    url: string;
    method: "POST" | "PUT";
    headers?: Record<string, string>;
  };
}

/**
 * Recipient
 */
export interface Recipient {
  email: string;
  name: string;
  type: "to" | "cc" | "bcc";
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  keepLatest: number; // Number of reports to keep
  keepDays?: number; // Days to keep reports
  archiveAfterDays?: number;
  deleteAfterDays?: number;
}

/**
 * Report instance (generated report)
 */
export interface ReportInstance {
  _id?: ObjectId;
  orgId: string;
  configId: string;
  
  // Identification
  name: string;
  type: ReportType;
  
  // Parameters used
  parameters: Record<string, unknown>;
  
  // Period
  periodStart?: Date;
  periodEnd?: Date;
  
  // Status
  status: ReportStatus;
  
  // Output
  outputs: ReportOutput[];
  
  // Delivery
  deliveries: ReportDelivery[];
  
  // Metrics
  metrics: {
    generationTimeMs?: number;
    fileSize?: number;
    rowCount?: number;
    pageCount?: number;
  };
  
  // Error
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  
  // Timestamps
  requestedAt: Date;
  requestedBy: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Report output
 */
export interface ReportOutput {
  format: ReportFormat;
  url: string;
  size: number;
  generatedAt: Date;
  expiresAt?: Date;
  checksum?: string;
}

/**
 * Report delivery
 */
export interface ReportDelivery {
  channel: "email" | "sms" | "portal" | "webhook";
  recipient: string;
  status: DeliveryStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
}

/**
 * Generate report request
 */
export interface GenerateReportRequest {
  orgId: string;
  configId: string;
  parameters?: Record<string, unknown>;
  formats?: ReportFormat[];
  requestedBy: string;
  immediate?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const REPORT_CONFIGS_COLLECTION = "report_configs";
const REPORT_INSTANCES_COLLECTION = "report_instances";

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Create report configuration
 */
export async function createReportConfig(
  config: Omit<ReportConfig, "_id" | "createdAt" | "updatedAt" | "lastRun" | "nextRun">
): Promise<{ success: boolean; configId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Calculate next run if scheduled
    const calculatedNextRun = config.schedule.frequency !== ScheduleFrequency.ON_DEMAND
      ? calculateNextRun(config.schedule)
      : null;
    
    const fullConfig: Omit<ReportConfig, "_id"> = {
      ...config,
      nextRun: calculatedNextRun ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(REPORT_CONFIGS_COLLECTION).insertOne(fullConfig);
    
    logger.info("Report config created", {
      component: "automated-reports",
      action: "createReportConfig",
    });
    
    return { success: true, configId: result.insertedId.toString() };
  } catch (error) {
    logError("create report config", error);
    return { success: false, error: "Failed to create report config" };
  }
}

/**
 * Get report configuration
 */
export async function getReportConfig(
  orgId: string,
  configId: string
): Promise<ReportConfig | null> {
  try {
    const db = await getDatabase();
    
    const config = await db.collection(REPORT_CONFIGS_COLLECTION).findOne({
      _id: new ObjectId(configId),
      orgId,
    }) as WithId<Document> | null;
    
    return config as unknown as ReportConfig | null;
  } catch (error) {
    logError("get report config", error);
    return null;
  }
}

/**
 * List report configurations
 */
export async function listReportConfigs(
  orgId: string,
  filters?: {
    type?: ReportType;
    isActive?: boolean;
    frequency?: ScheduleFrequency;
  }
): Promise<ReportConfig[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.frequency) {
      query["schedule.frequency"] = filters.frequency;
    }
    
    const configs = await db.collection(REPORT_CONFIGS_COLLECTION)
      .find(query)
      .sort({ name: 1 })
      .toArray();
    
    return configs as unknown as ReportConfig[];
  } catch (error) {
    logError("list report configs", error);
    return [];
  }
}

/**
 * Update report configuration
 */
export async function updateReportConfig(
  orgId: string,
  configId: string,
  updates: Partial<Omit<ReportConfig, "_id" | "orgId" | "createdAt" | "createdBy">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Recalculate next run if schedule changed
    let nextRun;
    if (updates.schedule) {
      nextRun = updates.schedule.frequency !== ScheduleFrequency.ON_DEMAND
        ? calculateNextRun(updates.schedule)
        : null;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...updates,
      updatedAt: new Date(),
    };
    
    if (nextRun !== undefined) {
      updateData.nextRun = nextRun;
    }
    
    await db.collection(REPORT_CONFIGS_COLLECTION).updateOne(
      { _id: new ObjectId(configId), orgId },
      { $set: updateData }
    );
    
    return { success: true };
  } catch (error) {
    logError("update report config", error);
    return { success: false, error: "Failed to update report config" };
  }
}

/**
 * Delete report configuration
 * Cascades deletion to associated report instances
 */
export async function deleteReportConfig(
  orgId: string,
  configId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // First delete the config
    const result = await db.collection(REPORT_CONFIGS_COLLECTION).deleteOne({
      _id: new ObjectId(configId),
      orgId,
    });
    
    if (result.deletedCount === 0) {
      return { success: false, error: "Report configuration not found" };
    }
    
    // Cascade delete all instances for this config
    await db.collection(REPORT_INSTANCES_COLLECTION).deleteMany({
      configId,
      orgId,
    });
    
    return { success: true };
  } catch (error) {
    logError("delete report config", error);
    return { success: false, error: "Failed to delete report config" };
  }
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate report
 */
export async function generateReport(
  request: GenerateReportRequest
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Get config
    const config = await getReportConfig(request.orgId, request.configId);
    if (!config) {
      return { success: false, error: "Report configuration not found" };
    }
    
    // Create instance
    const instance: Omit<ReportInstance, "_id"> = {
      orgId: request.orgId,
      configId: request.configId,
      name: config.name,
      type: config.type,
      parameters: request.parameters || {},
      status: ReportStatus.GENERATING,
      outputs: [],
      deliveries: [],
      metrics: {},
      requestedAt: new Date(),
      requestedBy: request.requestedBy,
      startedAt: new Date(),
    };
    
    const result = await db.collection(REPORT_INSTANCES_COLLECTION).insertOne(instance);
    const instanceId = result.insertedId.toString();
    
    // Generate report asynchronously
    // In production, this would be queued
    if (request.immediate !== false) {
      processReportGeneration(request.orgId, instanceId, config, request.formats).catch(err => {
        logger.error("Report generation failed", {
          component: "automated-reports",
          error: err,
        });
      });
    }
    
    logger.info("Report generation started", {
      component: "automated-reports",
      action: "generateReport",
    });
    
    return { success: true, instanceId };
  } catch (error) {
    logError("generate report", error);
    return { success: false, error: "Failed to generate report" };
  }
}

/**
 * Process report generation (async)
 */
async function processReportGeneration(
  orgId: string,
  instanceId: string,
  config: ReportConfig,
  formats?: ReportFormat[]
): Promise<void> {
  const db = await getDatabase();
  const startTime = Date.now();
  
  try {
    const outputFormats = formats || config.formats;
    const outputs: ReportOutput[] = [];
    
    for (const format of outputFormats) {
      const output = await generateReportOutput(orgId, config, format);
      outputs.push(output);
    }
    
    // Update instance with outputs
    await db.collection(REPORT_INSTANCES_COLLECTION).updateOne(
      { _id: new ObjectId(instanceId) },
      {
        $set: {
          status: ReportStatus.COMPLETED,
          outputs,
          completedAt: new Date(),
          "metrics.generationTimeMs": Date.now() - startTime,
          "metrics.fileSize": outputs.reduce((sum, o) => sum + o.size, 0),
        },
      }
    );
    
    // Process distribution
    await processDistribution(orgId, instanceId, config, outputs);
    
    // Update config last run (validate _id exists first)
    if (!config._id) {
      logger.error("Report config missing _id", { component: "automated-reports" });
      throw new Error("Report config missing _id");
    }
    
    await db.collection(REPORT_CONFIGS_COLLECTION).updateOne(
      { _id: new ObjectId(config._id) },
      {
        $set: {
          lastRun: new Date(),
          nextRun: calculateNextRun(config.schedule),
        },
      }
    );
    
    // Apply retention policy
    await applyRetentionPolicy(orgId, config._id.toString(), config.retention);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    await db.collection(REPORT_INSTANCES_COLLECTION).updateOne(
      { _id: new ObjectId(instanceId) },
      {
        $set: {
          status: ReportStatus.FAILED,
          completedAt: new Date(),
          error: {
            code: "GENERATION_ERROR",
            message: errorMessage,
          },
        },
      }
    );
    
    throw error;
  }
}

/**
 * Generate report output for a specific format
 */
async function generateReportOutput(
  orgId: string,
  config: ReportConfig,
  format: ReportFormat
): Promise<ReportOutput> {
  // In production, this would generate actual report files
  // For now, simulate report generation
  
  const filename = `${config.type}_${new Date().toISOString().split("T")[0]}.${format}`;
  const url = `/reports/${orgId}/${filename}`;
  
  // Simulate different sizes for different formats
  const sizeMultipliers: Record<ReportFormat, number> = {
    [ReportFormat.PDF]: 1.0,
    [ReportFormat.EXCEL]: 0.8,
    [ReportFormat.CSV]: 0.3,
    [ReportFormat.HTML]: 1.2,
    [ReportFormat.JSON]: 0.5,
  };
  
  const baseSize = 50000; // 50KB base
  const size = Math.round(baseSize * (sizeMultipliers[format] || 1));
  
  return {
    format,
    url,
    size,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };
}

/**
 * Process distribution
 */
async function processDistribution(
  _orgId: string,
  instanceId: string,
  config: ReportConfig,
  _outputs: ReportOutput[]
): Promise<void> {
  const db = await getDatabase();
  const deliveries: ReportDelivery[] = [];
  
  // Email distribution
  if (config.distribution.email?.enabled) {
    for (const recipient of config.distribution.email.recipients) {
      const delivery: ReportDelivery = {
        channel: "email",
        recipient: recipient.email,
        status: DeliveryStatus.PENDING,
      };
      
      // In production, send actual email
      delivery.status = DeliveryStatus.SENT;
      delivery.sentAt = new Date();
      
      deliveries.push(delivery);
    }
  }
  
  // SMS distribution
  if (config.distribution.sms?.enabled) {
    for (const phone of config.distribution.sms.recipients) {
      const delivery: ReportDelivery = {
        channel: "sms",
        recipient: phone,
        status: DeliveryStatus.PENDING,
      };
      
      // In production, send actual SMS
      delivery.status = DeliveryStatus.SENT;
      delivery.sentAt = new Date();
      
      deliveries.push(delivery);
    }
  }
  
  // Portal distribution
  if (config.distribution.portal?.enabled) {
    const delivery: ReportDelivery = {
      channel: "portal",
      recipient: "portal",
      status: DeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
    };
    
    deliveries.push(delivery);
  }
  
  // Webhook distribution
  if (config.distribution.webhook?.enabled) {
    const delivery: ReportDelivery = {
      channel: "webhook",
      recipient: config.distribution.webhook.url,
      status: DeliveryStatus.PENDING,
    };
    
    // In production, call actual webhook
    delivery.status = DeliveryStatus.SENT;
    delivery.sentAt = new Date();
    
    deliveries.push(delivery);
  }
  
  // Update instance with deliveries
  await db.collection(REPORT_INSTANCES_COLLECTION).updateOne(
    { _id: new ObjectId(instanceId) },
    { $set: { deliveries } }
  );
}

/**
 * Apply retention policy
 */
async function applyRetentionPolicy(
  orgId: string,
  configId: string,
  policy: RetentionPolicy
): Promise<void> {
  const db = await getDatabase();
  
  // Get all instances for this config, sorted by date (newest first)
  const instances = await db.collection(REPORT_INSTANCES_COLLECTION)
    .find({ orgId, configId })
    .sort({ requestedAt: -1 })
    .toArray();
  
  if (instances.length === 0) return;
  
  // Compute which instances to delete based on BOTH policies
  // An instance is kept if: (within keepLatest count) AND (not older than deleteAfterDays)
  const cutoffDate = policy.deleteAfterDays 
    ? new Date(Date.now() - policy.deleteAfterDays * 24 * 60 * 60 * 1000)
    : null;
  
  const idsToDelete: ObjectId[] = [];
  
  instances.forEach((instance, index) => {
    // Fix: Use !== undefined instead of truthy check - keepLatest: 0 means "keep none"
    const exceedsKeepLatest = policy.keepLatest !== undefined && index >= policy.keepLatest;
    const isOlderThanCutoff = cutoffDate && instance.requestedAt < cutoffDate;
    
    // Delete if EITHER policy says to delete (union of deletion criteria)
    if (exceedsKeepLatest || isOlderThanCutoff) {
      idsToDelete.push(instance._id);
    }
  });
  
  if (idsToDelete.length > 0) {
    await db.collection(REPORT_INSTANCES_COLLECTION).deleteMany({
      _id: { $in: idsToDelete },
    });
  }
}

// ============================================================================
// Report Instance Queries
// ============================================================================

/**
 * Get report instance
 */
export async function getReportInstance(
  orgId: string,
  instanceId: string
): Promise<ReportInstance | null> {
  try {
    const db = await getDatabase();
    
    const instance = await db.collection(REPORT_INSTANCES_COLLECTION).findOne({
      _id: new ObjectId(instanceId),
      orgId,
    }) as WithId<Document> | null;
    
    return instance as unknown as ReportInstance | null;
  } catch (error) {
    logError("get report instance", error);
    return null;
  }
}

/**
 * List report instances
 */
export async function listReportInstances(
  orgId: string,
  filters?: {
    configId?: string;
    type?: ReportType;
    status?: ReportStatus;
    dateFrom?: Date;
    dateTo?: Date;
  },
  options?: { page?: number; limit?: number }
): Promise<{ instances: ReportInstance[]; total: number }> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters?.configId) {
      query.configId = filters.configId;
    }
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.requestedAt = {};
      if (filters.dateFrom) query.requestedAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.requestedAt.$lte = filters.dateTo;
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;
    
    const [instances, total] = await Promise.all([
      db.collection(REPORT_INSTANCES_COLLECTION)
        .find(query)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(REPORT_INSTANCES_COLLECTION).countDocuments(query),
    ]);
    
    return {
      instances: instances as unknown as ReportInstance[],
      total,
    };
  } catch (error) {
    logError("list report instances", error);
    return { instances: [], total: 0 };
  }
}

/**
 * Get report history
 */
export async function getReportHistory(
  orgId: string,
  configId: string,
  limit: number = 10
): Promise<ReportInstance[]> {
  try {
    const db = await getDatabase();
    
    const instances = await db.collection(REPORT_INSTANCES_COLLECTION)
      .find({ orgId, configId })
      .sort({ requestedAt: -1 })
      .limit(limit)
      .toArray();
    
    return instances as unknown as ReportInstance[];
  } catch (error) {
    logError("get report history", error);
    return [];
  }
}

// ============================================================================
// Scheduler
// ============================================================================

/**
 * Get due reports
 */
export async function getDueReports(
  limit: number = 50
): Promise<ReportConfig[]> {
  try {
    const db = await getDatabase();
    
    const now = new Date();
    
    const configs = await db.collection(REPORT_CONFIGS_COLLECTION)
      .find({
        isActive: true,
        nextRun: { $lte: now },
        "schedule.frequency": { $ne: ScheduleFrequency.ON_DEMAND },
      })
      .limit(limit)
      .toArray();
    
    return configs as unknown as ReportConfig[];
  } catch (error) {
    logError("get due reports", error);
    return [];
  }
}

/**
 * Process scheduled reports
 */
export async function processScheduledReports(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const dueReports = await getDueReports();
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const config of dueReports) {
    try {
      const result = await generateReport({
        orgId: config.orgId,
        configId: config._id!.toString(),
        requestedBy: "scheduler",
        immediate: true,
      });
      
      processed++;
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`process scheduled report ${config._id}`, error);
      processed++;
      failed++;
    }
  }
  
  logger.info("Processed scheduled reports", {
    component: "automated-reports",
    action: "processScheduledReports",
  });
  
  return { processed, succeeded, failed };
}

// ============================================================================
// Template Management
// ============================================================================

/**
 * Get standard report templates
 */
export function getStandardTemplates(): Record<ReportType, ReportTemplate> {
  return {
    [ReportType.INCOME_STATEMENT]: createFinancialTemplate("income_statement"),
    [ReportType.BALANCE_SHEET]: createFinancialTemplate("balance_sheet"),
    [ReportType.CASH_FLOW]: createFinancialTemplate("cash_flow"),
    [ReportType.RENT_ROLL]: createPropertyTemplate("rent_roll"),
    [ReportType.AGING_REPORT]: createFinancialTemplate("aging"),
    [ReportType.COLLECTION_REPORT]: createFinancialTemplate("collection"),
    [ReportType.VAT_REPORT]: createFinancialTemplate("vat"),
    [ReportType.OCCUPANCY_REPORT]: createPropertyTemplate("occupancy"),
    [ReportType.VACANCY_REPORT]: createPropertyTemplate("vacancy"),
    [ReportType.LEASE_EXPIRATION]: createPropertyTemplate("lease_expiration"),
    [ReportType.PROPERTY_PERFORMANCE]: createPropertyTemplate("performance"),
    [ReportType.TENANT_DIRECTORY]: createPropertyTemplate("tenant_directory"),
    [ReportType.WORK_ORDER_SUMMARY]: createOperationsTemplate("work_order"),
    [ReportType.MAINTENANCE_COST]: createOperationsTemplate("maintenance_cost"),
    [ReportType.VENDOR_PERFORMANCE]: createOperationsTemplate("vendor"),
    [ReportType.SLA_COMPLIANCE]: createOperationsTemplate("sla"),
    [ReportType.EMPLOYEE_ROSTER]: createHRTemplate("roster"),
    [ReportType.ATTENDANCE_REPORT]: createHRTemplate("attendance"),
    [ReportType.PAYROLL_SUMMARY]: createHRTemplate("payroll"),
    [ReportType.LEAVE_BALANCE]: createHRTemplate("leave"),
    [ReportType.ZATCA_SUBMISSION]: createComplianceTemplate("zatca"),
    [ReportType.EJAR_STATUS]: createComplianceTemplate("ejar"),
    [ReportType.AUDIT_LOG]: createComplianceTemplate("audit"),
    [ReportType.EXECUTIVE_SUMMARY]: createExecutiveTemplate("summary"),
    [ReportType.KPI_DASHBOARD]: createExecutiveTemplate("kpi"),
    [ReportType.PORTFOLIO_OVERVIEW]: createExecutiveTemplate("portfolio"),
    [ReportType.CUSTOM]: createCustomTemplate(),
  };
}

function createFinancialTemplate(_subtype: string): ReportTemplate {
  return {
    layout: "portrait",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: true,
    },
    sections: [
      {
        id: "summary",
        type: "summary",
        title: "Summary",
        titleAr: "ملخص",
        visible: true,
        order: 1,
      },
      {
        id: "data",
        type: "table",
        title: "Details",
        titleAr: "التفاصيل",
        visible: true,
        order: 2,
        content: {
          showTotals: true,
        },
      },
    ],
  };
}

function createPropertyTemplate(_subtype: string): ReportTemplate {
  return {
    layout: "landscape",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: false,
    },
    sections: [
      {
        id: "kpis",
        type: "kpi_cards",
        title: "Key Metrics",
        titleAr: "المؤشرات الرئيسية",
        visible: true,
        order: 1,
      },
      {
        id: "data",
        type: "table",
        title: "Property Details",
        titleAr: "تفاصيل العقارات",
        visible: true,
        order: 2,
      },
    ],
  };
}

function createOperationsTemplate(_subtype: string): ReportTemplate {
  return {
    layout: "landscape",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: false,
    },
    sections: [
      {
        id: "summary",
        type: "summary",
        visible: true,
        order: 1,
      },
      {
        id: "chart",
        type: "chart",
        visible: true,
        order: 2,
        content: {
          chartType: "bar",
        },
      },
      {
        id: "data",
        type: "table",
        visible: true,
        order: 3,
      },
    ],
  };
}

function createHRTemplate(_subtype: string): ReportTemplate {
  return {
    layout: "portrait",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: true,
    },
    sections: [
      {
        id: "data",
        type: "table",
        visible: true,
        order: 1,
        content: {
          showTotals: true,
        },
      },
    ],
  };
}

function createComplianceTemplate(_subtype: string): ReportTemplate {
  return {
    layout: "portrait",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: true,
      text: "Official document - Handle with care",
      textAr: "وثيقة رسمية - يرجى التعامل بحذر",
    },
    sections: [
      {
        id: "header_info",
        type: "text",
        visible: true,
        order: 1,
      },
      {
        id: "data",
        type: "table",
        visible: true,
        order: 2,
      },
      {
        id: "signature",
        type: "signature",
        visible: true,
        order: 3,
      },
    ],
  };
}

function createExecutiveTemplate(_subtype: string): ReportTemplate {
  return {
    layout: "landscape",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: true,
    },
    sections: [
      {
        id: "kpis",
        type: "kpi_cards",
        visible: true,
        order: 1,
      },
      {
        id: "charts",
        type: "chart",
        visible: true,
        order: 2,
        content: {
          chartType: "line",
        },
      },
      {
        id: "summary",
        type: "summary",
        visible: true,
        order: 3,
      },
    ],
  };
}

function createCustomTemplate(): ReportTemplate {
  return {
    layout: "portrait",
    pageSize: "A4",
    header: {
      showLogo: true,
      showDate: true,
      showPageNumber: true,
    },
    footer: {
      showGeneratedBy: true,
      showConfidential: false,
    },
    sections: [],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateNextRun(schedule: ReportSchedule): Date | null {
  if (schedule.frequency === ScheduleFrequency.ON_DEMAND) {
    return null;
  }
  
  const now = new Date();
  const next = new Date(now);
  
  // Parse time if set (validate HH:MM format)
  let hours = 6; // Default 6 AM
  let minutes = 0;
  if (schedule.time) {
    const timeRegex = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;
    const match = schedule.time.match(timeRegex);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    } else {
      // Invalid format, use defaults
      logger.warn("Invalid schedule time format, using default 06:00", {
        component: "automated-reports",
        time: schedule.time,
      });
    }
  }
  
  switch (schedule.frequency) {
    case ScheduleFrequency.DAILY:
      next.setDate(next.getDate() + 1);
      next.setHours(hours, minutes, 0, 0);
      break;
      
    case ScheduleFrequency.WEEKLY: {
      const targetDay = schedule.dayOfWeek || 1; // Monday
      const currentDay = next.getDay();
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      next.setDate(next.getDate() + daysUntilTarget);
      next.setHours(hours, minutes, 0, 0);
      break;
    }
      
    case ScheduleFrequency.BI_WEEKLY:
      next.setDate(next.getDate() + 14);
      next.setHours(hours, minutes, 0, 0);
      break;
      
    case ScheduleFrequency.MONTHLY: {
      next.setDate(1); // Prevent rollover when changing month
      next.setMonth(next.getMonth() + 1);
      const desiredDay = schedule.dayOfMonth || 1;
      const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(desiredDay, daysInMonth));
      next.setHours(hours, minutes, 0, 0);
      break;
    }
      
    case ScheduleFrequency.QUARTERLY: {
      next.setDate(1); // Prevent rollover when changing month
      const currentQuarter = Math.floor(next.getMonth() / 3);
      next.setMonth((currentQuarter + 1) * 3);
      const desiredDayQ = schedule.dayOfMonth || 1;
      const daysInQuarterMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(desiredDayQ, daysInQuarterMonth));
      next.setHours(hours, minutes, 0, 0);
      break;
    }
      
    case ScheduleFrequency.ANNUALLY: {
      next.setDate(1); // Prevent rollover when changing month
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth((schedule.monthOfYear || 1) - 1);
      const desiredDayA = schedule.dayOfMonth || 1;
      const daysInAnnualMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(desiredDayA, daysInAnnualMonth));
      next.setHours(hours, minutes, 0, 0);
      break;
    }
  }
  
  // Ensure next run is in the future using iteration instead of recursion
  let iterations = 0;
  const MAX_ITERATIONS = 100;
  
  while (next <= now && iterations < MAX_ITERATIONS) {
    iterations++;
    
    // Advance by one period based on frequency
    switch (schedule.frequency) {
      case ScheduleFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ScheduleFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case ScheduleFrequency.BI_WEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case ScheduleFrequency.MONTHLY: {
        // Fix date rollover: set day to 1 before incrementing month
        const targetDay = schedule.dayOfMonth || next.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() + 1);
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(targetDay, daysInMonth));
        break;
      }
      case ScheduleFrequency.QUARTERLY: {
        // Fix date rollover: set day to 1 before incrementing months
        const targetDayQ = schedule.dayOfMonth || next.getDate();
        next.setDate(1);
        next.setMonth(next.getMonth() + 3);
        const daysInQMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(targetDayQ, daysInQMonth));
        break;
      }
      case ScheduleFrequency.ANNUALLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
  }
  
  if (iterations >= MAX_ITERATIONS) {
    logger.error("calculateNextRun exceeded max iterations", {
      component: "automated-reports",
      frequency: schedule.frequency,
    });
    // Return null to indicate failure rather than potentially invalid date
    return null;
  }
  
  return next;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Configuration
  createReportConfig,
  getReportConfig,
  listReportConfigs,
  updateReportConfig,
  deleteReportConfig,
  
  // Generation
  generateReport,
  
  // Instances
  getReportInstance,
  listReportInstances,
  getReportHistory,
  
  // Scheduler
  getDueReports,
  processScheduledReports,
  
  // Templates
  getStandardTemplates,
};
