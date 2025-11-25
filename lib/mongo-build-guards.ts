interface MongoErrorShape {
  code?: string | number;
  message?: string;
}

/**
 * Determines whether a MongoDB error should be treated as "unavailable"
 * (e.g., DNS failure, skipped connection during build, socket issues).
 */
export function isMongoUnavailableError(
  error: unknown,
): error is Error & MongoErrorShape {
  if (!error || typeof error !== "object") {
    return false;
  }

  const err = error as MongoErrorShape;
  const code = typeof err.code === "string" ? err.code : String(err.code ?? "");
  const message = (err.message || "").toLowerCase();

  if (code === "MONGO_DISABLED_FOR_BUILD") {
    return true;
  }

  if (["enotfound", "etimedout", "econnrefused"].includes(code.toLowerCase())) {
    return true;
  }

  if (
    message.includes("_mongodb._tcp") ||
    message.includes("failed to connect to server")
  ) {
    return true;
  }

  return false;
}
