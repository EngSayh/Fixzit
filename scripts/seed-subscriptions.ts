import "dotenv/config";
import mongoose from "mongoose";
import Module from "../server/models/Module";
import PriceBook from "../server/models/PriceBook";
import DiscountRule from "../server/models/DiscountRule";
import Benchmark from "../server/models/Benchmark";

const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error(
    "Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production.",
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("Set ALLOW_SEED=1 to run seed-subscriptions.ts in non-production.");
  process.exit(1);
}

const USD_PRICES = [
  { module_key: "FM_CORE", monthly_usd: 22, monthly_sar: 82 },
  { module_key: "PM", monthly_usd: 8, monthly_sar: 30 },
  { module_key: "MARKETPLACE_PRO", monthly_usd: 5, monthly_sar: 19 },
  { module_key: "ANALYTICS_PRO", monthly_usd: 10, monthly_sar: 38 },
  { module_key: "COMPLIANCE", monthly_usd: 8, monthly_sar: 30 },
  { module_key: "HR_LITE", monthly_usd: 6, monthly_sar: 23 },
  { module_key: "CRM_LITE", monthly_usd: 5, monthly_sar: 19 },
];

const TIERS = [
  { min_seats: 1, max_seats: 5, discount_pct: 0.0 },
  { min_seats: 6, max_seats: 20, discount_pct: 0.08 },
  { min_seats: 21, max_seats: 50, discount_pct: 0.12 },
  { min_seats: 51, max_seats: 100, discount_pct: 0.18 },
  { min_seats: 101, max_seats: 200, discount_pct: 0.25 },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI must be set");

  await mongoose.connect(uri);

  const modules = [
    { key: "FM_CORE", name: "FM Core" },
    { key: "PM", name: "Preventive Maintenance" },
    { key: "MARKETPLACE_PRO", name: "Marketplace Pro" },
    { key: "ANALYTICS_PRO", name: "Analytics Pro" },
    { key: "COMPLIANCE", name: "Compliance & Legal" },
    { key: "HR_LITE", name: "HR Lite" },
    { key: "CRM_LITE", name: "CRM Lite" },
  ];

  await Module.deleteMany({});
  await Module.insertMany(modules);

  await PriceBook.deleteMany({});
  await PriceBook.create({
    name: "Global USD",
    currency: "USD",
    tiers: TIERS.map((tier) => ({ ...tier, prices: USD_PRICES })),
  });
  await PriceBook.create({
    name: "KSA SAR",
    currency: "SAR",
    tiers: TIERS.map((tier) => ({ ...tier, prices: USD_PRICES })),
  });

  await DiscountRule.deleteMany({ key: "ANNUAL_PREPAY" });
  await DiscountRule.create({ key: "ANNUAL_PREPAY", percentage: 0.15 });

  await Benchmark.deleteMany({});
  await Benchmark.insertMany([
    {
      vendor: "UpKeep",
      region: "Global",
      plans: [
        {
          name: "Essential",
          price_per_user_month_usd: 20,
          url: "https://upkeep.com/pricing/",
          features: ["WOs", "Assets", "PM"],
        },
        {
          name: "Premium",
          price_per_user_month_usd: 45,
          url: "https://upkeep.com/pricing/",
          features: ["Advanced PM", "Manpower"],
        },
      ],
    },
    {
      vendor: "MaintainX",
      region: "Global",
      plans: [
        {
          name: "Essential",
          price_per_user_month_usd: 20,
          url: "https://www.getmaintainx.com/pricing",
          features: ["WOs", "PM"],
        },
        {
          name: "Premium",
          price_per_user_month_usd: 65,
          url: "https://www.getmaintainx.com/pricing",
          features: ["Inventory", "Purchasing"],
        },
      ],
    },
    {
      vendor: "Hippo CMMS",
      region: "Global",
      plans: [
        {
          name: "Starter",
          price_per_user_month_usd: 35,
          url: "https://www.trustradius.com/products/hippo-cmms/pricing",
          features: ["WOs", "PM"],
        },
        {
          name: "Pro",
          price_per_user_month_usd: 75,
          url: "https://www.trustradius.com/products/hippo-cmms/pricing",
          features: ["Advanced", "Reports"],
        },
      ],
    },
  ]);

  console.log("✅ Seed complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
