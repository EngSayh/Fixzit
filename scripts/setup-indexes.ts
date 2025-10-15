// import { ensureCoreIndexes } from '@/lib/mongodb-unified';

async function setupIndexes() {

  try {
    if (!process.env.MONGODB_URI) {

      process.exit(0);
    }
    // await ensureCoreIndexes();

    process.exit(0);
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    process.exit(1);
  }
}

setupIndexes();
