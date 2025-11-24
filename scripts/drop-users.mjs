import "dotenv/config";
import { MongoClient } from "mongodb";

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not set");
    process.exit(1);
  }

  const c = new MongoClient(MONGODB_URI);

  try {
    await c.connect();
    const db = c.db("fixzit");
    console.log("🗑️  Dropping all users...");
    const result = await db.collection("users").deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} users`);
  } catch (error) {
    console.error("❌ Drop users failed:", error);
    process.exit(1);
  } finally {
    await c.close();
  }
}

main();
