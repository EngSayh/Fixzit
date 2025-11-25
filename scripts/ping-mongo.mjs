import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI not found");
  process.exit(1);
}

console.log("🔌 Connecting to MongoDB Atlas...");

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
});

try {
  await client.connect();
  console.log("✅ Connected");
  await client.db("admin").command({ ping: 1 });
  console.log("✅ Ping OK");
  const { databases } = await client.db().admin().listDatabases();
  console.log("✅ DBs:", databases.map((db) => db.name).join(", "));
} catch (err) {
  console.error("❌ Failed:", err?.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
