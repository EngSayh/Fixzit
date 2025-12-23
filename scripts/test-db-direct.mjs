#!/usr/bin/env node
/**
 * Direct MongoDB connection test (bypasses API auth)
 * Tests database connectivity and checks issue count
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable not set');
  console.error('   Make sure .env.local exists with MONGODB_URI');
  process.exit(1);
}

// Issue schema (minimal)
const IssueSchema = new mongoose.Schema({
  key: String,
  orgId: mongoose.Schema.Types.ObjectId,
  status: String,
  priority: String,
  title: String,
}, { collection: 'issues' });

const Issue = mongoose.models.Issue || mongoose.model('Issue', IssueSchema);

async function testConnection() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const count = await Issue.countDocuments();
    console.log(`\n📊 Issue count: ${count}`);
    
    if (count > 0) {
      const issues = await Issue.find().limit(5).select('key title status priority');
      console.log('\n📄 Sample issues:');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.key}: ${issue.title} (${issue.status}, ${issue.priority})`);
      });
      
      const statusCounts = await Issue.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      console.log('\n📈 Status breakdown:');
      statusCounts.forEach(({ _id, count }) => {
        console.log(`  ${_id || 'null'}: ${count}`);
      });
    } else {
      console.log('\n⚠️  No issues found in database');
      console.log('   Run: node scripts/import-backlog-audit.mjs');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection test completed');
    
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testConnection();
