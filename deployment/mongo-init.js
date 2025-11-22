// Initializes MongoDB with a basic admin user and database
// ⚡ FIXED: Uses environment variables provided by docker-compose (no hardcoded credentials)

// This script runs in the Mongo container context
 
/* global db, process */

// Create application database and user if provided
const appDbName = 'fixzit';
const appDb = db.getSiblingDB(appDbName);

// ⚡ FIXED: Read credentials from environment variables (set by docker-compose)
const appUser = process.env.MONGO_USERNAME || 'fixzit_user';
const appPass = process.env.MONGO_PASSWORD || 'fixzit_password';

// Create a user with readWrite role for the application database
try {
  appDb.createUser({
    user: appUser,
    pwd: appPass,
    roles: [{ role: 'readWrite', db: appDbName }],
  });
} catch (e) {
  // ignore if exists
}

