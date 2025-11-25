#!/usr/bin/env node
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI not set");
  process.exit(1);
}
async function ping() {
  try {
    console.log("📡 Connecting to MongoDB Atlas...");
    await mongoose.connect(uri, { dbName: "fixzit" });
    const admin = mongoose.connection.db.admin();
    const result = await admin.ping();
    console.log("✅ MongoDB Atlas connection successful!");
    console.log("   Ping:", result);
    console.log("   Database:", mongoose.connection.db.databaseName);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}
ping();
