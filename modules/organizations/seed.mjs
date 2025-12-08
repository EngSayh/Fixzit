#!/usr/bin/env node
import dotenv from "dotenv";
import mongoose from "mongoose";
import Organization from "./schema.ts";
import { logger } from "../../lib/logger";

dotenv.config();

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.sa";

const organizations = [
  {
    name: "Fixzit Platform",
    nameAr: "منصة فيكسيت",
    subscriptionPlan: "Enterprise",
    status: "active",
    email: `platform@${EMAIL_DOMAIN}`,
    phone: "+966-11-123-4567",
    website: "https://fixzit.sa",
    address: {
      street: "King Fahd Road",
      city: "Riyadh",
      state: "Riyadh Province",
      postalCode: "11564",
      country: "Saudi Arabia",
    },
    billingEmail: `billing@${EMAIL_DOMAIN}`,
    taxId: "SA-300000000000003",
    settings: { timezone: "Asia/Riyadh", language: "en", currency: "SAR" },
  },
  {
    name: "ACME Corporation",
    nameAr: "شركة أكمي",
    subscriptionPlan: "Premium",
    status: "active",
    email: "contact@acme.local",
    phone: "+966-11-765-4321",
    website: "https://acme.local",
    address: {
      street: "Olaya Street",
      city: "Riyadh",
      state: "Riyadh Province",
      postalCode: "12345",
      country: "Saudi Arabia",
    },
    billingEmail: "finance@acme.local",
    taxId: "SA-123456789000001",
    settings: { timezone: "Asia/Riyadh", language: "ar", currency: "SAR" },
  },
];

async function seedOrganizations() {
  try {
    logger.debug("🌱 Starting organization seed...");
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI not found");

    logger.debug("📡 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    logger.debug("✅ Connected");

    let created = 0,
      updated = 0;
    for (const orgData of organizations) {
      logger.debug(`📋 Processing: ${orgData.name}`);
      const result = await Organization.updateOne(
        { name: orgData.name },
        { $set: orgData },
        { upsert: true },
      );
      if (result.upsertedCount > 0) {
        created++;
        logger.debug("   ✅ Created");
      } else if (result.modifiedCount > 0) {
        updated++;
        logger.debug("   ♻️  Updated");
      } else logger.debug("   ⏭️  No changes");
    }

    logger.debug(
      `📊 Created: ${created}, Updated: ${updated}, Total: ${organizations.length}`,
    );
    const count = await Organization.countDocuments();
    logger.debug(`✅ Total organizations in database: ${count}`);
  } catch (error) {
    logger.error("❌ Seed failed", error instanceof Error ? error : undefined);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.debug("👋 Disconnected");
  }
}

seedOrganizations();
