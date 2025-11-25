const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST_WORKER_ID !== undefined ||
  process.env.JEST_WORKER_ID !== undefined;

function requireEnv(name, options = {}) {
  const value = process.env[name];
  const hasValue =
    value !== undefined && (options.allowEmpty || (value || "").trim() !== "");

  if (hasValue) {
    return value;
  }

  if (
    isTestEnv &&
    Object.prototype.hasOwnProperty.call(options, "testFallback")
  ) {
    process.env[name] = options.testFallback;
    return options.testFallback;
  }

  throw new Error(
    `Missing required environment variable "${name}". Set it in your environment or secrets manager.`,
  );
}

function getEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }
  return value;
}

module.exports = {
  requireEnv,
  getEnv,
};
