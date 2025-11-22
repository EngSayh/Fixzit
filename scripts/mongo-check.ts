const uri = process.env.MONGODB_URI || "";
if (!uri) {
  console.log("MONGODB_URI not set — skipping DB check.");
  process.exit(0);
}

(async () => {
  try {
    // Dynamic require to avoid dependency when unused
     
    const { MongoClient } = require("mongodb") as { MongoClient: typeof import("mongodb").MongoClient };
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    console.log("MongoDB ping OK ✅");
  } catch (e) {
    console.error("MongoDB ping FAILED ❌", e);
    process.exit(1);
  }
})();
