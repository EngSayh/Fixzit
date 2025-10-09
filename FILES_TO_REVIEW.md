# الملفات التي تحتاج مراجعة | Files Requiring Review

## 🔴 ملفات حرجة - مراجعة فورية | Critical Files

### 1. lib/auth.ts
**السبب:** JWT Secret مكشوفة  
**الأسطر:** 100, 121  
**الإجراء المطلوب:** إزالة القيمة الثابتة واستخدام متغير بيئي  
**الأولوية:** 🔴 حرجة جداً

```typescript
// الأسطر المحددة للمراجعة:
// السطر 100: jwtSecret = '6c042711c6357e8...'
// السطر 121: return '6c042711c6357e8...'
```

---

## ⚠️ ملفات عالية الأولوية | High Priority Files

### 2. lib/auth-middleware.ts
**السبب:** دالة getSessionUser مكررة  
**الأسطر:** 1-82 (الملف بالكامل)  
**الإجراء المطلوب:** توحيد مع server/middleware/withAuthRbac.ts  
**الأولوية:** ⚠️ عالية

**الدالة:**
```typescript
// السطر 12
export async function getSessionUser(req: NextRequest): Promise<AuthenticatedUser>
```

### 3. server/middleware/withAuthRbac.ts
**السبب:** دالة getSessionUser مكررة  
**الأسطر:** 1-62 (الملف بالكامل)  
**الإجراء المطلوب:** توحيد مع lib/auth-middleware.ts  
**الأولوية:** ⚠️ عالية

**الدالة:**
```typescript
// السطر 12
export async function getSessionUser(req: NextRequest): Promise<SessionUser>
```

### 4. server/plugins/auditPlugin.ts
**السبب:** استخدام optional chaining غير ضروري على user objects  
**الأسطر:** 273-274  
**الإجراء المطلوب:** فحص صريح لوجود المستخدم  
**الأولوية:** ⚠️ عالية

```typescript
// السطر 273-274
userId: userId || req.user?.id || req.user?._id?.toString(),
userEmail: req.user?.email,
```

---

## 🟡 ملفات متوسطة الأولوية | Medium Priority Files

### 5. app/api/support/incidents/route.ts
**السبب:** optional chaining متعدد على user objects  
**الأسطر:** 56, 63, 86, 105, 116, 125, 133  
**الإجراء المطلوب:** تبسيط منطق التحقق من المستخدم  
**الأولوية:** 🟡 متوسطة

```typescript
// الأسطر المحددة:
// 56: sessionUser = { id: user.id, role: user.role, orgId: (user as any)?.orgId }
// 63: const rateKey = `incidents:rate:${sessionUser?.id ? `u:${sessionUser.id}` : `ip:${ip}`}`
// 86: const tenantScope = sessionUser?.orgId || req.headers.get('x-org-id')...
```

### 6. app/api/support/tickets/route.ts
**السبب:** optional chaining غير ضروري  
**الأسطر:** 30, 39, 41  
**الإجراء المطلوب:** فحص صريح للمستخدم  
**الأولوية:** 🟡 متوسطة

### 7. app/cms/[slug]/page.tsx
**السبب:** استخدام dangerouslySetInnerHTML  
**السطر:** 45  
**الإجراء المطلوب:** التأكد من أن renderMarkdown يقوم بالـ sanitization  
**الأولوية:** 🟡 متوسطة

```typescript
// السطر 45
dangerouslySetInnerHTML={{ __html: await renderMarkdown(page.content) }}
```

### 8. components/ErrorBoundary.tsx
**السبب:** استخدام console.log كثيف (15 مرة)  
**الإجراء المطلوب:** استبدال بنظام logging  
**الأولوية:** 🟡 متوسطة

### 9. lib/database.ts
**السبب:** استخدام console متعدد  
**الإجراء المطلوب:** استبدال بنظام logging  
**الأولوية:** 🟡 متوسطة

---

## 📋 ملفات تحتاج تنظيف | Files Needing Cleanup

### مجلد _deprecated/
**الملفات:** 44+ ملف نموذج قديم

**القائمة:**
```
_deprecated/src-models-old/
  - OwnerGroup.ts
  - PaymentMethod.ts
  - PriceTier.ts
  - ServiceContract.ts
  - DiscountRule.ts
  - Module.ts
  - Customer.ts
  - SubscriptionInvoice.ts
  - Subscription.ts
  - Organization.ts
  - Benchmark.ts
  - marketplace/Product.ts
  - marketplace/RFQ.ts
  - marketplace/AttributeSet.ts
  - marketplace/Category.ts
  - marketplace/Order.ts

_deprecated/models-old/
  - (نفس القائمة أعلاه تقريباً)

_deprecated/db-models-old/
  - (نفس القائمة أعلاه تقريباً)
```

**الإجراء المطلوب:** 
1. التحقق من عدم استخدام هذه الملفات
2. حذفها بالكامل
3. تحديث git history إن لزم

---

## 🔍 ملفات تحتاج مراجعة أمنية | Security Review Files

### 10. server/copilot/llm.ts
**السبب:** استخدام OPENAI_API_KEY بدون validation كافية  
**الأسطر:** 5, 43, 56  
**الإجراء المطلوب:** validation أفضل وerror handling  
**الأولوية:** 🟡 متوسطة

```typescript
// السطر 5
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment'); // recommend explicit validation
}
// Validation recommended in report
```

### 11. server/copilot/retrieval.ts
**السبب:** نفس المشكلة أعلاه  
**الأسطر:** 9, 12, 26  
**الإجراء المطلوب:** validation أفضل  
**الأولوية:** 🟡 متوسطة

### 12. components/GoogleMap.tsx
**السبب:** استخدام API key بدون fallback  
**السطر:** 65  
**الإجراء المطلوب:** إضافة validation وerror message  
**الأولوية:** 🟡 متوسطة

```typescript
// السطر 65
script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
// لا يوجد فحص للقيمة
```

---

## 📁 ملفات API تحتاج توحيد | API Files for Consolidation

### 13-57. جميع ملفات API routes (44 ملف)
**السبب:** فحوصات مصادقة متكررة  
**الإجراء المطلوب:** استخدام middleware موحد

**القائمة الكاملة:**
```
app/api/
  - tenants/[id]/route.ts
  - tenants/route.ts
  - work-orders/[id]/status/route.ts
  - work-orders/[id]/attachments/presign/route.ts
  - work-orders/[id]/checklists/toggle/route.ts
  - work-orders/[id]/comments/route.ts
  - work-orders/route.ts
  - slas/route.ts
  - vendors/[id]/route.ts
  - vendors/route.ts
  - support/tickets/[id]/route.ts
  - support/tickets/[id]/reply/route.ts
  - support/tickets/my/route.ts
  - support/tickets/route.ts
  - support/incidents/route.ts
  - kb/search/route.ts
  - kb/ingest/route.ts
  - properties/[id]/route.ts
  - properties/route.ts
  - payments/create/route.ts
  - notifications/[id]/route.ts
  - notifications/bulk/route.ts
  - notifications/route.ts
  - rfqs/[id]/publish/route.ts
  - rfqs/[id]/bids/route.ts
  - rfqs/route.ts
  - projects/[id]/route.ts
  - projects/route.ts
  - help/articles/[id]/route.ts
  - help/articles/route.ts
  - help/ask/route.ts
  - files/resumes/presign/route.ts
  - files/resumes/[file]/route.ts
  - cms/pages/[slug]/route.ts
  - invoices/[id]/route.ts
  - invoices/route.ts
  - aqar/properties/route.ts
  - aqar/map/route.ts
  - assistant/query/route.ts
  - assets/[id]/route.ts
  - assets/route.ts
```

**النمط المتكرر في كل ملف:**
```typescript
const user = await getSessionUser(req);
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

## 🔧 ملفات تحتاج refactoring | Files for Refactoring

### 58. lib/payments/currencyUtils.ts
**السبب:** catch block كبير مع fallback معقد  
**الأسطر:** 120-138  
**الإجراء المطلوب:** تبسيط المنطق  
**الأولوية:** 🟢 منخفضة

### 59. contexts/TranslationContext.tsx
**السبب:** ملف كبير جداً (1700+ سطر) مع catch blocks متعددة  
**الأسطر:** متعددة  
**الإجراء المطلوب:** تقسيم إلى ملفات أصغر  
**الأولوية:** 🟢 منخفضة

---

## 📊 إحصائيات المراجعة | Review Statistics

```
المجموع الكلي: 59 ملف/مجموعة
  🔴 حرجة   : 1 ملف
  ⚠️ عالية  : 4 ملفات
  🟡 متوسطة : 9 ملفات
  🟢 منخفضة : 2 ملف
  📁 تنظيف  : 44+ ملف (في _deprecated)
  🔄 توحيد  : 44 ملف API
```

---

## 🎯 خطة المراجعة المقترحة | Review Plan

### المرحلة 1 (يوم واحد)
1. مراجعة وإصلاح `lib/auth.ts` (حرج)
2. اختبار المصادقة بعد الإصلاح

### المرحلة 2 (2-3 أيام)
3. توحيد `getSessionUser` (ملفان)
4. تحديث جميع المراجع (41 ملف)
5. مراجعة `server/plugins/auditPlugin.ts`

### المرحلة 3 (أسبوع)
6. مراجعة ملفات optional chaining (9 ملفات)
7. مراجعة ملفات الأمان (3 ملفات)
8. تطبيق middleware موحد للـ API

### المرحلة 4 (حسب الوقت المتاح)
9. تنظيف `_deprecated/` (44+ ملف)
10. refactoring ملفات كبيرة (2 ملف)

---

## 📝 نموذج checklist للمراجعة | Review Checklist Template

```markdown
## مراجعة ملف: [اسم الملف]

- [ ] قراءة الكود بالكامل
- [ ] فهم الغرض والوظيفة
- [ ] فحص الأمان
- [ ] فحص معالجة الأخطاء
- [ ] فحص الاختبارات
- [ ] تطبيق الإصلاحات
- [ ] تشغيل الاختبارات
- [ ] مراجعة ذاتية
- [ ] طلب code review
- [ ] دمج التغييرات
```

---

## 🔗 مراجع إضافية | Additional References

- التقرير الكامل: `SYSTEM_AUDIT_FINDINGS_REPORT.md`
- الملخص السريع: `AUDIT_QUICK_SUMMARY.md`
- قائمة المهام: `AUDIT_ISSUES_CHECKLIST.md`

---

**آخر تحديث:** 2025-10-09  
**الحالة:** قائمة جاهزة للاستخدام  
**الاستخدام:** مرجع للمطورين أثناء المراجعة
