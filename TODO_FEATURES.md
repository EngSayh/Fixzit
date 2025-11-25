# TODO FEATURE TRACKING
**Generated**: November 23, 2025  
**Last validated**: Today  
**Purpose**: Track *all* remaining TODO markers in production code with factual counts  
**Status**: 📋 Ready for Sprint Planning

---

## 📊 SUMMARY

- **Total TODO markers in production**: 9  
  - 1 feature enhancement (personalized recommendations)  
  - 5 type-safety cleanups (Mongoose statics/model exports)  
  - 1 configuration TODO (boost pricing)  
  - 2 documentation/historical notes  
- **Risk**: Low–medium (type-safety debt can hide runtime issues)  
- **Impact**: One UX feature; rest are quality/hardening items

---

## 🎯 FEATURE TODOs (1)

### 1. User Personalization for Aqar Recommendations
**Location**: `src/lib/aqar/recommendation.ts:103`  
**Priority**: 🟢 Low (Enhancement)  
**Effort**: 🔵 Medium (2–3 days)  
**Category**: Machine Learning / Personalization

**Current Behavior**  
Recommendations are based only on property attributes (location, type, price range).

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

## 🛡️ TYPE-SAFETY DEBT (5)
- `models/project.model.ts:522` – `setStatus` static is cast; define proper ProjectModel statics interface.
- `models/project.model.ts:542` – `recomputeBudget` static cast; same fix as above.
- `models/aqarBooking.model.ts:435` – `isAvailable` casts `this` to BookingModel.
- `models/aqarBooking.model.ts:453` – `createWithAvailability` casts `this` to BookingModel.
- `models/aqarBooking.model.ts:523` – Model export cast to BookingModel.

**Suggested fix**: Define reusable `BookingModel`/`ProjectModel` static interfaces and apply them instead of `as unknown as` casts.

---

## ⚙️ CONFIGURATION TODO (1)
- `models/aqarBoost.model.ts:10` – Boost pricing hardcoded; TODO notes org-level configurable pricing. Add settings source with sensible defaults and admin override.

---

## 📝 DOCUMENTATION / HISTORICAL NOTES (2)
- `components/SystemVerifier.tsx:32` – Documentation note about dynamic API integration.
- `app/api/admin/users/route.ts:180` – Historical note on removed plaintext passwords.

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
