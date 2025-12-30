/**
 * MongoDB test utilities
 * 
 * Shared helpers for model tests that need to wait for MongoDB Memory Server.
 * @module tests/utils/mongo-helpers
 */

import mongoose from 'mongoose';

/**
 * Wait for mongoose connection to be ready with retry logic.
 * 
 * Handles CI environments where MongoDB Memory Server may take longer to start
 * due to binary download or cold start conditions.
 * 
 * @param maxWaitMs - Maximum time to wait (default 180s for CI cold starts)
 * @param retryIntervalMs - Interval between connection checks (default 200ms)
 * @returns Promise that resolves when connected or rejects on timeout
 */
export async function waitForMongoConnection(
  maxWaitMs = 180000,
  retryIntervalMs = 200
): Promise<void> {
  const start = Date.now();
  let lastLoggedState = -1;
  
  while (mongoose.connection.readyState !== 1) {
    const elapsed = Date.now() - start;
    
    if (elapsed > maxWaitMs) {
      throw new Error(
        `Mongoose not connected after ${maxWaitMs}ms - readyState: ${mongoose.connection.readyState}. ` +
        `Ensure MongoMemoryServer started in vitest.setup.ts beforeAll hook.`
      );
    }
    
    // Log state changes for debugging (but not too frequently)
    const currentState = mongoose.connection.readyState;
    if (currentState !== lastLoggedState && elapsed > 5000) {
      console.debug(`[waitForMongoConnection] Waiting... readyState=${currentState}, elapsed=${elapsed}ms`);
      lastLoggedState = currentState;
    }
    
    await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
  }
}
