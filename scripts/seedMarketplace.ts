import "dotenv/config";
import path from "path";
import { access } from "fs/promises";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb-unified";
import Category from "@/server/models/marketplace/Category";
import AttributeSet from "@/server/models/marketplace/AttributeSet";
import Product from "@/server/models/marketplace/Product";
import Order from "@/server/models/marketplace/Order";
import RFQ from "@/server/models/marketplace/RFQ";
import { objectIdFrom } from "@/lib/marketplace/objectIds";

const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error(
    "Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production.",
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("Set ALLOW_SEED=1 to run seedMarketplace.ts in non-production.");
  process.exit(1);
}

async function ensureAssetExists(relativeUrl: string) {
  const filePath = path.join(
    process.cwd(),
    "public",
    relativeUrl.replace(/^\//, ""),
  );
  try {
    await access(filePath);
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : "";
    throw new Error(
      `Marketplace seed asset missing: ${filePath}. Ensure marketplace docs and images are generated before seeding.${detail}`,
    );
  }
}

async function run() {
  await dbConnect();
  const orgKey = process.env.MARKETPLACE_DEFAULT_TENANT || "demo-tenant";
  const orgId = objectIdFrom(orgKey);
  const hvacAttrSetId = new Types.ObjectId();

  await AttributeSet.updateOne(
    { _id: hvacAttrSetId, orgId },
    {
      $setOnInsert: {
        orgId,
        title: "HVAC Filters",
        items: [
          {
            key: "efficiency",
            label: { en: "Efficiency", ar: "الكفاءة" },
            unit: "MERV",
            required: true,
          },
          { key: "size", label: { en: "Size", ar: "المقاس" }, unit: "mm" },
          { key: "frame", label: { en: "Frame", ar: "الإطار" } },
        ],
      },
    },
    { upsert: true },
  );

  const categories = [
    { slug: "electrical", name: { en: "Electrical", ar: "كهرباء" } },
    { slug: "plumbing", name: { en: "Plumbing", ar: "سباكة" } },
    {
      slug: "hvac",
      name: { en: "HVAC", ar: "تكييف" },
      attrSetId: hvacAttrSetId,
    },
    { slug: "concrete", name: { en: "Concrete", ar: "خرسانة" } },
    { slug: "paints", name: { en: "Paints", ar: "دهانات" } },
    { slug: "ppe", name: { en: "PPE", ar: "معدات الوقاية" } },
    { slug: "tools", name: { en: "Tools", ar: "أدوات" } },
  ];

  for (const category of categories) {
    await Category.updateOne(
      { orgId, slug: category.slug },
      {
        $set: {
          ...category,
          orgId,
        },
      },
      { upsert: true },
    );
  }

  const hvacCategory = await Category.findOne({ orgId, slug: "hvac" });
  const ppeCategory = await Category.findOne({ orgId, slug: "ppe" });

  if (!hvacCategory || !ppeCategory) {
    throw new Error("Required categories missing after seed");
  }

  await Promise.all([
    ensureAssetExists("/images/marketplace/hvac-filter.svg"),
    ensureAssetExists("/docs/msds/merv13.pdf"),
    ensureAssetExists("/images/marketplace/nitrile-gloves.svg"),
    ensureAssetExists("/docs/msds/nitrile-gloves.pdf"),
  ]);

  await Product.updateOne(
    { orgId, sku: "HVAC-FLTR-MERV13-24x24" },
    {
      $set: {
        orgId,
        categoryId: hvacCategory._id,
        slug: "merv13-filter-24x24",
        title: {
          en: "MERV 13 Air Filter 24x24in",
          ar: "فلتر هواء MERV 13 مقاس 24x24",
        },
        summary: "High efficiency HVAC filter meeting ASHRAE 52.2 standard",
        brand: "FiltrationPro",
        standards: ["ASHRAE 52.2", "EN 779 (M6/F7)"],
        specs: {
          efficiency: "MERV 13",
          size: "610x610x25",
          frame: "Galvanized steel",
        },
        media: [
          { url: "/images/marketplace/hvac-filter.svg", role: "GALLERY" },
          { url: "/docs/msds/merv13.pdf", role: "MSDS", title: "MSDS" },
        ],
        buy: { price: 38, currency: "SAR", uom: "ea", leadDays: 2, minQty: 1 },
        stock: { onHand: 120, reserved: 12, location: "Riyadh DC" },
        rating: { avg: 4.6, count: 18 },
        status: "ACTIVE",
      },
    },
    { upsert: true },
  );

  await Product.updateOne(
    { orgId, sku: "PPE-NITRILE-GLOVE-XL" },
    {
      $set: {
        orgId,
        categoryId: ppeCategory._id,
        slug: "nitrile-gloves-xl",
        title: {
          en: "Nitrile Gloves (Powder Free) - XL",
          ar: "قفازات نايترايل بدون بودرة - حجم كبير",
        },
        summary: "Industrial-grade blue nitrile gloves compliant with EN374",
        brand: "SafeHands",
        standards: ["EN 374", "ASTM D6319"],
        specs: {
          thickness: "6 mil",
          color: "Blue",
          packaging: "Box of 100",
        },
        media: [
          { url: "/images/marketplace/nitrile-gloves.svg", role: "GALLERY" },
          { url: "/docs/msds/nitrile-gloves.pdf", role: "MSDS", title: "MSDS" },
        ],
        buy: { price: 68, currency: "SAR", uom: "box", leadDays: 3, minQty: 2 },
        stock: { onHand: 240, reserved: 30, location: "Jeddah Hub" },
        rating: { avg: 4.8, count: 42 },
        status: "ACTIVE",
      },
    },
    { upsert: true },
  );

  await Order.deleteMany({ orgId });
  await RFQ.deleteMany({ orgId });

  console.log("Marketplace seed complete");
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
