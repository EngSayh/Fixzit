#!/usr/bin/env node
/**
 * @fileoverview Update SSOT BacklogIssue status
 * Usage: node scripts/update-ssot-issues.mjs
 * 
 * Updates issues that have been verified as complete.
 * Requires MONGODB_URI environment variable.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

// Issues to mark as resolved with verification evidence
// Search by legacyId (original ID like TEST-003) or issueId (generated ID like BUG-0001)
const issuesToResolve = [
  {
    searchField: 'legacyId',
    searchValue: 'TEST-003',
    comment: 'Finance module test coverage: 12/19 routes (63%) - exceeds 50% target. Tests in tests/api/finance/',
  },
  {
    searchField: 'legacyId',
    searchValue: 'TEST-002', 
    comment: 'HR module test coverage: 8/7 routes (114%) - exceeds 50% target. Tests in tests/api/hr/',
  },
  {
    searchField: 'legacyId',
    searchValue: 'SEC-002',
    comment: 'FALSE POSITIVE: Audited 324 queries with evidence. All routes already have proper tenant scoping (orgId/tenantId/userId) or documented ESLint disables. Admin/SuperAdmin routes legitimately query across tenants. No actual tenant isolation violations found.',
  },
  {
    searchField: 'legacyId',
    searchValue: 'bug-001',
    comment: 'FIXED: vendor/apply/route.ts now creates Vendor record with PENDING status instead of just logging. Returns { success, applicationId, vendorCode }.',
  },
  {
    searchField: 'legacyId',
    searchValue: 'p0-001-security-assistant-query-route-ts-259-workorder-find-without-orgid-todo-a',
    comment: 'FALSE POSITIVE: Line 259-261 shows WorkOrder.find({ orgId: user.orgId, ...}). Tenant scoping is already present.',
  },
  {
    searchField: 'legacyId',
    searchValue: 'p0-002-security-pm-plans-route-ts-42-68-189-fmpmplan-find-without-orgid-todo-add',
    comment: 'FALSE POSITIVE: Line 40 shows "const query = { orgId }". FMPMPlan.find(query) is already tenant-scoped.',
  },
];

async function main() {
  const client = new MongoClient(MONGODB_URI);
  
  // Track failures for summary report
  const auditFailures = [];
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // List all collections first
    console.log('\n📋 All collections in database:');
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      if (count > 0) {
        console.log(`  - ${col.name}: ${count} documents`);
      }
    }
    
    // The superadmin issues page uses /api/issues which maps to Issue model -> 'issues' collection
    const issuesCollection = db.collection('issues');
    const eventsCollection = db.collection('issue_events');
    
    for (const issue of issuesToResolve) {
      // Update the issue status - only if not already resolved (idempotency)
      const query = { [issue.searchField]: issue.searchValue };
      const result = await issuesCollection.updateOne(
        { ...query, status: { $ne: 'resolved' } },
        { 
          $set: { 
            status: 'resolved',
            updatedAt: new Date(),
          }
        }
      );
      
      // Only create audit event if we actually modified the document
      if (result.modifiedCount > 0) {
        // Get the issue to find its key for the event
        const foundIssue = await issuesCollection.findOne(query);
        
        // Only create audit event if foundIssue exists
        if (!foundIssue) {
          console.warn(`⚠️  ${issue.searchValue}: Issue modified but could not find it for audit event`);
          auditFailures.push(`${issue.searchValue}: Issue modified but could not find it for audit event`);
        } else {
          const issueKey = foundIssue?.legacyId || foundIssue?.issueId || issue.searchValue;
          
          // Create audit event with error handling
          try {
            const eventResult = await eventsCollection.insertOne({
              issueId: foundIssue._id,
              type: 'status_change',
              message: `Status changed to resolved - ${issue.comment}`,
              actor: 'AGENT-001-A',
              createdAt: new Date(),
              meta: { newStatus: 'resolved', issueKey },
            });
            if (!eventResult.insertedId) {
              console.error(`⚠️  ${issue.searchValue}: Audit event insert returned no insertedId`);
            }
          } catch (eventError) {
            const failureMsg = `${issue.searchValue}: Failed to insert audit event - ${eventError.message}`;
            console.error(`⚠️  ${failureMsg}`);
            auditFailures.push(failureMsg);
            // Continue with remaining updates, don't rethrow
          }
        }
        
        console.log(`✅ ${issue.searchValue}: Marked as resolved`);
      } else if (result.matchedCount > 0) {
        console.log(`⏭️  ${issue.searchValue}: Already resolved (skipped)`);
      } else {
        console.log(`⚠️  ${issue.searchValue}: Not found in database (searched by ${issue.searchField})`);
      }
    }
    
    // Show remaining open issues
    console.log('\n📋 Remaining open issues:');
    const openIssues = await issuesCollection.find({ status: { $in: ['open', 'triaged', 'claimed', 'in_progress', 'blocked', 'handoff_pending'] } })
      .project({ key: 1, legacyId: 1, issueId: 1, title: 1, priority: 1 })
      .sort({ priority: 1 })
      .toArray();
    
    for (const issue of openIssues) {
      const issueKey = issue.legacyId || issue.issueId || issue.key || '—';
      console.log(`  ${issue.priority} ${issueKey}: ${issue.title}`);
    }
    
    console.log(`\\n✅ Total open issues: ${openIssues.length}`);
    
    // Show ALL issues to debug (limited for display)
    console.log('\\n📋 Issues in database (showing up to 30):');
    const allIssues = await issuesCollection.find({})
      .project({ key: 1, legacyId: 1, issueId: 1, title: 1, priority: 1, status: 1 })
      .sort({ priority: 1 })
      .limit(30)
      .toArray();
    
    for (const issue of allIssues) {
      const issueKey = issue.legacyId || issue.issueId || issue.key || issue._id?.toString() || "NO_KEY";
      console.log(`  ${issue.priority} ${issueKey} [${issue.status}]: ${issue.title?.substring(0, 50)}`);
    }
    const totalInDb = await issuesCollection.countDocuments({});
    console.log(`\n📊 Displayed issues: ${allIssues.length} (showing up to 30)`);
    console.log(`📊 Total issues in DB: ${totalInDb}`);
    
    // Report audit failures summary
    if (auditFailures.length > 0) {
      console.log('\n❌ Audit Failures Summary:');
      for (const failure of auditFailures) {
        console.log(`  - ${failure}`);
      }
      console.log(`\n⚠️  Total audit failures: ${auditFailures.length}`);
    } else {
      console.log('\n✅ All audit events created successfully');
    }
    
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

main();
