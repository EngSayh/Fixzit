const { MongoClient } = require("mongodb");

async function testMongoConnection() {
  console.log("🔄 Testing MongoDB Cloud Connection...");

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "fixzit";

  console.log("📋 Configuration Check:");
  console.log(`- MONGODB_URI: ${mongoUri ? "✅ Set" : "❌ Missing"}`);
  console.log(`- MONGODB_DB: ${dbName}`);

  if (!mongoUri) {
    console.log("❌ MongoDB URI not found in environment variables.");
    console.log("🔧 Please set MONGODB_URI in your .env.local file");
    console.log(
      "Format: mongodb+srv://username:password@cluster.mongodb.net/database",
    );
    return false;
  }

  const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  console.log(`🔗 Connecting to: ${safeUri}`);

  try {
    const client = new MongoClient(mongoUri);
    console.log("⏳ Attempting connection...");
    await client.connect();
    console.log("✅ Successfully connected to MongoDB!");

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log(`📊 Database: ${dbName}`);
    console.log(`📁 Collections found: ${collections.length}`);

    await client.close();
    console.log("🎉 MongoDB connection test completed successfully!");
    return true;
  } catch (error) {
    console.log(`❌ MongoDB connection failed: ${error.message}`);
    return false;
  }
}

testMongoConnection().then((success) => process.exit(success ? 0 : 1));
