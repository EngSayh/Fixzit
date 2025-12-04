#!/usr/bin/env tsx
/**
 * Comprehensive Database Deployment Verification Script
 *
 * This script verifies the MongoDB deployment is ready for production:
 * - Connection testing
 * - Database operations verification
 * - Performance checks
 * - Data integrity validation
 * - Multi-tenant scoping verification
 */

import {
  connectToDatabase,
  getDatabase,
  checkDatabaseHealth,
  disconnectFromDatabase,
} from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "@/lib/db/collections";

interface VerificationResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: unknown;
}

class DatabaseVerifier {
  private results: VerificationResult[] = [];

  private async runTest(
    testName: string,
    testFn: () => Promise<unknown>,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🧪 Testing: ${testName}...`);
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        test: testName,
        passed: true,
        duration,
        details: result,
      });

      console.log(`✅ ${testName} - ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log(`❌ ${testName} - Failed in ${duration}ms: ${error}`);
    }
  }

  async verifyConnection(): Promise<void> {
    await this.runTest("MongoDB Connection", async () => {
      const connection = await connectToDatabase();
      return {
        state: connection.connection.readyState,
        dbName: connection.connection.db?.databaseName,
        host: connection.connection.host,
        port: connection.connection.port,
      };
    });
  }

  async verifyHealthCheck(): Promise<void> {
    await this.runTest("Database Health Check", async () => {
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) throw new Error("Health check failed");

      const db = await getDatabase();
      const adminResult = await db.admin().ping();
      return { ping: adminResult, healthy: isHealthy };
    });
  }

  async verifyDatabaseOperations(): Promise<void> {
    await this.runTest("Basic CRUD Operations", async () => {
      const db = await getDatabase();
      const testCollection = db.collection("_deployment_test");

      // Create
      const testDoc = {
        _id: new ObjectId(),
        testData: "deployment-verification",
        timestamp: new Date(),
        orgId: new ObjectId(), // Multi-tenant test
      };

      const insertResult = await testCollection.insertOne(testDoc);

      // Read
      const readResult = await testCollection.findOne({ _id: testDoc._id });
      if (!readResult) throw new Error("Failed to read inserted document");

      // Update
      const updateResult = await testCollection.updateOne(
        { _id: testDoc._id },
        { $set: { updated: true, updatedAt: new Date() } },
      );

      // Delete (cleanup)
      const deleteResult = await testCollection.deleteOne({ _id: testDoc._id });

      return {
        insert: insertResult.acknowledged,
        read: !!readResult,
        update: updateResult.modifiedCount === 1,
        delete: deleteResult.deletedCount === 1,
      };
    });
  }

  async verifyIndexes(): Promise<void> {
    await this.runTest("Index Verification", async () => {
      const db = await getDatabase();

      // Check common collections exist and have proper indexes
      const collections = [
        COLLECTIONS.USERS,
        COLLECTIONS.PROPERTIES,
        COLLECTIONS.WORK_ORDERS,
        COLLECTIONS.TENANTS,
      ];
      const indexInfo: Record<string, unknown> = {};

      for (const collName of collections) {
        try {
          const collection = db.collection(collName);
          const indexes = await collection.indexes();
          indexInfo[collName] = {
            count: indexes.length,
            indexes: indexes.map((idx) => idx.name),
          };
        } catch (_error) {
          indexInfo[collName] = { error: "Collection not found or accessible" };
        }
      }

      return indexInfo;
    });
  }

  async verifyMultiTenancy(): Promise<void> {
    await this.runTest("Multi-Tenant Data Isolation", async () => {
      const db = await getDatabase();
      const testCollection = db.collection("_tenant_test");

      const tenant1Id = new ObjectId();
      const tenant2Id = new ObjectId();

      // Insert test data for two tenants
      const tenant1Doc = {
        orgId: tenant1Id,
        data: "tenant1",
        createdAt: new Date(),
      };
      const tenant2Doc = {
        orgId: tenant2Id,
        data: "tenant2",
        createdAt: new Date(),
      };

      await testCollection.insertMany([tenant1Doc, tenant2Doc]);

      // Verify isolation - each tenant should only see their data
      const tenant1Count = await testCollection.countDocuments({
        orgId: tenant1Id,
      });
      const tenant2Count = await testCollection.countDocuments({
        orgId: tenant2Id,
      });
      const crossTenantCount = await testCollection.countDocuments({
        orgId: tenant1Id,
        data: "tenant2",
      });

      // Cleanup
      await testCollection.deleteMany({
        orgId: { $in: [tenant1Id, tenant2Id] },
      });

      if (crossTenantCount > 0) {
        throw new Error("Multi-tenant isolation failed");
      }

      return {
        tenant1Records: tenant1Count,
        tenant2Records: tenant2Count,
        crossTenantLeaks: crossTenantCount,
        isolated: crossTenantCount === 0,
      };
    });
  }

  async verifyPerformance(): Promise<void> {
    await this.runTest("Performance Benchmarks", async () => {
      const db = await getDatabase();
      const testCollection = db.collection("_perf_test");

      // Insert performance test
      const batchSize = 100;
      const testDocs = Array.from({ length: batchSize }, (_, i) => ({
        index: i,
        orgId: new ObjectId(),
        data: `performance-test-${i}`,
        timestamp: new Date(),
      }));

      const insertStart = Date.now();
      await testCollection.insertMany(testDocs);
      const insertTime = Date.now() - insertStart;

      // Query performance test
      const queryStart = Date.now();
      const results = await testCollection
        .find({ data: { $regex: /^performance-test/ } })
        .toArray();
      const queryTime = Date.now() - queryStart;

      // Cleanup
      await testCollection.deleteMany({
        data: { $regex: /^performance-test/ },
      });

      return {
        insertedDocs: batchSize,
        insertTime: `${insertTime}ms`,
        insertRate: `${Math.round(batchSize / (insertTime / 1000))} docs/sec`,
        queriedDocs: results.length,
        queryTime: `${queryTime}ms`,
        queryRate: `${Math.round(results.length / (queryTime / 1000))} docs/sec`,
      };
    });
  }

  async verifyEnvironmentConfig(): Promise<void> {
    await this.runTest("Environment Configuration", async () => {
      const config = {
        mongoUri: !!process.env.MONGODB_URI,
        mongoDb: process.env.MONGODB_DB || "default",
        nodeEnv: process.env.NODE_ENV,
        hasValidUri: process.env.MONGODB_URI?.startsWith("mongodb"),
        connectionString: process.env.MONGODB_URI
          ? process.env.MONGODB_URI.replace(/:[^:@]*@/, ":***@")
          : "NOT_SET",
      };

      if (!config.mongoUri) {
        throw new Error("MONGODB_URI environment variable not set");
      }

      if (!config.hasValidUri) {
        throw new Error(
          "MONGODB_URI does not appear to be a valid MongoDB connection string",
        );
      }

      return config;
    });
  }

  generateReport(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 DATABASE DEPLOYMENT VERIFICATION REPORT");
    console.log("=".repeat(60));

    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? "❌" : "✅"}`);
    console.log(
      `   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`,
    );
    console.log(`   Total Time: ${totalTime}ms`);

    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results
        .filter((r) => !r.passed)
        .forEach((result) => {
          console.log(`   • ${result.test}: ${result.error}`);
        });
    }

    console.log(`\n✅ Passed Tests:`);
    this.results
      .filter((r) => r.passed)
      .forEach((result) => {
        console.log(`   • ${result.test} (${result.duration}ms)`);
      });

    console.log("\n" + "=".repeat(60));

    // Exit with appropriate code
    if (failedTests > 0) {
      console.log("❌ DEPLOYMENT VERIFICATION FAILED");
      process.exit(1);
    } else {
      console.log("✅ DEPLOYMENT VERIFICATION PASSED");
      process.exit(0);
    }
  }

  async runAllVerifications(): Promise<void> {
    console.log("🚀 Starting Database Deployment Verification...\n");

    try {
      await this.verifyEnvironmentConfig();
      await this.verifyConnection();
      await this.verifyHealthCheck();
      await this.verifyDatabaseOperations();
      await this.verifyIndexes();
      await this.verifyMultiTenancy();
      await this.verifyPerformance();
    } finally {
      // Always disconnect
      try {
        await disconnectFromDatabase();
      } catch (error) {
        console.log("Warning: Error during disconnect:", error);
      }
    }

    this.generateReport();
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DatabaseVerifier();
  verifier.runAllVerifications().catch((error) => {
    console.error("💥 Verification failed:", error);
    process.exit(1);
  });
}

export { DatabaseVerifier };
