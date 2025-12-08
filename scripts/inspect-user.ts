#!/usr/bin/env node
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

async function inspectUser() {
  try {
    await db;
    const adminEmail = `admin@${EMAIL_DOMAIN}`;
    const user = await User.findOne({ email: adminEmail });

    if (user) {
      console.log(`📋 Existing ${adminEmail} user structure:`);
      console.log(JSON.stringify(user.toObject(), null, 2));
    } else {
      console.log("❌ No user found");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

inspectUser();
