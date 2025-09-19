// Initializes MongoDB with a basic admin user and database
// Uses environment variables provided by docker-compose

// This script runs in the Mongo container context
const adminDb = db.getSiblingDB('admin');

// Create application database and user if provided
const appDbName = 'fixzit';
const appDb = db.getSiblingDB(appDbName);

// Create a user with readWrite role for the application database
try {
  appDb.createUser({
    user: 'fixzit_user',
    pwd: 'fixzit_password',
    roles: [{ role: 'readWrite', db: appDbName }],
  });
} catch (e) {
  // ignore if exists
}

