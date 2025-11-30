#!/usr/bin/env tsx
/**
 * Backfill current_period_start/current_period_end for existing subscriptions.
 *
 * Heuristic:
 * - Use next_billing_date (if present) as period end.
 * - Else use current_period_end (if already set), else createdAt + cycle length.
 * - Derive period start by subtracting cycle length (30 days monthly, 365 days annual) from period end.
 *
 * Notes:
 * - Does not alter amount or billing_history.
 * - Safe to re-run; skips documents that already have both fields.
 */

import mongoose from "mongoose";
import Subscription from "@/server/models/Subscription";
import { config } from "dotenv";
import path from "path";

async function main() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  config({ path: envPath });
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("MONGODB_URI/DATABASE_URL is required");
  }

  await mongoose.connect(uri);
  const batchSize = 200;

  const cursor = Subscription.find({
    $or: [{ current_period_start: { $exists: false } }, { current_period_end: { $exists: false } }],
  })
    .sort({ _id: 1 })
    .cursor();

  let processed = 0;
  let updated = 0;

  for await (const sub of cursor) {
    processed += 1;

    const billingCycle = (sub.billing_cycle || "MONTHLY").toUpperCase();
    const cycleDays = billingCycle === "ANNUAL" ? 365 : 30;
    const existingEnd =
      (sub as any).current_period_end ||
      sub.next_billing_date ||
      sub.updatedAt ||
      sub.createdAt;
    const periodEnd = new Date(existingEnd);
    const periodStart =
      (sub as any).current_period_start ||
      new Date(periodEnd.getTime() - cycleDays * 24 * 60 * 60 * 1000);

    // Only update missing fields
    const update: Record<string, Date> = {};
    if (!(sub as any).current_period_start) update.current_period_start = periodStart;
    if (!(sub as any).current_period_end) update.current_period_end = periodEnd;

    if (Object.keys(update).length > 0) {
      await Subscription.updateOne({ _id: sub._id }, { $set: update }).exec();
      updated += 1;
    }

    if (processed % batchSize === 0) {
      console.log(`Processed ${processed}, updated ${updated}`);
    }
  }

  console.log(`Done. Processed ${processed}, updated ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
