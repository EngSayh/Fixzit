#!/usr/bin/env tsx
import { db } from "../lib/mongo";
import { User } from "../server/models/User";

const TEST_ORG_ID = process.env.TEST_ORG_ID || process.env.DEFAULT_ORG_ID;

async function count() {
  try {
    if (!TEST_ORG_ID) {
      console.error("❌ TEST_ORG_ID or DEFAULT_ORG_ID must be set");
      process.exit(1);
    }
    await db;
    const users = await User.find({
      orgId: TEST_ORG_ID,
      employeeId: null,
    })
      .select("email username code employeeId")
      .lean();

    console.log(
      `Found ${users.length} users with orgId=${TEST_ORG_ID} and employeeId=null:`,
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
