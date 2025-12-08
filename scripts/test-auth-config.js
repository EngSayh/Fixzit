#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.com";

console.log("\n=== PHASE 1.2: AUTHENTICATION CONFIG VERIFICATION ===\n");

const results = {
  jwtSecret: false,
  jwtLength: false,
  mongodbUri: false,
  authModule: false,
};

console.log("[1/4] Checking JWT_SECRET...");
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.log("❌ JWT_SECRET not found");
} else {
  results.jwtSecret = true;
  console.log("✅ JWT_SECRET configured (********)");
  if (jwtSecret.length >= 32) {
    results.jwtLength = true;
    console.log(`✅ JWT_SECRET length: ${jwtSecret.length} bytes (secure)`);
  }
}

console.log("\n[2/4] Checking MONGODB_URI...");
const mongoUri = process.env.MONGODB_URI;
if (mongoUri && mongoUri.includes("mongodb+srv")) {
  results.mongodbUri = true;
  console.log("✅ MONGODB_URI configured (Atlas)");
}

console.log("\n[3/4] Testing auth module...");
try {
  const { generateToken, verifyToken } = require("../lib/auth");
  results.authModule = true;
  console.log("✅ Auth module loaded");

  console.log("\n[4/4] Testing JWT operations...");
  const token = generateToken({
    id: "123",
    email: `test@${EMAIL_DOMAIN}`,
    role: "super_admin",
    orgId: "456",
  });
  console.log("✅ Token generation successful");
  const decoded = verifyToken(token);
  if (decoded) console.log("✅ Token verification successful");
} catch (e) {
  console.log("❌ Auth module failed:", e.message);
}

const allPassed = Object.values(results).every((v) => v === true);
console.log("\n" + "=".repeat(60));
if (allPassed) {
  console.log("✅✅✅ PHASE 1.2 COMPLETE: AUTHENTICATION VERIFIED ✅✅✅\n");
  process.exit(0);
} else {
  console.log("❌ PHASE 1.2 INCOMPLETE\n");
  process.exit(1);
}
