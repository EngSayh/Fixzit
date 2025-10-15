const { MongoClient } = require("mongodb");

async function testMongoConnection() {

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "fixzit";

  if (!mongoUri) {

    return false;
  }
  
  const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");

  try {
    const client = new MongoClient(mongoUri);

    await client.connect();

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();

    await client.close();

    return true;
  } catch (error) {

    return false;
  }
}

testMongoConnection().then(success => process.exit(success ? 0 : 1));
