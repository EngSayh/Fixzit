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
