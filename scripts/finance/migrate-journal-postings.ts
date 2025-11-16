import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables BEFORE any other imports
config({ path: resolve(process.cwd(), '.env.local') });

import { connectToDatabase, disconnectFromDatabase } from '../../lib/mongodb-unified';
import { minorToDecimal128 } from '../../server/lib/money';

function toMinorDecimal(value?: number) {
  const asNumber = typeof value === 'number' ? value : 0;
  return minorToDecimal128(BigInt(Math.round(asNumber * 100)));
}

async function migrateDraftJournals() {
  await connectToDatabase();
  
  // Dynamic import to ensure env vars are loaded first
  const { default: Journal } = await import('../../server/models/finance/Journal');

  const journals = await Journal.find({
    status: 'DRAFT',
    'lines.0': { $exists: true },
  });

  let migrated = 0;

  for (const journal of journals) {
    if (journal.postings && journal.postings.length > 0) continue;
    if (!journal.lines || journal.lines.length === 0) continue;

    const postings = journal.lines.map((line) => {
      const dimensions: Record<string, unknown> = {};
      if (line.propertyId) dimensions.propertyId = line.propertyId;
      if (line.unitId) dimensions.unitId = line.unitId;
      if (line.ownerId) dimensions.ownerId = line.ownerId;
      if (line.tenantId) dimensions.tenantId = line.tenantId;
      if (line.vendorId) dimensions.vendorId = line.vendorId;

      const cleanedDimensions = Object.keys(dimensions).length > 0 ? dimensions : undefined;

      return {
        accountId: line.accountId,
        debitMinor: toMinorDecimal(line.debit),
        creditMinor: toMinorDecimal(line.credit),
        currency: process.env.FINANCE_BASE_CURRENCY || 'SAR',
        fxRate: 1,
        memo: line.description,
        dimensions: cleanedDimensions,
      };
    });

    journal.postings = postings;
    await journal.save();
    migrated += 1;
  }

  console.log(`Migrated ${migrated} draft journals to postings format.`);
  await disconnectFromDatabase();
}

migrateDraftJournals().catch(async (err) => {
  console.error('Failed to migrate journals', err);
  await disconnectFromDatabase();
  process.exit(1);
});
