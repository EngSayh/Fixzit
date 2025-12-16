# BACKLOG_AUDIT.md — Fixzit Pending Backlog Report

> **Extracted At**: 2025-12-16T15:15:00+03:00  \
> **Source File**: docs/PENDING_MASTER.md  \
> **Format**: v2.5 Pending Backlog Extractor

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Pending** | 22 |
| **P0 (Critical)** | 1 |
| **P1 (High)** | 3 |
| **P2 (Medium)** | 12 |
| **P3 (Low)** | 6 |
| **In Progress** | TEST-005 |

### By Category

| Category | Count |
|----------|-------|
| Documentation | 10 |
| Tests | 6 |
| Efficiency | 2 |
| Bug | 2 |
| Security | 1 |
| Ops | 1 |

---

## 🚨 Priority Snapshot

- **P0:** OPS-OTP-BYPASS — Production blocked by OTP bypass env var (env-guards.ts)
- **P1:** SEC-002 (tenant scope gaps); BUG-001 (process.env in client); DOC-102 (lib utilities missing JSDoc)
- **P2:** PERF-001; TEST-002; TEST-003; TEST-004; REF-001; DOC-101/103/104/105/106/108/109
- **P3:** PERF-002; TEST-001; TEST-005 (in progress); BUG-011; DOC-107; DOC-110

---

## 📝 Issue List (keys + titles)

| Key | Priority | Status | Title |
|-----|----------|--------|-------|
| OPS-OTP-BYPASS | P0 | open | Production blocked by OTP bypass env var |
| SEC-002 | P1 | open | Tenant scope missing across DB queries |
| BUG-001 | P1 | open | process.env accessed directly in client code |
| DOC-102 | P1 | open | Missing JSDoc for 51 lib utility modules |
| PERF-001 | P2 | open | N+1 BuyBoxService calls in auto-repricer |
| TEST-002 | P2 | open | Create HR module tests (employees CRUD, payroll) |
| TEST-003 | P2 | open | Create Finance module tests (invoices, payments, billing) |
| TEST-004 | P2 | open | Increase CRM module test coverage |
| REF-001 | P2 | open | Create CRM route handler tests |
| DOC-101 | P2 | open | Missing JSDoc for 7 API route handlers |
| DOC-103 | P2 | open | Missing JSDoc for 124 Mongoose model schemas |
| DOC-104 | P2 | open | Missing function-level JSDoc for issues CRUD |
| DOC-105 | P2 | open | Missing inline comments for ZATCA TLV encoding |
| DOC-106 | P2 | open | Missing README for backlog tracker feature |
| DOC-108 | P2 | open | Missing API endpoint documentation in OpenAPI spec |
| DOC-109 | P2 | open | Missing error response documentation for API routes |
| PERF-002 | P3 | open | Sequential updates in fulfillment/claims |
| TEST-001 | P3 | open | Increase Souq test coverage (checkout/fulfillment/repricer) |
| TEST-005 | P3 | in_progress | Increase Aqar module test coverage |
| BUG-011 | P3 | open | Add .catch() to notification chains |
| DOC-107 | P3 | open | Missing BacklogIssue interface documentation |
| DOC-110 | P3 | open | Missing deployment checklist for backlog tracker |

---

## 📌 Notes

- SSOT remains MongoDB Issue Tracker; this file is a derived snapshot from docs/PENDING_MASTER.md.
- New today: OPS-OTP-BYPASS recorded from instrumentation/env-guards (production outage cause), TEST-005 marked in-progress per latest session.
- DB import pending: localhost:3000 unavailable during curl check.

