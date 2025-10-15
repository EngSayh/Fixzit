#!/usr/bin/env node
/**
 * Review and document security issues
 * These require manual review and fixing
 */

const fs = require('fs');

console.log('🔒 مراجعة مشاكل الأمان...\n');

// Read security-related CSVs
const dangerousHTML = fs.readFileSync('fixes/dangerousHTML-locations.csv', 'utf8');
const evalUsage = fs.readFileSync('fixes/evalUsage-locations.csv', 'utf8');

function parseAndDisplay(csv, title) {
  console.log(`\n### ${title}\n`);
  const lines = csv.split('\n').slice(1);
  
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const parts = line.split(',');
    if (parts.length >= 3) {
      const file = parts[0].replace(/^"|"$/g, '');
      const lineNum = parts[1];
      const code = parts[2].replace(/^"|"$/g, '');
      console.log(`${index + 1}. ${file}:${lineNum}`);
      console.log(`   ${code.substring(0, 100)}\n`);
    }
  });
}

parseAndDisplay(dangerousHTML, 'استخدام dangerouslySetInnerHTML (5 حالات)');
parseAndDisplay(evalUsage, 'استخدام eval() (1 حالة)');

console.log('\n⚠️  تحذير: هذه المشاكل تحتاج مراجعة يدوية');
console.log('📝 تم توثيق جميع الحالات في الملفات CSV\n');

// Generate security report
const report = `# تقرير الأمان - المشاكل الحرجة

## dangerouslySetInnerHTML (5 حالات)

${dangerousHTML}

## eval() Usage (1 حالة)

${evalUsage}

## التوصيات:

1. **dangerouslySetInnerHTML**: 
   - تأكد من تنظيف HTML قبل العرض
   - استخدم مكتبة مثل DOMPurify
   - فكّر في بدائل أكثر أماناً

2. **eval()**: 
   - تجنب استخدام eval() تماماً
   - استخدم JSON.parse() للبيانات
   - استخدم Function constructor إذا لزم الأمر (أكثر أماناً نسبياً)
`;

fs.writeFileSync('SECURITY_ISSUES_REPORT.md', report);
console.log('✅ تم إنشاء: SECURITY_ISSUES_REPORT.md\n');
