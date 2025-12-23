#!/usr/bin/env npx tsx
/**
 * Migration: Backfill orgId on Souq advertising and fee schedule collections.
 *
 * Targets:
 * - souq_campaigns        (orgId from seller)
 * - souq_ad_groups        (orgId from campaign -> seller)
 * - souq_ads              (orgId from adGroup -> campaign -> seller)
 * - souq_ad_targets       (orgId from adGroup -> campaign -> seller)
 * - souq_fee_schedules    (no strong linkage; logs unresolved for manual review)
 *
 * Usage:
 *   npx tsx scripts/migrations/2025-12-05-backfill-souq-ads-fees-orgId.ts --dry-run
 *   npx tsx scripts/migrations/2025-12-05-backfill-souq-ads-fees-orgId.ts
 */

import "dotenv/config";
import { ObjectId } from "mongodb";
import { getDatabase, disconnectFromDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

type CampaignDoc = { _id: ObjectId; sellerId?: ObjectId | string; orgId?: string };
type AdGroupDoc = { _id: ObjectId; campaignId?: ObjectId | string; sellerId?: ObjectId | string; orgId?: string };
type AdDoc = {
  _id: ObjectId;
  adGroupId?: ObjectId | string;
  campaignId?: ObjectId | string;
  sellerId?: ObjectId | string;
  orgId?: string;
};
type AdTargetDoc = {
  _id: ObjectId;
  adGroupId?: ObjectId | string;
  campaignId?: ObjectId | string;
  sellerId?: ObjectId | string;
  orgId?: string;
};
type FeeScheduleDoc = { _id: ObjectId; orgId?: string };

async function resolveOrgIdFromSeller(db: Awaited<ReturnType<typeof getDatabase>>, sellerId?: ObjectId | string) {
  if (!sellerId) return null;
  const sellers = db.collection(COLLECTIONS.SOUQ_SETTLEMENTS.replace("settlements", "sellers")); // sellers collection is "souq_sellers"
  const queries: Array<Record<string, unknown>> = [];
  if (ObjectId.isValid(String(sellerId))) {
    queries.push({ _id: new ObjectId(String(sellerId)) });
  }
  queries.push({ sellerId });

  for (const q of queries) {
    const seller = await sellers.findOne(q, { projection: { orgId: 1 } });
    if (seller?.orgId) return typeof seller.orgId === "string" ? seller.orgId : String(seller.orgId);
  }
  return null;
}

async function resolveOrgIdFromCampaign(
  db: Awaited<ReturnType<typeof getDatabase>>,
  campaignId?: ObjectId | string,
): Promise<string | null> {
  if (!campaignId) return null;
  const campaigns = db.collection(COLLECTIONS.SOUQ_CAMPAIGNS);
  const queries: Array<Record<string, unknown>> = [];
  if (ObjectId.isValid(String(campaignId))) queries.push({ _id: new ObjectId(String(campaignId)) });
  queries.push({ campaignId });

  for (const q of queries) {
    const campaign = await campaigns.findOne(q, { projection: { orgId: 1, sellerId: 1 } });
    if (campaign?.orgId) return typeof campaign.orgId === "string" ? campaign.orgId : String(campaign.orgId);
    if (campaign?.sellerId) {
      const orgId = await resolveOrgIdFromSeller(db, campaign.sellerId);
      if (orgId) return orgId;
    }
  }
  return null;
}

async function resolveOrgIdFromAdGroup(
  db: Awaited<ReturnType<typeof getDatabase>>,
  adGroupId?: ObjectId | string,
  campaignId?: ObjectId | string,
  sellerId?: ObjectId | string,
): Promise<string | null> {
  if (!adGroupId && !campaignId && !sellerId) return null;
  const adGroups = db.collection(COLLECTIONS.SOUQ_AD_GROUPS);
  const queries: Array<Record<string, unknown>> = [];
  if (adGroupId && ObjectId.isValid(String(adGroupId))) queries.push({ _id: new ObjectId(String(adGroupId)) });
  if (adGroupId) queries.push({ adGroupId });
  if (campaignId) queries.push({ campaignId });

  for (const q of queries) {
    const adGroup = await adGroups.findOne(q, { projection: { orgId: 1, campaignId: 1, sellerId: 1 } });
    if (adGroup?.orgId) return typeof adGroup.orgId === "string" ? adGroup.orgId : String(adGroup.orgId);
    const viaCampaign = await resolveOrgIdFromCampaign(db, adGroup?.campaignId ?? campaignId);
    if (viaCampaign) return viaCampaign;
    if (adGroup?.sellerId) {
      const orgId = await resolveOrgIdFromSeller(db, adGroup.sellerId);
      if (orgId) return orgId;
    }
  }

  if (campaignId) {
    const viaCampaign = await resolveOrgIdFromCampaign(db, campaignId);
    if (viaCampaign) return viaCampaign;
  }
  if (sellerId) {
    const viaSeller = await resolveOrgIdFromSeller(db, sellerId);
    if (viaSeller) return viaSeller;
  }
  return null;
}

async function backfillCollection<T extends Record<string, unknown>>(
  db: Awaited<ReturnType<typeof getDatabase>>,
  opts: {
    collection: string;
    projector: Record<string, unknown>;
    resolver: (_doc: T) => Promise<string | null>;
    name: string;
  },
) {
  const { collection, projector, resolver, name } = opts;
  let processed = 0;
  let updated = 0;
  let unresolved = 0;

  const cursor = db.collection<T>(collection).find({ orgId: { $exists: false } }, { projection: projector });

  while (await cursor.hasNext()) {
    const batch: T[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const doc = await cursor.next();
      if (!doc) break;
      batch.push(doc);
    }
    if (batch.length === 0) break;

    const ops = [];
    for (const doc of batch) {
      processed++;
      // @ts-expect-error _id exists on T
      const _id = (doc as { _id: ObjectId })._id;
      const orgId = await resolver(doc);
      if (!orgId) {
        unresolved++;
        continue;
      }
      ops.push({ updateOne: { filter: { _id }, update: { $set: { orgId } } } });
    }

    if (!DRY_RUN && ops.length > 0) {
      const res = await db.collection(collection).bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount ?? 0;
    } else if (DRY_RUN) {
      updated += ops.length;
    }
  }

  console.log(`${name}: processed=${processed}, updated=${updated}, unresolved=${unresolved}`);
}

async function main() {
  console.log("🔧 Backfill orgId for Souq advertising and fee schedules");
  if (DRY_RUN) console.log("📝 DRY RUN - no writes will be performed\n");

  const db = await getDatabase();
  try {
    await backfillCollection<CampaignDoc>(db, {
      collection: COLLECTIONS.SOUQ_CAMPAIGNS,
      projector: { sellerId: 1 },
      name: "Campaigns",
      resolver: async (doc) => resolveOrgIdFromSeller(db, doc.sellerId),
    });

    await backfillCollection<AdGroupDoc>(db, {
      collection: COLLECTIONS.SOUQ_AD_GROUPS,
      projector: { campaignId: 1, sellerId: 1 },
      name: "AdGroups",
      resolver: async (doc) => resolveOrgIdFromAdGroup(db, doc._id, doc.campaignId, doc.sellerId),
    });

    await backfillCollection<AdDoc>(db, {
      collection: COLLECTIONS.SOUQ_ADS,
      projector: { adGroupId: 1, campaignId: 1, sellerId: 1 },
      name: "Ads",
      resolver: async (doc) =>
        (await resolveOrgIdFromAdGroup(db, doc.adGroupId, doc.campaignId, doc.sellerId)) ??
        (await resolveOrgIdFromCampaign(db, doc.campaignId)) ??
        (await resolveOrgIdFromSeller(db, doc.sellerId)),
    });

    await backfillCollection<AdTargetDoc>(db, {
      collection: COLLECTIONS.SOUQ_AD_TARGETS,
      projector: { adGroupId: 1, campaignId: 1, sellerId: 1 },
      name: "AdTargets",
      resolver: async (doc) =>
        (await resolveOrgIdFromAdGroup(db, doc.adGroupId, doc.campaignId, doc.sellerId)) ??
        (await resolveOrgIdFromCampaign(db, doc.campaignId)) ??
        (await resolveOrgIdFromSeller(db, doc.sellerId)),
    });

    // Fee schedules have no strong linkage; log unresolved for manual follow-up
    await backfillCollection<FeeScheduleDoc>(db, {
      collection: COLLECTIONS.SOUQ_FEE_SCHEDULES,
      projector: {},
      name: "FeeSchedules",
      resolver: async () => null, // intentional: requires manual org resolution
    });

    console.log("\n✅ Backfill complete");
    if (DRY_RUN) console.log("⚠️  This was a dry run. Run without --dry-run to apply updates.");
  } finally {
    await disconnectFromDatabase();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
