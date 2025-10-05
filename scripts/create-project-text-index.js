/**
 * MongoDB Migration: Create text index for Projects collection
 * Run: node scripts/create-project-text-index.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';

async function createTextIndex() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('projects');
    
    // Check if text index already exists
    const indexes = await collection.indexes();
    const hasTextIndex = indexes.some(idx => 
      idx.name?.includes('text') || Object.values(idx.key || {}).includes('text')
    );
    
    if (hasTextIndex) {
      console.log('✓ Text index already exists on projects collection');
    } else {
      // Create text index on name and description fields
      await collection.createIndex(
        { name: 'text', description: 'text' },
        { 
          name: 'project_search_text',
          weights: { name: 10, description: 5 },
          default_language: 'english'
        }
      );
      console.log('✓ Created text index on projects.name and projects.description');
    }
    
    // List all indexes for verification
    const allIndexes = await collection.indexes();
    console.log('\nCurrent indexes on projects collection:');
    allIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✓ Connection closed');
  }
}

createTextIndex();
