# Fixzit Souq Marketplace Implementation Roadmap

**Project**: Advanced Marketplace Features for Fixzit Souq  
**Timeline**: 6-12 months (phased rollout)  
**Status**: Phase 0 - Foundation (In Progress)  
**Branch**: `feat/souq-marketplace-advanced`

---

## Executive Summary

Implementing enterprise-grade marketplace with:

- Multi-seller catalog with FSIN (Fixzit Standard Item Number)
- Buy Box competition algorithm
- Sponsored Products/Brands/Display ads (CPC auction)
- Fulfillment by Fixzit (FBF) + Fulfillment by Merchant (FBM)
- Returns Center with A-to-Z claims
- Settlement & payout engine
- Brand Registry & IP protection
- Account Health monitoring
- Full Arabic/English RTL support

---

## Release Train: Souq-Advanced-Features

### Feature Flags (lib/feature-flags.ts)

```typescript
export const SOUQ_FEATURES = {
  ads: boolean;              // Sponsored ads
  deals: boolean;            // Lightning/Event deals
  buy_box: boolean;          // Multi-seller competition
  settlement: boolean;       // Payout cycles
  returns_center: boolean;   // Self-service returns
  brand_registry: boolean;   // Brand verification
  account_health: boolean;   // Seller metrics
} as const;
```

---

## Phase Breakdown

### Phase 0: Foundation (Week 1-2) - 4 hours immediate

**Status**: ✅ IN PROGRESS
**Deliverables**:

- [x] Project roadmap document
- [ ] Feature flags infrastructure
- [ ] FSIN generator utility
- [ ] Base service architecture (catalog-svc, seller-svc, listing-svc)
- [ ] MongoDB schemas (Category, Brand, Product, Variation)
- [ ] Navigation YAML + sidebar updates
- [ ] Environment setup (Redis, NATS/Kafka placeholder)

**Critical Path**:

1. Create `lib/souq/fsin-generator.ts`
2. Create `server/models/souq/` directory structure
3. Create `app/marketplace/seller-central/` routes
4. Create `app/marketplace/admin/` enhanced routes
5. Update navigation config

---

### Phase 1: Catalog & Brand Registry (Week 3-6) - EPIC A (20 SP)

**Duration**: 4 weeks  
**Team**: 2 backend + 1 frontend

**Stories**:

- A1 (8 SP): FSIN generator + product/variation creation flow
- A2 (4 SP): Category & attribute manager in Admin
- A3 (5 SP): Brand registry submission + verification workflow
- A4 (3 SP): Compliance checks (policy flags + expiry reminders)

**Deliverables**:

- [ ] catalog-svc: 6 endpoints
- [ ] Admin UI: Category/attribute CRUD
- [ ] Seller Central: Brand registry submission
- [ ] Admin: Brand verification queue
- [ ] Compliance engine with JSON rules
- [ ] Daily cron for document expiry warnings

**Acceptance Criteria**:

- ✅ Creating product returns `{ id, fsin }`
- ✅ Restricted categories block until approval
- ✅ Brand registry gates listings for gated brands
- ✅ Compliance flags visible with DOA override logging

**MongoDB Collections**:

```typescript
// souq_categories, souq_attributes, souq_brands,
// souq_products, souq_variations, souq_compliance_flags
```

---

### Phase 2: Seller Onboarding & Account Health (Week 7-9) - EPIC B (15 SP)

**Duration**: 3 weeks  
**Team**: 2 backend + 1 frontend + 1 QA

**Stories**:

- B1 (7 SP): KYC onboarding (legal entity + bank + policies)
- B2 (8 SP): Account Health metrics + auto-actions + appeals

**Deliverables**:

- [ ] seller-svc: 3 endpoints
- [ ] KYC multi-step form (legal, VAT, bank, policies)
- [ ] Metrics calculation jobs (ODR, LateShip, Cancel, Tracking)
- [ ] Redis cache for health scores
- [ ] Account Health dashboard
- [ ] Auto-enforcement (suppress listings, pause ads, remove Buy Box)
- [ ] Appeals workflow

**Acceptance Criteria**:

- ✅ New seller completes onboarding → active state
- ✅ Health metrics update within 5 minutes
- ✅ Threshold violations trigger auto-actions
- ✅ Appeals restore privileges with audit log

**MongoDB Collections**:

```typescript
// souq_sellers, souq_kyc_documents, souq_health_metrics,
// souq_violations, souq_appeals
```

---

### Phase 3: Listings, Pricing & Buy Box (Week 10-13) - EPIC C (18 SP)

**Duration**: 4 weeks  
**Team**: 2 backend + 2 frontend

**Stories**:

- C1 (6 SP): Listings with min/max price guardrails
- C2 (5 SP): Auto-repricer to track lowest landed price
- C3 (7 SP): Buy Box scoring & winner selection

**Deliverables**:

- [ ] listing-svc: 3 endpoints
- [ ] Min/max price enforcement
- [ ] Auto-repricer worker (BullMQ)
- [ ] Buy Box algorithm (normalized scoring)
- [ ] PDP: Primary Buy Box + "Other offers" tab
- [ ] Redis caching (5-min TTL with invalidation)

**Buy Box Scoring**:

```typescript
score =
  0.4 * priceScore +
  0.25 * deliveryScore +
  0.2 * sellerScore +
  0.1 * stockScore +
  0.05 * fastBadge;
```

**Acceptance Criteria**:

- ✅ Repricer never violates min/max
- ✅ Deterministic Buy Box winner per snapshot
- ✅ Winner updates on price/speed/health changes
- ✅ "Currently unavailable" graceful handling

**MongoDB Collections**:

```typescript
// souq_listings, souq_offers, souq_pricing_rules,
// souq_buy_box_snapshots
```

---

### Phase 4: Inventory & Fulfillment (Week 14-18) - EPIC D (18 SP)

**Duration**: 5 weeks  
**Team**: 2 backend + 1 integration + 1 frontend

**Stories**:

- D1 (6 SP): Inventory receive/reserve/release; health
- D2 (7 SP): FBF & FBM modes with SLAs
- D3 (5 SP): Returns logistics & RTO

**Deliverables**:

- [ ] inventory-svc: 4 endpoints
- [ ] fulfillment-svc: 3 endpoints
- [ ] Carrier adapters: Aramex, SMSA, SPL
- [ ] Webhook handler for tracking updates
- [ ] SLA computation + Fast Badge logic
- [ ] Nightly inventory health jobs
- [ ] Order Tracking UI

**Acceptance Criteria**:

- ✅ FBF auto-generates label + tracking
- ✅ FBM requires seller tracking within SLA
- ✅ Buyer sees real-time carrier status
- ✅ No negative stock (reservations match orders)

**MongoDB Collections**:

```typescript
// souq_inventory, souq_reservations, souq_fulfillment_orders,
// souq_shipments, souq_carrier_events, souq_rto_requests
```

---

### Phase 5: Orders, Payments, Returns & Claims (Week 19-24) - EPIC E (20 SP)

**Duration**: 6 weeks  
**Team**: 3 backend + 2 frontend + 1 QA

**Stories**:

- E1 (8 SP): Cart → checkout → payment → order placement
- E2 (6 SP): Returns Center with rules matrix
- E3 (6 SP): A-to-Z claims + Support integration

**Deliverables**:

- [ ] orders-svc: 5 endpoints
- [ ] Payment integrations: Mada, STC Pay, Apple Pay
- [ ] Returns matrix config (auto-approve vs manual)
- [ ] RMA generation + shipping label/pickup
- [ ] support-svc: 3 endpoints
- [ ] Buyer-seller messaging
- [ ] Funds hold/reserve on claim

**Acceptance Criteria**:

- ✅ Buyer can start return from Returns Center
- ✅ Eligible cases auto-issue RMA and label
- ✅ Refund logic respects scan/inspection triggers
- ✅ Claims update settlement with audit trail

**MongoDB Collections**:

```typescript
// souq_orders, souq_carts, souq_payments, souq_returns,
// souq_rmas, souq_claims, souq_messages, souq_refunds
```

---

### Phase 6: Advertising System (Week 25-30) - EPIC F (20 SP)

**Duration**: 6 weeks  
**Team**: 2 backend + 2 frontend + 1 data analyst

**Stories**:

- F1 (8 SP): Campaigns, ad groups, targets & negatives
- F2 (7 SP): CPC second-price auction with budgets
- F3 (5 SP): Reports and placements

**Deliverables**:

- [ ] ads-svc: 4 endpoints
- [ ] Campaign/ad group management
- [ ] CPC auction engine with quality score
- [ ] Budget enforcement (daily caps, frequency)
- [ ] Placement rendering: Search, PLP, PDP
- [ ] Performance reports: impressions, clicks, CTR, CPC, ACOS, ROAS

**CPC Auction Algorithm**:

```typescript
// Second-price auction with quality score
const cost = (second.qualityScore * second.bid) / winner.qualityScore + 0.01;
```

**Acceptance Criteria**:

- ✅ Budgets not exceeded; clicks decrement budget
- ✅ Reports show accurate metrics
- ✅ Ads auto-disabled for out-of-stock/blocked items

**MongoDB Collections**:

```typescript
// souq_campaigns, souq_ad_groups, souq_ads, souq_targets,
// souq_bids, souq_ad_events, souq_ad_reports
```

---

### Phase 7: Deals & Coupons (Week 31-32) - EPIC G (10 SP)

**Duration**: 2 weeks  
**Team**: 1 backend + 1 frontend

**Deliverables**:

- [ ] Coupon engine (percent/amount, min basket, caps)
- [ ] Lightning/Event deals with timers
- [ ] Deal eligibility checks
- [ ] UI: Strikethrough pricing, countdown timers

**Acceptance Criteria**:

- ✅ Valid coupons apply and respect caps
- ✅ Lightning deals show timers + apply at checkout

**MongoDB Collections**:

```typescript
// souq_coupons, souq_deals, souq_deal_participants
```

---

### Phase 8: Reviews, Q&A, Moderation (Week 33-35) - EPIC H (12 SP)

**Duration**: 3 weeks  
**Team**: 2 backend + 1 frontend

**Deliverables**:

- [ ] Verified-purchase reviews only
- [ ] NLP abuse filter (simple keyword + sentiment)
- [ ] Q&A system with moderation queue
- [ ] Helpful votes
- [ ] PDP integration

**Acceptance Criteria**:

- ✅ Only delivered orders produce "Verified" reviews
- ✅ Flagged content hidden until moderated
- ✅ Buyers can vote helpful; Q&A appears on PDP

**MongoDB Collections**:

```typescript
// souq_reviews, souq_questions, souq_answers,
// souq_moderation_queue, souq_helpful_votes
```

---

### Phase 9: Settlement, Fees & Invoicing (Week 36-40) - EPIC I (16 SP)

**Duration**: 5 weeks  
**Team**: 2 backend + 1 finance integration

**Deliverables**:

- [ ] Fee schedules per category/seller tier
- [ ] Payout cycle engine (7/14/30 days)
- [ ] VAT invoice generation (ZATCA-compliant)
- [ ] PDF statement generation
- [ ] Finance module integration (journal entries)
- [ ] Settlement console for admin

**Acceptance Criteria**:

- ✅ Running settlement generates payouts with fee breakdown
- ✅ Compliant VAT invoices
- ✅ Finance receives reconciled journal entries

**MongoDB Collections**:

```typescript
// souq_fee_schedules, souq_transactions, souq_payouts,
// souq_invoices, souq_settlement_periods
```

---

### Phase 10: Search, Ranking & Recommendations (Week 41-44) - EPIC J (14 SP)

**Duration**: 4 weeks  
**Team**: 2 backend + 1 search specialist

**Deliverables**:

- [ ] OpenSearch/Meilisearch integration
- [ ] Full-text search with facets and sorts
- [ ] Relevance tuning
- [ ] Similar items recommendations (rule-based)
- [ ] Frequently-bought-together
- [ ] Search analytics

**Acceptance Criteria**:

- ✅ Search returns relevant results with facets
- ✅ Recommendations appear on PDP
- ✅ Analytics track search performance

**Search Index**:

```typescript
// souq_search_index (external: OpenSearch/Meilisearch)
```

---

### Phase 11: Reporting & Admin Consoles (Week 45-48) - EPIC K (14 SP)

**Duration**: 4 weeks  
**Team**: 2 backend + 1 frontend

**Deliverables**:

- [ ] Business reports (sales, units, ASP, conversion, traffic)
- [ ] Inventory health reports (aging, excess, stranded)
- [ ] Ads reports (complete metrics suite)
- [ ] Returns & defects reports
- [ ] Settlement reports
- [ ] Admin consoles: Policy, Disputes, IP, Settlement overrides

**Acceptance Criteria**:

- ✅ All reports support date ranges, filters, CSV/PDF export
- ✅ Admin consoles functional with DOA logging

**MongoDB Collections**:

```typescript
// souq_reports_cache, souq_admin_actions, souq_disputes
```

---

## Technical Architecture

### Services (Logical Domains)

```
catalog-svc      → Products, categories, brands, attributes
seller-svc       → KYC, onboarding, account health
listing-svc      → Multi-seller offers, pricing, Buy Box
inventory-svc    → Stock, reservations, health
orders-svc       → Cart, checkout, order lifecycle
fulfillment-svc  → Labels, tracking, SLAs, RTO
ads-svc          → Campaigns, auction, reports
deals-svc        → Coupons, lightning deals
reviews-svc      → Reviews, Q&A, moderation
settlement-svc   → Fees, payouts, invoices
search-rank-svc  → Search index, recommendations
support-svc      → Claims, messaging, disputes
reporting-svc    → Analytics, dashboards
compliance-svc   → Policy enforcement, IP
events-bus       → NATS/Kafka for inter-service communication
```

### Tech Stack

**Backend**:

- Node.js 20 + TypeScript (strict mode)
- Next.js 15 API routes
- MongoDB (Mongoose) - indexed, normalized
- Redis - caching + BullMQ for job queues
- NATS/Kafka - event bus

**Frontend**:

- Next.js 15 App Router
- Tailwind CSS + Fixzit design tokens
- shadcn/ui components
- lucide-react icons
- RTL support (Arabic/English)

**Infrastructure**:

- S3-compatible storage (media, documents)
- OpenSearch/Meilisearch (search)
- Carrier APIs: Aramex, SMSA, SPL
- Payment gateways: Mada, STC Pay, Apple Pay
- ZATCA e-invoicing adapter

---

## Domain Events

All services communicate via event bus with typed, versioned schemas:

```typescript
// Catalog events
catalog.product.created;
catalog.brand.verified;
catalog.compliance.flagged;

// Seller events
seller.onboarded;
seller.health.updated;
seller.violation.triggered;
seller.appeal.submitted;

// Listing events
listing.created;
listing.price.updated;
listing.suppressed;

// Inventory events
inventory.received;
inventory.reserved;
inventory.released;
inventory.health.updated;

// Order events
order.placed;
order.paid;
order.shipped;
order.delivered;
order.return.requested;
order.refunded;

// Fulfillment events
fulfillment.label.created;
fulfillment.tracking.updated;
fulfillment.rto.initiated;

// Ads events
ads.campaign.created;
ads.auction.won;
ads.spend.accrued;
ads.budget.exceeded;

// Settlement events
settlement.payout.generated;
settlement.fee.applied;
settlement.invoice.created;

// Review events
review.created;
review.flagged;
qa.question.posted;
qa.answer.posted;

// Support events
support.claim.opened;
support.claim.resolved;
support.message.sent;
```

---

## Security & Quality

### Authentication & Authorization

- JWT on all APIs
- RBAC enforcement: ADMIN, MARKETPLACE_ADMIN, SELLER_OWNER, SELLER_STAFF, BUYER, DISPUTE_AGENT, FINANCE_OPS
- Rate limiting: Redis-based, 100 req/min default

### Validation & Sanitization

- Zod schemas for all inputs
- HTML escaping for user content
- XSS/CSRF protection

### Audit Logging

- All DOA-guarded actions logged
- Fee changes, settlement overrides, claim decisions, IP takedowns
- MongoDB collection: `souq_audit_logs`

### Testing Requirements

- Unit tests: Jest, ≥80% coverage (Buy Box, Ads, Settlement, Returns)
- Integration tests: API flows via supertest
- E2E tests: Playwright (buyer journey, return, claim)
- Load tests: k6 (500 RPS PLP, 50 RPS checkout, p95 < 600ms)

### Monitoring

- Prometheus metrics
- Grafana dashboards
- Alerts: ODR spikes, error rates, slow endpoints, job backlog

---

## Migration & Rollout Strategy

### Data Migration

1. **FSIN Backfill**: Assign FSINs to existing products
2. **Seller Backfill**: Import sellers, assign health baselines
3. **Inventory Reconciliation**: Move stock to inventory-svc
4. **Search Reindex**: Full rebuild from new schemas

### Feature Flag Rollout Order

```
1. ads                 → Week 30
2. deals               → Week 32
3. buy_box             → Week 13
4. returns_center      → Week 24
5. settlement          → Week 40
6. account_health      → Week 9
7. brand_registry      → Week 6
```

### Deployment Checklist

- [ ] Migrations applied (staging → prod dry-run)
- [ ] Feature flags default OFF in production
- [ ] Unit + integration + E2E tests green
- [ ] Observability dashboards configured
- [ ] Rollback plan documented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Carrier integrations tested
- [ ] Payment gateway integrations tested
- [ ] ZATCA e-invoicing validated

---

## Risks & Mitigations

| Risk                                  | Impact | Mitigation                                       |
| ------------------------------------- | ------ | ------------------------------------------------ |
| Data migration issues                 | High   | Dry-run on snapshot; idempotent backfill scripts |
| Buy Box performance                   | Medium | Caching + precomputation; load testing           |
| Carrier/payment integration flakiness | Medium | Retries, DLQs, circuit breakers                  |
| Search index lag                      | Low    | Real-time + nightly rebuild; monitoring          |
| Settlement calculation errors         | High   | Extensive unit tests; manual review queue        |
| RBAC gaps                             | High   | Code review + security audit before each phase   |

---

## Success Metrics

### Business KPIs

- Seller onboarding rate
- GMV (Gross Merchandise Value)
- Average order value (AOV)
- Conversion rate
- Return rate
- Seller satisfaction (NPS)

### Technical KPIs

- API p95 latency < 600ms
- Search p95 < 300ms
- Checkout success rate > 95%
- System uptime > 99.9%
- Zero data loss events
- Settlement accuracy 100%

---

## Phase 0 Immediate Actions (Next 4 Hours)

### 1. Feature Flags Infrastructure

- [ ] Create `lib/souq/feature-flags.ts`
- [ ] Environment variables in `.env.local`
- [ ] Admin UI for flag management

### 2. FSIN Generator

- [ ] Create `lib/souq/fsin-generator.ts`
- [ ] Unit tests with collision detection

### 3. Base Service Architecture

- [ ] Create `server/services/souq/` directory
- [ ] Base service classes with error handling
- [ ] Event bus placeholder

### 4. MongoDB Schemas

- [ ] Create `server/models/souq/Category.ts`
- [ ] Create `server/models/souq/Brand.ts`
- [ ] Create `server/models/souq/Product.ts`
- [ ] Create `server/models/souq/Variation.ts`

### 5. Navigation Updates

- [ ] Create `config/souq-navigation.yaml`
- [ ] Update sidebar with Seller Central
- [ ] Update sidebar with enhanced Admin consoles
- [ ] Update sidebar with Buyer sections

### 6. Environment Setup

- [ ] Redis connection config
- [ ] BullMQ queue setup
- [ ] NATS/Kafka placeholder

---

**Status**: ✅ Roadmap Complete  
**Next Step**: Implement Phase 0 Foundation  
**Timeline**: 4 hours → then phase-by-phase over 6-12 months  
**Estimated Total Effort**: 180+ story points = 9-12 months with 3-person team
