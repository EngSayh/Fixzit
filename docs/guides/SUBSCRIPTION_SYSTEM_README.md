# Fixzit Enterprise - Subscription & Billing System

## ✅ Implementation Snapshot

### 🏗️ Data Models (MongoDB / Mongoose)

- ✅ `src/db/models/Module.ts` – module catalog and defaults
- ✅ `src/db/models/PriceBook.ts` – tiered seat pricing
- ✅ `src/db/models/DiscountRule.ts` – annual prepay discount control
- ✅ `src/db/models/Subscription.ts` – subscriber contracts + PayTabs snapshot
- ✅ `src/db/models/PaymentMethod.ts` – tokenised payment methods (PayTabs)
- ✅ `src/db/models/Benchmark.ts` – competitive pricing references
- ✅ `src/db/models/OwnerGroup.ts` – property owner automation
- ✅ `src/db/models/ServiceAgreement.ts` – e-signed agreements archive

### ⚙️ Services & Jobs

- ✅ `src/services/pricing.ts` – seat-tier pricing engine (USD/SAR)
- ✅ `src/services/checkout.ts` – subscription checkout + PayTabs HPP orchestration
- ✅ `src/services/paytabs.ts` – webhook normalisation, token storage, provisioning
- ✅ `src/services/provision.ts` – provisioning hook integration point
- ✅ `src/jobs/recurring-charge.ts` – daily recurring billing token runner

### 🔌 API Endpoints (Next.js App Router)

- ✅ `POST /api/checkout/quote` – instant pricing quote
- ✅ `POST /api/checkout/session` – generic checkout initialiser
- ✅ `POST /api/checkout/complete` – finalise checkout / poll status
- ✅ `POST /api/paytabs/callback` – PayTabs server callback handler
- ✅ `GET  /api/paytabs/return` – PayTabs hosted page return redirector
- ✅ `POST /api/subscribe/corporate` – FM company self-service flow
- ✅ `POST /api/subscribe/owner` – property owner self-service flow
- ✅ `POST /api/admin/billing/pricebooks` – create price books (Super Admin)
- ✅ `PATCH /api/admin/billing/pricebooks/:id` – update price books (Super Admin)
- ✅ `PATCH /api/admin/billing/annual-discount` – adjust annual discount (Super Admin)
- ✅ `GET /api/admin/billing/benchmark` – list competitor benchmarks
- ✅ `POST /api/admin/billing/benchmark/vendor` – add benchmark vendor
- ✅ `PATCH /api/admin/billing/benchmark/:id` – maintain benchmark entries

### 🌱 Seed Script

- ✅ `scripts/seed-subscriptions.ts` – modules, price books, discount, benchmark data

## 🚀 Getting Started

### 1. Environment (`.env.local`)

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/fixzit
MONGODB_DB=fixzit

# PayTabs Hosted Payment Page
PAYTABS_DOMAIN=https://secure.paytabs.sa
PAYTABS_PROFILE_ID=your_profile_id
PAYTABS_SERVER_KEY=your_server_key
APP_URL=https://your-app-domain

# Optional cron secret (for external schedulers)
CRON_SECRET=your_secure_random_string
```

### 2. Seed the Catalogue

```bash
npx tsx scripts/seed-subscriptions.ts
```

### 3. Run the App

```bash
npm run dev
```

## 🎯 Pricing Baseline (USD, per seat unless noted)

| Module                 | 1-5 | 6-20         | 21-50         | 51-100        | 101-200       |
| ---------------------- | --- | ------------ | ------------- | ------------- | ------------- |
| FM Core                | $22 | $22 × (1-8%) | $22 × (1-12%) | $22 × (1-18%) | $22 × (1-25%) |
| Preventive Maintenance | $8  | $8 × (1-8%)  | $8 × (1-12%)  | $8 × (1-18%)  | $8 × (1-25%)  |
| Marketplace Pro        | $5  | $5 × (1-8%)  | $5 × (1-12%)  | $5 × (1-18%)  | $5 × (1-25%)  |
| Analytics Pro          | $10 | $10 × (1-8%) | $10 × (1-12%) | $10 × (1-18%) | $10 × (1-25%) |
| Compliance & Legal     | $8  | $8 × (1-8%)  | $8 × (1-12%)  | $8 × (1-18%)  | $8 × (1-25%)  |
| HR Lite                | $6  | $6 × (1-8%)  | $6 × (1-12%)  | $6 × (1-18%)  | $6 × (1-25%)  |
| CRM Lite               | $5  | $5 × (1-8%)  | $5 × (1-12%)  | $5 × (1-18%)  | $5 × (1-25%)  |

> Annual prepay discount defaults to **15%** (editable by Super Admin). Seat counts above 200 trigger `requiresQuote`.

## 💳 PayTabs Integration Highlights

- Hosted Payment Page with `tokenise=2` for monthly plans
- Recurring token charge via `tran_class: 'recurring'`
- Token + masked card stored only (no PAN/CVV)
- Return + callback wired through `/api/paytabs/return` & `/api/paytabs/callback`

## 📊 Benchmark Dataset (editable)

- UpKeep – Essential $20, Premium $45 (global)
- MaintainX – Essential $20, Premium $65 (global)
- Hippo CMMS – Starter $35, Pro $75 (global)

## 🔒 Governance & Automation

- Super Admin only access to billing admin APIs
- Corporate vs Owner flows issue appropriately scoped subscriptions
- Owner metadata drives `OwnerGroup` provisioning after successful payment
- `provisionSubscriber` hook ready for RBAC entitlement wiring
- Daily recurring job charges tokenised monthly subscriptions

## ✅ Status

All subscription system requirements from governance V5/V6 + the updated billing charter are implemented and production ready.
