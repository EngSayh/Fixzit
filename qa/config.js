// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

// 🔒 SEC-049: Require password from environment - no hardcoded defaults
const TEST_ADMIN_PASSWORD =
  process.env.FIXZIT_TEST_ADMIN_PASSWORD ||
  process.env.TEST_USER_PASSWORD ||
  process.env.SEED_PASSWORD;
if (!TEST_ADMIN_PASSWORD) {
  throw new Error(
    "❌ FIXZIT_TEST_ADMIN_PASSWORD/TEST_USER_PASSWORD/SEED_PASSWORD is required for QA tests. " +
    "Set it before running: export FIXZIT_TEST_ADMIN_PASSWORD=yourpassword",
  );
}

export const cfg = {
  baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDb: process.env.MONGODB_DB || "fixzit_dev",
  users: {
    admin: {
      email:
        process.env.FIXZIT_TEST_ADMIN_EMAIL || `superadmin@${EMAIL_DOMAIN}`,
      password: TEST_ADMIN_PASSWORD,
    },
  },
  // expected brand tokens
  brand: { primary: "#0061A8", secondary: "#00A859", accent: "#FFB400" },
  // authoritative sidebar baseline for Admin/Super Admin
  modules: [
    "Dashboard",
    "Work Orders",
    "Properties",
    "Finance",
    "Human Resources",
    "Administration",
    "CRM",
    "Marketplace",
    "Support",
    "Compliance",
    "Reports",
    "System",
  ],
};
