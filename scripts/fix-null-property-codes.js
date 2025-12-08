require("dotenv/config");
require("tsx/cjs");

const { connectToDatabase, disconnectFromDatabase } = require("../lib/mongodb-unified.ts");
const { COLLECTIONS, createIndexes } = require("../lib/db/collections.ts");

/**
 * Fix null propertyCode values before creating unique index
 */

async function fixNullPropertyCodes() {
  try {
    console.log("🔗 Connecting to MongoDB (unified connector)...");
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    // Find properties with null propertyCode
    const nullProperties = await db
      .collection(COLLECTIONS.PROPERTIES)
      .find({
        $or: [
          { propertyCode: null },
          { propertyCode: { $exists: false } },
          { propertyCode: "" },
        ],
      })
      .toArray();

    console.log(
      `🔍 Found ${nullProperties.length} properties with null/missing propertyCode`,
    );

    if (nullProperties.length > 0) {
      // Generate property codes for null values
      for (let i = 0; i < nullProperties.length; i++) {
        const property = nullProperties[i];

        const orgId = property.orgId || property.organization;
        // Get organization code or use property ID
        const orgCode = orgId
          ? orgId.toString().slice(-4).toUpperCase()
          : "DFLT";

        // Generate sequential code
        const count = await db.collection(COLLECTIONS.PROPERTIES).countDocuments({
          $or: [{ orgId }, { organization: orgId }],
          propertyCode: { $ne: null },
        });

        const newCode = `PROP-${orgCode}-${(count + i + 1).toString().padStart(5, "0")}`;

        // Update the property
        await db
          .collection(COLLECTIONS.PROPERTIES)
          .updateOne(
            { _id: property._id },
            { $set: { propertyCode: newCode } },
          );

        console.log(
          `✅ Updated property ${property._id} with code: ${newCode}`,
        );
      }
    }

    console.log("\n🏢 Ensuring canonical indexes via createIndexes()...");
    await createIndexes();
    console.log("✅ Canonical indexes created successfully!");
  } catch (error) {
    console.error("❌ Error fixing property codes:", error);
    process.exit(1);
  } finally {
    try {
      await disconnectFromDatabase();
    } catch (err) {
      console.warn("⚠️ Failed to disconnect cleanly", err);
    }
    console.log("🔚 Disconnected from MongoDB");
    process.exit(0);
  }
}

fixNullPropertyCodes();
