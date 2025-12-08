import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.development" });
dotenv.config();

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function debugAuth() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI not found in environment");
      process.exit(1);
    }

    console.log("🔍 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected\n");

    // Define User schema
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model("User", userSchema, "users");

    // Test credentials
    const testEmail = `admin@${EMAIL_DOMAIN}`;
    const testPassword = "password123";

    console.log("🔍 Testing authentication for:", testEmail);
    console.log("🔍 Testing password:", testPassword);
    console.log("");

    // Find user
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.error("❌ User not found with email:", testEmail);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ User found in database:");
    console.log("   - ID:", user._id.toString());
    console.log("   - Email:", user.email);
    console.log("   - Role:", user.role || user.professional?.role || "N/A");
    console.log("   - Has password hash:", !!user.password);
    console.log("   - Password hash length:", user.password?.length || 0);
    console.log(
      "   - Password hash starts with:",
      user.password?.substring(0, 7),
    );
    console.log(
      "   - Is Active:",
      user.isActive !== undefined ? user.isActive : user.status === "ACTIVE",
    );
    console.log("");

    // Test bcrypt comparison
    console.log("🔍 Testing bcrypt password comparison...");
    const isValid = await bcrypt.compare(testPassword, user.password);

    if (isValid) {
      console.log("✅ PASSWORD MATCH! Authentication should work.");
    } else {
      console.log("❌ PASSWORD MISMATCH! This is the problem.");
      console.log("");
      console.log("🔧 Generating new hash for comparison:");
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log("   New hash:", newHash);
      console.log("   Stored hash:", user.password);
      console.log("");
      console.log(
        "💡 The stored password might have been hashed with a different method or salt.",
      );
    }

    console.log("");
    console.log("🔍 Checking other demo users...");
    const demoEmails = [
      `superadmin@${EMAIL_DOMAIN}`,
      `admin@${EMAIL_DOMAIN}`,
      `manager@${EMAIL_DOMAIN}`,
      `tenant@${EMAIL_DOMAIN}`,
      `vendor@${EMAIL_DOMAIN}`,
    ];

    for (const email of demoEmails) {
      const demoUser = await User.findOne({ email });
      if (demoUser) {
        const match = await bcrypt.compare(testPassword, demoUser.password);
        console.log(
          `   ${match ? "✅" : "❌"} ${email.padEnd(25)} - Password ${match ? "VALID" : "INVALID"}`,
        );
      }
    }

    await mongoose.disconnect();
    console.log("\n✅ Diagnostic complete");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

debugAuth();
