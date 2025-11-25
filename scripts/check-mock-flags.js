#!/usr/bin/env node

/**
 * Prevent mock/stubbed APIs from being enabled in production or CI environments.
 * Fails the build if any guarded mock flags are set to a truthy value.
 */

const BOOL_TRUE = ["true", "1", "yes", "y", "on"];
const MOCK_FLAGS = [
  "VENDOR_ASSIGNMENTS_API_MOCKS",
  "NEXT_PUBLIC_VENDOR_ASSIGNMENTS_API_MOCKS",
];

const strictEnv =
  process.env.NODE_ENV === "production" ||
  process.env.CI === "true" ||
  process.env.CHECK_MOCK_FLAGS === "true";

if (!strictEnv) {
  console.log(
    "[mock-flags] Skipped (NODE_ENV is not production and CI is not true).",
  );
  process.exit(0);
}

const offenders = MOCK_FLAGS.filter((flag) => {
  const value = process.env[flag];
  if (!value) return false;
  return BOOL_TRUE.includes(String(value).toLowerCase());
});

if (offenders.length > 0) {
  console.error(
    `[mock-flags] Blocked: mock feature flags must be false in production/CI. Offenders: ${offenders.join(
      ", ",
    )}`,
  );
  process.exit(1);
}

console.log("[mock-flags] OK: no production mock flags enabled.");
