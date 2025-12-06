/**
 * Backfill orgId on souq_ad_bids from parent campaigns
 *
 * Usage:
 *   DRY_RUN=false pnpm ts-node scripts/backfill-souq-ad-bids-orgid.ts
 *
 * Defaults to DRY_RUN=true to prevent accidental writes. Set DRY_RUN=false to apply updates.
 */

import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";

async function main() {
  const db = await getDatabase();
  const bids = db.collection("souq_ad_bids");
  const campaigns = db.collection("souq_campaigns");

  const dryRun = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

  // Ensure index to support org-scoped lookups
  await bids.createIndex(
    { orgId: 1, campaignId: 1, bidId: 1 },
    { name: "org_campaign_bid" },
  );

  const campaignCursor = campaigns.find(
    { orgId: { $exists: true } },
    { projection: { campaignId: 1, orgId: 1 } },
  );

  let scanned = 0;
  let candidates = 0;
  let updated = 0;

  for await (const campaign of campaignCursor) {
    scanned += 1;
    const campaignId = campaign.campaignId;
    const orgId = campaign.orgId;
    if (!campaignId || !orgId) continue;

    const filter = {
      campaignId,
      $or: [{ orgId: { $exists: false } }, { orgId: null }],
    };

    const count = await bids.countDocuments(filter);
    if (count === 0) continue;
    candidates += count;

    if (dryRun) {
      logger.info(`[DRY RUN] Would backfill ${count} bids for ${campaignId}`, {
        campaignId,
        orgId,
      });
      continue;
    }

    const res = await bids.updateMany(filter, { $set: { orgId } });
    updated += res.modifiedCount;
    logger.info(`[Backfill] Updated ${res.modifiedCount} bids`, {
      campaignId,
      orgId,
    });
  }

  logger.info("[Backfill] Complete", { scanned, candidates, updated, dryRun });
}

main()
  .then(() => {
    logger.info("[Backfill] Done");
    if (process.env.EXIT_ON_COMPLETE !== "false") process.exit(0);
  })
  .catch((error) => {
    logger.error("[Backfill] Failed", error as Error);
    if (process.env.EXIT_ON_COMPLETE !== "false") process.exit(1);
  });
