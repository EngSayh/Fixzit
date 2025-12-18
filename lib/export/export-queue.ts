import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";
import { type FilterEntityType } from "@/lib/filters/entities";

export type ExportJobMessage = {
  jobId: string;
  orgId: string;
  userId: string;
  entityType: FilterEntityType;
  format: "csv" | "xlsx";
  filters?: Record<string, unknown>;
  search?: string;
  ids?: string[];
  columns?: string[];
};

/**
  * Enqueue an export job to BullMQ. The worker can hydrate filters/ids
  * and stream CSV/XLS output asynchronously.
  */
export async function enqueueExportJob(message: ExportJobMessage) {
  return addJob(QUEUE_NAMES.EXPORTS, `export:${message.entityType}`, message, {
    // Options: delay, priority, jobId, repeat
  });
}
