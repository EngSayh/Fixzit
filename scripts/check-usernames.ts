#!/usr/bin/env tsx
/**
 * List all users by username
 */
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

async function listUsers() {
  try {
    await db;
    console.log("👥 Checking specific usernames...\n");

    const usernames = [
      "test-admin",
      "test-owner",
      "test-employee",
      "test-technician",
      "test-property-manager",
      "test-tenant",
      "test-vendor",
      "test-viewer",
    ];

    for (const username of usernames) {
      const user = await User.findOne({ username })
        .select("code username email professional.role status")
        .lean();
      if (user) {
        console.log(
          `✅ ${username.padEnd(25)} ${user.email?.padEnd(40)} ${user.professional?.role || "NO_ROLE"}`,
        );
      } else {
        console.log(`❌ ${username.padEnd(25)} NOT FOUND`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

listUsers();
