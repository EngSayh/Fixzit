import "dotenv/config";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { WorkOrder } from "@/server/models/WorkOrder";
import { deleteObject } from "@/lib/storage/s3";
import { logger } from "@/lib/logger";

const DAYS_OLD = Number(process.env.ORPHAN_WO_DAYS ?? "7");

async function cleanup() {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - DAYS_OLD * 24 * 60 * 60 * 1000);

  const orphans = await WorkOrder.find({
    status: "DRAFT",
    createdAt: { $lte: cutoff },
  })
    .select({ attachments: 1 })
    .lean();

  let woDeleted = 0;
  let attachmentDeletes = 0;
  let attachmentFailures = 0;

  type OrphanWorkOrder = {
    _id?: unknown;
    attachments?: Array<{ key?: string }>;
  };

  for (const wo of orphans as OrphanWorkOrder[]) {
    const attachments = wo.attachments ?? [];
    const keys = attachments.map((a) => a.key).filter(Boolean) as string[];
    if (keys.length) {
      const results = await Promise.allSettled(
        keys.map((k) => deleteObject(k)),
      );
      attachmentDeletes += results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      attachmentFailures += results.filter(
        (r) => r.status === "rejected",
      ).length;
    }
    await WorkOrder.deleteOne({ _id: wo._id });
    woDeleted += 1;
  }

  logger.info("Cleanup summary", {
    cutoff: cutoff.toISOString(),
    draftsDeleted: woDeleted,
    attachmentDeletes,
    attachmentFailures,
  });
}

cleanup()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("Cleanup error", err);
    process.exit(1);
  });
