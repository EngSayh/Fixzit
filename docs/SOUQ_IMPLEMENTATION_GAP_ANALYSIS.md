# Fixzit Souq Marketplace - Implementation Gap Analysis

**Date**: November 15, 2025  
**Spec**: Amazon-Parity Fixzit Souq Implementation Pack  
**Current Branch**: `feat/souq-marketplace-advanced`  
**Status**: Phase 0 Foundation - Partially Complete

---

## Executive Summary

Based on comprehensive review of the codebase against the full Amazon-parity specification, the Fixzit Souq marketplace has **strong foundational infrastructure** in place (models, FSIN generation, Buy Box algorithm, feature flags) but is **missing critical user-facing implementations** across most EPICs. From a Super Admin perspective, major buyer-facing journeys (checkout, support) and the observability/QA hooks required for sign-off are still absent, limiting the ability to govern the marketplace end-to-end.

### High-Level Status

| Component                                             | Status              | Completion                                                                                                            |
| ----------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Foundation (Phase 0)**                              | ✅ **80% Complete** | FSIN generator, feature flags, core models, Buy Box service                                                           |
| **Catalog & Brands (EPIC A)**                         | 🟡 **40% Complete** | Models exist, missing Admin UI & brand registry workflow                                                              |
| **Seller Onboarding (EPIC B)**                        | 🟡 **50% Complete** | Seller model complete, missing KYC UI & health dashboard                                                              |
| **Listings & Buy Box (EPIC C)**                       | 🟡 **60% Complete** | Buy Box algorithm ready, missing PDP integration & repricer                                                           |
| **Inventory & Fulfillment (EPIC D)**                  | ⚠️ **10% Complete** | Models exist, no carrier integrations or FBF/FBM logic                                                                |
| **Orders & Returns (EPIC E)**                         | 🟡 **30% Complete** | Order model exists, missing returns center & A-to-Z claims                                                            |
| **Advertising (EPIC F)**                              | ❌ **0% Complete**  | No CPC auction, no campaigns, no ad placement logic                                                                   |
| **Deals & Coupons (EPIC G)**                          | 🟡 **40% Complete** | Deal model exists, missing coupon engine & UI                                                                         |
| **Reviews & Q&A (EPIC H)**                            | 🟡 **30% Complete** | Review model exists, missing moderation & Q&A system                                                                  |
| **Settlement (EPIC I)**                               | 🟡 **50% Complete** | Settlement model exists, missing payout engine & PDF generation                                                       |
| **Search & Ranking (EPIC J)**                         | 🟡 **40% Complete** | Basic search API exists, missing facets & recommendations                                                             |
| **Reporting (EPIC K)**                                | ⚠️ **10% Complete** | No business reports or admin consoles                                                                                 |
| **Consumer Experience (Checkout, Payments, Support)** | ⚠️ **15% Complete** | PDP/Catalog UI exists, but checkout, payments, buyer support center, and Super Admin SLA dashboards are unimplemented |
| **QA / HFV Evidence**                                 | ⚠️ **10% Complete** | Only Buy Box unit tests exist; no HFV screenshots or automation tied to Super Admin acceptance gates                  |

**Overall System Completion**: ~35%

---

## What's Implemented ✅

### Phase 0: Foundation (80% Complete)

#### ✅ FSIN Generator

- **Location**: `lib/souq/fsin-generator.ts`
- **Status**: Fully implemented with collision detection
- **Format**: `FS-{12-char UUID uppercase}`
- **Features**: Metadata tracking, check digit validation

#### ✅ Feature Flags System

- **Location**: `lib/souq/feature-flags.ts`
- **Status**: Complete with dependency management
- **Flags Defined**: 12 flags (ads, deals, buy_box, settlement, returns_center, brand_registry, account_health, fulfillment_by_fixzit, a_to_z_claims, sponsored_products, auto_repricer, reviews_qa)
- **Features**:
  - Environment variable override support
  - Dependency chain validation
  - Middleware for API route protection
  - Development logging

**Feature-Flag Dependency Matrix (Super Admin View)**

| Flag                    | Implemented Components  | Missing for “ON” State                                             |
| ----------------------- | ----------------------- | ------------------------------------------------------------------ |
| `ads`                   | Flag definition only    | CPC auction service, sponsored placement UI, billing hooks         |
| `deals`                 | Deal model + CRUD API   | Buyer-facing deal carousel, coupon engine, Super Admin approval UI |
| `buy_box`               | Algorithm + API         | PDP integration, repricer worker, HFV evidence                     |
| `settlement`            | Settlement CRUD + model | Payout engine, tax exports, Super Admin approval console           |
| `brand_registry`        | Brand schema            | Seller submission workflow, admin queue, compliance cron           |
| `account_health`        | Seller metrics fields   | Health dashboard UI, enforcement service, alerting                 |
| `fulfillment_by_fixzit` | Listing flags           | Carrier integrations, warehouse UI, SLA monitors                   |
| `returns_center`        | Returns schema          | Buyer portal, inspection workflow, refund automation               |
| `a_to_z_claims`         | Claim schema stub       | Buyer claim UI, adjudication console, settlement adjustments       |
| `sponsored_products`    | Flag only               | Ads placement pipeline, reporting, billing                         |
| `auto_repricer`         | None                    | Pricing worker, risk guardrails, Super Admin override screen       |
| `reviews_qa`            | Review model            | PDP UI, moderation queue, helpful votes                            |

> Super Admins should not enable a flag until the “Missing” column ships with HFV/QA evidence.

#### ✅ MongoDB Schemas (Complete)

**Location**: `server/models/souq/`

| Model             | Status      | Key Features                                                 |
| ----------------- | ----------- | ------------------------------------------------------------ |
| **Category.ts**   | ✅ Complete | Hierarchical, restricted categories, required approvals      |
| **Brand.ts**      | ✅ Complete | Registry status, ownership verification, document tracking   |
| **Product.ts**    | ✅ Complete | FSIN integration, compliance flags, specifications           |
| **Variation.ts**  | ✅ Complete | Attribute combinations, SKU, inventory link                  |
| **Seller.ts**     | ✅ Complete | **Excellent** - KYC, account health, violations, tier system |
| **Listing.ts**    | ✅ Complete | Multi-seller, Buy Box fields, pricing guardrails             |
| **Order.ts**      | ✅ Complete | Full lifecycle, payment, fulfillment status                  |
| **Deal.ts**       | ✅ Complete | Lightning/event deals, eligibility, time windows             |
| **Review.ts**     | ✅ Complete | Verified purchases, ratings, moderation flags                |
| **Settlement.ts** | ✅ Complete | Period tracking, fees, payout calculations                   |

#### ✅ Buy Box Algorithm

- **Location**: `services/souq/buybox-service.ts`
- **Status**: Fully implemented with scoring logic
- **Features**:
  - Eligibility gates (stock, seller health, price guardrails)
  - Normalized scoring: 40% price + 25% delivery + 20% seller + 10% stock + 5% fast badge
  - Tie-breaker logic (FBF → stock → jitter)
  - Seller health integration
  - Average price calculation
  - Recalculation triggers

#### ✅ API Routes (Partial)

**Location**: `app/api/souq/`

| Endpoint                       | Status         | Notes                    |
| ------------------------------ | -------------- | ------------------------ |
| `/souq/buybox/[fsin]`          | ✅ Implemented | Buy Box winner retrieval |
| `/souq/categories`             | ✅ Implemented | Category listing         |
| `/souq/products`               | ✅ Implemented | Product CRUD             |
| `/souq/catalog/products`       | ✅ Implemented | Catalog search           |
| `/souq/listings`               | ✅ Implemented | Listing management       |
| `/souq/sellers`                | ✅ Implemented | Seller CRUD              |
| `/souq/sellers/[id]/dashboard` | ✅ Implemented | Seller metrics           |
| `/souq/orders`                 | ✅ Implemented | Order management         |
| `/souq/deals`                  | ✅ Implemented | Deal CRUD                |
| `/souq/reviews`                | ✅ Implemented | Review submission        |
| `/souq/settlements`            | ✅ Implemented | Settlement CRUD          |
| `/souq/brands`                 | ✅ Implemented | Brand management         |
| `/souq/search`                 | ✅ Implemented | Search API               |

#### ✅ UI Pages (Basic)

**Location**: `app/souq/`, `app/marketplace/`

| Page                                  | Status      | Notes                      |
| ------------------------------------- | ----------- | -------------------------- |
| `/souq/page.tsx`                      | ✅ Complete | Landing page with features |
| `/souq/catalog`                       | ✅ Complete | Product catalog view       |
| `/souq/vendors`                       | ✅ Complete | Vendor directory           |
| `/marketplace/vendor/portal`          | ✅ Complete | Vendor dashboard           |
| `/marketplace/vendor/products/upload` | ✅ Complete | Product upload             |
| `/marketplace/seller/onboarding`      | ✅ Complete | Seller onboarding form     |

### Automation & Ops Coverage (Super Admin Visibility)

| Layer                           | Status              | Notes                                                                                                                                                          |
| ------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cron / Schedulers**           | ⚠️ **20% Complete** | Only FSIN cleanup cron exists; compliance expiry, account-health recalcs, repricing, and payout batching jobs are missing, leaving Super Admin blind to drift. |
| **Queues / Workers**            | ⚠️ **15% Complete** | Minimal in-memory queue wiring for Buy Box recalcs; no dedicated workers for KYC review, settlement batching, document OCR, or proactive SLA escalations.               |
| **Notifications / Escalations** | 🟡 **40% Complete** | Email templates cover seller onboarding, but no buyer support or Super Admin SLA notifications are wired.                                                      |
| **Observability / Audit**       | ⚠️ **25% Complete** | Logger events exist yet no structured audit, Grafana/Kibana dashboards, or alerting for failed jobs—violates Super Admin governance requirements.              |

**Action**: add an “Automation Matrix” appendix mapping each EPIC to required cron/queue jobs, owners, and acceptance gates so Super Admins can audit operational readiness.

### QA / HFV Coverage (Blocking Super Admin Sign-off)

| Area                           | Automated Tests                  | HFV / Evidence | Notes                                                                                 |
| ------------------------------ | -------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| Foundation (Buy Box, FSIN)     | ✅ Unit tests for FSIN + Buy Box | ❌ None        | Need HFV screenshots showing Buy Box switching + audit logs                           |
| Catalog & Brands               | ❌ None                          | ❌ None        | No Cypress flows validating admin category manager                                    |
| Seller Onboarding & Health     | ❌ None                          | ❌ None        | Multi-step onboarding + account health dashboards lack automation and manual evidence |
| Listings & Buy Box (PDP)       | ❌ None                          | ❌ None        | PDP doesn’t render Buy Box, so HFV cannot be recorded                                 |
| Settlement & Finance           | 🟡 Partial model tests           | ❌ None        | Need payout engine tests + HFV of Super Admin settlement console                      |
| Consumer Experience (Checkout) | ❌ None                          | ❌ None        | No checkout implementation yet, so QA is blocked                                      |

> Requirement: every EPIC must attach HFV artifacts (screenshots, console/network logs) plus automated tests before Super Admin can mark the feature “production-ready”.

---

## Critical Gaps ❌

### EPIC A: Catalog & Brand Registry (60% Missing)

#### ❌ Missing Components

1. **Admin UI for Category/Attribute Manager**
   - **Spec Requirement**: Grid-based CRUD for categories, attributes, restrictions
   - **Current State**: Models exist, no admin interface
   - **Impact**: Cannot configure marketplace structure
   - **Location Needed**: `app/admin/souq/categories/page.tsx`

2. **Brand Registry Workflow**
   - **Spec Requirement**: Seller submission → Admin review queue → Verification
   - **Current State**: Brand model exists, no UI workflow
   - **Impact**: Cannot enforce gated brands
   - **Location Needed**:
     - `app/marketplace/seller-central/brand-registry/page.tsx`
     - `app/admin/souq/brand-verification/page.tsx`

3. **Compliance Engine**
   - **Spec Requirement**: JSON rules, automated checks, expiry reminders
   - **Current State**: Compliance flags in Product model, no engine
   - **Impact**: Manual policy enforcement
   - **Location Needed**:
     - `services/souq/compliance-service.ts`
     - Daily cron job

4. **Document Expiry Job**
   - **Spec Requirement**: Daily cron for KYC/compliance document expiry warnings
   - **Current State**: Not implemented
   - **Impact**: No proactive compliance management

---

### EPIC B: Seller Onboarding & Account Health (50% Missing)

#### ✅ Strengths

- Excellent Seller model with all fields
- Account health calculation methods in model
- Violation tracking structure

#### ❌ Missing Components

1. **KYC Onboarding UI**
   - **Spec Requirement**: Multi-step form (legal, VAT, bank, policies)
   - **Current State**: Basic onboarding page exists, not multi-step
   - **Impact**: Cannot collect complete seller data
   - **Location**: Enhance `app/marketplace/seller/onboarding/page.tsx`

2. **Account Health Dashboard**
   - **Spec Requirement**: Live metrics, threshold bars, violation history, appeals
   - **Current State**: `/sellers/[id]/dashboard` API exists, no rich UI
   - **Impact**: Sellers cannot monitor performance
   - **Location Needed**: `app/marketplace/seller-central/account-health/page.tsx`

3. **Metrics Calculation Job**
   - **Spec Requirement**: 90-day rolling window; ODR, LateShip, Cancel, Tracking
   - **Current State**: Model has calculation methods, no scheduled job
   - **Impact**: Metrics never update
   - **Location Needed**:
     - `services/souq/account-health-service.ts`
     - Hourly cron job triggered by order/fulfillment events

4. **Auto-Actions on Threshold Breaches**
   - **Spec Requirement**: Suppress listings, pause ads, remove Buy Box eligibility
   - **Current State**: Eligibility checks exist in Buy Box service, no enforcement
   - **Impact**: No consequences for poor performance
   - **Location Needed**: Event handlers in `services/souq/seller-enforcement-service.ts`

5. **Appeals Workflow**
   - **Spec Requirement**: Seller submits → Admin decides → Restore privileges
   - **Current State**: Not implemented
   - **Impact**: No dispute resolution
   - **Location Needed**:
     - `app/marketplace/seller-central/appeals/page.tsx`
     - `app/admin/souq/appeals-queue/page.tsx`

---

### EPIC C: Listings, Pricing & Buy Box (40% Missing)

#### ✅ Strengths

- Buy Box algorithm fully implemented
- Listing model with price guardrails
- API endpoints exist

#### ❌ Missing Components

1. **PDP Buy Box Integration**
   - **Spec Requirement**: Primary Buy Box winner + "Other offers" tab
   - **Current State**: PDP exists (`app/marketplace/product/[slug]/page.tsx`), no Buy Box display
   - **Impact**: Multi-seller not visible to buyers
   - **Location**: Enhance PDP to call `/api/souq/buybox/[fsin]` and render offers

2. **Auto-Repricer Worker**
   - **Spec Requirement**: In-memory queue job to track lowest landed price with floor/ceiling
   - **Current State**: Not implemented
   - **Impact**: Sellers cannot compete automatically
   - **Location Needed**:
     - `services/souq/repricer-service.ts`
     - Queue `souq:repricer`
     - Configuration per listing

3. **Price Change Event Triggers**
   - **Spec Requirement**: Recompute Buy Box on `listing.price.updated`
   - **Current State**: Buy Box service has method, no event listener
   - **Impact**: Stale Buy Box winners
   - **Location Needed**: Event handler in `services/souq/buybox-service.ts`

4. **Seller Central Pricing UI**
   - **Spec Requirement**: Inline price edit, repricer rules, min/max configuration
   - **Current State**: Basic vendor product upload exists
   - **Impact**: Cannot manage competitive pricing
   - **Location Needed**: `app/marketplace/seller-central/pricing/page.tsx`

---

### EPIC D: Inventory & Fulfillment (90% Missing)

#### ❌ Critical Missing Components

1. **Inventory Service**
   - **Spec Requirement**: Receive, reserve, release, health aging
   - **Current State**: Not implemented
   - **Impact**: No stock management, overselling risk
   - **Location Needed**:
     - `services/souq/inventory-service.ts`
     - API routes `/api/souq/inventory/*`

2. **Fulfillment Service**
   - **Spec Requirement**: FBF/FBM label generation, tracking, SLAs
   - **Current State**: Not implemented
   - **Impact**: Cannot fulfill orders
   - **Location Needed**:
     - `services/souq/fulfillment-service.ts`
     - API routes `/api/souq/fulfillment/*`

3. **Carrier Integrations**
   - **Spec Requirement**: Aramex, SMSA, SPL webhooks & label APIs
   - **Current State**: Not implemented
   - **Impact**: No tracking, no label generation
   - **Location Needed**:
     - `lib/carriers/aramex.ts`
     - `lib/carriers/smsa.ts`
     - `lib/carriers/spl.ts`
     - Webhook handler `/api/webhooks/carrier/update`

4. **Order Tracking UI**
   - **Spec Requirement**: Real-time carrier status for buyers
   - **Current State**: Orders page exists, no tracking integration
   - **Impact**: Poor buyer experience
   - **Location Needed**: Enhance `app/marketplace/orders/page.tsx`

5. **Fast Badge Logic**
   - **Spec Requirement**: SLA ≤ 2 days → Fast Badge display
   - **Current State**: Not implemented
   - **Impact**: No delivery speed differentiation

6. **Inventory Health Job**
   - **Spec Requirement**: Nightly aging, excess, stranded calculation
   - **Current State**: Not implemented
   - **Impact**: No inventory optimization

---

### EPIC E: Orders, Payments, Returns & Claims (70% Missing)

#### ✅ Strengths

- Order model complete
- Basic order API exists

#### ❌ Missing Components

1. **Returns Center**
   - **Spec Requirement**: Self-service returns with auto-approval matrix, RMA, label/pickup
   - **Current State**: Not implemented
   - **Impact**: No returns workflow
   - **Location Needed**:
     - `app/marketplace/returns-center/page.tsx`
     - `services/souq/returns-service.ts`
     - API `/api/souq/returns/*`

2. **Returns Matrix Configuration**
   - **Spec Requirement**: Per-category/price rules for auto-approval vs manual review
   - **Current State**: Not implemented
   - **Impact**: All returns require manual handling
   - **Location Needed**: Admin config interface + service logic

3. **A-to-Z Claims System**
   - **Spec Requirement**: Buyer submits → Evidence window → Decision → Settlement adjustment
   - **Current State**: Not implemented
   - **Impact**: No buyer protection
   - **Location Needed**:
     - `app/marketplace/claims/page.tsx` (buyer)
     - `app/marketplace/seller-central/claims/page.tsx` (seller)
     - `app/admin/souq/disputes/page.tsx` (admin)
     - `services/souq/claims-service.ts`
     - API `/api/souq/claims/*`

4. **Buyer-Seller Messaging**
   - **Spec Requirement**: Masked in-platform messaging with 24h SLA
   - **Current State**: Not implemented
   - **Impact**: No communication channel
   - **Location Needed**:
     - `services/souq/messaging-service.ts`
     - Real-time updates (WebSocket or polling)

5. **Funds Hold/Reserve on Claims**
   - **Spec Requirement**: Lock related funds until claim resolution
   - **Current State**: Not implemented
   - **Impact**: Settlement conflicts
   - **Location Needed**: Integration in settlement-service

6. **Payment Gateway Webhooks**
   - **Spec Requirement**: Mada, STC Pay, Apple Pay refund webhooks & partial refunds
   - **Current State**: Basic payment integration exists in checkout
   - **Impact**: Cannot process refunds
   - **Location Needed**: Enhance `/api/webhooks/payment/*`

---

### EPIC F: Advertising System (100% Missing) ⚠️ CRITICAL

#### ❌ All Components Missing

1. **Ads Service (Complete absence)**
   - **Spec Requirement**: Campaign manager, ad groups, targets, negatives, CPC auction
   - **Current State**: **Not implemented at all**
   - **Impact**: No advertising revenue stream
   - **Location Needed**:
     - `services/souq/ads-service.ts`
     - Models: `server/models/souq/Campaign.ts`, `AdGroup.ts`, `Ad.ts`, `AdTarget.ts`
     - API routes: `/api/souq/ads/*`

2. **CPC Auction Engine**
   - **Spec Requirement**: Second-price auction with quality score (CTR, relevance, rating, delivery)
   - **Current State**: Not implemented
   - **Impact**: Cannot run ads
   - **Location Needed**: `services/souq/ads-auction-service.ts`
   - **Algorithm**:
     ```typescript
     AD_SCORE = QualityScore * Bid;
     cost = next_highest(AD_SCORE) / winner.qualityScore + 0.01;
     ```

3. **Budget Management**
   - **Spec Requirement**: Daily caps, frequency caps, real-time decrement on click
   - **Current State**: Not implemented
   - **Impact**: Cannot control ad spend
   - **Location Needed**: MongoDB budget tracking + in-memory queue for roll-ups

4. **Ad Placements**
   - **Spec Requirement**: Search/PLP top slots, PDP mid slots with "Sponsored" label
   - **Current State**: Not implemented
   - **Impact**: Nowhere to show ads
   - **Location Needed**:
     - Search page component updates
     - PDP component updates
     - Catalog view component updates

5. **Campaign Management UI**
   - **Spec Requirement**: Seller Central interface for campaigns, keywords, bids, budgets
   - **Current State**: Not implemented
   - **Impact**: Sellers cannot create ads
   - **Location Needed**: `app/marketplace/seller-central/advertising/*`

6. **Ads Reports**
   - **Spec Requirement**: Impressions, clicks, CTR, CPC, ACOS, ROAS
   - **Current State**: Not implemented
   - **Impact**: No performance visibility
   - **Location Needed**: `app/marketplace/seller-central/advertising/reports/page.tsx`

**NOTE**: Seller model has `sponsored_ads: boolean` feature flag field, but no implementation behind it.

---

### EPIC G: Deals & Coupons (60% Missing)

#### ✅ Strengths

- Deal model exists with lightning/event types
- Basic deals API exists

#### ❌ Missing Components

1. **Coupon Engine**
   - **Spec Requirement**: Percent/amount off, min basket, max redemptions, time windows
   - **Current State**: Not implemented
   - **Impact**: Cannot run promotions
   - **Location Needed**:
     - Model: `server/models/souq/Coupon.ts`
     - Service: `services/souq/coupon-service.ts`
     - API: `/api/souq/coupons/*`

2. **Checkout Coupon Application**
   - **Spec Requirement**: Apply coupons at checkout with validation
   - **Current State**: Checkout page exists, no coupon support
   - **Impact**: Cannot redeem coupons
   - **Location**: Enhance `app/marketplace/checkout/page.tsx`

3. **Lightning Deal Timers**
   - **Spec Requirement**: Countdown timers on PLP/PDP
   - **Current State**: Not implemented
   - **Impact**: No urgency signals
   - **Location**: Component updates for product cards & PDP

4. **Deal Eligibility Checks**
   - **Spec Requirement**: Inventory, review rating, account health gates
   - **Current State**: Not implemented
   - **Impact**: Cannot enforce deal quality
   - **Location**: `services/souq/deals-service.ts`

5. **Seller Central Deal Creation UI**
   - **Spec Requirement**: Interface to submit deals with eligibility preview
   - **Current State**: Not implemented
   - **Impact**: Sellers cannot participate
   - **Location Needed**: `app/marketplace/seller-central/deals/page.tsx`

---

### EPIC H: Reviews, Q&A, Moderation (70% Missing)

#### ✅ Strengths

- Review model complete with verified purchase tracking
- Basic review submission API exists

#### ❌ Missing Components

1. **Q&A System**
   - **Spec Requirement**: Product Q&A with seller + community answers, moderation
   - **Current State**: Not implemented
   - **Impact**: No pre-purchase questions
   - **Location Needed**:
     - Models: `server/models/souq/Question.ts`, `Answer.ts`
     - API: `/api/souq/qa/*`
     - PDP Q&A section

2. **Moderation Queue**
   - **Spec Requirement**: Admin queue for flagged content with NLP filters
   - **Current State**: Review model has `moderationStatus` field, no queue
   - **Impact**: Abuse not filtered
   - **Location Needed**:
     - `app/admin/souq/moderation/page.tsx`
     - `services/souq/moderation-service.ts`
     - Simple NLP filter (keyword + sentiment)

3. **Helpful Votes**
   - **Spec Requirement**: Buyers can vote reviews helpful
   - **Current State**: Not implemented
   - **Impact**: No quality signals
   - **Location**: Add to review display component

4. **PDP Review Integration**
   - **Spec Requirement**: Display reviews with averages, sort by recent/helpful
   - **Current State**: PDP exists, no review display
   - **Impact**: Social proof missing
   - **Location**: Enhance `app/marketplace/product/[slug]/page.tsx`

5. **Rate Limiting**
   - **Spec Requirement**: Prevent review spam (per buyer, per time period)
   - **Current State**: Not implemented
   - **Impact**: Abuse risk
   - **Location**: API middleware

---

### EPIC I: Settlement, Fees & Invoicing (50% Missing)

#### ✅ Strengths

- **Model/API Readiness (≈80%)**: Settlement schema, CRUD API, and pre-save fee calculations exist and align with Super Admin financial controls.
- **Payout Execution (≈10%)**: No automated payout actions, exports, or financial artifacts are generated; Super Admin currently lacks any dashboard to approve/reject cycles.

#### ❌ Missing Components

1. **Payout Engine**
   - **Spec Requirement**: Scheduled job per seller cycle (7/14/30 days), idempotent
   - **Current State**: Not implemented
   - **Impact**: No automated payouts
   - **Location Needed**:
     - `services/souq/settlement-service.ts` (enhanced)
     - Cron job scheduler
     - In-memory queue for settlement runs

2. **Fee Schedule Configuration**
   - **Spec Requirement**: Per-category referral %, FBF fees, closing fees, dispute fees
   - **Current State**: Not implemented
   - **Impact**: Cannot configure pricing
   - **Location Needed**:
     - Model: `server/models/souq/FeeSchedule.ts`
     - Admin UI: `app/admin/souq/fee-schedules/page.tsx`

3. **VAT Invoice Generation**
   - **Spec Requirement**: ZATCA-compliant PDF invoices
   - **Current State**: Not implemented
   - **Impact**: Non-compliant
   - **Location Needed**:
     - `lib/invoicing/zatca-adapter.ts`
     - PDF generation (pdfkit or similar)

4. **Settlement Console (Admin)**
   - **Spec Requirement**: Fee table management, manual adjustments, rollback
   - **Current State**: Not implemented
   - **Impact**: Cannot manage payouts
   - **Location Needed**: `app/admin/souq/settlement-console/page.tsx`

5. **Seller Payout Dashboard**
   - **Spec Requirement**: Payout statements, fee breakdowns, PDF downloads
   - **Current State**: Not implemented
   - **Impact**: Sellers cannot see earnings
   - **Location Needed**: `app/marketplace/seller-central/payouts/page.tsx`

6. **Finance Module Integration**
   - **Spec Requirement**: Journal entries to Finance for reconciliation
   - **Current State**: Not implemented
   - **Impact**: Cannot reconcile books
   - **Location**: Settlement service should publish events to Finance

7. **Tax Withholding & Reconciliation Exports**
   - **Spec Requirement**: WHT calculations per jurisdiction, downloadable CSV/PDF exports for Super Admin finance audits
   - **Current State**: No withholding logic, no bank/export adapters
   - **Impact**: Regulatory non-compliance and zero audit trail for payouts
   - **Location Needed**: `services/souq/settlement-service.ts`, `lib/finance/exporters/`

---

### EPIC J: Search, Ranking & Recommendations (60% Missing)

#### ✅ Strengths

- Basic search API exists (`/api/souq/search`)
- Product catalog view with search bar

#### ❌ Missing Components

1. **Search Index (OpenSearch/Meilisearch)**
   - **Spec Requirement**: Full-text index with facets, relevance tuning
   - **Current State**: Likely using MongoDB queries
   - **Impact**: Slow, poor relevance
   - **Location Needed**:
     - Service: `services/souq/search-service.ts`
     - Config: OpenSearch or Meilisearch connection
     - Indexing job on product changes

2. **Faceted Search**
   - **Spec Requirement**: Category, brand, price range, rating, badges, delivery speed filters
   - **Current State**: Basic filters in catalog view
   - **Impact**: Limited discoverability
   - **Location**: Enhance search UI and API to support facets

3. **Relevance Ranking**
   - **Spec Requirement**: Signals include Buy Box winner, rating, review count, delivery speed
   - **Current State**: Not implemented
   - **Impact**: Poor search results
   - **Location**: Search service scoring logic

4. **Recommendations**
   - **Spec Requirement**: Similar items (attribute-based), frequently bought together (co-occurrence)
   - **Current State**: Not implemented
   - **Impact**: No cross-sell
   - **Location Needed**:
     - `services/souq/recommendations-service.ts`
     - PDP component updates

5. **Search Analytics**
   - **Spec Requirement**: Track search performance (clicks, conversions, null results)
   - **Current State**: Not implemented
   - **Impact**: Cannot optimize search
   - **Location**: Analytics event tracking

---

### EPIC K: Reporting & Admin Consoles (90% Missing)

#### ❌ Almost All Missing

1. **Business Reports**
   - **Spec Requirement**: Sales, units, ASP, conversion, traffic by date/seller/category
   - **Current State**: Not implemented
   - **Impact**: No business intelligence
   - **Location Needed**:
     - `app/marketplace/seller-central/reports/business/page.tsx`
     - `app/admin/souq/reports/business/page.tsx`
     - `services/souq/reporting-service.ts`

2. **Inventory Health Reports**
   - **Spec Requirement**: Aging, excess, stranded inventory
   - **Current State**: Not implemented
   - **Impact**: Cannot optimize inventory
   - **Location Needed**: `app/marketplace/seller-central/reports/inventory/page.tsx`

3. **Ads Reports**
   - **Spec Requirement**: Full metrics suite (impressions, clicks, CTR, CPC, ACOS, ROAS)
   - **Current State**: Not implemented (ads not implemented)
   - **Impact**: No ad performance visibility
   - **Location**: Part of ads implementation

4. **Returns & Defects Reports**
   - **Spec Requirement**: Return rate by FSIN, reason codes, trends
   - **Current State**: Not implemented
   - **Impact**: Cannot identify quality issues
   - **Location Needed**: Admin + Seller reports

5. **Admin Consoles**
   - **Spec Requirement**: Policy Center, Dispute Center, IP/Counterfeit, Performance Thresholds
   - **Current State**: Basic admin page exists, no specialized consoles
   - **Impact**: Cannot administer marketplace
   - **Location Needed**:
     - `app/admin/souq/policy-center/page.tsx`
     - `app/admin/souq/disputes/page.tsx`
     - `app/admin/souq/ip-enforcement/page.tsx`
     - `app/admin/souq/performance-thresholds/page.tsx`

6. **CSV/PDF Export**
   - **Spec Requirement**: All reports exportable
   - **Current State**: Not implemented
   - **Impact**: Cannot share reports
   - **Location**: Report component export buttons

---

## Consumer Experience, Checkout & Support (Super Admin Critical)

Even though the Amazon-parity spec stresses seller tooling, the Super Admin also owns the full buyer journey. Currently that flow is largely absent.

### Status Snapshot

- **PDP / Media**: ✅ basic product display; ❌ no Buy Box, no review widget, no cross-sell.
- **Cart & Checkout**: ❌ missing entire flow (cart persistence, address book, payment capture, order confirmation).
- **Payments**: ❌ no PSP integration, no tokenization, no Super Admin settlement visibility.
- **Buyer Support**: ❌ no returns center UI, no A-to-Z claim portal, no live chat/help center.

### Required Work

1. **Consumer Checkout Stack** – Build `/souq/cart`, `/souq/checkout`, payment orchestration, and order confirmation emails with Super Admin monitoring hooks.
2. **Buyer Support Center** – Implement self-service returns, A-to-Z claims, chat/contact flows plus admin resolution consoles.
3. **PDP Enhancements** – Surface Buy Box winner, price history, reviews/Q&A, shipping promises.
4. **Super Admin SLA Dashboards** – Provide dashboards for customer support metrics (response time, refunds) so the platform owner can audit customer satisfaction.

Until these pieces exist with QA/HFV evidence, the marketplace cannot be deemed Amazon-parity from a Super Admin governance lens.

---

## Infrastructure & Integration Gaps

### Event Bus (NATS/Kafka)

- **Spec Requirement**: Inter-service communication via event bus
- **Current State**: Not implemented (placeholder mentioned in roadmap)
- **Impact**: Tight coupling, no async workflows
- **Location Needed**:
  - Service: `lib/events/event-bus.ts`
  - Publishers/subscribers in all services
  - Example topics: `order.placed`, `listing.price.updated`, etc.

### MongoDB + In-Memory Queue

- **Spec Requirement**: Caching + job queues (Buy Box recompute, repricer, settlement)
- **Current State**: Not configured
- **Impact**: No background jobs, no cache
- **Location Needed**:
  - Config: `lib/mongodb-client.ts`
  - Queues: `lib/queues/*`

### Payment Gateway Enhancements

- **Spec Requirement**: Partial refunds, chargeback webhooks
- **Current State**: Basic payment in checkout exists
- **Impact**: Cannot handle refunds properly
- **Location**: Enhance existing payment integration

### Carrier APIs

- **Spec Requirement**: Aramex, SMSA, SPL for label + tracking
- **Current State**: Not implemented
- **Impact**: Cannot fulfill orders
- **Location Needed**: `lib/carriers/*`

### ZATCA E-Invoicing

- **Spec Requirement**: Compliant VAT invoices for settlement
- **Current State**: Not implemented
- **Impact**: Tax compliance risk
- **Location Needed**: `lib/invoicing/zatca-adapter.ts`

---

## Appendix A – Automation Matrix (Super Admin Audit Template)

| EPIC / Capability      | Required Cron / Queue                                     | Owner           | Status         | HFV / Evidence             |
| ---------------------- | --------------------------------------------------------- | --------------- | -------------- | -------------------------- |
| Compliance (Brand/KYC) | `compliance-expiry-cron`, `brand-review-queue`            | Platform Ops    | ❌ Not built   | —                          |
| Account Health         | `account-health-recalc-cron`, `seller-enforcement-worker` | Seller Success  | ❌ Not built   | —                          |
| Buy Box / Pricing      | `buybox-recalc-cron`, `repricer-worker`                   | Marketplace Ops | ⚠️ Recalc only | Need HFV of job dashboards |
| Settlement             | `payout-cycle-cron`, `payout-export-worker`               | Finance         | ❌ Not built   | —                          |
| Returns & Claims       | `returns-aging-cron`, `a2z-queue`                         | CX Ops          | ❌ Not built   | —                          |

> Populate this matrix during each release review so Super Admins can verify automation readiness before enabling feature flags.

---

## Security & Quality Gaps

### Authentication & RBAC

- **Spec Requirement**: JWT on all APIs, RBAC (ADMIN, MARKETPLACE_ADMIN, SELLER_OWNER, etc.)
- **Current State**: Basic auth exists (auth.ts), unclear if roles enforced on Souq APIs
- **Impact**: Potential unauthorized access
- **Action**: Audit all `/api/souq/*` routes for role checks

### Rate Limiting

- **Spec Requirement**: MongoDB-based, 100 req/min default
- **Current State**: Not implemented
- **Impact**: Abuse risk
- **Location Needed**: Middleware in API routes

### Input Validation (Zod)

- **Spec Requirement**: All inputs validated with zod schemas
- **Current State**: Unclear implementation
- **Action**: Audit API routes for validation

### Audit Logging

- **Spec Requirement**: DOA-guarded actions (payouts, claims, fee changes)
- **Current State**: Not implemented
- **Impact**: No compliance trail
- **Location Needed**: Model `server/models/souq/AuditLog.ts` + service

### Testing

- **Spec Requirement**:
  - Unit tests (≥80% coverage for Buy Box, Ads, Settlement, Returns)
  - Integration tests (API flows)
  - E2E tests (Playwright: buyer journey, return, claim)
  - Load tests (k6: 500 RPS PLP, 50 RPS checkout, p95 < 600ms)
- **Current State**: Unknown coverage, no E2E or load tests mentioned
- **Action**: Test suite implementation

### Monitoring

- **Spec Requirement**: Prometheus + Grafana + alerts (ODR spikes, error rates, job backlog)
- **Current State**: Not implemented
- **Impact**: No observability
- **Location Needed**: Instrumentation + dashboards

---

## Navigation & UI Gaps

### Seller Central (Missing Entire Section)

**Spec Requirement**: Complete seller dashboard with 10+ pages

- Dashboard
- Inventory & Listings
- Pricing (Repricer)
- Orders
- Returns
- Advertising
- Deals & Coupons
- Account Health
- Brand Registry
- Reports
- Settings

**Current State**: Only vendor portal and product upload exist
**Location Needed**: `app/marketplace/seller-central/*`

### Buyer Section (Partial)

**Spec Requirement**: Deals, Coupons, Q&A, Reviews, Order Tracking, Returns Center
**Current State**: Order tracking exists, rest missing
**Location Needed**: `app/marketplace/buyer/*`

### Admin Souq Consoles (Mostly Missing)

**Spec Requirement**: 8+ specialized admin pages

- Category & Attribute Manager
- Policy & Restrictions
- Dispute Center (A-to-Z)
- Ads Console
- Campaign Events
- Settlement Console
- Performance Thresholds
- IP/Counterfeit

**Current State**: Basic admin page exists
**Location Needed**: `app/admin/souq/*`

---

## Data Migration & Rollout Gaps

### Migration Scripts

- **Spec Requirement**: FSIN backfill, seller import, inventory reconciliation, search reindex
- **Current State**: Not implemented
- **Impact**: Cannot migrate existing data
- **Location Needed**: `scripts/migrations/souq/*`

### Feature Flag Rollout Plan

- **Spec Requirement**: Phased rollout (ads → deals → buy_box → etc.)
- **Current State**: Flags defined but all OFF; no rollout documentation
- **Impact**: Unclear deployment strategy
- **Action**: Document rollout order and criteria

---

## Priority Matrix

### P0 - Critical for MVP (Complete These First)

| Feature                      | EPIC | Effort | Impact   | Notes                                |
| ---------------------------- | ---- | ------ | -------- | ------------------------------------ |
| **Inventory Service**        | D    | High   | Critical | Cannot sell without stock management |
| **FBF/FBM Fulfillment**      | D    | High   | Critical | Cannot ship orders                   |
| **Carrier Integrations**     | D    | Medium | Critical | Blocking fulfillment                 |
| **Returns Center**           | E    | Medium | Critical | Legal requirement                    |
| **Seller Central Dashboard** | B    | Medium | High     | Core seller experience               |
| **Account Health UI**        | B    | Low    | High     | Seller performance visibility        |
| **PDP Buy Box Display**      | C    | Low    | High     | Multi-seller value proposition       |
| **Search Facets**            | J    | Medium | High     | Discoverability                      |

### P1 - High Value (Complete Next)

| Feature                      | EPIC | Effort    | Impact    | Notes                 |
| ---------------------------- | ---- | --------- | --------- | --------------------- |
| **CPC Advertising System**   | F    | Very High | Very High | Major revenue stream  |
| **Settlement Payout Engine** | I    | High      | High      | Seller trust          |
| **Auto-Repricer**            | C    | Medium    | High      | Competitive advantage |
| **A-to-Z Claims**            | E    | High      | High      | Buyer protection      |
| **Coupon Engine**            | G    | Medium    | Medium    | Promotions driver     |
| **Reviews & Q&A UI**         | H    | Medium    | High      | Social proof          |
| **Brand Registry Workflow**  | A    | Medium    | Medium    | IP protection         |

### P2 - Quality & Scale (Complete After MVP)

| Feature                    | EPIC | Effort | Impact | Notes           |
| -------------------------- | ---- | ------ | ------ | --------------- |
| **Business Reports**       | K    | High   | Medium | Analytics       |
| **Compliance Engine**      | A    | Medium | Medium | Automation      |
| **Moderation Queue**       | H    | Medium | Medium | Content quality |
| **Recommendations**        | J    | Medium | Medium | Cross-sell      |
| **Admin Consoles**         | K    | High   | Medium | Operations      |
| **Buyer-Seller Messaging** | E    | Medium | Low    | Support channel |

### P3 - Nice-to-Have (Defer)

| Feature                      | EPIC | Effort | Impact | Notes             |
| ---------------------------- | ---- | ------ | ------ | ----------------- |
| **Inventory Health Reports** | K    | Low    | Low    | Optimization      |
| **Appeals Workflow**         | B    | Medium | Low    | Edge case         |
| **Lightning Deal Timers**    | G    | Low    | Low    | Marketing feature |

---

## Implementation Roadmap (Revised)

### Phase 1: MVP Foundation (8-12 weeks)

**Goal**: Enable basic multi-seller marketplace transactions

**Week 1-4: Inventory & Fulfillment**

- Inventory service (receive, reserve, release, health)
- Fulfillment service (FBF/FBM label generation, tracking)
- Carrier integrations (Aramex, SMSA, SPL)
- Order tracking UI enhancements

**Week 5-6: Returns**

- Returns service with auto-approval matrix
- Returns Center UI (buyer)
- RMA generation + label/pickup

**Week 7-8: Seller Central Core**

- Multi-step KYC onboarding UI
- Account Health dashboard
- Inventory & Listings management UI

**Week 9-10: Buy Box & Pricing**

- PDP Buy Box winner display + "Other offers" tab
- Auto-repricer worker (in-memory queue)
- Seller Central pricing UI

**Week 11-12: Search & Discovery**

- OpenSearch/Meilisearch integration
- Faceted search implementation
- Basic recommendations (similar items)

**Milestone**: Multi-seller marketplace with Buy Box, fulfillment, and returns operational

---

### Phase 2: Revenue & Protection (8-10 weeks)

**Goal**: Enable advertising revenue and buyer/seller protection

**Week 1-6: Advertising System (Most Complex)**

- Ads models (Campaign, AdGroup, Ad, AdTarget)
- CPC auction engine
- Budget management (in-memory queue)
- Ad placement rendering (Search, PLP, PDP)
- Campaign management UI (Seller Central)
- Ads reports

**Week 7-8: A-to-Z Claims**

- Claims service (evidence, decisions, funds hold)
- Buyer claims UI
- Seller response UI
- Admin dispute center

**Week 9-10: Settlement Engine**

- Fee schedule configuration
- Automated payout engine (cron + in-memory queue)
- VAT invoice generation (ZATCA)
- Settlement console (admin)
- Payout dashboard (seller)

**Milestone**: Advertising revenue live, buyer protection in place, automated settlements

---

### Phase 3: Quality & Scale (6-8 weeks)

**Goal**: Enhance quality, automation, and operations

**Week 1-2: Reviews & Q&A**

- Q&A system implementation
- Moderation queue + NLP filters
- PDP review/Q&A integration
- Helpful votes

**Week 3-4: Deals & Coupons**

- Coupon engine
- Checkout coupon application
- Lightning deal timers
- Seller Central deal creation UI

**Week 5-6: Brand Registry & Compliance**

- Brand registry workflow (seller submission → admin approval)
- Compliance engine with JSON rules
- Document expiry job
- Admin category/attribute manager

**Week 7-8: Reporting & Admin Tools**

- Business reports (sales, units, conversion, traffic)
- Inventory health reports
- Admin consoles (policy, disputes, IP, performance thresholds)
- CSV/PDF export

**Milestone**: Full-featured marketplace with quality controls and operations tools

---

### Phase 4: Infrastructure & Polish (4-6 weeks)

**Goal**: Production-ready infrastructure and quality gates

**Week 1-2: Event Bus & Background Jobs**

- NATS/Kafka setup
- Event publishers/subscribers in all services
- in-memory queue configuration
- All background jobs (Buy Box, repricer, settlement, inventory health)

**Week 3-4: Security & Compliance**

- RBAC audit on all Souq APIs
- Rate limiting middleware
- Zod validation on all inputs
- Audit logging implementation

**Week 5-6: Testing & Monitoring**

- Unit tests (≥80% coverage for critical services)
- Integration tests (API flows)
- E2E tests (Playwright: buyer journey, return, claim)
- Load tests (k6: 500 RPS targets)
- Prometheus + Grafana dashboards
- Alerts setup

**Milestone**: Production-ready system with observability and quality gates

---

## Estimated Total Effort

| Phase                            | Duration     | Team Size  | Story Points |
| -------------------------------- | ------------ | ---------- | ------------ |
| Phase 1: MVP Foundation          | 12 weeks     | 3 devs     | ~60 SP       |
| Phase 2: Revenue & Protection    | 10 weeks     | 3 devs     | ~50 SP       |
| Phase 3: Quality & Scale         | 8 weeks      | 3 devs     | ~40 SP       |
| Phase 4: Infrastructure & Polish | 6 weeks      | 3 devs     | ~30 SP       |
| **Total**                        | **36 weeks** | **3 devs** | **~180 SP**  |

**Note**: Original spec estimated 6-12 months; with foundation already 35% complete, realistic timeline is **8-9 months** with 3-person team working full-time.

---

## Recommendations

### Immediate Actions (This Week)

1. **Enable Feature Flags in Development**

   ```bash
   # .env.local
   SOUQ_FEATURE_BUY_BOX=true
   SOUQ_FEATURE_ACCOUNT_HEALTH=true
   ```

2. **Set Up in-memory queue**
   - Install dependencies: `pnpm add mongodb`
   - Configure connection: `lib/mongodb-client.ts`
   - Create first queue: Buy Box recompute

3. **Create Seller Central Skeleton**
   - `app/marketplace/seller-central/layout.tsx`
   - Navigation structure
   - Placeholder pages for all 10+ sections

4. **Inventory Service MVP**
   - Start with receive/reserve/release endpoints
   - Link to existing Order model
   - Test with manual API calls

### Strategic Decisions Needed

1. **Search Engine Choice**
   - OpenSearch (AWS-managed) vs Meilisearch (self-hosted)
   - Recommendation: Meilisearch for simplicity in MVP

2. **Event Bus Choice**
   - NATS (lightweight) vs Kafka (enterprise-grade)
   - Recommendation: NATS for MVP, can migrate to Kafka later

3. **Ads vs Other Features Priority**
   - Ads are 100% missing but represent major revenue
   - Can defer to Phase 2 if need to ship MVP faster
   - Decision: Follow proposed roadmap (MVP first, ads in Phase 2)

4. **Third-Party vs Custom**
   - ZATCA e-invoicing: Use library vs custom
   - Carrier integrations: Direct API vs aggregator
   - Recommendation: Use libraries/aggregators where available

---

## Success Metrics (When Complete)

### Technical KPIs

- [ ] API p95 latency < 600ms
- [ ] Search p95 < 300ms
- [ ] Checkout success rate > 95%
- [ ] System uptime > 99.9%
- [ ] Zero data loss events
- [ ] Settlement accuracy 100%
- [ ] Unit test coverage ≥ 80%

### Business KPIs

- [ ] Multi-seller listings per FSIN > 1.5 avg
- [ ] Buy Box winner rotation > 20% weekly
- [ ] Advertising ROAS > 3.0
- [ ] Return rate < 10%
- [ ] Seller NPS > 50
- [ ] GMV growth month-over-month

---

## Conclusion

The Fixzit Souq marketplace has **excellent foundational architecture** with well-designed models, a complete Buy Box algorithm, and feature flag infrastructure. However, **critical user-facing implementations are missing** across most EPICs, particularly:

- **Inventory & Fulfillment (90% missing)** - Blocks order fulfillment
- **Advertising System (100% missing)** - Major revenue stream absent
- **Seller Central UI (80% missing)** - Poor seller experience
- **Returns & Claims (70% missing)** - Legal and trust issues

**Recommended Path**: Follow revised 4-phase roadmap prioritizing MVP foundation (inventory, fulfillment, returns, seller UX) before revenue features (ads, advanced reports). Additionally, unblock the **consumer checkout/support journey**, stand up the **automation matrix jobs**, and attach **QA/HFV artifacts** for each EPIC so Super Admins can safely enable feature flags. With focused effort, a **functional multi-seller marketplace can launch in 3-4 months**, with full Amazon-parity features in **8-9 months** once these governance gates are met.

---

**Generated**: November 15, 2025  
**Analyst**: GitHub Copilot  
**Review Status**: Ready for Engineering Review  
**Next Step**: Stakeholder sign-off on Phase 1 priorities
