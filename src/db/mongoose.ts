import mongoose from 'mongoose';

let connection: typeof mongoose | null = null;

export async function dbConnect() {
  if (connection) return connection;

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fixzit";
  const dbName = process.env.MONGODB_DB || 'fixzit';

  connection = await mongoose.connect(uri, { dbName });
  return connection;
}

export function getMongoose() {
  if (!connection) {
    throw new Error('Mongoose not connected. Call dbConnect() first.');
  }
  return connection;
}


