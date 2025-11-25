export const cfg = {
  baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDb: process.env.MONGODB_DB || "fixzit_dev",
  users: {
    admin: {
      email: process.env.FIXZIT_TEST_ADMIN_EMAIL || "admin@fixzit.co",
      password: process.env.FIXZIT_TEST_ADMIN_PASSWORD || "admin123",
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
