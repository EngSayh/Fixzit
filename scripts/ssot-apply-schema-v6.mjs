#!/usr/bin/env node
/**
 * Apply Fixzit SSOT "issues" collection validator + indexes (AGENTS.md v6.0).
 *
 * WARNING:
 * - If you set validationLevel=strict and your existing documents don't satisfy
 *   the schema, future writes can fail. Run ssot-migrate-v6.mjs first.
 *
 * Env:
 *   MONGODB_URI
 *   MONGODB_DB
 */

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) {
  console.error('Missing MONGODB_URI or MONGODB_DB');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const validationLevel = (() => {
  const i = args.indexOf('--level');
  if (i !== -1 && args[i + 1]) return args[i + 1];
  return 'strict';
})();
const validationAction = (() => {
  const i = args.indexOf('--action');
  if (i !== -1 && args[i + 1]) return args[i + 1];
  return 'error';
})();

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['tenantId', 'issueKey', 'title', 'type', 'status', 'priority', 'domain', 'createdAt', 'version'],
    properties: {
      tenantId: { bsonType: 'string' },
      issueKey: { bsonType: 'string', pattern: '^(FM|SOUQ|AQAR|HR|CORE)-[0-9]{5}$' },
      title: { bsonType: 'string', minLength: 10, maxLength: 200 },
      description: { bsonType: 'string', maxLength: 4000 },
      type: { enum: ['bug', 'task', 'feature', 'security', 'performance', 'tech_debt'] },
      priority: { bsonType: 'int', minimum: 1, maximum: 5 },
      domain: {
        enum: ['core', 'auth', 'middleware', 'finance', 'billing', 'souq', 'marketplace', 'aqar', 'real_estate', 'hr', 'payroll', 'tests', 'scripts'],
      },
      status: {
        enum: ['open', 'triaged', 'claimed', 'in_progress', 'blocked', 'handoff_pending', 'resolved', 'verified', 'closed', 'abandoned'],
      },
      filePaths: { bsonType: 'array', items: { bsonType: 'string' } },

      // Agent coordination
      assignment: {
        bsonType: 'object',
        properties: {
          agentId: { bsonType: ['string', 'null'], pattern: '^AGENT-00[1-6](-[A-Z])?$' },
          agentType: { enum: [null, 'Copilot', 'Claude Code', 'Codex', 'Cursor', 'Windsurf'] },
          claimedAt: { bsonType: ['date', 'null'] },
          claimExpiresAt: { bsonType: ['date', 'null'] },
          claimToken: { bsonType: ['string', 'null'] },
          history: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              properties: {
                agentId: { bsonType: 'string' },
                action: { enum: ['claimed', 'released', 'transferred', 'expired'] },
                timestamp: { bsonType: 'date' },
                reason: { bsonType: 'string' },
              },
            },
          },
        },
      },

      // Handoff tracking
      handoffHistory: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          properties: {
            from: { bsonType: 'string' },
            to: { bsonType: 'string' },
            timestamp: { bsonType: 'date' },
            reason: { bsonType: 'string' },
          },
        },
      },

      // Dedup
      contentHash: { bsonType: 'string', pattern: '^[a-f0-9]{16}$' },

      // Timestamps
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
      resolvedAt: { bsonType: ['date', 'null'] },

      // OCC
      version: { bsonType: 'int', minimum: 1 },
    },
  },
};

const indexes = [
  { key: { tenantId: 1, status: 1, priority: -1 }, options: { name: 'idx_tenant_status_priority' } },
  { key: { tenantId: 1, issueKey: 1 }, options: { unique: true, name: 'idx_unique_issue_key' } },
  { key: { tenantId: 1, 'assignment.agentId': 1, status: 1 }, options: { name: 'idx_agent_assignments' } },
  { key: { contentHash: 1 }, options: { unique: true, sparse: true, name: 'idx_dedup_hash' } },
  { key: { filePaths: 1 }, options: { name: 'idx_file_paths' } },
  {
    key: { 'assignment.claimExpiresAt': 1 },
    options: {
      name: 'idx_claim_expiry',
      partialFilterExpression: { status: { $in: ['claimed', 'in_progress'] } },
    },
  },
];

function log(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const collections = await db.listCollections({ name: 'issues' }).toArray();
  const exists = collections.length > 0;

  const plan = {
    dryRun,
    validationLevel,
    validationAction,
    collectionExists: exists,
    steps: [],
  };

  if (!exists) {
    plan.steps.push({
      step: 'createCollection',
      command: {
        create: 'issues',
        validator,
        validationLevel,
        validationAction,
      },
    });
  } else {
    plan.steps.push({
      step: 'collMod',
      command: {
        collMod: 'issues',
        validator,
        validationLevel,
        validationAction,
      },
    });
  }

  for (const idx of indexes) {
    plan.steps.push({ step: 'createIndex', key: idx.key, options: idx.options });
  }

  if (dryRun) {
    log({ ok: true, plan });
    await client.close();
    return;
  }

  if (!exists) {
    await db.createCollection('issues', {
      validator,
      validationLevel,
      validationAction,
    });
  } else {
    await db.command({ collMod: 'issues', validator, validationLevel, validationAction });
  }

  const col = db.collection('issues');
  for (const idx of indexes) {
    await col.createIndex(idx.key, idx.options);
  }

  log({ ok: true, applied: true, collection: 'issues', validationLevel, validationAction, indexes: indexes.map(i => i.options.name) });
  await client.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
