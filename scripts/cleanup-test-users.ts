#!/usr/bin/env tsx
/**
 * Clean up test users (@test.fixzit.co)
 */
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

const TEST_ORG_ID = process.env.TEST_ORG_ID || process.env.DEFAULT_ORG_ID;

async function cleanup() {
  try {
    await db;
    console.log("🧹 Cleaning up test users...");

    // Delete by email pattern
    const result1 = await User.deleteMany({
      email: { $regex: /@test\.fixzit\.co$/ },
    });

    // Delete by orgId with null employeeId (old test users)
    let result2 = { deletedCount: 0 };
    if (TEST_ORG_ID) {
      result2 = await User.deleteMany({
        orgId: TEST_ORG_ID,
        employeeId: null,
      });
    }

    console.log(
      `✅ Deleted ${result1.deletedCount + result2.deletedCount} test users`,
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

cleanup();
