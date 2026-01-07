#!/usr/bin/env node
/**
 * Log completed issues from session [AGENT-0041] to MongoDB SSOT
 * Run with: node scripts/log-session-issues.mjs
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const AGENT_TOKEN = '[AGENT-0041]';

const issuesToLog = [
  {
    issueId: 'AUTO-002',
    legacyId: 'AUTO-002',
    title: 'Invoice Auto-Approval Rules Implementation',
    description: 'Implemented threshold-based invoice auto-approval with PO matching, business hours, vendor exclusions, and daily limits.',
    category: 'feat',
    priority: 'P1',
    status: 'resolved',
    module: 'finance',
    filePath: 'services/finance/invoice-auto-approval.ts',
    action: 'Created invoice-auto-approval.ts with evaluateForAutoApproval, processAutoApproval, batchProcessAutoApprovals',
    effort: 'M',
    source: 'ai_scan',
  },
  {
    issueId: 'DEV-003',
    legacyId: 'DEV-003',
    title: 'CodeRabbit AI Review Config',
    description: 'Created .coderabbit.yaml configuration for AI-powered code reviews on PRs.',
    category: 'feat',
    priority: 'P2',
    status: 'resolved',
    module: 'devops',
    filePath: '.coderabbit.yaml',
    action: 'Created .coderabbit.yaml with language, review, and chat configuration',
    effort: 'S',
    source: 'ai_scan',
  },
  {
    issueId: 'LOGIC-003',
    legacyId: 'LOGIC-003',
    title: 'Live Currency Conversion Service',
    description: 'Implemented live currency conversion with external API, caching, and fallback rates.',
    category: 'feat',
    priority: 'P1',
    status: 'resolved',
    module: 'finance',
    filePath: 'services/finance/currency-service.ts',
    action: 'Created currency-service.ts with getExchangeRate, convertCurrency, getAllRates, refreshRates',
    effort: 'M',
    source: 'ai_scan',
  },
  {
    issueId: 'TEST-PERF',
    legacyId: 'TEST-PERF',
    title: 'k6 Performance Test Suite',
    description: 'Created k6 performance testing suite with smoke, load, and stress test scenarios.',
    category: 'test',
    priority: 'P2',
    status: 'resolved',
    module: 'tests',
    filePath: 'tests/performance/',
    action: 'Created config.js, api-smoke.js, api-load.js, api-stress.js',
    effort: 'M',
    source: 'ai_scan',
  },
];

async function logIssuesToSSOT() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB SSOT');

    const db = client.db();
    const issuesCollection = db.collection('issues');
    const eventsCollection = db.collection('issue_events');

    console.log(`\n📋 Logging ${issuesToLog.length} issues to SSOT...\n`);

    for (const issue of issuesToLog) {
      const now = new Date();

      // Check if already exists
      const existing = await issuesCollection.findOne({
        $or: [{ issueId: issue.issueId }, { legacyId: issue.legacyId }],
      });

      let targetIssue;

      if (existing) {
        // Update existing to resolved
        await issuesCollection.updateOne(
          { _id: existing._id },
          {
            $set: {
              status: 'resolved',
              resolvedAt: now,
              updatedAt: now,
              agentToken: AGENT_TOKEN,
              action: issue.action,
            },
          }
        );
        targetIssue = existing;
        console.log(`✅ Updated: ${issue.issueId} → resolved`);
      } else {
        // Insert new issue
        const newIssue = {
          ...issue,
          agentToken: AGENT_TOKEN,
          resolvedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        const result = await issuesCollection.insertOne(newIssue);
        targetIssue = { _id: result.insertedId, ...newIssue };
        console.log(`✅ Created: ${issue.issueId} → resolved`);
      }

      // Create audit event
      await eventsCollection.insertOne({
        issueId: targetIssue._id,
        type: 'status_change',
        message: `Resolved by ${AGENT_TOKEN} - Implementation complete with tests passing`,
        actor: AGENT_TOKEN,
        createdAt: now,
        meta: {
          newStatus: 'resolved',
          issueKey: issue.issueId,
          filePath: issue.filePath,
          commit: '6685e29d2', // First commit with implementations
        },
      });
    }

    // Summary
    const resolvedCount = await issuesCollection.countDocuments({ status: 'resolved' });
    const totalCount = await issuesCollection.countDocuments({});
    
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ SSOT Update Complete`);
    console.log(`   Agent: ${AGENT_TOKEN}`);
    console.log(`   Issues logged: ${issuesToLog.length}`);
    console.log(`   Total resolved in SSOT: ${resolvedCount}/${totalCount}`);
    console.log(`${'─'.repeat(50)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

logIssuesToSSOT();
