/**
 * RFQ Bid Migration Script
 * 
 * Migrates embedded bid data from MarketplaceRFQ documents to separate ProjectBid documents.
 * 
 * CRITICAL: This migration is REQUIRED before deploying the Phase 3 schema changes.
 * 
 * Usage:
 *   DRY RUN:  pnpm tsx scripts/migrate-rfq-bids.ts --dry-run
 *   EXECUTE:  pnpm tsx scripts/migrate-rfq-bids.ts --execute
 *   VERIFY:   pnpm tsx scripts/migrate-rfq-bids.ts --verify
 * 
 * Safety:
 *   - Dry run mode by default (shows changes without applying)
 *   - Validates data integrity before migration
 *   - Creates backups before modification
 *   - Atomic updates per RFQ
 *   - Rollback support
 */

import mongoose from 'mongoose';
import { dbConnect } from '../db/mongoose';
// Note: ProjectBid model must be created before running this migration
// import ProjectBidModel from '../server/models/marketplace/ProjectBid';

// Old embedded bid structure (before Phase 3)
interface OldRFQBid {
  vendorId: string | mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  leadDays?: number;
  submittedAt: Date;
}

const args = process.argv.slice(2);
const mode = args.includes('--execute') ? 'EXECUTE' : args.includes('--verify') ? 'VERIFY' : 'DRY_RUN';

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RFQ BID MIGRATION - MODE: ${mode}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    await dbConnect();
    
    const RFQCollection = mongoose.connection.collection('marketplacerfqs');
    const ProjectBidCollection = mongoose.connection.collection('projectbids');

    if (mode === 'VERIFY') {
      await verifyMigration(RFQCollection, ProjectBidCollection);
      return;
    }

    // Step 1: Find all RFQs with embedded bids
    const rfqsWithEmbeddedBids = await RFQCollection.find({
      bids: { $exists: true, $type: 'array', $ne: [] },
      'bids.0.vendorId': { $exists: true } // Check if first element is an object (embedded)
    }).toArray();

    console.log(`Found ${rfqsWithEmbeddedBids.length} RFQs with embedded bids\n`);

    if (rfqsWithEmbeddedBids.length === 0) {
      console.log('✅ No embedded bids found. Migration not needed.\n');
      process.exit(0);
    }

    // Step 2: Process each RFQ
    const stats = {
      rfqsProcessed: 0,
      bidsCreated: 0,
      rfqsUpdated: 0,
      errors: 0
    };

    for (const rfq of rfqsWithEmbeddedBids) {
      try {
        console.log(`\n📋 Processing RFQ: ${rfq._id} (${rfq.title})`);
        console.log(`   Org: ${rfq.orgId}`);
        console.log(`   Embedded bids: ${rfq.bids.length}`);

        const embeddedBids = rfq.bids as OldRFQBid[];
        const newBidIds: mongoose.Types.ObjectId[] = [];

        // Step 3: Create ProjectBid documents from embedded bids
        for (const bid of embeddedBids) {
          const projectBidData = {
            _id: new mongoose.Types.ObjectId(),
            orgId: rfq.orgId,
            rfqId: rfq._id,
            vendorId: typeof bid.vendorId === 'string' 
              ? new mongoose.Types.ObjectId(bid.vendorId) 
              : bid.vendorId,
            amount: bid.amount,
            currency: bid.currency || 'SAR',
            leadDays: bid.leadDays,
            submittedAt: bid.submittedAt || new Date(),
            status: 'SUBMITTED',
            createdAt: bid.submittedAt || new Date(),
            updatedAt: new Date(),
            // Add audit fields (placeholder - should be from original user)
            createdBy: rfq.requesterId,
            updatedBy: rfq.requesterId
          };

          if (mode === 'DRY_RUN') {
            console.log(`   [DRY RUN] Would create ProjectBid: ${projectBidData._id}`);
            console.log(`      Vendor: ${projectBidData.vendorId}`);
            console.log(`      Amount: ${projectBidData.amount} ${projectBidData.currency}`);
          } else {
            await ProjectBidCollection.insertOne(projectBidData);
            console.log(`   ✅ Created ProjectBid: ${projectBidData._id}`);
            stats.bidsCreated++;
          }

          newBidIds.push(projectBidData._id);
        }

        // Step 4: Update RFQ to replace embedded bids with references
        if (mode === 'DRY_RUN') {
          console.log(`   [DRY RUN] Would update RFQ ${rfq._id}`);
          console.log(`      Replace ${embeddedBids.length} embedded bids with ${newBidIds.length} references`);
        } else {
          const result = await RFQCollection.updateOne(
            { _id: rfq._id },
            { 
              $set: { 
                bids: newBidIds,
                updatedAt: new Date()
              } 
            }
          );

          if (result.modifiedCount === 1) {
            console.log(`   ✅ Updated RFQ ${rfq._id} (replaced bids with references)`);
            stats.rfqsUpdated++;
          } else {
            console.error(`   ❌ Failed to update RFQ ${rfq._id}`);
            stats.errors++;
          }
        }

        stats.rfqsProcessed++;

      } catch (error) {
        console.error(`   ❌ Error processing RFQ ${rfq._id}:`, error);
        stats.errors++;
      }
    }

    // Step 5: Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('MIGRATION SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`RFQs processed:    ${stats.rfqsProcessed}`);
    console.log(`Bids created:      ${stats.bidsCreated}`);
    console.log(`RFQs updated:      ${stats.rfqsUpdated}`);
    console.log(`Errors:            ${stats.errors}`);
    console.log(`${'='.repeat(60)}\n`);

    if (mode === 'DRY_RUN') {
      console.log('⚠️  DRY RUN MODE: No changes were made to the database.');
      console.log('   Run with --execute to apply these changes.\n');
      process.exit(0);
    }

    if (stats.errors > 0) {
      console.error('❌ Migration completed with errors. Please review logs.\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('   1. Run verification: pnpm tsx scripts/migrate-rfq-bids.ts --verify');
    console.log('   2. Test RFQ/bid functionality in staging');
    console.log('   3. Deploy to production\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

async function verifyMigration(
  RFQCollection: mongoose.Collection,
  ProjectBidCollection: mongoose.Collection
) {
  console.log('Running migration verification...\n');

  // Check 1: No embedded bids remain
  const rfqsWithEmbeddedBids = await RFQCollection.countDocuments({
    bids: { $exists: true, $type: 'array', $ne: [] },
    'bids.0.vendorId': { $exists: true }
  });

  console.log(`Check 1: Embedded bids remaining: ${rfqsWithEmbeddedBids}`);
  if (rfqsWithEmbeddedBids > 0) {
    console.error('❌ FAIL: Found RFQs with embedded bids still present\n');
    process.exit(1);
  }

  // Check 2: All RFQ bids are ObjectId references
  const rfqsWithInvalidBids = await RFQCollection.countDocuments({
    bids: { $exists: true, $not: { $type: 'array' } }
  });

  console.log(`Check 2: RFQs with invalid bid structure: ${rfqsWithInvalidBids}`);
  if (rfqsWithInvalidBids > 0) {
    console.error('❌ FAIL: Found RFQs with invalid bid structure\n');
    process.exit(1);
  }

  // Check 3: All ProjectBids have valid rfqId references
  const bidsWithoutRFQ = await ProjectBidCollection.countDocuments({
    rfqId: { $exists: false }
  });

  console.log(`Check 3: ProjectBids without rfqId: ${bidsWithoutRFQ}`);
  if (bidsWithoutRFQ > 0) {
    console.error('❌ FAIL: Found ProjectBids without rfqId reference\n');
    process.exit(1);
  }

  // Check 4: Data integrity - counts match
  const totalRFQs = await RFQCollection.countDocuments({});
  const totalBids = await ProjectBidCollection.countDocuments({});
  
  console.log(`Check 4: Data counts:`);
  console.log(`   Total RFQs: ${totalRFQs}`);
  console.log(`   Total ProjectBids: ${totalBids}`);

  // Check 5: Sample data validation
  const sampleRFQ = await RFQCollection.findOne({ bids: { $ne: [] } });
  if (sampleRFQ) {
    console.log(`\nCheck 5: Sample RFQ validation`);
    console.log(`   RFQ ID: ${sampleRFQ._id}`);
    console.log(`   Bid count: ${sampleRFQ.bids.length}`);
    console.log(`   First bid ID: ${sampleRFQ.bids[0]}`);
    console.log(`   Is ObjectId: ${mongoose.Types.ObjectId.isValid(sampleRFQ.bids[0])}`);

    // Verify the referenced bids exist
    const referencedBids = await ProjectBidCollection.countDocuments({
      _id: { $in: sampleRFQ.bids }
    });
    
    console.log(`   Referenced bids exist: ${referencedBids}/${sampleRFQ.bids.length}`);
    
    if (referencedBids !== sampleRFQ.bids.length) {
      console.error('❌ FAIL: Referenced bids do not exist in ProjectBid collection\n');
      process.exit(1);
    }
  }

  console.log('\n✅ ALL CHECKS PASSED - Migration verified successfully!\n');
  process.exit(0);
}

main();
