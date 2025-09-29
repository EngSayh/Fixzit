/**
 * Scenario runner for src/lib/mongo.test.ts
 * Framework: Node.js built-in test runner will spawn this script via tsx.
 * This script patches mongoose, imports the module under test once (per isolated process),
 * runs a scenario, and prints JSON result to stdout for the parent to assert on.
 */

import path from 'node:path';
import mongoose from 'mongoose';

type AnyRec = Record<string, any>;

const scenario = process.env.SCENARIO || '';
const modulePath = path.resolve(__dirname, '../../mongo.test.ts');

// patch mongoose behaviors and capture calls
const setCalls: Array<[string, any]> = [];
let connectCalls = 0;
let capturedUri: string | undefined;
let capturedOptions: AnyRec | undefined;

// Ready state setup (default 0: disconnected)
const ready = Number(process.env.READY_STATE ?? '0');
try {
  // Ensure connection object and readyState are mutable
  if (!mongoose.connection) {
    Object.defineProperty(mongoose, 'connection', {
      value: {},
      writable: true,
      configurable: true
    });
  }
  Object.defineProperty(mongoose.connection, 'readyState', { value: ready, writable: true, configurable: true });
} catch {
  // fallback assignment
  Object.defineProperty(mongoose.connection, 'readyState', { value: ready, writable: true, configurable: true });
}

// Patch set(strictQuery, true)
const originalSet = mongoose.set;
mongoose.set = function (...args: any[]): typeof mongoose {
  setCalls.push(args as [string, any]);
  return mongoose as any;
};

// Patch connect to avoid real network and to capture args
const resultToken = process.env.MOCK_CONNECT_RESULT ?? 'CONNECTION';
const rejectMessage = process.env.MOCK_CONNECT_REJECT;
const deferConnect = process.env.DEFER_CONNECT === '1';
let deferResolve: ((v: any) => void) | undefined;

mongoose.connect = function (uri: string, options?: any): Promise<typeof mongoose> {
  connectCalls++;
  capturedUri = uri;
  capturedOptions = options;
  if (rejectMessage) {
    return Promise.reject(new Error(rejectMessage));
  }
  if (deferConnect) {
    return new Promise((resolve) => {
      deferResolve = resolve;
    });
  }
  return Promise.resolve(resultToken as any);
};

async function run() {
  let mod: any;
  try {
    mod = await import(modulePath);
  } catch (e: any) {
    process.stdout.write(JSON.stringify({ scenario, ok: false, importError: String(e?.message || e) }));
    process.exit(0);
  }

  try {
    switch (scenario) {
      case 'use-mock': {
        const value = await mod.connectMongo();
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          value,
          isMockDB: mod.isMockDB === true,
          connectCalls,
          setCalls: setCalls.length
        }));
        break;
      }
      case 'missing-uri': {
        let error: string | undefined;
        try {
          await mod.connectMongo();
        } catch (e: any) {
          error = String(e?.message || e);
        }
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          error,
          connectCalls,
          setCalls: setCalls.length
        }));
        break;
      }
      case 'ready-1': {
        const value = await mod.connectMongo();
        const isMongooseReturned = value === mongoose;
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          isMongooseReturned,
          connectCalls,
          setCalls: setCalls.length
        }));
        break;
      }
      case 'connect-cache': {
        // One connect may already be triggered by the module's exported db at import time.
        const first = await mod.connectMongo();
        const second = await mod.connectMongo();
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          first,
          second,
          same: first === second,
          connectCalls,
          setCalls: setCalls.length,
          capturedUri,
          options: capturedOptions
        }));
        break;
      }
      case 'concurrency': {
        // If deferred connect is enabled, both calls should share the same pending promise.
        const p1 = mod.connectMongo();
        const p2 = mod.connectMongo();
        // resolve deferred
        if (deferResolve) deferResolve(resultToken);
        const [r1, r2] = await Promise.all([p1, p2]);
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          r1,
          r2,
          same: r1 === r2,
          connectCalls,
          setCalls: setCalls.length
        }));
        break;
      }
      case 'db-export': {
        const value = await mod.db;
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          value,
          connectCalls,
          setCalls: setCalls.length
        }));
        break;
      }
      case 'is-mock-false': {
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          isMockDB: mod.isMockDB === false
        }));
        break;
      }
      case 'options-pass': {
        await mod.connectMongo();
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          options: capturedOptions
        }));
        break;
      }
      case 'trim-uri': {
        await mod.connectMongo();
        process.stdout.write(JSON.stringify({
          scenario,
          ok: true,
          uri: capturedUri
        }));
        break;
      }
      default: {
        process.stdout.write(JSON.stringify({ scenario, ok: false, error: 'Unknown scenario' }));
      }
    }
  } catch (e: any) {
    process.stdout.write(JSON.stringify({ scenario, ok: false, runError: String(e?.message || e) }));
  }
}

run();