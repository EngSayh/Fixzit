# Souq Marketplace - Quick Start Guide

> **Phase 0 Foundation Complete** ✅  
> Ready to begin implementation of 11 EPICs (180 story points, 48 weeks)

---

## 📋 What's Been Built (Phase 0)

### 1. **Planning & Architecture**
- ✅ Comprehensive 48-week roadmap → `SOUQ_MARKETPLACE_ROADMAP.md`
- ✅ 11 phased implementations (Catalog, Sellers, Listings, Inventory, Orders, Ads, Deals, Reviews, Settlement, Search, Reporting)
- ✅ Technical architecture (13 services, event bus, job queues)
- ✅ Risk analysis & mitigation strategies

### 2. **Feature Management**
- ✅ Feature flags system → `lib/souq/feature-flags.ts`
- ✅ 12 toggleable features (ads, deals, buy_box, settlement, etc.)
- ✅ Dependency checking (e.g., claims require returns)
- ✅ Environment variable overrides

### 3. **Core Utilities**
- ✅ FSIN generator → `lib/souq/fsin-generator.ts`
- ✅ 14-digit unique product identifiers with Luhn check digit
- ✅ Format: `FX-12345-67890-1`
- ✅ Validation & collision detection

### 4. **Database Schemas**
- ✅ Category model → `server/models/souq/Category.ts`
- ✅ Brand model → `server/models/souq/Brand.ts`
- ✅ Product model → `server/models/souq/Product.ts`
- ✅ Variation model → `server/models/souq/Variation.ts`

### 5. **Navigation Structure**
- ✅ Navigation YAML → `config/souq-navigation.yaml`
- ✅ 200+ menu items (Buyer, Seller Central, Admin, RFQ)
- ✅ Bilingual (English/Arabic)
- ✅ Feature flag guards & RBAC

### 6. **Configuration**
- ✅ Environment template → `env.example` (100+ variables)
- ✅ Feature flags, Redis, S3, Search, Event bus, Payments, Carriers, ZATCA, Monitoring

---

## 🚀 Next Steps (Phase 1: Catalog & Brand Registry)

### Immediate Actions (Before Development)

#### 1. Infrastructure Setup (1 day)

**Redis (Caching + BullMQ)**
```bash
docker run -d --name fixzit-redis -p 6379:6379 redis:7-alpine
echo "REDIS_URL=redis://localhost:6379" >> .env.local
```

**Meilisearch (Product Search)**
```bash
docker run -d --name fixzit-meilisearch -p 7700:7700 getmeili/meilisearch:latest
echo "MEILISEARCH_HOST=http://localhost:7700" >> .env.local
echo "MEILISEARCH_API_KEY=master_key_dev" >> .env.local
```

**MinIO (S3-compatible Storage)**
```bash
docker run -d --name fixzit-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=admin -e MINIO_ROOT_PASSWORD=fixzit2024 \
  minio/minio server /data --console-address ":9001"
  
echo "S3_ENDPOINT=http://localhost:9000" >> .env.local
echo "S3_ACCESS_KEY_ID=admin" >> .env.local
echo "S3_SECRET_ACCESS_KEY=fixzit2024" >> .env.local
echo "S3_BUCKET_NAME=fixzit-marketplace" >> .env.local
```

**NATS (Event Bus)**
```bash
docker run -d --name fixzit-nats -p 4222:4222 -p 8222:8222 nats:latest
echo "NATS_URL=nats://localhost:4222" >> .env.local
```

**All-in-One Docker Compose** (recommended)
```yaml
# Create docker-compose.souq.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  meilisearch:
    image: getmeili/meilisearch:latest
    ports:
      - "7700:7700"
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}  # Set in .env.souq: MEILI_MASTER_KEY=$(openssl rand -base64 32)
  
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=admin
      - MINIO_ROOT_PASSWORD=fixzit2024
    command: server /data --console-address ":9001"
  
  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"
```

```bash
docker-compose -f docker-compose.souq.yml up -d
```

#### 2. Install Dependencies
```bash
pnpm add bullmq ioredis meilisearch @aws-sdk/client-s3 nats
pnpm add -D @types/meilisearch
```

#### 3. Create Git Branch
```bash
git checkout -b feat/souq-marketplace-advanced
git add .
git commit -m "feat(souq): Phase 0 foundation complete

- Add comprehensive roadmap (11 phases, 180 SP)
- Implement feature flags system (12 flags)
- Create FSIN generator with Luhn check digit
- Add MongoDB schemas (Category, Brand, Product, Variation)
- Create navigation YAML (200+ menu items)
- Update environment template (100+ variables)"

git push origin feat/souq-marketplace-advanced
```

---

## 📖 Phase 1 Implementation Guide

### Week 1-2: Catalog Service (FSIN + Product Creation)

**Backend Tasks** (2 engineers):
1. Create API routes in `app/api/souq/catalog/`:
   - `POST /products` - Create product with auto-generated FSIN
   - `GET /products/:fsin` - Get product details
   - `PUT /products/:fsin` - Update product
   - `POST /products/:fsin/variations` - Add variations
   - `DELETE /products/:fsin` - Deactivate product

2. Implement validation:
   - Zod schemas for all inputs
   - Category-specific required attributes
   - Image upload to S3
   - Duplicate FSIN prevention

3. Background jobs (BullMQ):
   - Index product in Meilisearch on create/update
   - Generate thumbnails for images
   - Validate product data integrity

**Frontend Tasks** (1 engineer):
1. Create Seller Central pages:
   - `/marketplace/seller-central/products/add` - Product wizard
   - `/marketplace/seller-central/products` - Product list
   - `/marketplace/seller-central/products/:fsin/edit` - Edit form

2. Components:
   - ProductForm (title, description, images, attributes)
   - VariationManager (add/edit variations, bulk upload)
   - ImageUploader (drag-drop, S3 upload, preview)
   - AttributeSelector (dynamic based on category)

**Testing**:
- Unit tests: FSIN generation, validation schemas
- Integration tests: Product CRUD API flows
- E2E tests: Seller creates product with variations

---

### Week 3: Category & Attribute Manager

**Backend Tasks**:
1. Admin API routes in `app/api/souq/admin/categories/`:
   - `POST /` - Create category
   - `PUT /:id` - Update category
   - `DELETE /:id` - Deactivate category
   - `GET /tree` - Full hierarchy
   - `POST /attributes` - Define attributes

**Frontend Tasks**:
1. Admin console:
   - `/marketplace/admin/categories` - Tree view with drag-drop
   - Category CRUD modal
   - Attribute manager (required/optional per category)

2. Buyer-facing:
   - `/marketplace/categories` - Browse hierarchy
   - `/marketplace/categories/:slug` - Category landing page

---

### Week 4: Brand Registry

**Backend Tasks**:
1. Brand API routes:
   - `POST /api/souq/brands` - Submit brand registration
   - `POST /api/souq/brands/:id/documents` - Upload verification docs
   - `PUT /api/souq/admin/brands/:id/verify` - Approve/reject

2. IP protection enforcement:
   - Check gated brands on product listing
   - Auto-flag unauthorized brand usage

**Frontend Tasks**:
1. Seller Central:
   - `/marketplace/seller-central/brands/register` - Registration form
   - Upload documents (trademark, authorization letter)
   - Track verification status

2. Admin console:
   - `/marketplace/admin/brands` - Verification queue
   - Approve/reject with notes
   - Authorize sellers for gated brands

---

## 🧪 Testing Strategy

### Unit Tests (≥80% coverage)
```bash
# Run tests
pnpm test

# Coverage report
pnpm test:coverage
```

**Test Files**:
- `lib/souq/__tests__/fsin-generator.test.ts` - FSIN generation, validation
- `lib/souq/__tests__/feature-flags.test.ts` - Flag toggling, dependencies
- `server/models/souq/__tests__/Category.test.ts` - Category tree, breadcrumbs
- `server/models/souq/__tests__/Product.test.ts` - Compliance checks, search

### Integration Tests (API Flows)
```bash
pnpm test:integration
```

**Test Scenarios**:
- Seller creates product → FSIN generated → indexed in search
- Admin creates category → seller selects category → required attributes enforced
- Seller submits brand → admin approves → seller can list gated brand

### E2E Tests (Playwright)
```bash
pnpm test:e2e
```

**User Journeys**:
- Seller onboarding → create product → add variations → list
- Admin create category → manage attributes → set restrictions
- Buyer browse categories → search products → view PDP

---

## 📊 Key Metrics & Monitoring

### Development Metrics
- TypeScript errors: **0** (strict mode)
- ESLint warnings: **0**
- Test coverage: **Target ≥80%**
- Build time: **< 2 minutes**
- Bundle size: **Track with @next/bundle-analyzer**

### Performance Targets (Phase 1)
- Product creation: **< 500ms** (p95)
- Category tree load: **< 200ms** (p95)
- Search query: **< 300ms** (p95)
- Image upload (S3): **< 2s** for 5MB

### Business Metrics (Post-Launch)
- Seller onboarding rate: **Track weekly**
- Products listed: **Track daily**
- FSIN collisions: **Should be 0**
- Brand verification queue: **< 3 days SLA**

---

## 🔒 Security Checklist

### Authentication & Authorization
- [ ] JWT validation on all API routes
- [ ] RBAC checks (SELLER_OWNER, ADMIN, etc.)
- [ ] Rate limiting (100 req/min per user)
- [ ] API key rotation for integrations

### Data Validation
- [ ] Zod schemas for all inputs
- [ ] XSS prevention (HTML escaping)
- [ ] CSRF tokens on forms
- [ ] File upload validation (type, size, virus scan)

### Audit Logging
- [ ] Log all DOA-guarded actions (brand approval, compliance override)
- [ ] Track FSIN generation (detect patterns)
- [ ] Monitor failed auth attempts
- [ ] Alert on bulk operations (mass product delete)

---

## 🐛 Troubleshooting

### Common Issues

**1. FSIN Collisions**
```typescript
// Check for existing FSIN before saving
const exists = await SouqProduct.findOne({ fsin: metadata.fsin });
if (exists) {
  // Regenerate FSIN
  metadata = await generateUniqueFSIN();
}
```

**2. Feature Flag Not Working**
```bash
# Check environment variables
echo $SOUQ_FEATURE_ADS

# Reset flags in code
import { resetFeatureFlags } from '@/lib/souq/feature-flags';
resetFeatureFlags(); // Reloads from env
```

**3. MongoDB Connection Issues**
```bash
# Check MongoDB is running
docker ps | grep mongo

# Test connection
mongosh "mongodb://localhost:27017/fixzit"
```

**4. S3 Upload Failures**
```bash
# Check MinIO is running
curl http://localhost:9000/minio/health/live

# Access console
open http://localhost:9001
# Login: admin / fixzit2024
```

---

## 📚 Documentation Links

### Internal Docs
- **Roadmap**: `SOUQ_MARKETPLACE_ROADMAP.md` (15,000 lines)
- **Phase 0 Summary**: `PHASE_0_FOUNDATION_SUMMARY.md` (1,500 lines)
- **API Contracts**: `docs/api/souq/` (to be created in Phase 1)
- **Database Schemas**: `docs/schemas/souq/` (to be created in Phase 1)

### External Resources
- [Next.js App Router](https://nextjs.org/docs/app)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [Meilisearch Documentation](https://www.meilisearch.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [NATS Documentation](https://docs.nats.io/)

---

## 👥 Team Contacts

### Roles & Responsibilities

**Backend Team** (2 engineers):
- API development (catalog-svc, seller-svc, admin-svc)
- MongoDB schema implementation
- BullMQ job processors
- Event bus integration

**Frontend Team** (1 engineer):
- Seller Central UI (product forms, brand registry)
- Admin console (category manager, brand verification)
- Buyer pages (category browse, PDP)

**QA Team** (1 engineer):
- Test automation (unit, integration, E2E)
- Manual testing (UAT, exploratory)
- Performance testing (load, stress)

**DevOps Team** (1 engineer):
- Infrastructure setup (Redis, Meilisearch, S3, NATS)
- Docker Compose management
- CI/CD pipeline updates
- Monitoring & alerting

---

## 🎯 Success Criteria (Phase 1)

### Must-Have (MVP)
- [ ] Sellers can create products with auto-generated FSIN
- [ ] Products support variations (color, size, etc.)
- [ ] Admins can create/manage category hierarchy
- [ ] Category-specific attributes enforced
- [ ] Sellers can submit brand registration
- [ ] Admins can approve/reject brands
- [ ] Products auto-flagged for compliance issues

### Nice-to-Have (Future Phases)
- [ ] Bulk product upload (CSV/Excel)
- [ ] Product templates for common categories
- [ ] Brand verification automation (API integrations)
- [ ] Advanced compliance rules (ML-based)

---

## 📅 Timeline Summary

| Phase | Duration | Story Points | Deliverables |
|-------|----------|--------------|--------------|
| **Phase 0** | ✅ Complete | 0 SP | Foundation, roadmap, schemas |
| **Phase 1** | 4 weeks | 20 SP | Catalog, categories, brands |
| **Phase 2** | 3 weeks | 15 SP | Seller onboarding, account health |
| **Phase 3** | 4 weeks | 18 SP | Listings, pricing, Buy Box |
| **Phase 4** | 5 weeks | 18 SP | Inventory, fulfillment (FBF/FBM) |
| **Phase 5** | 6 weeks | 20 SP | Orders, returns, A-to-Z claims |
| **Phase 6** | 6 weeks | 20 SP | Advertising (CPC auction) |
| **Phase 7** | 2 weeks | 10 SP | Deals & coupons |
| **Phase 8** | 3 weeks | 12 SP | Reviews, Q&A, moderation |
| **Phase 9** | 5 weeks | 16 SP | Settlement, fees, invoicing |
| **Phase 10** | 4 weeks | 14 SP | Search, ranking, recommendations |
| **Phase 11** | 4 weeks | 14 SP | Reporting & admin consoles |
| **Total** | **48 weeks** | **177 SP** | **Complete marketplace** |

---

## 🔗 Quick Links

### Development
- **Local App**: http://localhost:3000
- **Meilisearch Console**: http://localhost:7700
- **MinIO Console**: http://localhost:9001 (admin/fixzit2024)
- **NATS Monitoring**: http://localhost:8222

### Production (Future)
- **Marketplace**: https://fixzit.sa/marketplace
- **Seller Central**: https://fixzit.sa/marketplace/seller-central
- **Admin Console**: https://fixzit.sa/marketplace/admin

---

**Phase 0 Complete!** 🎉  
**Ready for Phase 1: Catalog & Brand Registry** 🚀

**Questions?** Check `SOUQ_MARKETPLACE_ROADMAP.md` or ask in `#marketplace-dev`
