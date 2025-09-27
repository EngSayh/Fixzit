# Pricing & Plans Requirements

Outlines the subscription and transactional pricing model for Fixzit customers.

## Tiers Overview
- **Starter** (free): limited to 3 active work orders per month, community support, DIY guides.
- **Growth** ($49/mo): unlimited work orders, priority scheduling, live chat support, 2 team members.
- **Scale** ($149/mo): all Growth features plus SLA-backed response, analytics dashboard, 10 team members.
- **Enterprise** (custom): bespoke integrations, dedicated CSM, unlimited team seats, contract pricing.

## Upgrade & Downgrade Rules (Must-Pass)
- Upgrades take effect immediately; prorate the current billing cycle.
- Downgrades schedule at the next renewal and warn users about feature loss.
- Enterprise quotes require approval workflow with finance and legal review.

## Billing Events
- Charge usage overages at $10 per additional active work order for Starter tier.
- Send invoice emails 7 days before renewal and on payment confirmation.
- Suspend accounts after 14 days of non-payment while preserving data for 90 days.

## In-Product Experience
- Display plan comparison on the Pricing page with feature checklist.
- Show contextual upgrade nudges when users hit tier limits (e.g., maximum active work orders).
- Provide a self-service cancellation flow with optional feedback survey.

## Reporting & Analytics
- Emit `billing.planChanged` events with `from`, `to`, `delta`, and `actor`.
- Daily job reconciles subscription status with payment processor and raises discrepancies.
- Finance dashboard shows MRR, churn, expansion, and cohort retention sourced from the billing API.
