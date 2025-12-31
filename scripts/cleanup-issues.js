/**
 * Cleanup malformed/duplicate issues from the issue tracker
 * Run with: node scripts/cleanup-issues.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const issues = db.collection('issues');

  console.log('=== Issue Cleanup Script ===\n');

  // 1. Find malformed entries (corrupted imports)
  const malformed = await issues.find({
    $or: [
      { key: /^[0-9]+-bug/ },
      { key: /^p[0-9]+-bug/ },
      { title: /^\| [0-9]+ \| / },  // Table row as title
      { title: { $regex: '^P[0-3]$' } }, // Just "P0", "P1" etc
    ]
  }).toArray();

  console.log(`Found ${malformed.length} malformed entries:`);
  malformed.forEach(i => console.log(`  - ${i.key}: ${(i.title || '').substring(0, 50)}`));

  // 2. Find duplicate PERF-001 entries
  const perf001 = await issues.find({ key: /^perf-001$/i }).toArray();
  console.log(`\nFound ${perf001.length} PERF-001 entries:`);
  perf001.forEach(i => console.log(`  - ${i._id}: ${(i.title || '').substring(0, 50)} [${i.status}]`));

  // 3. Find duplicate OTP-001 entries
  const otp001 = await issues.find({ key: /^otp-001$/i }).toArray();
  console.log(`\nFound ${otp001.length} OTP-001 entries:`);
  otp001.forEach(i => console.log(`  - ${i._id}: ${(i.title || '').substring(0, 50)} [${i.status}]`));

  // 4. Cleanup - delete malformed and dedupe
  if (process.argv.includes('--fix')) {
    console.log('\n=== FIXING ===\n');

    // Delete malformed entries
    if (malformed.length > 0) {
      const malformedIds = malformed.map(i => i._id);
      const result = await issues.deleteMany({ _id: { $in: malformedIds } });
      console.log(`Deleted ${result.deletedCount} malformed entries`);
    }

    // Keep only the most recent PERF-001, mark it as resolved (per MASTER_PENDING_REPORT.md)
    if (perf001.length > 1) {
      const sorted = perf001.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      const keep = sorted[0];
      const toDelete = sorted.slice(1).map(i => i._id);
      
      await issues.deleteMany({ _id: { $in: toDelete } });
      await issues.updateOne(
        { _id: keep._id },
        { 
          $set: { 
            status: 'resolved',
            title: 'PERF-001: db.collection() tenant scoping verified',
            resolution: 'Verified - all 23 db.collection() calls have proper tenant scoping',
            resolvedAt: new Date()
          }
        }
      );
      console.log(`Deduped PERF-001: deleted ${toDelete.length}, updated 1 to resolved`);
    }

    // Mark OTP-001 as blocked (DevOps task, not code)
    if (otp001.length > 0) {
      const sorted = otp001.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      const keep = sorted[0];
      const toDelete = sorted.slice(1).map(i => i._id);
      
      if (toDelete.length > 0) {
        await issues.deleteMany({ _id: { $in: toDelete } });
      }
      await issues.updateOne(
        { _id: keep._id },
        { 
          $set: { 
            status: 'blocked',
            title: 'OTP-001: Configure Taqnyat SMS env vars in Vercel',
            description: 'DevOps task - requires Taqnyat credentials configuration in Vercel environment variables',
            blockedReason: 'DevOps/Infrastructure task - not a code fix'
          }
        }
      );
      console.log(`Deduped OTP-001: deleted ${toDelete.length}, updated 1 to blocked`);
    }

    // Update LAYOUT-FIX-001 if not already resolved
    await issues.updateOne(
      { key: 'LAYOUT-FIX-001', status: { $ne: 'resolved' } },
      { $set: { status: 'resolved', resolvedAt: new Date() } }
    );

    console.log('\n✅ Cleanup complete');
  } else {
    console.log('\nRun with --fix to apply changes');
  }

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
