#!/usr/bin/env node
/**
 * Import BACKLOG_AUDIT.json directly to MongoDB Issue Tracker
 * Bypasses API authentication for automated sync
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

async function importIssues() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('📦 Connecting to MongoDB...');
    await client.connect();
    const db = client.db();
    const issuesCollection = db.collection('issues');
    
    // Read BACKLOG_AUDIT.json
    const auditPath = join(__dirname, '../BACKLOG_AUDIT.json');
    const auditData = JSON.parse(readFileSync(auditPath, 'utf8'));
    
    console.log(`📋 Found ${auditData.issues.length} issues in BACKLOG_AUDIT.json`);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const issue of auditData.issues) {
      try {
        const existing = await issuesCollection.findOne({ key: issue.key });
        
        // Generate issueId if not present (required field)
        if (!issue.issueId) {
          const categoryPrefix = issue.category === 'bug' ? 'BUG' :
                                issue.category === 'missing_test' ? 'TEST' :
                                issue.category === 'documentation' ? 'DOC' :
                                issue.category === 'efficiency' ? 'PERF' :
                                issue.category === 'refactor' ? 'REF' : 'ISSUE';
          // Use key as suffix (e.g., WORKFLOW-001 → BUG-WORKFLOW-001)
          issue.issueId = `${categoryPrefix}-${issue.key}`;
        }
        
        if (existing) {
          // Update if status changed or new fields added
          const hasChanges = 
            existing.status !== issue.status ||
            existing.priority !== issue.priority ||
            (issue.resolution && !existing.resolution);
          
          if (hasChanges) {
            // Build events array
            const events = existing.events || [];
            
            // Add status change event if status changed
            if (existing.status !== issue.status) {
              events.push({
                type: 'STATUS_CHANGED',
                timestamp: new Date(),
                user: 'eng.sultan',
                metadata: {
                  from: existing.status,
                  to: issue.status,
                  via: 'backlog-sync'
                }
              });
            }
            
            // Add resolution event if newly resolved
            if (issue.resolution && !existing.resolution) {
              events.push({
                type: 'RESOLVED',
                timestamp: new Date(issue.resolution.resolvedAt),
                user: issue.resolution.resolvedBy,
                metadata: {
                  notes: issue.resolution.notes,
                  commitHash: issue.resolution.commitHash
                }
              });
            }
            
            await issuesCollection.updateOne(
              { key: issue.key },
              { 
                $set: {
                  ...issue,
                  events,
                  updatedAt: new Date(),
                  syncedAt: new Date(),
                  mentionCount: (existing.mentionCount || 0) + 1
                }
              }
            );
            updated++;
            console.log(`  ✏️  Updated: ${issue.key} (${existing.status} → ${issue.status})`);
          } else {
            // Just bump mentionCount
            await issuesCollection.updateOne(
              { key: issue.key },
              { 
                $set: { syncedAt: new Date() },
                $inc: { mentionCount: 1 }
              }
            );
            skipped++;
            console.log(`  ⏭️  Skipped: ${issue.key} (no changes)`);
          }
        } else {
          // Create new issue
          const newIssue = {
            ...issue,
            events: [
              {
                type: 'CREATED',
                timestamp: new Date(),
                user: 'eng.sultan',
                metadata: { via: 'backlog-sync' }
              }
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
            syncedAt: new Date(),
            mentionCount: 1
          };
          
          // Add resolution event if issue is already resolved
          if (issue.resolution) {
            newIssue.events.push({
              type: 'RESOLVED',
              timestamp: new Date(issue.resolution.resolvedAt),
              user: issue.resolution.resolvedBy,
              metadata: {
                notes: issue.resolution.notes,
                commitHash: issue.resolution.commitHash
              }
            });
          }
          
          await issuesCollection.insertOne(newIssue);
          created++;
          console.log(`  ✅ Created: ${issue.key} (${issue.status})`);
        }
      } catch (err) {
        errors++;
        console.error(`  ❌ Error processing ${issue.key}:`, err.message);
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total: ${auditData.issues.length}`);
    
    // Get final stats
    const totalIssues = await issuesCollection.countDocuments();
    const openIssues = await issuesCollection.countDocuments({ status: { $in: ['open', 'in_progress', 'blocked'] } });
    const resolvedIssues = await issuesCollection.countDocuments({ status: 'resolved' });
    
    console.log('\n📈 Database Stats:');
    console.log(`  Total Issues: ${totalIssues}`);
    console.log(`  Open: ${openIssues}`);
    console.log(`  Resolved: ${resolvedIssues}`);
    
    return { created, updated, skipped, errors };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run import
importIssues()
  .then(({ created, updated, skipped, errors }) => {
    console.log('\n✅ Backlog sync complete!');
    process.exit(errors > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
