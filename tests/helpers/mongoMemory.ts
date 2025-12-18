import { MongoMemoryServer } from "mongodb-memory-server";

type StartOptions = {
  launchTimeoutMs?: number;
  instance?: NonNullable<ConstructorParameters<typeof MongoMemoryServer>[0]>["instance"];
  binary?: NonNullable<ConstructorParameters<typeof MongoMemoryServer>[0]>["binary"];
};

function ensureMongoMemoryEnv() {
  if (!process.env.MONGOMS_TIMEOUT) {
    process.env.MONGOMS_TIMEOUT = "60000";
  }
  if (!process.env.MONGOMS_DOWNLOAD_TIMEOUT) {
    process.env.MONGOMS_DOWNLOAD_TIMEOUT = "60000";
  }
  if (!process.env.MONGOMS_START_TIMEOUT) {
    process.env.MONGOMS_START_TIMEOUT = "60000";
  }
}

export async function startMongoMemoryServer(
  options: StartOptions = {},
): Promise<MongoMemoryServer> {
  ensureMongoMemoryEnv();
  const launchTimeout = options.launchTimeoutMs ?? 60_000;
  const retries = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await MongoMemoryServer.create({
        ...options,
        instance: {
          port: options.instance?.port ?? 0,
          launchTimeout,
          ...(options.instance ?? {}),
        },
        binary: options.binary,
      });
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
    }
  }
  throw lastError ?? new Error("MongoMemoryServer failed to start");
}

// Simplified API for integration tests
let globalMongoServer: MongoMemoryServer | null = null;

export async function startMongoMemory(): Promise<string> {
  if (globalMongoServer) {
    throw new Error('MongoMemoryServer already started');
  }
  globalMongoServer = await startMongoMemoryServer();
  const uri = globalMongoServer.getUri();
  
  // Note: Mongoose connection managed by app (not here)
  // Tests should use the URI to connect their own mongoose instance if needed
  return uri;
}

export async function stopMongoMemory(): Promise<void> {
  if (!globalMongoServer) {
    return;
  }
  await globalMongoServer.stop();
  globalMongoServer = null;
}

export async function clearCollections(): Promise<void> {
  // This is a no-op for integration tests that don't use mongoose
  // Real tests should import mongoose and clear collections themselves
  return Promise.resolve();
}
