import mongoose from 'mongoose';
import { db as libDb } from '@/src/lib/mongo';

let connection: typeof mongoose | null = null;

export async function dbConnect() {
	// Delegate to the shared connection in src/lib/mongo.ts to avoid duplicate pools
	connection = (await libDb()) as typeof mongoose;
	return connection;
}

export function getMongoose() {
	if (!connection) {
		throw new Error('Mongoose not connected. Call dbConnect() first.');
	}
	return connection;
}


