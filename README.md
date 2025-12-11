# Fixzit

Complete Property & Facility Management Platform with Marketplace Integration.

![Version](https://img.shields.io/badge/version-2.0.27-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Tests](https://img.shields.io/badge/tests-2468%20passing-green)

## Overview

Fixzit is a comprehensive platform that combines:
- **Facility Management (FM)** - Work orders, maintenance, inspections
- **Property Management (Aqar)** - Listings, tenants, leases
- **Marketplace (Souq)** - E-commerce for B2B procurement
- **Human Resources (HR)** - Employee management, attendance, payroll
- **Finance** - Invoicing, budgets, expenses, payments
- **Applicant Tracking (ATS)** - Job postings, applications, hiring

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.6 |
| Database | MongoDB (Mongoose ODM) |
| Auth | NextAuth.js v5 |
| Styling | Tailwind CSS + Radix UI |
| Testing | Vitest + Playwright |
| Monitoring | OpenTelemetry + Sentry |
| Deployment | Vercel / Docker |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB 7+ (or MongoDB Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/fixzit/fixzit.git
cd fixzit

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
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
```

## Project Structure

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
├── components/            # React components
├── lib/                   # Utility functions
├── server/                # Server-side code
├── services/              # Business logic services
├── db/                    # Database models
├── i18n/                  # Internationalization (EN/AR)
├── tests/                 # Test suites
│   ├── unit/             # Vitest unit tests
│   ├── api/              # API route tests
│   ├── e2e/              # Playwright E2E tests
│   └── services/         # Service integration tests
└── docs/                  # Documentation
```

## Development

### Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm start                  # Start production server

# Testing
pnpm test                   # Run Vitest tests
pnpm test:e2e              # Run Playwright E2E tests
pnpm test:api              # Run API tests

# Quality
pnpm typecheck             # TypeScript type checking
pnpm lint                  # ESLint
pnpm lint:fix              # Fix lint issues

# i18n
pnpm i18n:build            # Generate translation dictionaries
pnpm scan:i18n:audit       # Audit translation coverage

# Security
node scripts/rbac-audit.mjs  # Audit API route authorization
```

### Testing

- **Unit Tests**: 2,468 tests across 247 files
- **E2E Tests**: 424 tests across 41 specs
- **Coverage Target**: 80%+

```bash
# Run all tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm vitest run tests/unit/path/to/test.ts

# Run E2E tests with UI
pnpm playwright test --ui
```

## Architecture

### Authentication & Authorization

- NextAuth.js v5 with JWT sessions
- Role-Based Access Control (RBAC)
- Multi-tenant via `organizationId`
- Middleware-enforced route protection

### API Design

- REST endpoints under `/api/*`
- GraphQL endpoint at `/api/graphql`
- Rate limiting on auth endpoints
- CSRF protection on state-changing requests

### Internationalization

- Full English (EN) and Arabic (AR) support
- RTL layout support
- 31,000+ translation keys
- Professional translations (no machine translation)

## Security

- HTTP-only session cookies
- CSRF token validation
- Input sanitization
- PII encryption in finance/HR modules
- Audit logging for sensitive operations

## Contributing

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

## License

Proprietary - All rights reserved.

---

**Last Updated**: December 2024  
**Maintained By**: Fixzit Engineering Team
