const mongoose = require('mongoose');

let databaseStatus = {
  connected: false,
  error: null,
  uri: null,
  lastConnectedAt: null,
};

function getMongoUri() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/fixzit';
  return uri;
}

async function connectDatabase() {
  const uri = getMongoUri();
  databaseStatus.uri = uri;

  if (!uri) {
    databaseStatus.connected = false;
    databaseStatus.error = 'MONGODB_URI not set';
    return false;
  }

  // If already connected, return true
  if (mongoose.connection.readyState === 1) {
    databaseStatus.connected = true;
    databaseStatus.error = null;
    return true;
  }

  mongoose.connection.on('connected', () => {
    databaseStatus.connected = true;
    databaseStatus.error = null;
    databaseStatus.lastConnectedAt = new Date().toISOString();
    console.log('✅ MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    databaseStatus.connected = false;
    databaseStatus.error = err?.message || String(err);
    console.error('❌ MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    databaseStatus.connected = false;
    console.log('⚠️ MongoDB disconnected');
  });

  try {
    await mongoose.connect(uri, {
      // Use recommended options for stable connections
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: true,
      bufferMaxEntries: 0
    });
    
    // Wait a bit to ensure connection is established
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    databaseStatus.connected = false;
    databaseStatus.error = error?.message || String(error);
    console.error('❌ Failed to connect to MongoDB:', error);
    return false;
  }
}

function getDatabaseStatus() {
  return { ...databaseStatus };
}

module.exports = {
  connectDatabase,
  getDatabaseStatus,
};

