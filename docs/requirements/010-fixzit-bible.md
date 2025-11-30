# Fixzit Bible

The Fixzit Bible serves as the canonical articulation of the product mission, cross-cutting non-functional requirements, and SMART must-pass gates that apply to every release.

## Mission & North Star Metrics

- **Mission**: Empower households and small businesses to resolve maintenance issues within 24 hours by connecting them with vetted professionals and guided DIY flows.
- **North Star**: Percentage of tickets resolved within the SLA window with a satisfaction rating of 4.5/5 or higher.
- **Supporting KPIs**: Conversion from intake to booking, DIY completion rate, and repeat engagement within 30 days.

## Experience Pillars

1. **Clarity** — Every screen must communicate next steps in one sentence or less and expose contextual help.
2. **Confidence** — Show trust signals (licenses, reviews, guarantees) before asking for commitment.
3. **Momentum** — Never strand users; always provide a primary action and secondary escape hatch.

## Global UX Requirements (Must-Pass)

- Primary CTAs use the `brand` button style and include descriptive verbs (e.g., “Book Pro Now”).
- Loading states must appear for any operation exceeding 500ms, using the shared spinner component.
- Empty states must include: succinct headline, supportive body copy, and a recommended next action.
- All forms must support inline validation with actionable error messages.

## Engineering Requirements (Must-Pass)

- Feature flags gate any net-new functionality and default to `off` in production until QA sign-off.
- Telemetry must emit `interaction`, `error`, and `success` events with consistent `feature` and `actor` metadata.
- Accessibility baseline: semantic HTML, focus management for modals, and minimum 4.5:1 contrast.
- Tests: unit coverage for core logic, integration test for critical flows, and snapshot for visual regressions.

## Release Checklist

1. Confirm requirements mapping and validation in the PR template.
2. Update relevant requirement digests if behavior deviates from written expectations.
3. Attach recordings of new flows in the QA handoff and log them in the verification summary.

## 5.1 Dynamic Top Bar (STRICT v4)

The Dynamic Top Bar is the single, global navigation surface for Fixzit Enterprise. It mounts once inside `app/layout.tsx`, locks the Top Bar → Sidebar → Content structure, and may only be touched for bug fixes. UX expectations:

- **Module awareness & routing** – Module scope is inferred from the URL (`/fm` → Facility Management, `/marketplace/real-estate` → Aqar, etc.). All search results, quick actions, KPIs, and badging respect that scope without leaking cross-tenant data.
- **Fixed apps** – App Switcher always exposes FM, Fixzit Souq (materials marketplace), and Aqar Souq (real estate). Availability is filtered by subscription tier + RBAC, and the last-selected app is persisted per tenant and per user.
- **Element order (LTR, mirrored for RTL)** – Brand block (tenant logo + Fixzit logo + “Fixzit Enterprise” + module badge), App Switcher, Top Mega Menu (mirrors sidebar items and remembers collapsed state), Global Search (module-scoped, ⌘/Ctrl+K palette, debounced `/api/search` contract), Quick Actions (role-aware), Notifications inbox, Language selector (STRICT v4 flags/native/ISO, instant RTL/LTR), Currency selector, and User menu (profile, role switch, tenant switch, dark mode, settings, sign out).
- **Preferences** – Mega menu collapse state, language, currency, theme, last search scope, and palette saved searches are all stored in `localStorage` with composite keys of `{tenantId}:{userId}` so multiple orgs/users can share a browser without clobbering each other.
- **Design tokens** – Primary `#0061A8`, Secondary `#00A859`, Accent `#FFB400`, neutral ramps (#F9FAFB/#FFFFFF for light, #111827/#1F2937 for dark), status colors (Success #16A34A, Warning #FACC15, Error #DC2626), and typography stacks Inter/Nunito Sans with 24–32px rhythm. Dark mode uses slate surfaces and bright accents; RTL mirrors the full layout with sidebar on the right.
- **Search contract** – `/api/search` uses Mongo aggregation + `$text`, debounces input by 250 ms, and returns a normalized payload `{ id, entity, title, subtitle, href }` per entity (work orders, properties, listings, products, etc.). Palette saved searches and quick actions share the same data plane.
- **RBAC & tenancy** – All menus, quick actions, notifications, and palette actions are filtered by role and tenant subscription. Super Admin sees everything; technicians and vendors only see modules granted to them.
- **QA gates** – Releases must provide the Halt–Fix–Verify bundle: zero console/log errors, RTL/dark mode screenshots taken ≥10s apart, scoped search/quick actions verified per module and role, and a root-cause/fix summary in the verification log.
