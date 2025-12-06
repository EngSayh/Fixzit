/**
 * Backfill legacy org_id fields and add compound indexes for Souq collections.
 *
 * - Copies org_id -> orgId when orgId is missing.
 * - Adds indexes that include orgId to prevent cross-tenant collisions.
 *
 * Run with: pnpm ts-node scripts/migrations/2025-12-22-backfill-souq-orgid.ts
 */
import { connectDb } from "../../lib/mongodb-unified";

type CollectionConfig = {
  name: string;
  indexSpecs?: Array<{ keys: Record<string, 1 | -1>; options?: Record<string, unknown> }>;
};

const COLLECTIONS: CollectionConfig[] = [
  {
    name: "souq_ad_stats",
    indexSpecs: [{ keys: { bidId: 1, orgId: 1 }, options: { background: true } }],
  },
  {
    name: "souq_ad_events",
    indexSpecs: [{ keys: { orgId: 1, bidId: 1 }, options: { background: true } }],
  },
  {
    name: "souq_campaigns",
    indexSpecs: [{ keys: { campaignId: 1, orgId: 1 }, options: { background: true } }],
  },
  {
    name: "souq_orders",
    indexSpecs: [{ keys: { orgId: 1, "items.sellerId": 1, deliveredAt: -1 }, options: { background: true } }],
  },
  {
    name: "souq_settlements",
    indexSpecs: [{ keys: { statementId: 1, orgId: 1 }, options: { background: true } }],
  },
  {
    name: "souq_ad_bids",
    indexSpecs: [{ keys: { bidId: 1, orgId: 1 }, options: { background: true } }],
  },
];

async function backfillOrgId(collectionName: string): Promise<void> {
  const { connection } = await connectDb();
  const db = connection.db!;
  const collection = db.collection(collectionName);

  // Only update documents missing orgId but having org_id
  const result = await collection.updateMany(
    { orgId: { $exists: false }, org_id: { $exists: true } },
    [
      { $set: { orgId: "$org_id" } },
      { $unset: "org_id" },
    ],
  );

  console.log(
    `[${collectionName}] backfill matched ${result.matchedCount}, modified ${result.modifiedCount}`,
  );
}

async function ensureIndexes(config: CollectionConfig): Promise<void> {
  if (!config.indexSpecs || config.indexSpecs.length === 0) return;
  const { connection } = await connectDb();
  const db = connection.db!;
  const collection = db.collection(config.name);

  for (const spec of config.indexSpecs) {
    await collection.createIndex(spec.keys, spec.options ?? { background: true });
    console.log(`[${config.name}] ensured index ${JSON.stringify(spec.keys)}`);
  }
}

async function run(): Promise<void> {
  for (const config of COLLECTIONS) {
    await backfillOrgId(config.name);
    await ensureIndexes(config);
  }
  console.log("✅ Backfill and index creation completed.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});

