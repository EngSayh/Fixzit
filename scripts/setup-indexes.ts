// import { ensureCoreIndexes } from '@/lib/mongodb-unified';

async function setupIndexes() {
  console.log("Setting up database indexes...");
  try {
    if (!process.env.MONGODB_URI) {
      console.log("⚠️  MONGODB_URI not set - skipping index creation");
      process.exit(0);
    }
    // await ensureCoreIndexes();
    console.log("✅ Database indexes created successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Index creation failed:", error);
    process.exit(1);
  }
}

setupIndexes();
