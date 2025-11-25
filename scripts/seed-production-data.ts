#!/usr/bin/env ts-node
/**
 * Production-ready seed script with curated fixtures for:
 * - FM vendors and inspections
 * - Souq claims
 *
 * Usage:
 *   MONGODB_URI="mongodb://localhost:27017/fixzit" pnpm tsx scripts/seed-production-data.ts
 * Optional:
 *   SEED_ORG_ID="66f2a0b1e1c2a3b4c5d6e7f8" pnpm tsx scripts/seed-production-data.ts
 *
 * This script uses real models (no mocks) and performs idempotent upserts.
 */
import mongoose, { Types } from "mongoose";
import { Vendor } from "@/server/models/Vendor";
import { SouqClaim } from "@/server/models/souq/Claim";
import { FMInspection } from "@/domain/fm/fm.behavior";

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  const orgId = new Types.ObjectId(
    process.env.SEED_ORG_ID || "66f2a0b1e1c2a3b4c5d6e7f8",
  );
  const now = new Date();

  await mongoose.connect(mongoUri);
  console.log(`✅ Connected to MongoDB: ${mongoUri}`);

  // --------------------------
  // Vendors (FM)
  // --------------------------
  const vendors = [
    {
      code: "VEND-HVAC-001",
      name: "Riyadh AC Masters",
      type: "SERVICE_PROVIDER",
      status: "APPROVED",
      orgId,
      business: {
        registrationNumber: "CR-123456",
        taxId: "3101234567",
        employees: 42,
      },
      performance: { rating: 4.7, completedProjects: 120, successRate: 97 },
      contact: {
        primary: {
          name: "Ahmad Al Saud",
          email: "contact@acmasters.sa",
          phone: "+966500000001",
        },
        address: { city: "Riyadh", region: "Riyadh", country: "SA" },
      },
      tags: ["HVAC", "preventive-maintenance"],
      catalog: [
        {
          category: "HVAC",
          subcategory: "Chillers",
          products: [
            {
              code: "CHILL-01",
              name: "Chiller PM Visit",
              unitPrice: 1500,
              currency: "SAR",
              leadTime: 3,
            },
          ],
        },
      ],
    },
    {
      code: "VEND-ELEC-002",
      name: "Eastern Electricals",
      type: "CONTRACTOR",
      status: "APPROVED",
      orgId,
      business: {
        registrationNumber: "CR-654321",
        taxId: "3107654321",
        employees: 65,
      },
      performance: { rating: 4.5, completedProjects: 200, successRate: 95 },
      contact: {
        primary: {
          name: "Sara Al Qahtani",
          email: "hello@e-electricals.sa",
          phone: "+966500000002",
        },
        address: { city: "Dammam", region: "Eastern Province", country: "SA" },
      },
      tags: ["electrical", "fitout", "repairs"],
      catalog: [
        {
          category: "Electrical",
          subcategory: "Fit-out",
          products: [
            {
              code: "FIT-EL-01",
              name: "Panel Upgrade",
              unitPrice: 3200,
              currency: "SAR",
              leadTime: 5,
            },
          ],
        },
      ],
    },
  ];

  for (const vendor of vendors) {
    await Vendor.updateOne(
      { orgId: vendor.orgId, code: vendor.code },
      { $set: { ...vendor, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }
  console.log(`✅ Seeded vendors: ${vendors.map((v) => v.code).join(", ")}`);

  // --------------------------
  // FM Inspections
  // --------------------------
  const inspections = [
    {
      property_id: new Types.ObjectId(),
      unit_id: new Types.ObjectId(),
      type: "HVAC_PREVENTIVE",
      checklist: [
        { item: "Filter clean", severity: "LOW", ok: true },
        { item: "Thermostat calibration", severity: "MEDIUM", ok: false },
      ],
      assignee_user_id: new Types.ObjectId(),
      signoff: undefined,
      org_id: orgId,
      createdAt: now,
      updatedAt: now,
    },
    {
      property_id: new Types.ObjectId(),
      unit_id: new Types.ObjectId(),
      type: "ELECTRICAL_SAFETY",
      checklist: [
        { item: "Breaker labels", severity: "LOW", ok: true },
        { item: "Grounding test", severity: "HIGH", ok: true },
      ],
      assignee_user_id: new Types.ObjectId(),
      org_id: orgId,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const insp of inspections) {
    await FMInspection.updateOne(
      { org_id: insp.org_id, type: insp.type, unit_id: insp.unit_id },
      {
        $set: { ...insp, updatedAt: new Date() },
        $setOnInsert: { createdAt: insp.createdAt },
      },
      { upsert: true },
    );
  }
  console.log(`✅ Seeded FM inspections: ${inspections.length}`);

  // --------------------------
  // Souq Claims
  // --------------------------
  const claims = [
    {
      claimId: "CLM-1001",
      orderId: "ORD-5001",
      orderNumber: "SO-5001",
      buyerId: "BUY-100",
      sellerId: "SELL-200",
      claimType: "not_received",
      buyerDescription: "Package never arrived.",
      desiredResolution: "full_refund",
      requestedAmount: 249.99,
      buyerEvidence: [
        {
          uploadedBy: "buyer",
          type: "screenshot",
          url: "https://cdn.fixzit.test/evidence/tracking.png",
          description: "Tracking shows stuck",
          uploadedAt: now,
        },
      ],
      sellerResponseDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: "submitted",
      timeline: [{ status: "submitted", timestamp: now, note: "Seeded claim" }],
      createdAt: now,
      updatedAt: now,
    },
    {
      claimId: "CLM-1002",
      orderId: "ORD-5002",
      orderNumber: "SO-5002",
      buyerId: "BUY-101",
      sellerId: "SELL-201",
      claimType: "damaged",
      buyerDescription: "Screen arrived cracked.",
      desiredResolution: "replacement",
      requestedAmount: 1299.0,
      buyerEvidence: [
        {
          uploadedBy: "buyer",
          type: "photo",
          url: "https://cdn.fixzit.test/evidence/crack.jpg",
          description: "Cracked screen",
          uploadedAt: now,
        },
      ],
      sellerResponseDeadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: "under_review",
      timeline: [
        { status: "under_review", timestamp: now, note: "Seeded claim" },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const claim of claims) {
    await SouqClaim.updateOne(
      { claimId: claim.claimId },
      {
        $set: { ...claim, updatedAt: new Date() },
        $setOnInsert: { createdAt: claim.createdAt },
      },
      { upsert: true },
    );
  }
  console.log(
    `✅ Seeded souq claims: ${claims.map((c) => c.claimId).join(", ")}`,
  );
}

main()
  .then(() => {
    console.log("🎯 Seed completed.");
    return mongoose.disconnect();
  })
  .catch((err) => {
    console.error("❌ Seed failed", err);
    void mongoose.disconnect();
    process.exit(1);
  });
