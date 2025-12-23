// Next.js guard: ensures this file is treated as server-only in real app.
// Skip the hard throw when running vitest (VITEST=1) by using a dynamic import.
if (!process.env.VITEST) {
  void import("server-only");
}
import mongoose from "mongoose";
import type { ModifyResult, WithId } from "mongodb";

/**
 * SERVER-ONLY: Atomic counter for generating unique sequential user codes
 * Uses MongoDB's findOneAndUpdate with $inc to guarantee uniqueness
 * even under high concurrency (race condition safe)
 *
 * ⚡ CRITICAL: This file is marked as server-only and will error if imported in client/edge code
 */

interface CounterDoc {
  _id: string; // MongoDB native _id field used as counter name
  seq: number;
}

/**
 * Generate next atomic user code (e.g., USR000001, USR000002, etc.)
 *
 * @param session - Optional MongoDB session for transactions
 * @returns Promise<string> - Formatted user code (e.g., "USR000123")
 * @throws Error if database connection is not available
 */
export async function getNextAtomicUserCode(
  session?: mongoose.ClientSession,
): Promise<string> {
  const conn = mongoose.connection;

  if (!conn.db) {
    throw new Error(
      "Database connection not available. Call connectToDatabase() first.",
    );
  }

  // Use MongoDB's atomic findOneAndUpdate with $inc
  // This guarantees uniqueness even if multiple requests happen simultaneously
  const collection = conn.db.collection<CounterDoc>("counters");
  // eslint-disable-next-line local/require-tenant-scope -- NO_LEAN: Native driver returns lean POJO; PLATFORM-WIDE: Shared counter collection
  const rawResult = await collection.findOneAndUpdate(
    { _id: "userCode" },
    {
      $inc: { seq: 1 }, // Atomically increment (Mongo treats missing field as 0)
    },
    {
      upsert: true, // Create if doesn't exist
      returnDocument: "after", // Return updated document
      session, // Support transactions
    },
  );

  const result = rawResult as ModifyResult<CounterDoc> | CounterDoc | null;
  const seqFromResult =
    (result && typeof (result as ModifyResult<CounterDoc>).value === "object"
      ? (result as ModifyResult<CounterDoc>).value?.seq
      : (result as CounterDoc | null)?.seq) ?? undefined;

  let seqValue = seqFromResult;
  if (typeof seqValue !== "number" || Number.isNaN(seqValue)) {
    // Fallback to direct read (rare but safe when result is missing)
    // eslint-disable-next-line local/require-lean, local/require-tenant-scope -- NO_LEAN: Native driver returns lean POJO; PLATFORM-WIDE: Shared counter
    const fallbackDoc = await collection.findOne({ _id: "userCode" });
    seqValue = fallbackDoc?.seq;
  }

  if (typeof seqValue !== "number" || Number.isNaN(seqValue)) {
    throw new Error(
      `Failed to generate atomic user code: findOneAndUpdate returned invalid seq. ` +
        `Result: ${JSON.stringify(result)}. Check database connection and counter document.`,
    );
  }

  // Format as USR000001, USR000002, etc.
  return `USR${String(seqValue).padStart(6, "0")}`;
}

/**
 * Normalize MongoDB findOneAndUpdate/findOneAndDelete results across driver versions.
 * - Driver v4/v5 returned ModifyResult<{ value?: T }>
 * - Driver v6 returns the document directly
 */
export function unwrapFindOneResult<T>(
  result: ModifyResult<T> | WithId<T> | null | undefined,
): WithId<T> | null {
  if (!result) return null;
  if (typeof result === "object" && "value" in result) {
    const value = (result as ModifyResult<T>).value;
    return (value ?? null) as WithId<T> | null;
  }
  return result as WithId<T>;
}
