# Phase 2 - Multi-PR Split Strategy
**Date:** November 16, 2025  
**Purpose:** Break Phase 2 into manageable, reviewable PRs  
**Total Conflicts:** 65 files  
**Strategy:** Feature-based grouping with minimal interdependencies

---

## PR Grouping Strategy

### 🎯 PR #1: Core Infrastructure & Models (Foundation)
**Branch:** `feat/souq-phase2-pr1-infrastructure`  
**Files:** ~20 files  
**Conflicts:** Low (2-3)  
**Review Time:** 30 minutes

**Includes:**
- Core Souq models (Product, Category, Brand)
- Database schemas and migrations
- Shared utilities (FSIN generator, feature flags)
- MongoDB plugins and helpers

**Files:**
```
server/models/souq/Product.ts
server/models/souq/Category.ts
server/models/souq/Brand.ts
server/models/souq/Variation.ts
lib/souq/fsin-generator.ts
lib/souq/feature-flags.ts
src/types/mongoose-compat.ts
types/souq/reviews.ts
```

**Why First:** Foundation for all other PRs, minimal conflicts

---

### 📦 PR #2: Inventory Management (EPIC I - Part 1)
**Branch:** `feat/souq-phase2-pr2-inventory`  
**Files:** ~15 files  
**Conflicts:** Medium (4-5)  
**Review Time:** 45 minutes

**Includes:**
- Inventory models and services
- Stock tracking APIs
- Warehouse management
- Reserve/release logic

**Files:**
```
server/models/souq/Inventory.ts
server/models/souq/Listing.ts
services/souq/inventory-service.ts
app/api/souq/inventory/route.ts
app/api/souq/inventory/[listingId]/route.ts
app/api/souq/inventory/adjust/route.ts
app/api/souq/inventory/health/route.ts
app/api/souq/inventory/reserve/route.ts
app/api/souq/inventory/release/route.ts
```

**Dependencies:** PR #1 (Product models)

---

### 📊 PR #3: Analytics Dashboard (EPIC G)
**Branch:** `feat/souq-phase2-pr3-analytics`  
**Files:** ~18 files  
**Conflicts:** Medium (5-6)  
**Review Time:** 1 hour

**Includes:**
- Analytics service
- Dashboard APIs
- Sales/traffic/customer analytics
- UI components

**Files:**
```
services/souq/analytics/analytics-service.ts
app/api/souq/analytics/dashboard/route.ts
app/api/souq/analytics/sales/route.ts
app/api/souq/analytics/products/route.ts
app/api/souq/analytics/traffic/route.ts
app/api/souq/analytics/customers/route.ts
components/seller/analytics/SalesChart.tsx
components/seller/analytics/ProductPerformanceTable.tsx
components/seller/analytics/CustomerInsightsCard.tsx
components/seller/analytics/TrafficAnalytics.tsx
app/marketplace/seller-central/analytics/page.tsx
```

**Dependencies:** PR #1, PR #2 (Order data)

---

### ⭐ PR #4: Reviews & Ratings System (EPIC H)
**Branch:** `feat/souq-phase2-pr4-reviews`  
**Files:** ~22 files  
**Conflicts:** High (8-10)  
**Review Time:** 1.5 hours

**Includes:**
- Review models and services
- Rating aggregation
- Buyer submission APIs
- Seller response system
- Review moderation
- UI components

**Files:**
```
server/models/souq/Review.ts
services/souq/reviews/review-service.ts
services/souq/reviews/rating-aggregation-service.ts
app/api/souq/reviews/route.ts
app/api/souq/reviews/[id]/route.ts
app/api/souq/reviews/[id]/helpful/route.ts
app/api/souq/reviews/[id]/report/route.ts
app/api/souq/products/[id]/reviews/route.ts
app/api/souq/seller-central/reviews/route.ts
app/api/souq/seller-central/reviews/[id]/respond/route.ts
components/seller/reviews/ReviewCard.tsx
components/seller/reviews/ReviewForm.tsx
components/seller/reviews/ReviewList.tsx
components/seller/reviews/RatingSummary.tsx
components/seller/reviews/SellerResponseForm.tsx
app/marketplace/seller-central/reviews/page.tsx
app/marketplace/orders/[orderId]/review/page.tsx
app/marketplace/products/[id]/reviews/page.tsx
lib/validations/reviews.ts
docs/api/souq-reviews.md
```

**Dependencies:** PR #1 (Product models), PR #2 (Order completion)

---

### 🏪 PR #5: Seller Central Dashboard (EPIC E - Part 1)
**Branch:** `feat/souq-phase2-pr5-seller-dashboard`  
**Files:** ~16 files  
**Conflicts:** Medium (5-6)  
**Review Time:** 1 hour

**Includes:**
- Seller dashboard
- Performance metrics
- Account health
- KYC system

**Files:**
```
server/models/souq/Seller.ts
server/models/souq/SellerMetrics.ts
services/souq/seller-kyc-service.ts
services/souq/account-health-service.ts
app/api/souq/sellers/route.ts
app/api/souq/sellers/[id]/dashboard/route.ts
app/api/souq/seller-central/health/route.ts
app/api/souq/seller-central/health/summary/route.ts
app/api/souq/seller-central/kyc/submit/route.ts
app/api/souq/seller-central/kyc/status/route.ts
components/seller/health/HealthScore.tsx
components/seller/health/MetricCard.tsx
components/seller/kyc/KYCProgress.tsx
components/seller/kyc/DocumentUploadForm.tsx
app/marketplace/seller-central/health/page.tsx
app/marketplace/seller-central/kyc/page.tsx
```

**Dependencies:** PR #1 (Product models), PR #3 (Analytics)

---

### 💰 PR #6: Returns & Claims (EPIC E - Part 2)
**Branch:** `feat/souq-phase2-pr6-returns-claims`  
**Files:** ~20 files  
**Conflicts:** High (7-9)  
**Review Time:** 1.5 hours

**Includes:**
- Returns management (RMA)
- Claims system
- Refund processing
- Investigation workflow

**Files:**
```
server/models/souq/RMA.ts
server/models/souq/Claim.ts
services/souq/returns-service.ts
services/souq/claims/claim-service.ts
services/souq/claims/investigation-service.ts
services/souq/claims/refund-processor.ts
app/api/souq/returns/route.ts
app/api/souq/returns/[rmaId]/route.ts
app/api/souq/returns/initiate/route.ts
app/api/souq/returns/approve/route.ts
app/api/souq/claims/route.ts
app/api/souq/claims/[id]/route.ts
app/api/souq/claims/[id]/response/route.ts
components/souq/claims/ClaimForm.tsx
components/souq/claims/ClaimDetails.tsx
app/marketplace/buyer/claims/page.tsx
app/marketplace/seller-central/claims/page.tsx
```

**Dependencies:** PR #2 (Orders), PR #4 (Review integration)

---

### 🚚 PR #7: Order Processing & Fulfillment (EPIC I - Part 2)
**Branch:** `feat/souq-phase2-pr7-orders-fulfillment`  
**Files:** ~14 files  
**Conflicts:** Medium-High (6-7)  
**Review Time:** 1 hour

**Includes:**
- Order processing
- Fulfillment engine
- Shipping integration
- SLA tracking

**Files:**
```
server/models/souq/Order.ts
services/souq/fulfillment-service.ts
app/api/souq/orders/route.ts
app/api/souq/fulfillment/rates/route.ts
app/api/souq/fulfillment/generate-label/route.ts
app/api/souq/fulfillment/sla/[orderId]/route.ts
app/api/webhooks/carrier/tracking/route.ts
lib/carriers/aramex.ts
lib/carriers/smsa.ts
lib/carriers/spl.ts
```

**Dependencies:** PR #2 (Inventory reserve), PR #6 (Returns)

---

### 💳 PR #8: Settlements & Payouts (EPIC I - Part 3)
**Branch:** `feat/souq-phase2-pr8-settlements`  
**Files:** ~18 files  
**Conflicts:** Medium (4-5)  
**Review Time:** 1 hour

**Includes:**
- Settlement calculation
- Balance management
- Payout processing
- Transaction history

**Files:**
```
server/models/souq/Settlement.ts
server/models/souq/SettlementExtended.ts
server/models/souq/Transaction.ts
server/models/souq/PayoutRequest.ts
services/souq/settlements/settlement-calculator.ts
services/souq/settlements/balance-service.ts
services/souq/settlements/payout-processor.ts
app/api/souq/settlements/route.ts
app/api/souq/settlements/[id]/route.ts
app/api/souq/settlements/balance/route.ts
app/api/souq/settlements/request-payout/route.ts
app/api/souq/settlements/transactions/route.ts
components/seller/settlements/BalanceOverview.tsx
components/seller/settlements/SettlementStatementView.tsx
components/seller/settlements/WithdrawalForm.tsx
app/marketplace/seller-central/settlements/page.tsx
```

**Dependencies:** PR #7 (Orders complete)

---

### 🛍️ PR #9: Product Catalog & Variations (EPIC F)
**Branch:** `feat/souq-phase2-pr9-catalog`  
**Files:** ~12 files  
**Conflicts:** Low-Medium (3-4)  
**Review Time:** 45 minutes

**Includes:**
- Product catalog APIs
- Variation management
- BuyBox logic
- Multi-currency support

**Files:**
```
app/api/souq/catalog/products/route.ts
app/api/souq/products/route.ts
app/api/souq/categories/route.ts
app/api/souq/brands/route.ts
app/api/souq/buybox/[fsin]/route.ts
app/api/souq/buybox/winner/[fsin]/route.ts
app/api/souq/listings/route.ts
services/souq/buybox-service.ts
components/souq/BuyBoxWinner.tsx
components/souq/OtherOffersTab.tsx
app/souq/catalog/page.tsx
```

**Dependencies:** PR #1 (Models), PR #2 (Inventory)

---

### 🔍 PR #10: Search & Discovery
**Branch:** `feat/souq-phase2-pr10-search`  
**Files:** ~10 files  
**Conflicts:** Medium (4-5)  
**Review Time:** 45 minutes

**Includes:**
- Meilisearch integration
- Search indexing
- Filters and facets
- Search UI

**Files:**
```
app/api/souq/search/route.ts
services/souq/search-indexer-service.ts
lib/meilisearch-client.ts
lib/meilisearch.ts
components/souq/SearchBar.tsx
components/souq/SearchFilters.tsx
app/souq/search/page.tsx
jobs/search-index-jobs.ts
```

**Dependencies:** PR #1 (Product models)

---

### 📢 PR #11: Advertising & Deals (EPIC F)
**Branch:** `feat/souq-phase2-pr11-advertising`  
**Files:** ~16 files  
**Conflicts:** Low (2-3)  
**Review Time:** 1 hour

**Includes:**
- Advertising campaigns
- Sponsored products
- Auction engine
- Performance reports
- Deals management

**Files:**
```
server/models/souq/Advertising.ts
server/models/souq/Deal.ts
server/models/souq/Coupon.ts
services/souq/ads/campaign-service.ts
services/souq/ads/auction-engine.ts
services/souq/ads/budget-manager.ts
app/api/souq/ads/campaigns/route.ts
app/api/souq/ads/campaigns/[id]/route.ts
app/api/souq/ads/campaigns/[id]/stats/route.ts
app/api/souq/deals/route.ts
components/souq/ads/SponsoredProduct.tsx
components/souq/ads/SponsoredBrandBanner.tsx
components/seller/advertising/PerformanceReport.tsx
app/marketplace/seller-central/advertising/page.tsx
```

**Dependencies:** PR #9 (Catalog)

---

### 💲 PR #12: Dynamic Pricing & Repricer
**Branch:** `feat/souq-phase2-pr12-pricing`  
**Files:** ~8 files  
**Conflicts:** Low (1-2)  
**Review Time:** 30 minutes

**Includes:**
- Auto-repricer service
- Pricing rules
- Competitor analysis
- Price history

**Files:**
```
services/souq/auto-repricer-service.ts
app/api/souq/repricer/settings/route.ts
app/api/souq/repricer/run/route.ts
app/api/souq/repricer/analysis/[fsin]/route.ts
components/seller/pricing/PricingRuleCard.tsx
components/seller/pricing/CompetitorAnalysis.tsx
app/marketplace/seller-central/pricing/page.tsx
```

**Dependencies:** PR #9 (Listings)

---

### 🧪 PR #13: Testing & Documentation
**Branch:** `feat/souq-phase2-pr13-testing-docs`  
**Files:** ~10 files  
**Conflicts:** None (0)  
**Review Time:** 30 minutes

**Includes:**
- Test data seeding script
- API documentation
- Testing execution guide
- Finance scripts
- Status reports

**Files:**
```
scripts/seed/souq-test-data.ts
scripts/finance/seed-fx.ts
scripts/finance/migrate-journal-postings.ts
docs/api/souq-reviews.md
PHASE_2_TESTING_EXECUTION.md
SEEDING_SCRIPT_STATUS.md
FINANCE_SCRIPTS_EXECUTION_REPORT.md
PHASE_2_FINAL_STATUS.md
EXTERNAL_MODIFICATIONS_REVIEW.md
```

**Dependencies:** None (documentation only)

---

## Merge Order & Timeline

### Week 1 (Foundation)
1. **Monday:** PR #1 (Infrastructure) - 30 min review
2. **Tuesday:** PR #2 (Inventory) - 45 min review
3. **Wednesday:** PR #9 (Catalog) - 45 min review
4. **Thursday:** PR #10 (Search) - 45 min review
5. **Friday:** PR #13 (Testing/Docs) - 30 min review

### Week 2 (Features)
6. **Monday:** PR #3 (Analytics) - 1 hour review
7. **Tuesday:** PR #4 (Reviews) - 1.5 hours review
8. **Wednesday:** PR #5 (Seller Dashboard) - 1 hour review
9. **Thursday:** PR #11 (Advertising) - 1 hour review
10. **Friday:** PR #12 (Pricing) - 30 min review

### Week 3 (Complex Features)
11. **Monday:** PR #6 (Returns/Claims) - 1.5 hours review
12. **Tuesday:** PR #7 (Fulfillment) - 1 hour review
13. **Wednesday:** PR #8 (Settlements) - 1 hour review

---

## Implementation Steps

### 1. Abort Current Merge
```bash
git merge --abort
git stash pop  # Restore stashed changes if needed
```

### 2. Create PR Branches (Script)
```bash
#!/bin/bash
# Create all PR branches from feat/souq-marketplace-advanced

cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit

git checkout feat/souq-marketplace-advanced

# PR #1
git checkout -b feat/souq-phase2-pr1-infrastructure
# Cherry-pick relevant commits
git push origin feat/souq-phase2-pr1-infrastructure

# PR #2
git checkout feat/souq-marketplace-advanced
git checkout -b feat/souq-phase2-pr2-inventory
# Cherry-pick relevant commits
git push origin feat/souq-phase2-pr2-inventory

# ... repeat for all PRs
```

### 3. For Each PR
1. Create branch from `feat/souq-marketplace-advanced`
2. Cherry-pick only relevant commits
3. Resolve conflicts for that PR only
4. Test the PR independently
5. Push to GitHub
6. Create Pull Request with detailed description
7. Request review
8. Merge when approved
9. Move to next PR

---

## Conflict Resolution Strategy

### High-Conflict Files (Priority)
These files appear in multiple PRs and need careful handling:

1. **package.json / pnpm-lock.yaml** (All PRs)
   - Resolve in PR #1
   - Subsequent PRs rebase on main

2. **lib/mongodb-unified.ts** (PRs 1, 2, 7)
   - Resolve in PR #1
   - Later PRs inherit fix

3. **i18n files** (PRs 3, 4, 5)
   - Resolve in PR #3
   - Later PRs add keys only

4. **components/Sidebar.tsx** (PRs 4, 5, 11)
   - Resolve navigation in PR #4
   - Later PRs add menu items

### Conflict Resolution Per PR

**PR #1:** Minimal conflicts (infrastructure)
**PR #2:** Medium conflicts (inventory APIs)
**PR #3:** Medium conflicts (analytics dashboard)
**PR #4:** High conflicts (reviews system)
**PR #5-13:** Decreasing conflicts as dependencies resolve

---

## Benefits of This Approach

### ✅ Easier Reviews
- Each PR focuses on one feature
- Reviewers understand context quickly
- Faster approval cycles

### ✅ Incremental Deployment
- Can deploy PRs 1-5 first (foundation)
- PRs 6-12 add advanced features
- Rollback is easier

### ✅ Parallel Development
- Multiple developers can work on different PRs
- Less merge conflict hell
- Faster overall delivery

### ✅ Better Testing
- Each PR can be tested independently
- Easier to identify breaking changes
- Staging validation per feature

### ✅ Risk Mitigation
- If one PR has issues, others proceed
- Can defer complex PRs if needed
- Production deployment is safer

---

## PR Templates

### PR #1 Example
**Title:** `[Phase 2 - PR 1/13] Core Infrastructure & Models`

**Description:**
```markdown
## Overview
Foundation for Souq marketplace - core models, utilities, and database schemas.

## What's Included
- ✅ Product, Category, Brand models
- ✅ FSIN generator utility
- ✅ Feature flags system
- ✅ Mongoose compatibility types

## Dependencies
- None (foundation PR)

## Testing
- Unit tests for FSIN generator
- Model validation tests
- TypeScript compilation verified

## Deployment Notes
- No database migrations needed
- No breaking changes
- Safe to merge

## Related PRs
- Blocks: PR #2 (Inventory), PR #9 (Catalog)

## Checklist
- [x] Code reviewed
- [x] Tests passing
- [x] Documentation updated
- [x] TypeScript errors: 0
- [x] No conflicts with main
```

---

## Next Steps

**Immediate:**
1. Abort current merge
2. Create branch creation script
3. Start with PR #1 (Infrastructure)

**Short-term:**
1. Create all 13 PR branches
2. Submit PRs 1-5 for review
3. Begin PR #1 merge process

**Long-term:**
1. Complete all 13 PRs
2. Update main branch incrementally
3. Full Phase 2 deployment

---

## Success Metrics

- **Target:** All 13 PRs merged within 3 weeks
- **Quality:** 0 TypeScript errors per PR
- **Review Time:** <2 hours per PR
- **Conflicts:** <5 files per PR after PR #4
- **Deployment:** Zero downtime incremental rollout

**Status:** ✅ Ready to Execute  
**Approval:** Pending user confirmation
