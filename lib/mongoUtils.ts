import mongoose from 'mongoose';

/**
 * Atomic counter for generating unique sequential user codes
 * Uses MongoDB's findOneAndUpdate with $inc to guarantee uniqueness
 * even under high concurrency (race condition safe)
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
  const result = await conn.db.collection<CounterDoc>('counters').findOneAndUpdate(
    { _id: 'userCode' },
    { 
      $inc: { seq: 1 },           // Atomically increment
      $setOnInsert: { seq: 1 }    // Initialize to 1 if doesn't exist
    },
    { 
      upsert: true,                // Create if doesn't exist
      returnDocument: 'after',     // Return updated document
      session                      // Support transactions
    }
  );

  if (!result || typeof result.seq !== 'number') {
    throw new Error('Failed to generate atomic user code from counters collection');
  }
  
  // Format as USR000001, USR000002, etc.
  return `USR${String(result.seq).padStart(6, '0')}`;
}
