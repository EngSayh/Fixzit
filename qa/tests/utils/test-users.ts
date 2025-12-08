const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

export function getBaseUrlWithProdGuard(testName: string) {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  if (
    /fixzit\.co|vercel\.app|production/i.test(baseUrl) &&
    process.env.ALLOW_E2E_PROD !== "1"
  ) {
    throw new Error(
      `Refusing to run ${testName} against ${baseUrl} without ALLOW_E2E_PROD=1`,
    );
  }
  return baseUrl;
}

export function getAdminTestUser(testName: string) {
  const password =
    process.env.FIXZIT_TEST_ADMIN_PASSWORD ||
    process.env.TEST_USER_PASSWORD ||
    process.env.SEED_PASSWORD;

  if (!password) {
    throw new Error(
      `${testName}: FIXZIT_TEST_ADMIN_PASSWORD/TEST_USER_PASSWORD/SEED_PASSWORD is required (no hardcoded fallback).`,
    );
  }

  return {
    email: process.env.FIXZIT_TEST_ADMIN_EMAIL || `superadmin@${EMAIL_DOMAIN}`,
    password,
  };
}

export const TEST_EMAIL_DOMAIN = EMAIL_DOMAIN;
