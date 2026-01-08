# Production MongoDB Setup Guide

## Overview

This guide covers production-ready MongoDB configuration for the Fixzit application. The system is designed with fail-fast security principles and requires a real MongoDB connection in production environments.

## Table of Contents

- [Production Requirements](#production-requirements)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Connection Configuration](#connection-configuration)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Production Requirements

### Mandatory Configuration

The application **REQUIRES** the following in production:

1. **MongoDB Atlas Connection** (`mongodb+srv://`)
   - Local connections (`mongodb://localhost`, `mongodb://127.0.0.1`) are **blocked** in production
   - Enforced by `assertAtlasUriInProd()` in `lib/mongo.ts`
   - Override: Set `ALLOW_LOCAL_MONGODB=true` (not recommended)

2. **TLS/SSL Encryption**
   - Automatically enabled for `mongodb+srv://` connections
   - Explicitly enabled for `tls=true` or `ssl=true` parameters
   - Required for data-in-transit security

3. **Environment Variables**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fixzit
   NODE_ENV=production
   ```

### Fail-Fast Security

The system implements **fail-fast** principles to prevent silent security vulnerabilities:

- ❌ **No silent fallback** to mock databases in production
- ❌ **No localhost connections** in production (unless explicitly allowed)
- ✅ **Throws errors immediately** on configuration issues
- ✅ **Detailed logging** with correlation IDs for debugging

## MongoDB Atlas Setup

### Step 1: Create Atlas Cluster

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster:
   - **Tier**: M10 or higher for production
   - **Region**: Choose closest to your application servers
   - **Version**: MongoDB 7.0+ recommended
   - **Backup**: Enable continuous backups

### Step 2: Configure Database Access

1. **Create Database User**:

   ```
   Username: fixzit_app
   Password: [Generate strong password]
   Role: readWrite on 'fixzit' database
   ```

2. **Connection String**:
   ```
   mongodb+srv://fixzit_app:PASSWORD@cluster.mongodb.net/fixzit
   ```

### Step 3: Configure Network Access

1. **IP Allowlist**:
   - Add your application server IPs
   - For Vercel/Netlify: Add `0.0.0.0/0` (enable in VPC if possible)
   - For AWS/GCP: Use VPC peering for security

2. **Private Endpoint** (Recommended):
   - Set up private endpoint for VPC connections
   - Eliminates public internet exposure
   - Available on M10+ clusters

### Step 4: Database Configuration

1. **Create Database**: `fixzit`
2. **Collections** (auto-created on first use):
   - `users`
   - `workorders`
   - `properties`
   - `invoices`
   - `supporttickets`
   - (see `lib/db/index.ts` for complete list)

3. **Indexes**:
   ```bash
   # Run index creation during deployment
   pnpm tsx scripts/ensure-indexes.ts
   ```

## Connection Configuration

### Environment Variables

```bash
# Production (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fixzit
NODE_ENV=production

# Optional: Specify database name separately
MONGODB_DB=fixzit

# Optional: Allow local MongoDB (NOT recommended in production)
ALLOW_LOCAL_MONGODB=false

# Optional: Disable MongoDB during build phase
DISABLE_MONGODB_FOR_BUILD=true
```

### Connection Options

The application uses the following Mongoose connection options:

```typescript
{
  dbName: 'fixzit',
  autoIndex: true,              // Create indexes automatically
  maxPoolSize: 10,              // Connection pool size
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  retryWrites: true,            // Automatic retry for write operations
  tls: true,                    // TLS encryption (auto for mongodb+srv)
  w: 'majority',                // Write concern for durability
}
```

### Connection String Parameters

Recommended parameters for production:

```
mongodb+srv://username:password@cluster.mongodb.net/fixzit?
  retryWrites=true&
  w=majority&
  maxPoolSize=10&
  serverSelectionTimeoutMS=8000
```

## Security Best Practices

### 1. Credential Management

- ✅ **Use strong passwords**: Minimum 32 characters, alphanumeric + symbols
- ✅ **Rotate credentials**: Every 90 days
- ✅ **Store in secrets**: Use Vercel/AWS/GCP secret managers
- ❌ **Never commit**: Keep out of version control

### 2. Network Security

- ✅ **Private endpoints**: Use VPC peering when possible
- ✅ **IP allowlisting**: Restrict to known application IPs
- ✅ **TLS encryption**: Always enabled for data in transit
- ✅ **Firewall rules**: Configure at cloud provider level

### 3. Database Access Control

- ✅ **Principle of least privilege**: Grant minimum required permissions
- ✅ **Separate users**: Different users for app, backups, admin
- ✅ **Read-only replicas**: Use for reporting/analytics
- ✅ **Audit logs**: Enable and monitor access logs

### 4. Encryption

- ✅ **At-rest encryption**: Enabled by default on Atlas
- ✅ **In-transit encryption**: TLS/SSL for all connections
- ✅ **Field-level encryption**: For sensitive PII (optional)
- ✅ **Key management**: Use cloud provider KMS

## Performance Optimization

### 1. Indexing Strategy

Core indexes are created automatically. See `lib/db/index.ts`:

```typescript
// Users
{ email: 1 } (unique)
{ tenantId: 1 }
{ role: 1 }

// Work Orders
{ workOrderNumber: 1 } (unique)
{ orgId: 1, status: 1, createdAt: -1 } (compound)
{ 'sla.resolutionDeadline': 1 }
```

**Create indexes during deployment**:

```bash
pnpm tsx scripts/ensure-indexes.ts
```

### 2. Connection Pooling

- Default pool size: **10 connections**
- Adjust based on traffic: `maxPoolSize` parameter
- Monitor pool usage in Atlas dashboard

### 3. Query Optimization

- ✅ Use projection to limit returned fields
- ✅ Use lean() for read-only queries
- ✅ Paginate large result sets
- ✅ Add appropriate indexes for frequent queries

### 4. Caching Strategy

- ✅ Use MongoDB/Vercel KV for session caching
- ✅ Cache frequently accessed data (users, properties)
- ✅ Implement stale-while-revalidate pattern
- ✅ Set appropriate TTLs based on data volatility

## Monitoring & Health Checks

### Health Check Implementation

The application includes built-in health checks:

```typescript
import { checkDatabaseHealth } from "@/lib/mongodb-unified";

// Returns true if MongoDB is accessible
const isHealthy = await checkDatabaseHealth();
```

### Monitoring Metrics

Track these metrics in production:

1. **Connection Metrics**:
   - Active connections
   - Connection pool utilization
   - Connection errors/timeouts

2. **Query Performance**:
   - Slow queries (>100ms)
   - Query execution time
   - Index usage statistics

3. **Database Size**:
   - Total database size
   - Collection sizes
   - Index sizes

4. **Availability**:
   - Uptime percentage
   - Failover events
   - Replica lag

### Atlas Monitoring

Enable in Atlas dashboard:

1. **Performance Advisor**: Identifies missing indexes
2. **Real-time Performance Panel**: Query profiling
3. **Alerts**: Configure for critical events
4. **Metrics**: CPU, memory, disk usage

## Backup & Recovery

### Automated Backups (Atlas)

1. **Continuous Backup**:
   - Enable on M10+ clusters
   - Point-in-time recovery (PITR)
   - Retain for 7-90 days

2. **Snapshot Schedule**:
   - Daily snapshots at 00:00 UTC
   - Weekly retention: 4 weeks
   - Monthly retention: 12 months

### Manual Backups

```bash
# Export entire database
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/fixzit" --out=./backup

# Export specific collection
mongodump --uri="mongodb+srv://..." --collection=workorders --out=./backup

# Restore from backup
mongorestore --uri="mongodb+srv://..." --dir=./backup
```

### Recovery Testing

- Test recovery procedures quarterly
- Document recovery time objectives (RTO)
- Validate backup integrity regularly

## Troubleshooting

### Common Issues

#### 1. "No matching decryption secret"

**Symptom**: 401 errors, JWT session failures

**Cause**: `NEXTAUTH_SECRET` mismatch between environments

**Solution**:

```bash
# Ensure identical secret across all environments
NEXTAUTH_SECRET=same-secret-everywhere-32-chars-minimum
AUTH_SECRET=same-secret-everywhere-32-chars-minimum
```

#### 2. "Connection timeout"

**Symptom**: Application fails to start, timeout errors

**Causes**:

- IP not allowlisted in Atlas
- Network connectivity issues
- Incorrect connection string

**Solution**:

```bash
# Verify connection string
mongosh "mongodb+srv://username:password@cluster.mongodb.net/fixzit"

# Check IP allowlist in Atlas Network Access
# Add current IP or enable 0.0.0.0/0 for testing
```

#### 3. "Authentication failed"

**Symptom**: "Authentication failed" error

**Causes**:

- Wrong username/password
- User doesn't have permissions
- Special characters not URL-encoded

**Solution**:

```bash
# URL-encode special characters in password
# @ becomes %40, : becomes %3A, etc.
mongodb+srv://user:p%40ssw%3Ard@cluster.mongodb.net/fixzit

# Verify user exists in Database Access
```

#### 4. "FATAL: Local MongoDB URIs are not allowed in production"

**Symptom**: Application won't start in production

**Cause**: Using `mongodb://localhost` in production

**Solution**:

```bash
# Use Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fixzit

# Or explicitly allow local (not recommended)
ALLOW_LOCAL_MONGODB=true
```

#### 5. "Slow queries"

**Symptom**: Requests taking >1 second

**Causes**:

- Missing indexes
- Large result sets without pagination
- Unoptimized queries

**Solution**:

```bash
# Run Performance Advisor in Atlas
# Create recommended indexes
pnpm tsx scripts/ensure-indexes.ts

# Add pagination to large queries
.limit(20).skip(page * 20)

# Use projection to limit fields
.select('field1 field2')
```

### Debug Logging

Enable detailed MongoDB logging:

```bash
# Development
DEBUG=mongodb:* pnpm dev

# Production (use structured logging)
LOG_LEVEL=debug NODE_ENV=production pnpm start
```

### Support Resources

- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB University](https://university.mongodb.com/) (Free courses)
- [MongoDB Community Forums](https://www.mongodb.com/community/forums/)

## Production Checklist

Before deploying to production:

- [ ] MongoDB Atlas cluster created (M10+ tier)
- [ ] Database user with strong password created
- [ ] IP allowlist configured (or private endpoint)
- [ ] Connection string tested with `mongosh`
- [ ] `MONGODB_URI` set in production environment
- [ ] `NEXTAUTH_SECRET` matches across all environments
- [ ] Indexes created (`pnpm tsx scripts/ensure-indexes.ts`)
- [ ] Continuous backups enabled
- [ ] Monitoring alerts configured
- [ ] Health check endpoint verified (`/api/health`)
- [ ] Recovery procedures tested and documented
- [ ] Connection pooling configured appropriately
- [ ] TLS/SSL encryption verified
- [ ] Database user permissions reviewed (least privilege)
- [ ] Audit logs enabled and monitored

## Next Steps

1. Review [PRODUCTION_TESTING_SETUP.md](./PRODUCTION_TESTING_SETUP.md) for testing with real MongoDB
2. See [PRODUCTION_DEPLOYMENT_CHECKLIST.md](./PRODUCTION_DEPLOYMENT_CHECKLIST.md) for complete deployment guide
3. Configure monitoring and alerts in Atlas dashboard
4. Set up automated backup verification
5. Document your specific connection configuration
