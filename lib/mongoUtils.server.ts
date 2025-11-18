import 'server-only';
import mongoose from 'mongoose';
import type { ModifyResult } from 'mongodb';

/**
 * SERVER-ONLY: Atomic counter for generating unique sequential user codes
 * Uses MongoDB's findOneAndUpdate with $inc to guarantee uniqueness
 * even under high concurrency (race condition safe)
 * 
 * ⚡ CRITICAL: This file is marked as server-only and will error if imported in client/edge code
 */

interface CounterDoc {
  _id: string;  // MongoDB native _id field used as counter name
  seq: number;
}

/**
 * Generate next atomic user code (e.g., USR000001, USR000002, etc.)
 * 
 * @param session - Optional MongoDB session for transactions
 * @returns Promise<string> - Formatted user code (e.g., "USR000123")
 * @throws Error if database connection is not available
 */
export async function getNextAtomicUserCode(session?: mongoose.ClientSession): Promise<string> {
  const conn = mongoose.connection;
  
  if (!conn.db) {
    throw new Error('Database connection not available. Call connectToDatabase() first.');
  }

  // Use MongoDB's atomic findOneAndUpdate with $inc
  // This guarantees uniqueness even if multiple requests happen simultaneously
  const collection = conn.db.collection<CounterDoc>('counters');
  const rawResult = await collection.findOneAndUpdate(
    { _id: 'userCode' },
    { 
      $inc: { seq: 1 }            // Atomically increment (Mongo treats missing field as 0)
    },
    { 
      upsert: true,                // Create if doesn't exist
      returnDocument: 'after',     // Return updated document
      session                      // Support transactions
    }
  );

  const result = rawResult as ModifyResult<CounterDoc> | null;
  // SECURITY: Fail fast if atomic operation didn't return valid sequence
  // Don't fallback to separate query (breaks atomicity and ignores session)
  const counter = result?.value ?? null;
  const seqValue = counter?.seq;
  if (typeof seqValue !== 'number' || Number.isNaN(seqValue)) {
    throw new Error(
      `Failed to generate atomic user code: findOneAndUpdate returned invalid seq. ` +
      `Result: ${JSON.stringify(result)}. Check database connection and counter document.`
    );
  }
  
  // Format as USR000001, USR000002, etc.
  return `USR${String(seqValue).padStart(6, '0')}`;
}
