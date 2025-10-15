# تقرير الأمان - المشاكل الحرجة

## dangerouslySetInnerHTML (5 حالات)

File,Line,Code
"analyze-system-errors.js",99,"{ pattern: /dangerouslySetInnerHTML/g, type: 'Dangerous HTML' },"
"qa/tests/07-help-article-page-code.spec.ts",75,"test(""renders content via dangerouslySetInnerHTML with await renderMarkdown(a.content)"", async () => {"
"qa/tests/07-help-article-page-code.spec.ts",76,"expect(code).toMatch(/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*await\s+renderMarkdown\(\s*a\.content\s*\)\s*\}\}/);"
"app/cms/[slug]/page.tsx",45,"dangerouslySetInnerHTML={{ __html: await renderMarkdown(page.content) }}"
"app/help/[slug]/page.tsx",47,"dangerouslySetInnerHTML={{ __html: await renderMarkdownSanitized(a.content) }}"


## eval() Usage (1 حالة)

File,Line,Code
"scripts/scanner.js",213,"{ pattern: /eval\s*\(/g, issue: 'eval() usage detected', severity: Severity.CRITICAL },"


## التوصيات:

1. **dangerouslySetInnerHTML**: 
   - تأكد من تنظيف HTML قبل العرض
   - استخدم مكتبة مثل DOMPurify
   - فكّر في بدائل أكثر أماناً

2. **eval()**: 
   - تجنب استخدام eval() تماماً
   - استخدم JSON.parse() للبيانات
   - استخدم Function constructor إذا لزم الأمر (أكثر أماناً نسبياً)
