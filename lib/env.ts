const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST_WORKER_ID !== undefined ||
  process.env.JEST_WORKER_ID !== undefined;

type RequireEnvOptions = {
  /**
   * Allow returning an empty string (for flags). Defaults to false.
   */
  allowEmpty?: boolean;
  /**
   * Provide a fallback specifically for test environments.
   */
  testFallback?: string;
};

export const TEST_JWT_SECRET = 'test-secret-key-for-jest-tests-minimum-32-characters-long';

export function requireEnv(name: string, options: RequireEnvOptions = {}): string {
  const value = process.env[name];
  const hasValue = value !== undefined && (options.allowEmpty || value.trim() !== '');

  if (hasValue) {
    return value as string;
  }

  if (isTestEnv && options.testFallback !== undefined) {
    process.env[name] = options.testFallback;
    return options.testFallback;
  }

  throw new Error(
    `Missing required environment variable "${name}". Set it in your environment or secrets manager.`
  );
}

export function getEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}
