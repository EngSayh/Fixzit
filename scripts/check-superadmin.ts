#!/usr/bin/env tsx
/**
 * Check SuperAdmin accounts in database
 */

import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";

async function checkSuperAdmin() {
  try {
    console.log("🔍 Checking for SuperAdmin accounts...\n");

    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Find all SUPER_ADMIN users
    const superAdmins = await User.find({ 
      $or: [
        { role: "SUPER_ADMIN" },
        { isSuperAdmin: true },
        { "professional.role": "SUPER_ADMIN" }
      ]
    })
    .select("email username role isSuperAdmin status isActive orgId createdAt professional security")
    .lean();

    console.log(`Found ${superAdmins.length} SuperAdmin account(s):\n`);

    if (superAdmins.length === 0) {
      console.log("❌ No SuperAdmin accounts found!");
      console.log("\n📝 To create a SuperAdmin account, run:");
      console.log("   SUPERADMIN_EMAIL=your@email.com SUPERADMIN_PASSWORD=YourPass123! pnpm exec tsx scripts/setup-production-superadmin.ts");
    } else {
      superAdmins.forEach((user, idx) => {
        console.log(`${idx + 1}. SuperAdmin Details:`);
        console.log("   ═══════════════════════════════════════════");
        console.log("   ID:          ", user._id.toString());
        console.log("   Email:       ", user.email);
        console.log("   Username:    ", user.username);
        console.log("   Role:        ", user.role);
        console.log("   isSuperAdmin:", user.isSuperAdmin);
        console.log("   Status:      ", user.status);
        console.log("   isActive:    ", user.isActive);
        console.log("   OrgId:       ", user.orgId);
        console.log("   Locked:      ", user.security?.locked || false);
        console.log("   Login Fails: ", user.security?.loginAttempts || 0);
        console.log("   Created:     ", user.createdAt);
        console.log("   ═══════════════════════════════════════════\n");
      });

      console.log("✅ Login credentials should be:");
      console.log("   Email: One of the emails above");
      console.log("   Password: The password you set during account creation");
      console.log("\n📝 If you forgot the password, run:");
      console.log("   SUPERADMIN_EMAIL=email@above.com SUPERADMIN_PASSWORD=NewPass123! pnpm exec tsx scripts/setup-production-superadmin.ts");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkSuperAdmin();
