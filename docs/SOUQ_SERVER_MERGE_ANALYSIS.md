# Souq-Server Merge Analysis

## Overview
Analyzing packages/fixzit-souq-server to identify code worth merging before deletion.

## File-by-File Comparison

### 1. Models

#### MarketplaceItem.js (souq-server) vs Product.ts (main app)
**Souq-Server Model (Simple):**
- Basic fields: name, priceSar, vendor, category
- ~10 lines
- No multi-language support
- Simple flat structure

**Main App Model (Advanced):**
- Comprehensive: orgId, vendorId, categoryId, sku, slug
- Multi-language (en/ar)
- Media management (GALLERY, MSDS, COA)
- Buy details (price, currency, uom, minQty, leadDays)
- Stock tracking
- Ratings
- Status workflow
- ~105 lines

**Decision:** ❌ No merge needed - Main app far superior

#### Property.js & WorkOrder.js
**Status:** ✅ Main app already has /server/models/Property.ts and /server/models/WorkOrder.ts
**Decision:** ❌ No merge needed - Duplicates exist

### 2. Routes

#### marketplace.js Route
**Souq-Server:**
- Basic CRUD
- Simple filtering (category, price, vendor, rating)
- Pagination
- Search by text
- ~335 lines

**Main App:** /app/api/marketplace/
**Check needed:** Compare functionality

### 3. Infrastructure

#### db.js
**Features:**
- Mongoose connection management
- Connection status tracking
- Error handling
- Event listeners (connected, error, disconnected)
- Good connection options (maxPoolSize, timeouts)

**Check:** Does main app have equivalent?

#### Dockerfile
**Features:**
- Node 20 Alpine
- Production-only deps
- Port 5000 exposure

**Decision:** Check if main app has Dockerfile

## Action Plan

1. ✅ Compare marketplace routes
2. ✅ Check if db connection utils are needed
3. ✅ Review seed data patterns
4. ✅ Check auth route for any unique logic
5. ❌ Models - all inferior to main app versions

