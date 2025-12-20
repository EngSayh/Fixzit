# System-Wide QA Audit Report
**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Commit**: $(git rev-parse --short HEAD)

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| API Routes | 372 | Audited |
| Routes with Auth | 272 | ✅ |
| Routes needing Auth Review | 100 | ⚠️ |
| Skipped Tests Removed | 460 | ✅ |
| Real Tests Remaining | 178 | ✅ |

---

## 1. Security Audit: Routes Without Auth Guards

The following 100 routes need auth review. Many may be intentionally public (aqar listings, chatbot, pricing) or use signature-based auth (payment callbacks).

### Critical (Need Immediate Fix)
app/api/pm/generate-wos/route.ts
app/api/metrics/circuit-breakers/route.ts
app/api/metrics/route.ts
app/api/payments/callback/route.ts
app/api/work-orders/sla-check/route.ts
app/api/owner/units/[unitId]/history/route.ts
app/api/owner/statements/route.ts
app/api/owner/properties/route.ts
app/api/owner/reports/roi/route.ts
app/api/fm/marketplace/vendors/route.ts
app/api/fm/marketplace/listings/route.ts
app/api/fm/marketplace/orders/route.ts
app/api/fm/system/roles/route.ts
app/api/fm/system/integrations/[id]/toggle/route.ts
app/api/fm/system/users/invite/route.ts
app/api/fm/properties/route.ts
app/api/fm/support/escalations/route.ts
app/api/fm/support/tickets/route.ts
app/api/fm/finance/expenses/route.ts
app/api/fm/finance/budgets/route.ts
app/api/fm/finance/budgets/[id]/route.ts
app/api/fm/reports/schedules/route.ts
app/api/fm/reports/route.ts
app/api/fm/reports/[id]/download/route.ts
app/api/fm/reports/process/route.ts
app/api/marketplace/checkout/route.ts
app/api/marketplace/search/route.ts
app/api/marketplace/rfq/route.ts
app/api/marketplace/cart/route.ts
app/api/marketplace/orders/route.ts
app/api/marketplace/categories/route.ts
app/api/marketplace/vendor/products/route.ts
app/api/superadmin/organizations/search/route.ts
app/api/superadmin/branding/route.ts
app/api/superadmin/logout/route.ts
app/api/superadmin/tenants/route.ts
app/api/superadmin/tenants/[id]/route.ts
app/api/superadmin/users/route.ts
app/api/superadmin/issues/route.ts
app/api/superadmin/issues/report/route.ts
app/api/superadmin/issues/import/route.ts
app/api/superadmin/impersonate/status/route.ts
app/api/superadmin/impersonate/route.ts
app/api/superadmin/login/route.ts
app/api/superadmin/session/route.ts
app/api/admin/discounts/route.ts
app/api/admin/price-tiers/route.ts
app/api/admin/billing/benchmark/route.ts
app/api/admin/billing/benchmark/[id]/route.ts
app/api/admin/billing/pricebooks/route.ts
app/api/admin/billing/pricebooks/[id]/route.ts
app/api/admin/billing/annual-discount/route.ts
app/api/qa/reconnect/route.ts
app/api/qa/alert/route.ts
app/api/qa/log/route.ts
app/api/checkout/quote/route.ts
app/api/checkout/session/route.ts
app/api/careers/apply/route.ts
app/api/integrations/linkedin/apply/route.ts
app/api/support/welcome-email/route.ts
app/api/graphql/route.ts
app/api/owners/groups/assign-primary/route.ts
app/api/finance/invoices/[id]/route.ts
app/api/souq/ads/impressions/route.ts
app/api/souq/ads/clicks/route.ts
app/api/souq/products/route.ts
app/api/souq/products/[id]/reviews/route.ts
app/api/souq/buybox/offers/[fsin]/route.ts
app/api/souq/buybox/winner/[fsin]/route.ts
app/api/souq/claims/route.ts
app/api/souq/claims/[id]/response/route.ts
app/api/souq/claims/[id]/evidence/route.ts
app/api/souq/claims/[id]/route.ts
app/api/souq/claims/[id]/decision/route.ts
app/api/souq/claims/[id]/appeal/route.ts
app/api/ats/settings/route.ts
app/api/ats/convert-to-employee/route.ts
app/api/ats/applications/route.ts
app/api/ats/applications/[id]/route.ts
app/api/ats/jobs/route.ts
app/api/ats/jobs/[id]/apply/route.ts
app/api/ats/jobs/[id]/publish/route.ts
app/api/ats/interviews/route.ts
app/api/ats/analytics/route.ts
app/api/ats/moderation/route.ts
app/api/billing/quote/route.ts
app/api/billing/charge-recurring/route.ts
app/api/billing/subscribe/route.ts
app/api/vendor/apply/route.ts
app/api/upload/scan-callback/route.ts

### Public/Semi-Public (Acceptable)
app/api/aqar/chat/route.ts
app/api/aqar/listings/search/route.ts
app/api/aqar/support/chatbot/route.ts
app/api/aqar/pricing/route.ts
app/api/copilot/chat/route.ts
app/api/copilot/stream/route.ts
app/api/copilot/profile/route.ts
app/api/copilot/knowledge/route.ts
app/api/marketplace/products/route.ts
app/api/marketplace/products/[slug]/route.ts
app/api/public/aqar/listings/route.ts
app/api/public/aqar/listings/[id]/route.ts
