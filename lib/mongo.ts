import mongoose from 'mongoose';

let promise: Promise<typeof mongoose> | null = null;
export function connectMongo() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
  if (!promise) {
    promise = mongoose.connect(process.env.MONGODB_URI, { dbName: 'fixzit' });
  }
  return promise;
}
