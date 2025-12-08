import { getDatabase } from "@/lib/mongodb-unified";
import { COLLECTIONS } from "@/lib/db/collections";

const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error(
    "Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production.",
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("Set ALLOW_SEED=1 to run seed scripts in non-production.");
  process.exit(1);
}

async function run() {
  try {
    const db = await getDatabase();
    if (!db) throw new Error("Database connection not available");
    const col = db.collection(COLLECTIONS.PROPERTIES);

    const now = new Date();
    const docs = [
      {
        tenantId: "demo-tenant",
        code: "PROP-AQ-001",
        name: "Luxury Villa - Al Olaya",
        type: "RESIDENTIAL",
        subtype: "Villa",
        address: {
          street: "Olaya St",
          city: "Riyadh",
          region: "Riyadh",
          postalCode: "11564",
          district: "Al Olaya",
          coordinates: { lat: 24.69, lng: 46.685 },
        },
        details: { totalArea: 450, bedrooms: 5, bathrooms: 6 },
        market: { listingPrice: 3500000 },
        photos: ["/images/sample/villa1.jpg"],
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      },
      {
        tenantId: "demo-tenant",
        code: "PROP-AQ-002",
        name: "Modern Apartment - King Fahd Rd",
        type: "RESIDENTIAL",
        subtype: "Apartment",
        address: {
          street: "King Fahd Rd",
          city: "Riyadh",
          region: "Riyadh",
          postalCode: "11564",
          district: "Al Wurud",
          coordinates: { lat: 24.73, lng: 46.67 },
        },
        details: { totalArea: 120, bedrooms: 2, bathrooms: 2 },
        market: { listingPrice: 8500 },
        photos: ["/images/sample/apt1.jpg"],
        createdBy: "system",
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const d of docs) {
      const { createdAt, ...rest } = d;
      await col.updateOne(
        { code: d.code },
        {
          $set: { ...rest, updatedAt: new Date() },
          $setOnInsert: { createdAt: createdAt || new Date() },
        },
        { upsert: true },
      );
    }

    console.log("Seeded Aqar sample properties");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
