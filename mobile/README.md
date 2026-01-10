# Fixzit Mobile Applications

This directory contains the foundation for native mobile applications.

## Status: FOUNDATION COMPLETE [AGENT-0031]

The web platform includes all mobile infrastructure requirements:
- ✅ PWA Service Worker (`public/sw.js`) - 743 lines
- ✅ IndexedDB offline storage (`lib/offline/indexeddb.ts`)
- ✅ Offline photo capture (`lib/offline/photo-capture.ts`)
- ✅ Shared TypeScript types (`mobile/shared-types/`)
- ✅ Mobile-optimized API routes (`app/api/` with lean responses)

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    React Native Apps                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Technician  │    Tenant    │    Owner     │    Corporate   │
│     App      │     App      │     App      │      App       │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬────────┘
       │              │              │               │
       └──────────────┴──────────────┴───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Shared Library   │
                    │   mobile/shared   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Fixzit API      │
                    │   /api/*          │
                    └───────────────────┘
```

## Applications Planned

| App | Target Users | Priority | Store Listing |
|-----|--------------|----------|---------------|
| **Technician App** | Field technicians | P1 | App Store + Google Play |
| **Tenant App** | Property tenants | P2 | App Store + Google Play |
| **Owner App** | Property owners | P3 | App Store + Google Play |
| **Corporate App** | Enterprise managers | P4 | Enterprise MDM |

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **State**: Zustand + React Query
- **Offline**: WatermelonDB (SQLite-based)
- **Push**: Firebase Cloud Messaging + OneSignal
- **Auth**: JWT + Secure storage

## Getting Started

### Prerequisites

```bash
# Install Node.js 18+
node --version

# Install Expo CLI
npm install -g expo-cli

# Install React Native CLI (optional, for ejected apps)
npm install -g react-native-cli
```

### Create New App

```bash
# Create technician app
cd mobile
npx create-expo-app@latest technician-app --template expo-template-blank-typescript

# Navigate to app
cd technician-app

# Install dependencies
npm install

# Start development
npm start
```

### Shared Types

Import shared types from the web monorepo:

```typescript
// In React Native app
import type { 
  WorkOrder,
  WorkOrderStatus,
  WorkOrderPriority 
} from '@fixzit/shared-types/work-order';

import type {
  MobileUser,
  AuthTokens
} from '@fixzit/shared-types/auth';
```

## API Endpoints

The existing Fixzit API is mobile-ready:

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/mobile/login` | Mobile OTP login |
| `GET /api/work-orders?lean=true` | Work orders (minimal response) |
| `POST /api/work-orders/[id]/status` | Status transitions |
| `POST /api/work-orders/[id]/attachments` | Photo uploads |
| `GET /api/fm/inspections` | Inspection list |
| `POST /api/fm/inspections/[id]/sync` | Offline sync |

## Offline Strategy

1. **WatermelonDB** for local SQLite storage
2. **Queue mutations** when offline
3. **Sync on reconnect** with conflict resolution
4. **IndexedDB patterns** from web can be reused

## File Structure (Planned)

```
mobile/
├── README.md                 # This file
├── shared-types/             # Shared TypeScript types
│   ├── index.ts
│   ├── auth.ts
│   ├── work-order.ts
│   └── ...
├── technician-app/           # Technician React Native app
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── screens/
│       ├── components/
│       ├── services/
│       └── navigation/
├── tenant-app/               # Tenant app (future)
└── owner-app/                # Owner app (future)
```

## Development Roadmap

### Phase 1: Foundation (4h) ✅ COMPLETE
- [x] Shared types extracted
- [x] Mobile README
- [x] API documentation

### Phase 2: Technician App MVP (40h)
- [ ] Expo project setup
- [ ] Authentication flow (OTP)
- [ ] Work order list screen
- [ ] Work order detail screen
- [ ] Photo capture + upload
- [ ] Offline sync
- [ ] Push notifications

### Phase 3: Tenant App (30h)
- [ ] Expo project setup
- [ ] Maintenance request form
- [ ] Request status tracking
- [ ] Payment integration
- [ ] Communication features

### Phase 4: Owner App (30h)
- [ ] Portfolio dashboard
- [ ] Financial reports
- [ ] Document management
- [ ] Tenant communication

### Phase 5: App Store Release (16h)
- [ ] App Store assets
- [ ] Privacy policy
- [ ] Apple review process
- [ ] Google Play review process

## Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [WatermelonDB](https://nozbe.github.io/WatermelonDB/)
- [Fixzit API Documentation](../docs/API.md)
