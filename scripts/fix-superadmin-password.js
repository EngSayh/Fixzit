#!/usr/bin/env node
/**
 * Safely reset the superadmin password with tenant scoping.
 * - Requires ALLOW_SUPERADMIN_FIX=1
 * - Requires org env: DEFAULT_ORG_ID | PUBLIC_ORG_ID | TEST_ORG_ID
 * - Supports DRY_RUN=1 (default) to preview changes
 *
 * Usage:
 *   ALLOW_SUPERADMIN_FIX=1 DEFAULT_ORG_ID=... FIX_SUPERADMIN_EMAIL=... FIX_SUPERADMIN_PASSWORD=... node scripts/fix-superadmin-password.js
 */
const mongoose = require("mongoose");
const { db } = require("../lib/mongo");
const { User } = require("../server/models/User");
const { hashPassword } = require("../lib/auth");

const allowFix = process.env.ALLOW_SUPERADMIN_FIX === "1";
if (!allowFix) {
  console.error("❌ ALLOW_SUPERADMIN_FIX=1 is required to run this script");
  process.exit(1);
}

const ORG_ID =
  process.env.DEFAULT_ORG_ID ||
  process.env.PUBLIC_ORG_ID ||
  process.env.TEST_ORG_ID;

if (!ORG_ID || !mongoose.Types.ObjectId.isValid(ORG_ID)) {
  console.error("❌ DEFAULT_ORG_ID/PUBLIC_ORG_ID/TEST_ORG_ID (valid ObjectId) is required for tenancy scoping");
  process.exit(1);
}

const EMAIL = process.env.FIX_SUPERADMIN_EMAIL || process.env.TEST_USER_EMAIL || "superadmin@fixzit.co";
const PASSWORD =
  process.env.FIX_SUPERADMIN_PASSWORD ||
  process.env.SUPERADMIN_PASSWORD ||
  process.env.TEST_USER_PASSWORD;

if (!PASSWORD) {
  console.error("❌ FIX_SUPERADMIN_PASSWORD / SUPERADMIN_PASSWORD / TEST_USER_PASSWORD is required (no default)");
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN !== "0";

async function main() {
  await db;
  const orgObjectId = new mongoose.Types.ObjectId(ORG_ID);
  const filter = { email: EMAIL, orgId: orgObjectId };
  const user = await User.findOne(filter);

  if (!user) {
    console.error(`❌ User not found for email=${EMAIL} orgId=${ORG_ID}`);
    process.exit(1);
  }

  const hashed = await hashPassword(PASSWORD);
  const update = {
    password: hashed,
    orgId: orgObjectId,
    org_id: orgObjectId,
    tenantId: orgObjectId,
    tenant_id: orgObjectId,
    isSuperAdmin: true,
    status: "ACTIVE",
    updatedAt: new Date(),
  };

  console.log(
    JSON.stringify(
      {
        event: "fix-superadmin-password",
        dryRun: DRY_RUN,
        email: EMAIL,
        orgId: ORG_ID,
        userId: user._id?.toString?.(),
        fields: Object.keys(update),
      },
      null,
      2,
    ),
  );

  if (DRY_RUN) {
    console.log("🔍 DRY_RUN=1 (default). Set DRY_RUN=0 to apply changes.");
    process.exit(0);
  }

  await User.updateOne({ _id: user._id }, { $set: update });
  console.log("✅ Superadmin password updated (tenancy-scoped)");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
