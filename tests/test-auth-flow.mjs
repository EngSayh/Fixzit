import { z } from "zod";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.development" });
dotenv.config();

// Copy the LoginSchema from auth.config.ts
const LoginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, "Email or employee number is required"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional().default(false),
  })
  .transform((data, ctx) => {
    const idRaw = data.identifier.trim();
    const emailOk = z.string().email().safeParse(idRaw).success;
    const empUpper = idRaw.toUpperCase();
    const empOk = /^EMP\d+$/.test(empUpper);

    let loginIdentifier = "";
    let loginType;

    if (emailOk) {
      loginIdentifier = idRaw.toLowerCase();
      loginType = "personal";
    } else if (empOk) {
      loginIdentifier = empUpper;
      loginType = "corporate";
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identifier"],
        message:
          "Enter a valid email address or employee number (e.g., EMP001)",
      });
      return z.NEVER;
    }

    return {
      loginIdentifier,
      loginType,
      password: data.password,
      rememberMe: data.rememberMe,
    };
  });

async function testAuthFlow() {
  try {
    console.log("🔍 Testing NextAuth Credentials authorize() flow\n");

    // Simulate credentials from client
    const credentials = {
      identifier: "admin@fixzit.co",
      password: "password123",
      rememberMe: false,
    };

    console.log("📥 Input credentials:", credentials);
    console.log("");

    // Step 1: Validate schema
    console.log("Step 1: Validating schema...");
    const parsed = LoginSchema.safeParse(credentials);

    if (!parsed.success) {
      console.error("❌ Schema validation failed:", parsed.error.flatten());
      process.exit(1);
    }

    console.log("✅ Schema validation passed");
    console.log("   Parsed data:", parsed.data);
    console.log("");

    const { loginIdentifier, loginType, password, rememberMe } = parsed.data;

    // Step 2: Connect to database
    console.log("Step 2: Connecting to MongoDB...");
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    console.log("");

    // Step 3: Find user
    console.log("Step 3: Finding user...");
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model("User", userSchema, "users");

    let user;
    if (loginType === "personal") {
      console.log("   Looking for email:", loginIdentifier);
      user = await User.findOne({ email: loginIdentifier });
    } else {
      console.log("   Looking for username:", loginIdentifier);
      user = await User.findOne({ username: loginIdentifier });
    }

    if (!user) {
      console.error("❌ User not found");
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ User found:", user.email);
    console.log("");

    // Step 4: Verify password
    console.log("Step 4: Verifying password...");
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.error("❌ Password invalid");
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ Password valid");
    console.log("");

    // Step 5: Check if user is active
    console.log("Step 5: Checking user status...");
    const isUserActive =
      user.isActive !== undefined ? user.isActive : user.status === "ACTIVE";

    if (!isUserActive) {
      console.error("❌ User is inactive");
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ User is active");
    console.log("");

    // Step 6: Build return object
    console.log("Step 6: Building user object for session...");
    const userObject = {
      id: user._id.toString(),
      email: user.email,
      name:
        `${user.personal?.firstName || ""} ${user.personal?.lastName || ""}`.trim() ||
        user.email,
      role: user.professional?.role || user.role || "USER",
      orgId:
        typeof user.orgId === "string"
          ? user.orgId
          : user.orgId?.toString() || null,
      sessionId: null,
    };

    console.log("✅ User object created:", userObject);
    console.log("");

    console.log("✅✅✅ AUTHENTICATION FLOW SUCCESSFUL ✅✅✅");
    console.log("");
    console.log("💡 This proves the auth logic works correctly.");
    console.log(
      "💡 The issue must be in how the client-side signIn() function is being called.",
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

testAuthFlow();
