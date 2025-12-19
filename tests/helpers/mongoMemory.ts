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
