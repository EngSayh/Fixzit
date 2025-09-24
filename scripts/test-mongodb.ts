import { db } from '../src/lib/mongo';
import mongoose from 'mongoose';

async function testConnection() {
  console.log('🔍 Testing MongoDB connection...');
  
  try {
    // Attempt to connect
    await db();
    console.log('✅ Successfully connected to MongoDB');
    
    // Get connection info
    const connectionState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`📊 Connection state: ${states[connectionState]}`);
    
    // Test database info
    const admin = mongoose.connection.db?.admin();
    if (admin) {
      const info = await admin.serverInfo();
      console.log(`🗄️  MongoDB version: ${info.version}`);
      console.log(`🖥️  Server: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`📁 Database: ${mongoose.connection.name}`);
    }
    
    // List collections
    const collections = await mongoose.connection.db?.listCollections().toArray();
    if (collections && collections.length > 0) {
      console.log('\n📋 Collections:');
      collections.forEach(col => {
        console.log(`  - ${col.name}`);
      });
    } else {
      console.log('\n📋 No collections found (empty database)');
    }
    
    console.log('\n✅ MongoDB connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
    process.exit(0);
  }
}

// Run the test
testConnection();
