#!/usr/bin/env tsx
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

async function count() {
  try {
    await db;
    const users = await User.find({
      orgId: "68dc8955a1ba6ed80ff372dc",
      employeeId: null,
    })
      .select("email username code employeeId")
      .lean();

    console.log(
      `Found ${users.length} users with orgId=68dc8955a1ba6ed80ff372dc and employeeId=null:`,
    );
    users.forEach((u) => {
      console.log(
        `  ${u.code || "NO_CODE"} | ${u.username || "NO_USERNAME"} | ${u.email} | employeeId: ${u.employeeId}`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

count();
