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

  mongoose.connection.on('connected', () => {
    databaseStatus.connected = true;
    databaseStatus.error = null;
    databaseStatus.lastConnectedAt = new Date().toISOString();
  });

  mongoose.connection.on('error', (err) => {
    databaseStatus.connected = false;
    databaseStatus.error = err?.message || String(err);
  });

  mongoose.connection.on('disconnected', () => {
    databaseStatus.connected = false;
  });

  try {
    await mongoose.connect(uri, {
      // Use recommended options for stable connections
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    return true;
  } catch (error) {
    databaseStatus.connected = false;
    databaseStatus.error = error?.message || String(error);
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

