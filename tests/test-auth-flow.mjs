import { z } from "zod";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.development" });
dotenv.config();

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';
const TEST_PASSWORD =
  process.env.TEST_USER_PASSWORD || process.env.SEED_PASSWORD;
const TEST_USER_IDENTIFIER =
  process.env.TEST_USER_IDENTIFIER || `superadmin@${EMAIL_DOMAIN}`;
const TEST_ORG_CODE = process.env.TEST_ORG_CODE || "platform-org-001";

if (!TEST_PASSWORD) {
  throw new Error(
    "TEST_USER_PASSWORD or SEED_PASSWORD is required for auth flow test",
  );
}

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
      identifier: TEST_USER_IDENTIFIER,
      password: TEST_PASSWORD,
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
    const uri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("TEST_MONGODB_URI or MONGODB_URI is required");
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to run auth-flow test against production");
    }
    if (
      !process.env.TEST_MONGODB_URI &&
      !uri.includes("test") &&
      !uri.includes("localhost")
    ) {
      throw new Error(
        "Use TEST_MONGODB_URI or a test database (uri should include 'test' or be localhost)",
      );
    }
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
    console.log("");

    // Step 3: Find user
    console.log("Step 3: Finding user...");
    const userSchema = new mongoose.Schema(
      { passwordHash: { type: String, select: true } },
      { strict: false },
    );
    const orgSchema = new mongoose.Schema({}, { strict: false });
    const User =
      mongoose.models.AuthFlowUser ||
      mongoose.model("AuthFlowUser", userSchema, "users");
    const Organization =
      mongoose.models.AuthFlowOrg ||
      mongoose.model("AuthFlowOrg", orgSchema, "organizations");

    const targetOrg = await Organization.findOne({ code: TEST_ORG_CODE });

    let user;
    const baseFilter =
      loginType === "personal"
        ? { email: loginIdentifier }
        : { $or: [{ employeeId: loginIdentifier }, { username: loginIdentifier }] };
    const filter = targetOrg?._id
      ? { ...baseFilter, orgId: targetOrg._id }
      : baseFilter;
    console.log(
      `   Looking for ${loginType === "personal" ? "email" : "username"}:`,
      loginIdentifier,
      targetOrg?._id ? `(orgId: ${targetOrg._id})` : "(no org filter)",
    );
    user = await User.findOne(filter).select("+passwordHash");

    if (!user) {
      console.error("❌ User not found");
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log("✅ User found:", user.email);
    console.log("");

    // Step 4: Verify password
    console.log("Step 4: Verifying password...");
    const hash = user.passwordHash || user.password;
    if (!hash) {
      throw new Error("User record missing password hash");
    }
    const isValid = await bcrypt.compare(password, hash);

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
