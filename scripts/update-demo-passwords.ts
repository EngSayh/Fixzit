#!/usr/bin/env node
/**
 * Update all demo user passwords to "password123"
 * Uses centralized demo user configuration from lib/config/demo-users.ts
 */
import { db } from "../lib/mongo";
import { User } from "../server/models/User";
import { hashPassword } from "../lib/auth";
import { getDemoEmail } from "../lib/config/demo-users";

const emails = [
  getDemoEmail("superadmin"),
  getDemoEmail("admin"),
  getDemoEmail("manager"),
  getDemoEmail("tenant"),
  getDemoEmail("vendor"),
  getDemoEmail("emp001"),
  getDemoEmail("emp002"),
];

const usernames = ["EMP001", "EMP002"];

async function updatePasswords() {
  try {
    await db;
    console.log('🔐 Updating all demo user passwords to "password123"...\n');

    const hashedPassword = await hashPassword("password123");
    let updated = 0;

    // Update by email
    for (const email of emails) {
      const result = await User.updateOne(
        { email },
        { $set: { password: hashedPassword, status: "ACTIVE" } },
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated: ${email}`);
        updated++;
      } else {
        const exists = await User.findOne({ email });
        if (exists) {
          console.log(`⏭️  Already set: ${email}`);
        } else {
          console.log(`❌ Not found: ${email}`);
        }
      }
    }

    // Also update by username for corporate users
    for (const username of usernames) {
      const result = await User.updateOne(
        { username },
        { $set: { password: hashedPassword, status: "ACTIVE" } },
      );
      if (result.modifiedCount > 0 && result.matchedCount > 0) {
        console.log(`✅ Updated: ${username}`);
        updated++;
      }
    }

    console.log(`\n📊 Updated ${updated} user passwords`);
    console.log("\n🔑 All demo users now have password: password123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updatePasswords();
