# Fixzit Platform - Technical Overview

## Project Information
- **Application Name**: Fixzit - Comprehensive Service Company
- **Version**: 2.0.26
- **Environment**: Production-ready Next.js application
- **Copyright**: © All rights reserved by Comprehensive Service Company 2025

## Technology Stack

### Frontend Framework
- **Next.js**: 15.5.4 with Turbopack bundler
- **React**: 19.x (App Router architecture)
- **TypeScript**: 5.x with strict mode enabled
- **Styling**: Tailwind CSS 3.x with custom theme variables

### Backend & API
- **Runtime**: Node.js with Next.js API routes
- **Authentication**: NextAuth v5 beta (5.0.0-beta.29)
- **Database**: MongoDB with Mongoose ODM
- **API Pattern**: RESTful API routes in `/app/api/*`

### State Management
- **React Context API**: Custom contexts for global state
  - `ResponsiveContext`: RTL/LTR, responsive breakpoints
  - `FormStateContext`: Form dirty state tracking
  - `TopBarContext`: Navigation state
  - `TranslationContext`: i18n multilingual support

### Testing & Quality
- **Unit/Integration**: Vitest with React Testing Library
- **E2E Testing**: Playwright
- **Type Checking**: TypeScript with strict mode
- **Linting**: ESLint with Next.js config
- **CI/CD**: GitHub Actions (via workflows)

## Architecture Overview

### Application Structure
```
/app                 # Next.js App Router pages
  /api              # Backend API routes
  /(dashboard)      # Dashboard routes
  /(root)           # Public routes
  /admin            # Admin panel
  /login, /signup   # Auth pages
  
/components         # Reusable React components
/contexts          # React Context providers
/lib               # Utility libraries
/models            # MongoDB/Mongoose models
/services          # Business logic services
/hooks             # Custom React hooks
/types             # TypeScript type definitions
/public            # Static assets
```

### Key Features Implemented
1. **Multi-tenant Property Management**
   - Owner management
   - Tenant management
   - Contract management
   - Payment tracking

2. **Maintenance & Service Management**
   - Ticket system
   - Service provider management
   - Work order tracking

3. **Financial Management**
   - Invoice generation
   - Payment processing
   - Financial reporting
   - Installment tracking

4. **Real Estate Projects**
   - Project bidding system
   - Contractor management
   - Proposal management

5. **E-commerce Integration**
   - Product management
   - Order tracking
   - Online store

6. **Multi-language Support**
   - Arabic (RTL)
   - English (LTR)
   - Dynamic language switching

## Current Development Status

### Recent Fixes (PR #141)
- ✅ Removed duplicate auth requests (TopBar vs ClientLayout)
- ✅ Added SSR guards to ResponsiveContext
- ✅ Fixed hydration flash issues
- ✅ Replaced polling with event-driven form state tracking
- ✅ Fixed onSaveRequest duplicate listeners with formId filtering
- ✅ Standardized async test patterns

### Known Issues
- 40 test files with failures (not blocking production)
- Test suite needs comprehensive update

## Development Guidelines

### File Naming Conventions
- React Components: PascalCase (`TopBar.tsx`)
- Contexts: PascalCase with Context suffix (`FormStateContext.tsx`)
- Utils/Libs: camelCase (`auth.ts`)
- API Routes: lowercase with hyphens (`/api/auth/me`)

### Code Style
- **NOT using Python/Streamlit** (important: we are React/TypeScript)
- **NOT using PostgreSQL** (we use MongoDB)
- Server components by default, 'use client' when needed
- Custom hooks start with 'use' prefix
- Contexts provide both hook and direct access

### Database
- MongoDB connection via Mongoose
- Models in `/models` directory
- Schema validation with Mongoose schemas
- No SQL queries - use Mongoose methods

## Integration Points

### External Services (Planned)
- Payment gateways: Tap, MyFatoorah (Saudi market)
- SMS: Twilio or Taqnyat
- WhatsApp Business API
- Email: SendGrid or similar
- Maps: Google Maps API

### Authentication Flow
1. NextAuth handles session management
2. JWT-based authentication
3. Custom middleware for route protection
4. Role-based access control (RBAC)

## Deployment

### Production Environment
- **Platform**: Vercel (optimized for Next.js)
- **Database**: MongoDB Atlas
- **CDN**: Vercel Edge Network
- **Domain**: TBD

### Environment Variables Required
- `MONGODB_URI`: MongoDB connection string
- `NEXTAUTH_SECRET`: NextAuth encryption key
- `NEXTAUTH_URL`: Application URL
- Additional API keys for third-party services

## Performance Targets
- Lighthouse Score: 90+ (all metrics)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Core Web Vitals: All green

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- RTL support for Arabic language

---

**Note for AI Code Reviewers (like Gemini)**:
- This is a **Next.js/React/TypeScript** project, NOT Python/Streamlit
- We use **MongoDB**, NOT PostgreSQL
- We use **React Context API**, NOT Redux
- API routes are in `/app/api/*`, NOT Flask/FastAPI endpoints
- All code should be TypeScript/JavaScript, NOT Python
- Database queries use Mongoose, NOT SQLAlchemy or psycopg2
