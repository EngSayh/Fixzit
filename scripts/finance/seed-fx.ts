import { connectToDatabase, disconnectFromDatabase } from '../../lib/mongodb-unified';
import FxRate from '../../server/models/finance/FxRate';

interface SeedRate {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
}

const BASE_RATES: SeedRate[] = [
  { baseCurrency: 'SAR', quoteCurrency: 'SAR', rate: 1 },
  { baseCurrency: 'USD', quoteCurrency: 'SAR', rate: 3.75 },
];

async function seedFxRates(orgIds: string[]) {
  if (orgIds.length === 0) {
    console.error('Please provide at least one orgId');
    process.exit(1);
  }

  await connectToDatabase();

  const seedDate = new Date('2000-01-01T00:00:00.000Z');
  let total = 0;

  for (const orgId of orgIds) {
    for (const rate of BASE_RATES) {
      await FxRate.updateOne(
        { orgId, baseCurrency: rate.baseCurrency, quoteCurrency: rate.quoteCurrency, date: seedDate },
        {
          $set: {
            rate: rate.rate,
            source: 'seed-script',
            date: seedDate,
          },
        },
        { upsert: true }
      );
      total += 1;
    }
  }

  console.log(`Seeded FX rates for ${orgIds.length} orgs (${total} records).`);

  await disconnectFromDatabase();
}

const orgIds = process.argv.slice(2);
seedFxRates(orgIds).catch(async (err) => {
  console.error('Failed to seed FX rates', err);
  await disconnectFromDatabase();
  process.exit(1);
});
