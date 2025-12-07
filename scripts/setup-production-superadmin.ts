#!/usr/bin/env tsx
/**
 * Setup Production SuperAdmin
 *
 * Creates or updates the production SuperAdmin account.
 * Uses environment variables for email and password.
 *
 * Required Environment Variables:
 * - MONGODB_URI or DATABASE_URL: MongoDB connection string
 * - SUPERADMIN_EMAIL: SuperAdmin email (e.g., sultan.a.hassni@gmail.com)
 * - SUPERADMIN_PASSWORD: SuperAdmin password (will be hashed)
 * - PUBLIC_ORG_ID or DEFAULT_ORG_ID: Organization ID for the user
 *
 * Usage:
 *   SUPERADMIN_EMAIL=sultan.a.hassni@gmail.com SUPERADMIN_PASSWORD=YourSecurePassword123! pnpm exec tsx scripts/setup-production-superadmin.ts
 */

import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import bcrypt from "bcryptjs";

async function setupProductionSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL || process.env.NEXTAUTH_SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const orgId = process.env.PUBLIC_ORG_ID || process.env.DEFAULT_ORG_ID;

  if (!email) {
    console.error("❌ Missing SUPERADMIN_EMAIL environment variable");
    console.error("   Usage: SUPERADMIN_EMAIL=your@email.com SUPERADMIN_PASSWORD=YourPass123! pnpm exec tsx scripts/setup-production-superadmin.ts");
    process.exit(1);
  }

  if (!password) {
    console.error("❌ Missing SUPERADMIN_PASSWORD environment variable");
    console.error("   Usage: SUPERADMIN_EMAIL=your@email.com SUPERADMIN_PASSWORD=YourPass123! pnpm exec tsx scripts/setup-production-superadmin.ts");
    process.exit(1);
  }

  console.log("🔐 Setting up Production SuperAdmin...\n");
  console.log(`   Email: ${email}`);
  console.log(`   OrgId: ${orgId}`);
  console.log("");

  try {
    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to database\n");

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      console.log("📝 User exists, updating credentials...");
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user with superadmin credentials
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            status: "ACTIVE",
            isActive: true,
            isSuperAdmin: true,
            role: "SUPER_ADMIN",
            "professional.role": "SUPER_ADMIN",
            orgId: orgId,
            "security.locked": false,
            "security.lockReason": null,
            "security.lockTime": null,
            "security.loginAttempts": 0,
            emailVerifiedAt: new Date(),
          },
        }
      );
      
      console.log("✅ User updated successfully!\n");
    } else {
      console.log("📝 Creating new SuperAdmin user...");

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create new user
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        username: email.split("@")[0],
        status: "ACTIVE",
        isActive: true,
        isSuperAdmin: true,
        role: "SUPER_ADMIN",
        orgId: orgId,
        professional: {
          role: "SUPER_ADMIN",
        },
        personal: {
          firstName: "Super",
          lastName: "Admin",
        },
        security: {
          locked: false,
          loginAttempts: 0,
        },
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("✅ SuperAdmin created successfully!\n");
    }

    // Verify the user
    const verifiedUser = await User.findOne({ email: email.toLowerCase() });
    if (verifiedUser) {
      const passwordValid = await bcrypt.compare(password, verifiedUser.password);

      console.log("📋 SuperAdmin Details:");
      console.log("   ═══════════════════════════════════════════");
      console.log("   ID:        ", verifiedUser._id.toString());
      console.log("   Email:     ", verifiedUser.email);
      console.log("   Password:  ", passwordValid ? "✅ VERIFIED" : "❌ FAILED");
      console.log("   Role:      ", verifiedUser.role || verifiedUser.professional?.role);
      console.log("   Status:    ", verifiedUser.status);
      console.log("   isSuperAdmin:", verifiedUser.isSuperAdmin);
      console.log("   OrgId:     ", verifiedUser.orgId);
      console.log("   ═══════════════════════════════════════════\n");

      if (passwordValid) {
        console.log("🎉 SUCCESS! You can now log in at:");
        console.log("   https://fixzit.co/login");
        console.log("");
        console.log("   Make sure these Vercel environment variables are set:");
        console.log(`   NEXTAUTH_SUPERADMIN_EMAIL=${email}`);
        console.log("   NEXTAUTH_BYPASS_OTP_ALL=true");
        console.log("   NEXTAUTH_BYPASS_OTP_CODE=<12+ char secure code>");
        console.log("");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to setup SuperAdmin:", error);
    process.exit(1);
  }
}

setupProductionSuperAdmin();
