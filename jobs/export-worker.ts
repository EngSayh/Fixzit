"use strict";

import { createWorker, QUEUE_NAMES } from "@/lib/queues/setup";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongodb-unified";
import { ExportJob, type IExportJob } from "@/server/models/ExportJob";
import { arrayToCSV } from "@/lib/export-utils";
import { assertS3Configured } from "@/lib/storage/s3-config";
import { getPresignedGetUrl, putObjectBuffer } from "@/lib/storage/s3";
import {
  assertSupportedEntity,
  buildExportKey,
  sanitizeFilters,
  type SanitizedFilters,
} from "@/lib/export/worker-helpers";
import { WorkOrder } from "@/server/models/WorkOrder";
import { Invoice } from "@/server/models/Invoice";
import { Employee } from "@/server/models/hr.models"; // SEC-0002: Use encrypted Employee model
import { User } from "@/server/models/User";
import { AuditLogModel } from "@/server/models/AuditLog";
import { Property } from "@/server/models/Property";
import { MarketplaceProduct } from "@/server/models/MarketplaceProduct";

type CsvValue =
  | string
  | number
  | boolean
  | Date
  | Record<string, unknown>
  | null
  | undefined;
type CsvRow = Record<string, CsvValue>;

type ExportJobPayload = {
  jobId: string;
  orgId: string;
  userId: string;
  entityType: string;
  format: "csv" | "xlsx";
  filters?: Record<string, unknown>;
  search?: string;
  ids?: string[];
  columns?: string[];
};

const EXPORT_LIMIT = 5000;

function buildOrgQuery(orgId: string, filters: SanitizedFilters): Record<string, unknown> {
  return { orgId, ...filters };
}

import type { FilterEntityType } from "@/lib/filters/entities";

async function fetchRows(entity: FilterEntityType, orgId: string, filters: SanitizedFilters, ids?: string[]) {
  const query = buildOrgQuery(orgId, filters);
  if (ids && ids.length > 0) {
    query._id = { $in: ids };
  }

  switch (assertSupportedEntity(entity)) {
    case "workOrders":
      return WorkOrder.find(query)
        .select("workOrderNumber title status priority createdAt dueAt propertyId assigned_to orgId")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    case "users":
      return User.find(query)
        .select("email firstName lastName role status createdAt orgId")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    case "employees":
      // SEC-0002: Using hr.models.ts Employee with PII encryption
      return Employee.find(query)
        .select("firstName lastName departmentId jobTitle employmentStatus createdAt orgId")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    case "invoices":
      return Invoice.find(query)
        .select("number status total subtotal dueDate issuedAt orgId")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    case "auditLogs":
      return AuditLogModel.find(query)
        .select("action resource resourceId status actorId actorEmail createdAt orgId")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    case "properties":
      return Property.find(query)
        .select("title type listingType price currency city region status bedrooms bathrooms area createdAt orgId")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    case "products":
      return MarketplaceProduct.find(query)
        .select("name sku price currency stock status orgId createdAt")
        .limit(EXPORT_LIMIT)
        .lean()
        .exec();
    default:
      throw new Error(`Unsupported export entity: ${entity}`);
  }
}

async function markJob(
  job: IExportJob,
  updates: Partial<Pick<IExportJob, "status" | "file_url" | "error_message" | "row_count">>
) {
  Object.assign(job, updates);
  await job.save();
}

async function processExportJob(payload: ExportJobPayload) {
  await connectDb();

  const exportJob = await ExportJob.findById(payload.jobId);
  if (!exportJob) {
    logger.warn("[ExportWorker] ExportJob not found", { jobId: payload.jobId });
    return;
  }

  await markJob(exportJob, { status: "processing" });

  try {
    const config = assertS3Configured(); // Throws when missing

    const safeFilters = sanitizeFilters(exportJob.filters as Record<string, unknown>);
    const rows =
      (await fetchRows(
        exportJob.entity_type,
        exportJob.org_id,
        safeFilters,
        exportJob.ids,
      )) ?? [];
    // Normalize rows to JSON-safe objects for CSV serialization
    const exportRows: CsvRow[] = rows.map(
      (row) => JSON.parse(JSON.stringify(row)) as CsvRow,
    );
    const csv = arrayToCSV(exportRows);
    const buffer = Buffer.from(csv, "utf-8");
    const key = buildExportKey(exportJob.org_id, exportJob._id.toString(), exportJob.format);

    // Currently we export CSV for both CSV/XLSX requests to keep pipeline consistent.
    await putObjectBuffer(key, buffer, "text/csv");
    const url = await getPresignedGetUrl(key, 86_400); // 24h

    await markJob(exportJob, {
      status: "completed",
      file_url: url,
      row_count: exportRows.length,
      error_message: undefined,
    });

    logger.info("[ExportWorker] Export completed", {
      jobId: exportJob._id.toString(),
      entity: exportJob.entity_type,
      bucket: config.bucket,
      rows: exportRows.length,
    });
  } catch (error) {
    logger.error("[ExportWorker] Export failed", {
      error,
      jobId: exportJob._id.toString(),
      entity: exportJob.entity_type,
    });
    await markJob(exportJob, {
      status: "failed",
      error_message:
        error instanceof Error ? error.message : "Export failed",
    });
    throw error;
  }
}

// Worker entrypoint
createWorker<ExportJobPayload>(
  QUEUE_NAMES.EXPORTS,
  async (job) => {
    await processExportJob(job.data);
  },
  1
);

export { processExportJob };
