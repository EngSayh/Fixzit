#!/usr/bin/env ts-node
/**
 * Backfill orgId for SouqSeller documents (marketplace tenancy hardening)
 *
 * Usage:
 *   MONGODB_URI=... pnpm tsx scripts/migrate-souq-seller-org.ts [--dry-run] [--batch=500]
 *
 * Behavior:
 * - Finds sellers where orgId is missing/null.
 * - Attempts to resolve orgId from linked user (userId) and patches the seller.
 * - Runs in batches to avoid memory spikes.
 * - Skips sellers with no linked user or missing user orgId (reported at the end).
 */

import mongoose from "mongoose";
import { SouqSeller } from "@/server/models/souq/Seller";
import { User } from "@/server/models/User";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE =
  parseInt(
    process.argv
      .find((arg) => arg.startsWith("--batch="))
      ?.split("=")?.[1] || "500",
    10,
  ) || 500;

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("MONGODB_URI or DATABASE_URL must be set");
  }

  await mongoose.connect(mongoUri);
  console.log("[migrate-souq-seller-org] Connected to MongoDB");

  const missingQuery = {
    $or: [{ orgId: { $exists: false } }, { orgId: null }],
  };

  const totalMissing = await SouqSeller.countDocuments(missingQuery);
  if (totalMissing === 0) {
    console.log("[migrate-souq-seller-org] No sellers missing orgId. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  console.log(
    `[migrate-souq-seller-org] Sellers missing orgId: ${totalMissing} (batch size: ${BATCH_SIZE})`,
  );

  const cursor = SouqSeller.find(missingQuery).cursor({ batchSize: BATCH_SIZE });
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const missingOwnerOrg: string[] = [];

  const bulkOps: Parameters<typeof SouqSeller.bulkWrite>[0] = [];

  for await (const seller of cursor) {
    processed++;

    if (!seller.userId) {
      skipped++;
      missingOwnerOrg.push(seller._id.toString());
      continue;
    }

    const ownerUser = await User.findById(seller.userId)
      .select("orgId")
      .lean<{ orgId?: mongoose.Types.ObjectId | string }>();

    if (!ownerUser?.orgId) {
      skipped++;
      missingOwnerOrg.push(seller._id.toString());
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: seller._id },
        update: { $set: { orgId: ownerUser.orgId } },
      },
    });
    updated++;

    if (bulkOps.length >= BATCH_SIZE) {
      if (!DRY_RUN) {
        await SouqSeller.bulkWrite(bulkOps, { ordered: false });
      }
      bulkOps.length = 0;
      console.log(
        `[migrate-souq-seller-org] Progress: processed=${processed}, updated=${updated}, skipped=${skipped}`,
      );
    }
  }

  if (bulkOps.length > 0 && !DRY_RUN) {
    await SouqSeller.bulkWrite(bulkOps, { ordered: false });
  }

  console.log("[migrate-souq-seller-org] Migration complete", {
    processed,
    updated,
    skipped,
    dryRun: DRY_RUN,
    missingOwnerOrgCount: missingOwnerOrg.length,
  });

  if (missingOwnerOrg.length) {
    console.log(
      "[migrate-souq-seller-org] Sellers missing owner orgId (manual review):",
      missingOwnerOrg.join(", "),
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[migrate-souq-seller-org] Migration failed:", err);
  process.exitCode = 1;
});
