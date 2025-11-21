import 'dotenv/config';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { WorkOrder } from '@/server/models/WorkOrder';
import { deleteObject } from '@/lib/storage/s3';

const DAYS_OLD = Number(process.env.ORPHAN_WO_DAYS ?? '7');

async function cleanup() {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - DAYS_OLD * 24 * 60 * 60 * 1000);

  const orphans = await WorkOrder.find({
    status: 'DRAFT',
    createdAt: { $lte: cutoff },
  })
    .select({ attachments: 1 })
    .lean();

  let woDeleted = 0;
  let attachmentDeletes = 0;
  let attachmentFailures = 0;

  for (const wo of orphans) {
    const keys = (wo.attachments || []).map((a: any) => a.key).filter(Boolean) as string[];
    if (keys.length) {
      const results = await Promise.allSettled(keys.map((k) => deleteObject(k)));
      attachmentDeletes += results.filter((r) => r.status === 'fulfilled').length;
      attachmentFailures += results.filter((r) => r.status === 'rejected').length;
    }
    await WorkOrder.deleteOne({ _id: (wo as any)._id });
    woDeleted += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        cutoff: cutoff.toISOString(),
        draftsDeleted: woDeleted,
        attachmentDeletes,
        attachmentFailures,
      },
      null,
      2
    )
  );
}

cleanup()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Cleanup error', err);
    process.exit(1);
  });
