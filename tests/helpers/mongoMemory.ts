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
  return MongoMemoryServer.create({
    ...options,
    instance: {
      launchTimeout,
      ...(options.instance ?? {}),
    },
    binary: options.binary,
  });
}
