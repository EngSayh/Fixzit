# TODO FEATURE TRACKING
**Generated**: November 23, 2025  
**Last validated**: 2025-12-11  
**Purpose**: Track remaining TODO clusters and keep paths in sync with the current code layout  
**Status**: 📋 Ready for Sprint Planning

---

## 📊 SUMMARY

- **Active TODO clusters**: 1 (Aqar personalization backlog)  
- **Closed clusters**: Type-safety statics (5), boost pricing config, and 2 documentation/historical notes — all resolved and documented.  
- **Risk**: Low–medium (feature work only; type-safety debt was cleared)  
- **Impact**: Feature uplift only; no open safety or reliability debt in this list.

---

## 🎯 FEATURE TODOs (1 active)

### 1. User Personalization for Aqar Recommendations
**Location**: Backlog item `TODO-006` (see `docs/PENDING_MASTER.md`); current wrapper lives in `lib/aqar/recommendation.ts` and delegates to `services/aqar/recommendation-engine.ts`.  
**Priority**: 🟢 Low (Enhancement)  
**Effort**: 🔵 Medium (2–3 days)  
**Category**: Machine Learning / Personalization

**Current Behavior**  
Recommendations are based only on property attributes (location, type, price range) via `AqarRecommendationEngine.recommend()`.

**Proposed Enhancement**  
Personalize scoring using viewing history, favorites, and search patterns (collaborative/content-based filtering). Add A/B testing and metrics dashboard.

**Acceptance Criteria**
- [ ] Viewing history captured and stored
- [ ] Favorites influence scoring
- [ ] Search patterns influence results
- [ ] >10% CTR uplift on recommendations
- [ ] <200ms generation latency
- [ ] Opt-out / privacy controls

**Sprint Notes**  
Start with favorites weighting (quick win), then add view tracking, then ML model + A/B framework.

---

## ✅ CLOSED: TYPE-SAFETY DEBT (5)
- Legacy statics in `models/project.model.ts` and `models/aqarBooking.model.ts` were rehomed and fixed.  
- Canonical pattern documented in `docs/guides/TYPE_SAFETY_PATTERNS.md` (see `server/models/aqar/Booking.ts:642-750` for the live implementation).  
- No remaining `TODO(type-safety)` markers or `as unknown as` casts in the statics cluster.

---

## ✅ CLOSED: CONFIGURATION TODO
- Boost pricing now configurable via `server/models/aqar/Boost.ts` (`getPricing` reads `BOOST_*_PRICE_PER_DAY` with sane defaults).  
- No hardcoded prices remain; tenant isolation enforced through the model.

---

## ✅ CLOSED: DOCUMENTATION / HISTORICAL NOTES (2)
- Notes were moved out of code and captured in `docs/archived/HISTORICAL_NOTES_CLEANUP_2025-12-11.md` (SystemVerifier dynamic status + admin user password history).  
- UI now references the archive instead of inline historical comments.

---

## 🚀 IMPLEMENTATION ROADMAP (Personalization)

1) Foundation: Analytics collection schema, basic view tracking, activity logging service.  
2) Integration: Favorites + search history in scoring; preference extraction algorithm.  
3) Enhancement: Collaborative filtering; A/B testing; metrics dashboard.  
4) Optimization: Caching/indexing; privacy controls; docs/training.

---

## 📈 SUCCESS METRICS
- CTR on recommendations; time-to-discovery; engagement on recommended properties; conversion from recs.
- Targets: +10–15% CTR, -20% search time, +25% property views from recommendations.

---

## 💡 ALTERNATIVE APPROACHES
- Option A: Third-party recommender (Algolia/Elasticsearch) – speed vs. cost/control.  
- Option B: Rule-based weighting – quick win, low personalization.  
- Option C: Full ML pipeline – best long-term personalization, highest effort.

**Recommendation**: Start with Option B for speed, evolve to Option C once tracking data is available.
