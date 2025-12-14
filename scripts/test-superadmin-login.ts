#!/usr/bin/env tsx
/**
 * Test SuperAdmin Login Flow
 * 
 * This script tests the OTP bypass mechanism for the SuperAdmin account.
 */

import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { Config } from "@/lib/config/constants";

async function testSuperAdminLogin() {
  try {
    console.log("🧪 Testing SuperAdmin Login Configuration\n");

    // Check environment variables from Config module
    const superadminEmail = Config.auth.superAdmin.email;
    const bypassCode = Config.auth.superAdmin.bypassOtpCode;
    const bypassAll = Config.auth.superAdmin.bypassOtpAll;

    console.log("📋 Environment Configuration:");
    console.log("   ═══════════════════════════════════════════");
    console.log("   NEXTAUTH_SUPERADMIN_EMAIL:", superadminEmail || "❌ NOT SET");
    console.log("   NEXTAUTH_BYPASS_OTP_CODE:", bypassCode ? `✅ SET (${bypassCode.length} chars)` : "❌ NOT SET");
    console.log("   NEXTAUTH_BYPASS_OTP_ALL:", bypassAll ? "✅ true" : "❌ NOT SET");
    console.log("   ═══════════════════════════════════════════\n");

    if (!superadminEmail) {
      console.log("❌ NEXTAUTH_SUPERADMIN_EMAIL is not set!");
      console.log("   Add to .env.local: NEXTAUTH_SUPERADMIN_EMAIL=\"sultan.a.hassni@gmail.com\"");
      process.exit(1);
    }

    if (!bypassCode || bypassCode.length < 12) {
      console.log("❌ NEXTAUTH_BYPASS_OTP_CODE is not set or too short!");
      console.log("   Add to .env.local: NEXTAUTH_BYPASS_OTP_CODE=\"your-12-char-code\"");
      process.exit(1);
    }

    if (!bypassAll) {
      console.log("⚠️  NEXTAUTH_BYPASS_OTP_ALL is not set to 'true'");
      console.log("   Add to .env.local: NEXTAUTH_BYPASS_OTP_ALL=\"true\"");
    }

    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Find the SuperAdmin user
    const superadmin = await User.findOne({ email: superadminEmail.toLowerCase() })
      .select("email username role isSuperAdmin status isActive security")
      .lean();

    if (!superadmin) {
      console.log(`❌ SuperAdmin user not found: ${superadminEmail}`);
      console.log("\n📝 Create the SuperAdmin account:");
      console.log(`   SUPERADMIN_EMAIL=${superadminEmail} SUPERADMIN_PASSWORD=YourPass123! pnpm exec tsx scripts/setup-production-superadmin.ts`);
      process.exit(1);
    }

    console.log("✅ SuperAdmin Account Found:");
    console.log("   ═══════════════════════════════════════════");
    console.log("   Email:", superadmin.email);
    console.log("   Username:", superadmin.username);
    console.log("   Role:", superadmin.role || "❌ MISSING");
    console.log("   isSuperAdmin:", superadmin.isSuperAdmin ? "✅" : "❌");
    console.log("   Status:", superadmin.status);
    console.log("   isActive:", superadmin.isActive);
    console.log("   Locked:", (superadmin as any).security?.locked || false);
    console.log("   ═══════════════════════════════════════════\n");

    // Validate account
    const issues: string[] = [];
    if (!superadmin.role || superadmin.role !== 'SUPER_ADMIN') {
      issues.push("Role is not set to 'SUPER_ADMIN'");
    }
    if (!superadmin.isSuperAdmin) {
      issues.push("isSuperAdmin flag is not true");
    }
    if (superadmin.status !== 'ACTIVE') {
      issues.push("Status is not 'ACTIVE'");
    }
    if (superadmin.isActive === false) {
      issues.push("isActive flag is false");
    }
    if ((superadmin as any).security?.locked) {
      issues.push("Account is locked");
    }

    if (issues.length > 0) {
      console.log("⚠️  Account Issues Found:");
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log("\n📝 Fix the account:");
      console.log(`   SUPERADMIN_EMAIL=${superadminEmail} SUPERADMIN_PASSWORD=YourPass123! pnpm exec tsx scripts/setup-production-superadmin.ts`);
      process.exit(1);
    }

    console.log("✅ All Checks Passed!\n");
    console.log("🎉 SuperAdmin Login Configuration is Ready!");
    console.log("\n📝 Login Instructions:");
    console.log("   1. Go to: http://localhost:3000/login or https://fixzit.co/login");
    console.log(`   2. Email: ${superadminEmail}`);
    console.log("   3. Password: The password you set during account creation");
    console.log("   4. OTP Code (if prompted): Check your configured bypass code");
    console.log("\n💡 OTP Bypass is enabled, so you may not even need to enter the OTP code!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testSuperAdminLogin();
