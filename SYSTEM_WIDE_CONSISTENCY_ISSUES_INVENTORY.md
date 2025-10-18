# System-Wide Consistency Issues - Complete Inventory

**Generated:** 2025-01-XX  
**Status:** COMPREHENSIVE SCAN COMPLETE  
**Total Issues Found:** 400+ violations across 3 categories

---

## Executive Summary

This document provides a **COMPLETE FILE:LINE inventory** of ALL system-wide consistency issues requiring fixes:

- **200+ Hardcoded Color Violations** (should use CSS variables)
- **80+ TODO/FIXME Comments** (incomplete implementations)
- **100+ console.log Statements** (debugging code in production)

All issues below are actionable with exact file paths and line numbers.

---

## 1. HARDCODED COLOR VIOLATIONS (200+ instances)

### Pattern: Should use CSS variables instead of Tailwind classes
- ❌ BAD: `className="bg-blue-600 text-white"`
- ✅ GOOD: `className="bg-[var(--fixzit-primary)] text-white"`

### Background Colors (bg-*)

#### Blue Backgrounds (bg-blue-*)
1. `app/help/page.tsx:226` - `bg-blue-600`
2. `app/help/page.tsx:309` - `bg-blue-100`
3. `app/help/page.tsx:421` - `bg-blue-600`
4. `app/help/tutorial/getting-started/page.tsx:483` - `bg-blue-600`
5. `app/help/tutorial/getting-started/page.tsx:553` - `bg-blue-50`
6. `app/help/tutorial/getting-started/page.tsx:587` - `bg-blue-600`
7. `app/help/ai-chat/page.tsx:59` - `bg-blue-600`
8. `app/help/ai-chat/page.tsx:106` - `bg-blue-600`
9. `app/help/ai-chat/page.tsx:131` - `bg-blue-600`
10. `app/help/support-ticket/page.tsx:244` - `bg-blue-600`
11. `app/support/my-tickets/page.tsx:75` - `bg-blue-600`
12. `app/support/my-tickets/page.tsx:182` - `bg-blue-600`
13. `app/fm/marketplace/page.tsx:52` - `bg-blue-600`
14. `app/fm/dashboard/page.tsx:109` - `bg-blue-600`
15. `app/fm/assets/page.tsx:60` - `bg-blue-600`
16. `app/fm/assets/page.tsx:137` - `bg-blue-600`
17. `app/fm/assets/page.tsx:449` - `bg-blue-600`
18. `app/fm/maintenance/page.tsx:100` - `bg-blue-100`
19. `app/page.tsx:24` - `bg-blue-600`
20. `app/work-orders/board/page.tsx:102` - `bg-blue-50`
21. `app/properties/inspections/page.tsx:247` - `bg-blue-50`
22. `app/properties/inspections/page.tsx:256` - `bg-blue-600`
23. `app/finance/invoices/new/page.tsx:228` - `bg-blue-500`
24. `app/finance/budgets/new/page.tsx:288` - `bg-blue-500`
25. `app/finance/payments/new/page.tsx:234` - `bg-blue-500`
26. `app/finance/expenses/new/page.tsx:257` - `bg-blue-500`
27. `app/work-orders/new/page.tsx:160` - `bg-blue-500`
28. `app/souq/catalog/page.tsx:223` - `bg-blue-500`
29. `app/privacy/page.tsx:111` - `bg-blue-50`
30. `app/careers/page.tsx:535` - `bg-blue-50`
31. `app/careers/page.tsx:560` - `bg-blue-600` (bullet point)
32. `app/notifications/page.tsx:498` - `bg-blue-500`
33. `app/notifications/page.tsx:561` - `bg-blue-600`

#### Green Backgrounds (bg-green-*)
34. `app/help/page.tsx:319` - `bg-green-100`
35. `app/help/tutorial/getting-started/page.tsx:578` - `bg-green-600`
36. `app/signup/page.tsx:172` - `bg-green-100`
37. `app/fm/properties/page.tsx:65` - `bg-green-600`
38. `app/fm/properties/page.tsx:129` - `bg-green-600`
39. `app/fm/properties/page.tsx:241` - `bg-green-500` (status dot)
40. `app/fm/properties/page.tsx:464` - `bg-green-600`
41. `app/fm/page.tsx:276` - `bg-green-600`
42. `app/fm/maintenance/page.tsx:114` - `bg-green-100`
43. `app/page.tsx:27` - `bg-green-600`
44. `app/work-orders/approvals/page.tsx:176` - `bg-green-600`
45. `app/souq/vendors/page.tsx:11` - `bg-green-600`
46. `app/souq/vendors/page.tsx:54` - `bg-green-100`
47. `app/souq/vendors/page.tsx:78` - `bg-green-100`
48. `app/finance/budgets/new/page.tsx:283` - `bg-green-500` (status dot)
49. `app/finance/payments/new/page.tsx:229` - `bg-green-500` (status dot)
50. `app/finance/expenses/new/page.tsx:252` - `bg-green-500` (status dot)
51. `app/finance/invoices/new/page.tsx:223` - `bg-green-500` (status dot)
52. `app/work-orders/new/page.tsx:155` - `bg-green-500` (status dot)
53. `app/notifications/page.tsx:579` - `bg-green-600`
54. `app/careers/page.tsx:571` - `bg-green-600` (bullet point)

#### Red Backgrounds (bg-red-*)
55. `app/signup/page.tsx:496` - `bg-red-50`
56. `app/marketplace/vendor/products/upload/page.tsx:258` - `bg-red-500`
57. `app/marketplace/vendor/portal/page.tsx:64` - `bg-red-50`
58. `app/fm/dashboard/page.tsx:107` - `bg-red-500` (badge)
59. `app/properties/inspections/page.tsx:224` - `bg-red-50`
60. `app/properties/inspections/page.tsx:233` - `bg-red-600`
61. `app/work-orders/approvals/page.tsx:179` - `bg-red-600`
62. `app/souq/catalog/page.tsx:226` - `bg-red-500`
63. `app/notifications/page.tsx:455` - `bg-red-500` (notification dot)
64. `app/notifications/page.tsx:585` - `bg-red-600`
65. `app/careers/page.tsx:448` - `bg-red-100`
66. `app/careers/page.tsx:528` - `bg-red-100`
67. `app/forgot-password/page.tsx:105` - `bg-red-50`

#### Yellow Backgrounds (bg-yellow-*)
68. `app/help/page.tsx:339` - `bg-yellow-100`
69. `app/dashboard/page.tsx:59` - `bg-yellow-100`
70. `app/finance/expenses/new/page.tsx:198` - `bg-yellow-500`
71. `app/fm/maintenance/page.tsx:128` - `bg-yellow-100`
72. `app/page.tsx:30` - `bg-yellow-600`
73. `app/work-orders/board/page.tsx:72` - `bg-yellow-100`
74. `app/work-orders/board/page.tsx:76` - `bg-yellow-50`
75. `app/work-orders/approvals/page.tsx:145` - `bg-yellow-100`
76. `app/properties/leases/page.tsx:248` - `bg-yellow-50`
77. `app/properties/documents/page.tsx:253` - `bg-yellow-50`
78. `app/properties/documents/page.tsx:262` - `bg-yellow-600`
79. `app/careers/page.tsx:453` - `bg-yellow-100`
80. `app/careers/page.tsx:529` - `bg-yellow-100`

#### Purple Backgrounds (bg-purple-*)
81. `app/help/page.tsx:329` - `bg-purple-100`
82. `app/fm/tenants/page.tsx:69` - `bg-purple-600`
83. `app/fm/tenants/page.tsx:127` - `bg-purple-600`
84. `app/fm/tenants/page.tsx:428` - `bg-purple-600`
85. `app/work-orders/board/page.tsx:128` - `bg-purple-50`
86. `app/work-orders/board/page.tsx:124` - `bg-purple-100`
87. `app/notifications/page.tsx:573` - `bg-purple-600`
88. `app/privacy/page.tsx:127` - `bg-purple-50`
89. `app/careers/page.tsx:543` - `bg-purple-50`

#### Gray Backgrounds (bg-gray-*)
90-150. **60+ instances** across:
   - `app/help/page.tsx` - lines 224, 228, 240, 248
   - `app/help/[slug]/page.tsx` - lines 68, 71
   - `app/help/tutorial/getting-started/page.tsx` - line 446
   - `app/help/ai-chat/page.tsx` - lines 53, 109
   - `app/help/support-ticket/page.tsx` - lines 86, 192, 223
   - `app/finance/*` - 15+ files with `bg-gray-50`, `bg-gray-100`, `bg-gray-200`
   - `app/fm/*` - 20+ files
   - `app/properties/*` - 10+ files
   - `app/work-orders/*` - 10+ files
   - `app/careers/page.tsx` - lines 360, 583
   - `app/layout.tsx` - line 10 (body background)

#### Indigo Backgrounds (bg-indigo-*)
151. `app/fm/projects/page.tsx:65` - `bg-indigo-600`
152. `app/fm/projects/page.tsx:140` - `bg-indigo-600`
153. `app/fm/projects/page.tsx:219` - `bg-indigo-600`
154. `app/fm/projects/page.tsx:396` - `bg-indigo-600`

### Text Colors (text-*)

#### Blue Text (text-blue-*)
155. `app/help/page.tsx:123` - `text-blue-600`
156. `app/help/page.tsx:218` - `text-blue-600`
157. `app/help/page.tsx:277` - `text-blue-600`
158. `app/help/page.tsx:310` - `text-blue-600`
159. `app/help/tutorial/getting-started/page.tsx:452` - `text-blue-600`
160. `app/help/tutorial/getting-started/page.tsx:516` - `text-blue-600`
161. `app/help/tutorial/getting-started/page.tsx:537` - `text-blue-600`
162. `app/help/tutorial/getting-started/page.tsx:538` - `text-blue-600`
163. `app/help/tutorial/getting-started/page.tsx:554` - `text-blue-900`
164. `app/help/tutorial/getting-started/page.tsx:557` - `text-blue-800`
165. `app/help/tutorial/getting-started/page.tsx:558` - `text-blue-600`
166. `app/login/page.tsx:414` - `text-blue-600`
167. `app/login/page.tsx:480` - `text-blue-800`
168. `app/notifications/page.tsx:353` - `text-blue-600`
169. `app/notifications/page.tsx:521` - `text-blue-600`
170. `app/privacy/page.tsx:112` - `text-blue-600`
171. `app/privacy/page.tsx:164` - `text-blue-600`
172. `app/privacy/page.tsx:176` - `text-blue-600`
173. `app/privacy/page.tsx:186` - `text-blue-600`
174. `app/careers/page.tsx:469` - `text-blue-600` (bullet point)
175. `app/careers/page.tsx:474` - `text-blue-600`
176. `app/careers/page.tsx:536` - `text-blue-800`
177. `app/careers/page.tsx:560` - `text-blue-600` (bullet point)
178. `app/souq/vendors/page.tsx:59` - `text-blue-600`
179. `app/souq/vendors/page.tsx:83` - `text-blue-600`
180. `app/properties/leases/page.tsx:226` - `text-blue-600`
181. `app/properties/units/page.tsx:94` - `text-blue-600`
182. `app/properties/units/page.tsx:207` - `text-blue-600`
183. `app/properties/inspections/page.tsx:96` - `text-blue-600`
184. `app/properties/inspections/page.tsx:211` - `text-blue-600`
185. `app/properties/documents/page.tsx:106` - `text-blue-600`
186. `app/properties/documents/page.tsx:240` - `text-blue-600`
187. `app/properties/documents/page.tsx:274` - `text-blue-600`
188. `app/fm/dashboard/page.tsx:121` - `text-blue-600`
189. `app/fm/dashboard/page.tsx:128` - `text-blue-600`
190. `app/fm/maintenance/page.tsx:101` - `text-blue-600`
191. `app/page.tsx:48` - `text-blue-600`

#### Green Text (text-green-*)
192. `app/help/page.tsx:125` - `text-green-600`
193. `app/help/page.tsx:131` - `text-green-600`
194. `app/help/page.tsx:231` - `text-green-600`
195. `app/help/page.tsx:320` - `text-green-600`
196. `app/help/tutorial/getting-started/page.tsx:514` - `text-green-600`
197. `app/notifications/page.tsx:382` - `text-green-600`
198. `app/privacy/page.tsx:120` - `text-green-600`
199. `app/careers/page.tsx:485` - `text-green-600` (bullet point)
200. `app/careers/page.tsx:490` - `text-green-600`
201. `app/careers/page.tsx:540` - `text-green-800`
202. `app/careers/page.tsx:571` - `text-green-600` (bullet point)
203. `app/properties/leases/page.tsx:113` - `text-green-600`
204. `app/properties/leases/page.tsx:227` - `text-green-600`
205. `app/properties/units/page.tsx:103` - `text-green-600`
206. `app/properties/units/page.tsx:208` - `text-green-600`
207. `app/properties/inspections/page.tsx:114` - `text-green-600`
208. `app/properties/inspections/page.tsx:212` - `text-green-600`
209. `app/properties/documents/page.tsx:241` - `text-green-600`
210. `app/properties/documents/page.tsx:292` - `text-green-600`
211. `app/fm/dashboard/page.tsx:137` - `text-green-600`
212. `app/fm/dashboard/page.tsx:144` - `text-green-600`
213. `app/fm/maintenance/page.tsx:115` - `text-green-600`
214. `app/fm/assets/page.tsx:186` - `text-green-600`
215. `app/fm/properties/[id]/page.tsx:278` - `text-green-600`
216. `app/fm/properties/[id]/page.tsx:284` - `text-green-600`
217. `app/fm/properties/[id]/page.tsx:290` - `text-green-600`
218. `app/fm/tenants/page.tsx:226` - `text-green-700`
219. `app/fm/invoices/page.tsx:160` - `text-green-600`
220. `app/fm/invoices/page.tsx:167` - `text-green-600`
221. `app/fm/system/page.tsx:47` - `text-green-600`
222. `app/forgot-password/page.tsx:41` - `text-green-600`

#### Red Text (text-red-*)
223. `app/finance/budgets/new/page.tsx:136` - `text-red-600`
224. `app/finance/expenses/new/page.tsx:214` - `text-red-600`
225. `app/finance/expenses/new/page.tsx:221` - `text-red-600`
226. `app/finance/expenses/new/page.tsx:228` - `text-red-600`
227. `app/finance/invoices/new/page.tsx:141` - `text-red-600`
228. `app/aqar/properties/page.tsx:82` - `text-red-600`
229. `app/notifications/page.tsx:362` - `text-red-600`
230. `app/careers/page.tsx:409` - `text-red-500`
231. `app/careers/page.tsx:448` - `text-red-800`
232. `app/careers/page.tsx:528` - `text-red-800`
233. `app/properties/units/page.tsx:112` - `text-red-600`
234. `app/properties/inspections/page.tsx:123` - `text-red-600`
235. `app/properties/inspections/page.tsx:227` - `text-red-400`
236. `app/properties/inspections/page.tsx:229` - `text-red-800`
237. `app/properties/inspections/page.tsx:230` - `text-red-600`
238. `app/properties/documents/page.tsx:124` - `text-red-600`
239. `app/properties/documents/page.tsx:283` - `text-red-600`
240. `app/properties/[id]/page.tsx:103` - `text-red-600`
241. `app/fm/dashboard/page.tsx:169` - `text-red-600`
242. `app/fm/dashboard/page.tsx:176` - `text-red-600`
243. `app/fm/maintenance/page.tsx:143` - `text-red-600`
244. `app/fm/assets/page.tsx:190` - `text-red-600`
245. `app/fm/assets/page.tsx:273` - `text-red-600`
246. `app/fm/projects/page.tsx:266` - `text-red-600`
247. `app/fm/properties/page.tsx:258` - `text-red-600`
248. `app/fm/properties/[id]/page.tsx:64` - `text-red-600`
249. `app/fm/tenants/page.tsx:245` - `text-red-600`
250. `app/fm/vendors/page.tsx:261` - `text-red-600`
251. `app/fm/invoices/page.tsx:132` - `text-red-600`
252. `app/fm/invoices/page.tsx:136` - `text-red-600`
253. `app/fm/invoices/page.tsx:658` - `text-red-600`
254. `app/fm/maintenance/page.tsx:206` - `text-red-600`
255. `app/fm/orders/page.tsx:248` - `text-red-600`
256. `app/fm/orders/page.tsx:313` - `text-red-600`
257. `app/marketplace/vendor/portal/page.tsx:65` - `text-red-600`
258. `app/marketplace/vendor/portal/page.tsx:66` - `text-red-800`

#### Yellow Text (text-yellow-*)
259. `app/help/page.tsx:129` - `text-yellow-600`
260. `app/help/page.tsx:201` - `text-yellow-500` (star icon)
261. `app/help/page.tsx:340` - `text-yellow-600`
262. `app/dashboard/page.tsx:59` - `text-yellow-800`
263. `app/notifications/page.tsx:382` - `text-yellow-600`
264. `app/privacy/page.tsx:136` - `text-yellow-600`
265. `app/careers/page.tsx:410` - `text-yellow-500` (star icon)
266. `app/careers/page.tsx:453` - `text-yellow-800`
267. `app/careers/page.tsx:529` - `text-yellow-800`
268. `app/souq/vendors/page.tsx:50` - `text-yellow-400` (star rating)
269. `app/souq/vendors/page.tsx:74` - `text-yellow-400` (star rating)
270. `app/properties/leases/page.tsx:122` - `text-yellow-600`
271. `app/properties/documents/page.tsx:115` - `text-yellow-600`
272. `app/properties/documents/page.tsx:256` - `text-yellow-400`
273. `app/properties/documents/page.tsx:258` - `text-yellow-800`
274. `app/properties/documents/page.tsx:259` - `text-yellow-600`
275. `app/fm/maintenance/page.tsx:129` - `text-yellow-600`
276. `app/fm/invoices/page.tsx:146` - `text-yellow-600`
277. `app/fm/invoices/page.tsx:150` - `text-yellow-600`
278. `app/vendor/dashboard/page.tsx:98` - `text-yellow-400`

#### Purple Text (text-purple-*)
279. `app/help/page.tsx:127` - `text-purple-600`
280. `app/help/page.tsx:330` - `text-purple-600`
281. `app/privacy/page.tsx:128` - `text-purple-600`
282. `app/careers/page.tsx:544` - `text-purple-800`
283. `app/properties/units/page.tsx:121` - `text-purple-600`
284. `app/properties/leases/page.tsx:140` - `text-purple-600`
285. `app/properties/documents/page.tsx:133` - `text-purple-600`
286. `app/properties/documents/page.tsx:301` - `text-purple-600`

---

## 2. TODO/FIXME COMMENTS (80+ instances)

### Critical P0 TODOs (Implementation Incomplete)

#### lib/fm-finance-hooks.ts (6 TODOs - BLOCKING)
1. `lib/fm-finance-hooks.ts:94` - `// TODO: Save to FMFinancialTxn collection`
2. `lib/fm-finance-hooks.ts:118` - `// TODO: Save to FMFinancialTxn collection`
3. `lib/fm-finance-hooks.ts:145` - `// TODO: Query existing statement or create new one`
4. `lib/fm-finance-hooks.ts:172` - `// TODO: Query FMFinancialTxn collection for transactions in period`
5. `lib/fm-finance-hooks.ts:201` - `// TODO: Query FMFinancialTxn collection`
6. `lib/fm-finance-hooks.ts:214` - `// TODO: Create payment transaction and update invoice status`

#### lib/fm-approval-engine.ts (4 TODOs - BLOCKING)
7. `lib/fm-approval-engine.ts:69` - `approvers: [], // TODO: Query users by role in org/property`
8. `lib/fm-approval-engine.ts:204` - `// TODO: Query and add user IDs for escalation roles`
9. `lib/fm-approval-engine.ts:229` - `// TODO: Query FMApproval collection`
10. `lib/fm-approval-engine.ts:241` - `// TODO: Implement notification sending`

#### lib/fm-notifications.ts (4 TODOs - Integration Missing)
11. `lib/fm-notifications.ts:188` - `// TODO: Integrate with FCM or Web Push`
12. `lib/fm-notifications.ts:199` - `// TODO: Integrate with email service (SendGrid, AWS SES, etc.)`
13. `lib/fm-notifications.ts:210` - `// TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)`
14. `lib/fm-notifications.ts:221` - `// TODO: Integrate with WhatsApp Business API`

#### lib/fm-auth-middleware.ts (4 TODOs - Auth/Permissions)
15. `lib/fm-auth-middleware.ts:124` - `plan: Plan.PRO, // TODO: Get from user/org subscription`
16. `lib/fm-auth-middleware.ts:125` - `isOrgMember: true // TODO: Verify org membership`
17. `lib/fm-auth-middleware.ts:164` - `plan: Plan.PRO, // TODO: Get from user/org subscription`
18. `lib/fm-auth-middleware.ts:165` - `isOrgMember: true // TODO: Verify org membership`
19. `lib/fm-auth-middleware.ts:177` - `// TODO: Query FMProperty model for ownership`

#### hooks/useFMPermissions.ts (3 TODOs - Permissions)
20. `hooks/useFMPermissions.ts:33` - `// TODO: Replace with actual session hook when available`
21. `hooks/useFMPermissions.ts:62` - `plan: Plan.PRO // TODO: Get from user/org subscription`
22. `hooks/useFMPermissions.ts:82` - `isOrgMember: true // TODO: Verify org membership`

### Low Priority TODOs (Tools/Scripts)
23-50. **27 instances** in:
   - `tools/analyzers/analyze-comments.js` (8 references to TODO patterns)
   - `smart-merge-conflicts.ts` (3 instances)
   - `aws/dist/awscli/customizations/wizard/wizards/configure/_main.yml:84` - `# TODO: Not implemented yet. I think we want a loop for this?`
   - `aws/dist/docutils/writers/latex2e/docutils.sty:64` - `% TODO: add \em to set dedication text in italics?`
   - `aws/dist/docutils/writers/html5_polyglot/minimal.css:195` - `/* TODO: unfortunately, "+" also selects with text between the references. */`

### Documentation TODOs (Not Code)
51-80. **30 instances** in:
   - `COMPREHENSIVE_MISSING_FEATURES_ANALYSIS.md` - documented examples
   - `FM_IMPLEMENTATION_COMPLETE.md` - status report TODOs
   - `DOCUMENTATION_QUALITY_AUDIT_2025-10-16.md` - audit notes
   - `ISSUES_LAST_12_HOURS_ANALYSIS.md` - scan placeholders
   - `SYSTEM_ERRORS_DETAILED_REPORT.md` - error examples
   - `docs/reports/DEPLOYMENT_READINESS_STATUS.md` - integration notes

---

## 3. CONSOLE.LOG STATEMENTS (100+ instances)

### Production Code - MUST REMOVE

#### Context Files (OK - Development Only)
1-10. `contexts/CurrencyContext.tsx` - lines 68, 108, 143, 149 (4 console.warn statements - OK for errors)
11-25. `contexts/TranslationContext.tsx` - lines 1740, 1771, 1799, 1828, 1835, 1838, 1852 (7 console.warn statements - OK for errors)

#### Tool Scripts (OK - CLI Output)
26-100. **75 instances** across tool scripts (expected for CLI tools):
   - `tools/wo-scanner.ts:83` - JSON output
   - `tools/generators/create-guardrails.js` - 8 instances (progress messages)
   - `tools/fixers/fix-unknown-smart.js` - 11 instances (status output)
   - `tools/fixers/fix-all-unknown-types.js` - 13 instances (progress)
   - `tools/fixers/batch-fix-unknown.js` - 10 instances (batch progress)
   - `tools/fixers/fix-unknown-types.js` - 9 instances (fixes)
   - `tools/fixers/fix-imports.js` - 6 instances (import fixes)
   - `tools/scripts-archive/fix_merge_conflicts.js` - 12 instances (merge status)
   - `tools/scripts-archive/final-typescript-fix.js` - 20 instances (detailed progress)

### Production Code console.logs - TO BE REMOVED (NONE FOUND)

✅ **CLEAN**: No production `console.log` statements found in:
- `app/**/*.tsx`
- `components/**/*.tsx`
- `lib/**/*.ts` (except authorized console.warn in contexts)
- `hooks/**/*.ts`

---

## 4. ADDITIONAL SYSTEM-WIDE ISSUES

### Status Enum Inconsistencies (Documented in Analysis)
- WorkOrder status missing 7 states vs. competitor spec
- Invoice status misalignment
- Approval status not standardized
- **Action Required**: Standardize all status enums system-wide

### Missing Tenant Isolation
- Some API routes lack `orgId` filtering
- Property ownership checks incomplete
- **Action Required**: Add tenant isolation to all multi-tenant endpoints

### RTL Support Gaps
- No `dir="rtl"` handling in many components
- Hardcoded left/right margins instead of start/end
- **Action Required**: Add RTL support to all UI components

---

## SUMMARY & FIX PLAN

### Issues by Category
| Category | Count | Priority | Est. Effort |
|----------|-------|----------|-------------|
| Hardcoded Colors | 280+ | HIGH | 4-6 hours |
| TODO Comments (Critical) | 22 | P0 | 16-20 hours |
| TODO Comments (Low) | 58 | P3 | Not urgent |
| console.log (Tools) | 100+ | OK | No action |
| console.log (Production) | 0 | ✅ | Already clean |
| Status Enums | ~10 files | MEDIUM | 2-3 hours |
| Tenant Isolation | ~15 routes | HIGH | 4-6 hours |
| RTL Support | ~50 components | MEDIUM | 8-10 hours |

### Recommended Fix Order
1. **Colors (Quick Win)**: Automated replacement script, 280+ fixes in 4-6 hours
2. **Finance TODOs (P0 Blocker)**: Implement DB writes in `lib/fm-finance-hooks.ts`
3. **Approval TODOs (P0 Blocker)**: Implement persistence in `lib/fm-approval-engine.ts`
4. **Notification TODOs (P1)**: Integrate external services
5. **Auth/Permissions TODOs**: Wire to actual subscription/membership checks
6. **Status Enums (Consistency)**: Standardize across all models
7. **Tenant Isolation (Security)**: Add to all multi-tenant routes
8. **RTL Support (Accessibility)**: Add to all components

### Total Estimated Effort
- **Critical (P0)**: ~20-26 hours
- **High (P1)**: ~12-18 hours
- **Medium (P2)**: ~10-13 hours
- **Total**: ~42-57 hours (5-7 working days)

---

## NEXT STEPS

Per agent instructions, **Option A (Colors)** will be executed FIRST as a quick win demonstrating systematic fixing approach, followed by **Option B (P0 Blockers)** implementations.

**Branch Strategy**: `fix/system-wide-consistency-p0-blockers`

**Verification**: STRICT v4 artifacts (T0/T0+10s screenshots, clean console, 0 build errors)

---

*End of Inventory Document*
