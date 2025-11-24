#!/usr/bin/env node
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

async function listUsers() {
  try {
    await db;
    const users = await User.find({})
      .select("email username professional.role status")
      .limit(20);

    console.log(`📋 Found ${users.length} users:\n`);
    users.forEach((user) => {
      console.log(
        `${user.email || "N/A"} | ${user.username || "N/A"} | ${user.professional?.role || "N/A"} | ${user.status || "N/A"}`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

listUsers();
