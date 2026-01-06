/**
 * MongoDB test utilities
 * 
 * Shared helpers for model tests that need to wait for MongoDB Memory Server.
 * @module tests/utils/mongo-helpers
 */

/* eslint-disable no-console -- Test utilities need console output for debugging connection issues */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Track reconnection attempts to prevent infinite loops
let reconnectAttempted = false;

// Track local MongoMemoryServer instance for fallback
let localMongoServer: MongoMemoryServer | null = null;

/**
 * Wait for mongoose connection to be ready with retry logic.
 * Falls back to creating a local MongoMemoryServer if the global one isn't ready.
 * 
 * Handles CI environments where MongoDB Memory Server may take longer to start
 * due to binary download or cold start conditions. In sharded CI runs, the global
 * setup may not be available, so this function will create a local instance.
 * 
 * If the connection is disconnected (readyState=0) and we have a MONGODB_URI,
 * this function will attempt to reconnect once before continuing to wait.
 * 
 * IMPORTANT: maxWaitMs must be LESS than mongoose bufferTimeoutMS (10s default)
 * so the fallback triggers before mongoose operations timeout.
 * 
 * @param maxWaitMs - Maximum time to wait for global setup (default 8s before fallback)
 * @param retryIntervalMs - Interval between connection checks (default 100ms)
 * @returns Promise that resolves when connected or rejects on timeout
 */
export async function waitForMongoConnection(
  maxWaitMs = 8000,
  retryIntervalMs = 100
): Promise<void> {
  const start = Date.now();
  let lastLoggedState = -1;
  
  // First, wait for global setup to potentially connect
  while (mongoose.connection.readyState !== 1) {
    const elapsed = Date.now() - start;
    
    // After maxWaitMs, fall back based on available MongoDB source
    if (elapsed > maxWaitMs) {
      // CRITICAL: Disconnect any active/pending connection first
      // This prevents "Can't call openUri() on an active connection with different connection strings"
      const currentState = mongoose.connection.readyState;
      if (currentState !== 0) {
        console.debug(`[waitForMongoConnection] Disconnecting existing connection (readyState=${currentState}) before fallback...`);
        try {
          await mongoose.disconnect();
        } catch {
          // Ignore disconnect errors - we're creating a fresh connection anyway
        }
      }
      
      // Check if we have a real MongoDB URI (not MongoMemoryServer) to connect to
      // This handles CI environments with MongoDB service containers
      const mongoUri = process.env.MONGODB_URI;
      if (mongoUri && !mongoUri.includes('127.0.0.1:') && !mongoUri.includes('localhost:27017/fixzit-test-fallback')) {
        console.debug(`[waitForMongoConnection] Global setup not ready after ${maxWaitMs}ms, connecting to MONGODB_URI: ${mongoUri.split('@').pop()}`);
        await mongoose.connect(mongoUri, { autoCreate: true, autoIndex: true });
        console.debug(`[waitForMongoConnection] Connected to external MongoDB successfully`);
        
        // Wait for connection to stabilize
        let stableWait = 0;
        while (mongoose.connection.readyState !== 1 && stableWait < 5000) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          stableWait += 100;
        }
        break;
      }
      
      // Fall back to local MongoMemoryServer if no external MongoDB available
      console.debug(`[waitForMongoConnection] Global setup not ready after ${maxWaitMs}ms, starting local MongoMemoryServer...`);
      if (!localMongoServer) {
        localMongoServer = await MongoMemoryServer.create({
          instance: {
            dbName: 'fixzit-test-fallback',
            launchTimeout: 60000,
          },
        });
        const uri = localMongoServer.getUri();
        await mongoose.connect(uri, { autoCreate: true, autoIndex: true });
        console.debug(`[waitForMongoConnection] Local MongoMemoryServer started successfully`);
      } else {
        // MongoMemoryServer already exists, just reconnect
        const uri = localMongoServer.getUri();
        await mongoose.connect(uri, { autoCreate: true, autoIndex: true });
        console.debug(`[waitForMongoConnection] Reconnected to existing local MongoMemoryServer`);
      }
      
      // Wait for connection to stabilize (mongoose state transitions can take a moment)
      let stableWait = 0;
      while (mongoose.connection.readyState !== 1 && stableWait < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        stableWait += 100;
      }
      break;
    }
    
    const currentState = mongoose.connection.readyState;
    
    // If disconnected (state 0) and we have the URI, attempt reconnection once
    if (currentState === 0 && !reconnectAttempted && process.env.MONGODB_URI) {
      reconnectAttempted = true;
      console.debug(`[waitForMongoConnection] Connection dropped (readyState=0), attempting reconnect...`);
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          autoCreate: true,
          autoIndex: true,
        });
        console.debug(`[waitForMongoConnection] Reconnected successfully`);
        reconnectAttempted = false; // Reset for future disconnects
        continue;
      } catch (err) {
        console.error(`[waitForMongoConnection] Reconnect failed:`, err);
        // Continue waiting - maybe global setup will reconnect
      }
    }
    
    // Log state changes for debugging (but not too frequently)
    if (currentState !== lastLoggedState && elapsed > 5000) {
      console.debug(`[waitForMongoConnection] Waiting... readyState=${currentState}, elapsed=${elapsed}ms`);
      lastLoggedState = currentState;
    }
    
    await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
  }
  
  // Final check
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      `Mongoose not connected - readyState: ${mongoose.connection.readyState}. ` +
      `Both global setup and local fallback failed.`
    );
  }
  
  // Reset reconnect flag on successful connection for future tests
  reconnectAttempted = false;
}

/**
 * Cleanup function to stop local MongoMemoryServer if it was started.
 * Call this in afterAll hooks.
 */
export async function cleanupLocalMongoServer(): Promise<void> {
  if (localMongoServer) {
    await mongoose.disconnect();
    await localMongoServer.stop();
    localMongoServer = null;
    console.debug(`[cleanupLocalMongoServer] Local MongoMemoryServer stopped`);
  }
}
