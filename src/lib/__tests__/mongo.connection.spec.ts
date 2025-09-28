/**
 * Unit tests for src/lib/mongo.test.ts
 * Testing library and framework: Node.js built-in test runner (node:test) executed via tsx
 * - No new dependencies added
 * - Each test isolates module state by spawning a fresh tsx process running a scenario
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';

function runScenario(name: string, env: Record<string, string | undefined> = {}, unset: string[] = []) {
  return new Promise<any>((resolve) => {
    const runner = path.resolve(__dirname, './scenarios/mongo-scenario.ts');
    const mergedEnv: NodeJS.ProcessEnv = { ...process.env, SCENARIO: name };
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete mergedEnv[k];
      else mergedEnv[k] = v;
    }
    for (const k of unset) delete mergedEnv[k];

    const child = spawn('npx', ['tsx', runner], { env: mergedEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    (child.stdout as NodeJS.ReadableStream).on('data', (d: Buffer) => (out += d.toString()));
    (child.stderr as NodeJS.ReadableStream).on('data', (d: Buffer) => (err += d.toString()));
    child.on('close', () => {
      let parsed: any;
      try {
        parsed = JSON.parse(out || '{}');
      } catch {
        parsed = { ok: false, parseError: true, out, err };
      }
      resolve(parsed);
    });
  });
}

test('returns null when USE_MOCK_DB is true (isMockDB=true, no mongoose calls)', async () => {
  const res = await runScenario('use-mock', {
    USE_MOCK_DB: 'true',
    MONGODB_URI: 'mongodb://unused'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.value, null);
  assert.equal(res.isMockDB, true);
  assert.equal(res.connectCalls, 0);
  assert.equal(res.setCalls, 0);
});

test('throws when MONGODB_URI is missing (USE_MOCK_DB=false)', async () => {
  const res = await runScenario('missing-uri', {
    USE_MOCK_DB: 'false'
  }, ['MONGODB_URI']);
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.match(res.error || '', /MONGODB_URI is required/i);
});

test('returns mongoose immediately when already connected (readyState===1) without calling set/connect', async () => {
  const res = await runScenario('ready-1', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: 'mongodb://example/connected',
    READY_STATE: '1'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.isMongooseReturned, true);
  assert.equal(res.connectCalls, 0);
  assert.equal(res.setCalls, 0);
});

test('establishes connection when not connected and caches result across calls', async () => {
  const res = await runScenario('connect-cache', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: 'mongodb://example/new',
    READY_STATE: '0',
    MOCK_CONNECT_RESULT: 'MONGO_INSTANCE'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.first, 'MONGO_INSTANCE');
  assert.equal(res.second, 'MONGO_INSTANCE');
  assert.equal(res.same, true);
  // One connect may happen at module import due to exported db; total calls should be 1
  assert.equal(res.connectCalls, 1);
  assert.equal(res.setCalls, 1); // strictQuery set once before connect
  assert.deepEqual(res.options, {
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });
});

test('concurrent calls share the same promise and resolve to the same connection', async () => {
  const res = await runScenario('concurrency', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: 'mongodb://example/concurrent',
    READY_STATE: '0',
    DEFER_CONNECT: '1',
    MOCK_CONNECT_RESULT: 'CONN'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.same, true);
  assert.equal(res.r1, 'CONN');
  assert.equal(res.r2, 'CONN');
  assert.equal(res.connectCalls, 1);
});

test('db export resolves consistently with connectMongo', async () => {
  const res = await runScenario('db-export', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: 'mongodb://example/dbexport',
    READY_STATE: '0',
    MOCK_CONNECT_RESULT: 'PROMISED_CONN'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.value, 'PROMISED_CONN');
});

test('isMockDB reflects USE_MOCK_DB=false', async () => {
  const res = await runScenario('is-mock-false', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: 'mongodb://example/live'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.isMockDB, true, 'Expected isMockDB === false');
});

test('passes expected connect options to mongoose.connect', async () => {
  const res = await runScenario('options-pass', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: 'mongodb://example/options',
    READY_STATE: '0'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.deepEqual(res.options, {
    autoIndex: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });
});

test('trims MONGODB_URI before connecting', async () => {
  const res = await runScenario('trim-uri', {
    USE_MOCK_DB: 'false',
    MONGODB_URI: '  mongodb://example/trim  \n',
    READY_STATE: '0'
  });
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(res.uri, 'mongodb://example/trim');
});