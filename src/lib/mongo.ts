// Use standard import (Node runtime for server routes)
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/fixzit";

// Central flag to control mock mode explicitly
const USE_MOCK_DB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';
export const isMockDB = USE_MOCK_DB || !process.env.MONGODB_URI;

// Very small in-memory mock only when explicitly enabled or no URI
class MockDB {
  private connected = false;
  async connect() { this.connected = true; return this; }
  get readyState() { return 1; }
}

let conn = (global as any)._mongoose;
if (!conn) {
  if (isMockDB) {
    console.warn("⚠️ Mock DB mode — using in-memory stub. Not for production.");
    conn = (global as any)._mongoose = new MockDB();
  } else if (mongoose) {
    conn = (global as any)._mongoose = mongoose.connect(uri, {
      autoIndex: true,
      maxPoolSize: 10,
      dbName: process.env.MONGODB_DB || 'fixzit'
    });
  } else {
    throw new Error("Mongoose module not available. Install 'mongoose' or enable USE_MOCK_DB=true.");
  }
}

export const db = conn;
