import 'dotenv/config';
import { dbConnect } from '../src/db/mongoose';
import Module from '../src/models/Module';
import PriceTier from '../src/models/PriceTier';
import DiscountRule from '../src/models/DiscountRule';
import Benchmark from '../src/models/Benchmark';

async function run() {
  await dbConnect();

  const modules = [
    { code: 'FM_CORE', name: 'Facility Management Core', billingCategory: 'per_seat', isCore: true },
    { code: 'PROPERTIES', name: 'Properties & Units', billingCategory: 'per_seat' },
    { code: 'FINANCE', name: 'Finance', billingCategory: 'per_seat' },
    { code: 'HR', name: 'Human Resources', billingCategory: 'per_seat' },
    { code: 'COMPLIANCE', name: 'Compliance & Legal', billingCategory: 'per_seat' },
    { code: 'REPORTS', name: 'Reports & Analytics', billingCategory: 'per_seat' },
    { code: 'MARKETPLACE', name: 'Marketplace Integration', billingCategory: 'per_tenant' },
  ];
  const upserts = await Promise.all(modules.map(m => Module.updateOne({ code: m.code }, m, { upsert: true })));
  console.log(`Modules upserted: ${upserts.length}`);

  // price tiers baseline (USD) – seats up to 200; >200 => sales
  const tiers = [
    // FM_CORE
    ['FM_CORE', [
      [1,5, 29], [6,25, 25], [26,50,22], [51,100,19], [101,200,16]
    ]],
    ['PROPERTIES', [[1,5,8],[6,25,7],[26,50,6],[51,100,5],[101,200,4]]],
    ['FINANCE',    [[1,5,12],[6,25,10],[26,50,9],[51,100,8],[101,200,7]]],
    ['HR',         [[1,5,8],[6,25,7],[26,50,6],[51,100,5],[101,200,4]]],
    ['COMPLIANCE', [[1,5,7],[6,25,6],[26,50,5],[51,100,4],[101,200,4]]],
    ['REPORTS',    [[1,5,5],[6,25,4],[26,50,4],[51,100,3],[101,200,3]]],
    // MARKETPLACE per_tenant flat price
    ['MARKETPLACE', [[1,200,0]]] // use flatMonthly below
  ] as const;

  const moduleDocs = await Module.find({});
  const moduleId = (code: string) => moduleDocs.find(m => m.code === code)!._id;

  const priceDocs: any[] = [];
  for (const [code, rows] of tiers) {
    for (const [min,max,price] of rows) {
      priceDocs.push({
        moduleId: moduleId(code),
        seatsMin: min, seatsMax: max,
        pricePerSeatMonthly: code === 'MARKETPLACE' ? 0 : price,
        flatMonthly: code === 'MARKETPLACE' ? 99 : undefined, // per tenant
        currency: 'USD', region: 'GLOBAL'
      });
    }
  }
  await PriceTier.deleteMany({}); await PriceTier.insertMany(priceDocs);
  await DiscountRule.updateOne({ code: 'ANNUAL' }, { code: 'ANNUAL', type: 'percent', value: 15, active: true }, { upsert: true });

  // Seed benchmark references (from public pages)
  await Benchmark.deleteMany({});
  await Benchmark.insertMany([
    { vendor: 'UpKeep',     plan: 'Essential', pricingModel: 'per_user_month', priceMonthly: 20, notes: 'Public pricing', src: 'https://upkeep.com/pricing/' },
    { vendor: 'UpKeep',     plan: 'Premium',   pricingModel: 'per_user_month', priceMonthly: 45, notes: 'Public pricing', src: 'https://upkeep.com/pricing/' },
    { vendor: 'MaintainX',  plan: 'Essential', pricingModel: 'per_user_month', priceMonthly: 25, priceAnnualMonthly: 20, src: 'https://www.getmaintainx.com/pricing' },
    { vendor: 'MaintainX',  plan: 'Premium',   pricingModel: 'per_user_month', priceMonthly: 75, priceAnnualMonthly: 65, src: 'https://www.getmaintainx.com/pricing' },
    { vendor: 'Limble',     plan: 'Standard',  pricingModel: 'per_user_month', priceMonthly: 33, priceAnnualMonthly: 28, src: 'https://limblecmms.com/pricing/' }
  ]);

  console.log('Seed OK');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
