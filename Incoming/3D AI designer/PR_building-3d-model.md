# PR: 3D Building Model Generator + Public Tour (Properties)

## Title
**feat(properties): add 3D building model generator & tour**

## Branch
`feature/building-3d-model`

## Base
`master` (adjust to `main` if that is your default branch)

## Commit
`f10f963` (single commit on this branch)

---

## Why
Fixizit needs a property-level 3D building viewer that can be generated from a simple spec (floors + apartments per floor) and then linked to real Unit records so property owners / agents can:

- Generate an initial building layout quickly (today: procedural generator)
- View/select apartments and rooms in 3D
- Assign/maintain unit metadata (unit number, bedrooms, bathrooms, halls, sqm, electricity/water meters)
- Publish a model for a tenant-facing "3D Tour" page

This PR adds a deterministic, offline procedural generator with stable contracts so we can swap the generator implementation later for an LLM/AI pipeline without changing UI or database contracts.

---

## What Changed
### ✅ Database
- Extended `Unit` to store 3D-link + metadata:
  - `designKey`, `unitNumber`, `bedrooms`, `bathrooms`, `halls`, `electricityMeter`, `waterMeter`
- Added `BuildingModel` table with versioning + status:
  - `Draft | Published | Archived`
  - Stores `input` (generation spec) and `model` (render-ready JSON)
- Added indices/constraints:
  - `@@unique([propertyId, designKey])`
  - `@@index([propertyId, floor])`

### ✅ APIs
- `GET /api/properties/:id/building-model`
  - Returns latest model record + units for property
- `POST /api/properties/:id/building-model`
  - Generates model from spec and (optionally) syncs Units using `designKey`
- `POST /api/properties/:id/building-model/publish`
  - Publishes the latest model record
- Added unit CRUD endpoint:
  - `GET/PATCH/DELETE /api/units/:id`
- Enhanced `POST /api/units`

All write actions are wrapped with `withAudit(...)`.

### ✅ UI
- Added a new Property tab: **“3D Building”** in `PropertyDetailView`
- Added 3D model UI:
  - Spec editor (floors, apartments/floor, templates)
  - Generate model (procedural)
  - Optional “Sync Units” to create/update Unit records
  - Select a unit/room in 3D
  - Edit unit details (sqm, beds, baths, halls, meter numbers)
  - Publish model
- Added public tour page:
  - `/properties/:id/tour` shows the latest **Published** model

### ✅ Dependencies
- Added 3D viewer dependencies:
  - `three`
  - `@react-three/fiber`
  - `@react-three/drei`

---

## Files Touched
- **New**
  - `app/api/properties/[id]/building-model/route.ts`
  - `app/api/properties/[id]/building-model/publish/route.ts`
  - `app/api/units/[id]/route.ts`
  - `app/components/building3d/BuildingViewer.tsx`
  - `app/components/building3d/BuildingTourClient.tsx`
  - `app/components/properties/tabs/BuildingModelTab.tsx`
  - `app/properties/[id]/tour/page.tsx`
  - `lib/buildingModel.ts`

- **Modified**
  - `db/schema.prisma`
  - `package.json`
  - `app/api/units/route.ts`
  - `app/components/properties/PropertyDetailView.tsx`
  - `app/components/navigation/TopMenuBar.tsx`
  - `app/components/properties/tabs/UnitsTab.tsx`
  - `app/components/properties/tabs/FinancialsTab.tsx`

---

## How To Test
> Note: Prisma schema file is located at `db/schema.prisma`. If your environment expects `prisma/schema.prisma`, pass `--schema db/schema.prisma`.

1) Install deps
```bash
pnpm install
```

2) Update DB schema
```bash
pnpm prisma migrate dev --name building_model_3d --schema db/schema.prisma
# or, for ephemeral/dev DB:
# pnpm prisma db push --schema db/schema.prisma

pnpm prisma generate --schema db/schema.prisma
```

3) Run the app
```bash
pnpm dev
```

4) UI flows
- Open a property details page: `/properties/:id`
- Go to **3D Building** tab
- Generate a model, keep **Sync Units** enabled
- Click a unit in the 3D model → edit metadata and save
- Publish the model
- Open `/properties/:id/tour` and confirm it shows the published model

---

## Notes / Known Follow-ups
- This PR uses a procedural generator (deterministic) and stores the result in `BuildingModel.model` as JSON.
- AI-backed generation can be plugged in later by swapping the implementation behind `generateBuildingModel(...)`.
- Privacy: Tour page is designed to avoid exposing meter numbers publicly.

---

## PR Checklist
- [ ] DB migration created/applied
- [ ] No runtime errors on `/properties/:id` and `/properties/:id/tour`
- [ ] Build passes (`pnpm build`)
- [ ] Generation, unit sync, unit edit, publish all verified
