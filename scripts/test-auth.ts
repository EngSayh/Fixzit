#!/usr/bin/env node
/**
 * Test authentication manually
 */
import { db } from "../lib/mongo";
import { User } from "../server/models/User";
import bcrypt from "bcryptjs";

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

async function testAuth() {
  try {
    await db;

    const email = `admin@${EMAIL_DOMAIN}`;
    const password = "password123";

    console.log(`🔍 Testing authentication for ${email}...\n`);

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      console.error("❌ User not found");
      process.exit(1);
    }

    console.log("✅ User found");
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.professional?.role}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Has password: ${!!user.password}`);
    console.log(
      `   Password starts with $2b$: ${user.password?.startsWith("$2b$")}`,
    );

    // Test password
    console.log(`\n🔐 Testing password verification...`);
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      console.log("✅ Password matches!");
    } else {
      console.log("❌ Password does NOT match");

      // Try hashing the password and comparing
      console.log("\n🧪 Testing hash generation...");
      const newHash = await bcrypt.hash(password, 10);
      console.log(`   New hash: ${newHash.substring(0, 20)}...`);
      console.log(`   Stored hash: ${user.password.substring(0, 20)}...`);

      const testAgain = await bcrypt.compare(password, newHash);
      console.log(`   New hash validates: ${testAgain}`);
    }

    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testAuth();
