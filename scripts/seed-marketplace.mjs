import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTs } from './lib/ts-import.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSeed() {
  const preferMongo =
    (process.env.MARKETPLACE_SEED_DRIVER || '').toLowerCase() === 'mongodb' ||
    Boolean(process.env.MONGODB_URI);
  const jsPath = path.resolve(__dirname, './seed-marketplace.js');

  if (preferMongo) {
    try {
      const mod = await import(jsPath);
      const seed = mod.seedMarketplace ?? mod.default ?? mod;
      if (typeof seed === 'function') {
        return { seed, mode: 'mongodb' };
      }
    } catch (error) {
      if (error.code && error.code !== 'ERR_MODULE_NOT_FOUND') {
        throw error;
      }
      if (!error.code && !/Cannot find module/.test(error.message)) {
        throw error;
      }
    }
  }

  const tsPath = path.resolve(__dirname, './seed-marketplace.ts');
  const mod = await importTs(tsPath);
  const seed = mod.seedMarketplace ?? mod.default ?? mod;

  const mockDbPath = path.resolve(__dirname, '../src/lib/mockDb.ts');
  const mockDbMod = await importTs(mockDbPath);
  const mockDb = mockDbMod.MockDatabase?.getInstance?.() ?? new mockDbMod.MockDatabase();

  return { seed, mode: 'mock', mockDb };
}

const { seed, mode, mockDb } = await loadSeed();

if (typeof seed !== 'function') {
  throw new Error('Seed module did not export a function named seedMarketplace or default export.');
}

const options = {
  env: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL
};

if (mode === 'mongodb' && process.env.MONGODB_URI) {
  options.mongodbUri = process.env.MONGODB_URI;
}

if (mode === 'mock') {
  options.database = mockDb;
}

await seed(options);

console.log('✅ Marketplace seed completed');
