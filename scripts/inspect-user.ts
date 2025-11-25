#!/usr/bin/env node
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

async function inspectUser() {
  try {
    await db;
    const user = await User.findOne({ email: "admin@fixzit.co" });

    if (user) {
      console.log("📋 Existing admin@fixzit.co user structure:");
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
