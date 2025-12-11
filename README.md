# Fixzit

**Complete Property & Facility Management Platform with Marketplace Integration**

![Version](https://img.shields.io/badge/version-2.0.27-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Tests](https://img.shields.io/badge/tests-2524%20passing-green)
![E2E](https://img.shields.io/badge/e2e-424%20tests-green)
![Coverage](https://img.shields.io/badge/coverage-80%25+-brightgreen)

## 🏢 Overview

Fixzit is an enterprise-grade platform built for Saudi Arabian property and facility management companies. It combines multiple business domains into a unified, bilingual (EN/AR) solution.

### Core Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Facility Management (FM)** | Work order lifecycle management | SLA tracking, vendor assignment, preventive maintenance |
| **Property Management (Aqar)** | Real estate portfolio operations | Tenant management, lease tracking, rent collection |
| **Marketplace (Souq)** | B2B procurement platform | Product catalog, order management, vendor marketplace |
| **Human Resources (HR)** | Employee management | Payroll, attendance, performance reviews |
| **Finance** | Financial operations | Invoicing, budgets, expenses, TAP/PayTabs payments |
| **Applicant Tracking (ATS)** | Recruitment pipeline | Job postings, applications, interview scheduling |
| **CRM** | Customer relationship management | Leads, contacts, sales pipeline |
| **Compliance** | Regulatory compliance | Document management, audit trails |

## 🛠 Tech Stack

| Category | Technology | Notes |
|----------|------------|-------|
| **Framework** | Next.js 15 | App Router, Server Components |
| **Language** | TypeScript 5.6 | Strict mode enabled |
| **Database** | MongoDB 7+ | Mongoose 8.x ODM |
| **Auth** | NextAuth.js v5 | JWT sessions, RBAC |
| **UI** | Tailwind CSS + Radix UI | RTL support, design system |
| **Testing** | Vitest + Playwright | 2,524 unit + 424 E2E tests |
| **Monitoring** | OpenTelemetry + Sentry | Full observability |
| **SMS** | Taqnyat | CITC-compliant (Saudi Arabia) |
| **Payments** | TAP + PayTabs | Production-ready gateways |
| **Deployment** | Vercel / Docker | Edge-optimized |

## 📊 Project Status

| Metric | Value | Status |
|--------|-------|--------|
| **TypeScript Errors** | 0 | ✅ Clean |
| **ESLint Errors** | 0 | ✅ Clean |
| **Unit Tests** | 2,524 | ✅ All Passing |
| **E2E Tests** | 424 | ✅ All Passing |
| **Translation Coverage** | 100% | ✅ EN-AR Parity |
| **API Routes** | 354 | ✅ Documented |
| **Security Vulnerabilities** | 0 | ✅ Clean |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB 7+ (or MongoDB Atlas)

### Quick Start

```bash
# Clone and install
git clone https://github.com/fixzit/fixzit.git && cd fixzit
pnpm install

# Configure environment
cp .env.example .env.local

# Start development
pnpm dev
```

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
MONGODB_URI=mongodb://localhost:27017/fixzit

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# SMS (Saudi Arabia - Taqnyat only)
TAQNYAT_BEARER_TOKEN=your-token
TAQNYAT_SENDER_NAME=Fixzit

# Payments
PAYTABS_SERVER_KEY=your-key
PAYTABS_PROFILE_ID=your-profile
TAP_LIVE_SECRET_KEY=your-tap-key
TAP_ENVIRONMENT=live
```

## 📁 Project Structure

```
fixzit/
├── app/                    # Next.js App Router
│   ├── (app)/             # Main application layout
│   ├── (dashboard)/       # Dashboard layout
│   ├── api/               # API routes (354 endpoints)
│   ├── fm/                # Facility Management
│   ├── aqar/              # Property Management
│   ├── souq/              # Marketplace
│   ├── hr/                # Human Resources
│   └── finance/           # Finance module
├── components/            # React components (300+)
├── lib/                   # Utility functions
│   ├── auth/              # Authentication utilities
│   ├── config/            # Configuration (feature flags)
│   ├── payments/          # Payment integrations
│   └── sms-providers/     # SMS (Taqnyat only)
├── server/                # Server-side code
├── services/              # Business logic services
├── db/                    # Database models (Mongoose)
├── domain/                # Domain logic (FM, HR, etc.)
├── i18n/                  # Internationalization (EN/AR)
├── monitoring/            # Grafana dashboards & alerts
├── tests/                 # Test suites
│   ├── unit/             # Vitest unit tests (2,524)
│   ├── api/              # API route tests
│   ├── e2e/              # Playwright E2E (424)
│   └── services/         # Service integration tests
└── docs/                  # Documentation
    └── PENDING_MASTER.md  # Project status tracker
```
│   ├── e2e/              # Playwright E2E tests
│   └── services/         # Service integration tests
└── docs/                  # Documentation
```

## 💻 Development

### Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server

# Testing
pnpm test                   # Run Vitest tests (2,524 tests)
pnpm e2e                    # Run Playwright E2E tests (424 tests)
pnpm test:api              # Run API tests

# Quality
pnpm typecheck             # TypeScript type checking
pnpm lint                  # ESLint
pnpm lint:fix              # Fix lint issues
pnpm audit                 # Security audit

# i18n
pnpm i18n:build            # Generate translation dictionaries
node scripts/audit-translations.mjs  # Audit translation coverage

# Security
node scripts/rbac-audit.mjs  # Audit API route authorization
```

### Testing

| Type | Count | Framework |
|------|-------|-----------|
| Unit Tests | 2,524 | Vitest |
| E2E Tests | 424 | Playwright |
| API Tests | 200+ | Vitest |
| Coverage | 80%+ | v8 |

```bash
# Run all tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm vitest run tests/unit/path/to/test.ts

# Run E2E tests with UI
pnpm playwright test --ui
```

## 🏗 Architecture

### Authentication & Authorization

- NextAuth.js v5 with JWT sessions
- Role-Based Access Control (RBAC)
- Multi-tenant via `organizationId`
- Middleware-enforced route protection
- Super admin guards via `lib/auth/require-super-admin.ts`

### Feature Flags

Centralized feature flag system in `lib/config/feature-flags.ts`:

```typescript
import { isFeatureEnabled } from "@/lib/config/feature-flags";

if (isFeatureEnabled("graphqlApi")) {
  // Feature is enabled
}
```

### API Design

- REST endpoints under `/api/*` (354 routes)
- GraphQL endpoint at `/api/graphql` (optional)
- Rate limiting on auth endpoints
- CSRF protection on state-changing requests

### Internationalization

- Full English (EN) and Arabic (AR) support
- RTL layout support
- 2,953+ translation keys
- Professional translations (no machine translation)
- 100% EN-AR parity

## 🔒 Security

- HTTP-only session cookies
- CSRF token validation
- Input sanitization via Zod schemas
- PII encryption in finance/HR modules
- Audit logging for sensitive operations
- 0 known vulnerabilities (`pnpm audit`)

## 📈 Monitoring

### Grafana Dashboards
- System overview with SLIs
- SMS delivery metrics (Taqnyat)
- Payment gateway health (TAP/PayTabs)
- Work order SLA tracking

### Alerts
- Cron job heartbeat monitoring
- SMS queue depth alerts
- Payment webhook failure alerts
- Build/deployment rollback alerts

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Branch Naming

- `feat/<task-name>` - New features
- `fix/<issue-number>` - Bug fixes
- `agent/<timestamp>` - AI agent changes

### Commit Format

```
<type>(<scope>): <subject>

Types: feat, fix, docs, chore, refactor, test, perf, ci
```

### Pull Request Workflow

1. Create feature branch: `git checkout -b feat/<task-name>`
2. Make changes and test: `pnpm typecheck && pnpm lint && pnpm test`
3. Commit with conventional format
4. Push and create PR: `gh pr create --fill --draft`

## 📄 License

Proprietary - All rights reserved.

---

**Version**: 2.0.27  
**Last Updated**: December 2025  
**Maintained By**: Fixzit Engineering Team  
**Status**: ✅ Production Ready
