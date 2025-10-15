#!/usr/bin/env node
/**
 * Analyze identical and similar issues across the entire system
 * Group by pattern and generate detailed report with line numbers
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 تحليل المشاكل المتطابقة والمتشابهة عبر النظام...\n');

// Load the analysis data
const systemErrors = JSON.parse(fs.readFileSync('system-errors-detailed.json', 'utf8'));

// Group identical issues
const identicalIssues = {
  consoleLog: [],
  consoleDebug: [],
  consoleInfo: [],
  consoleWarn: [],
  consoleError: [],
  eslintDisable: [],
  tsIgnore: [],
  tsExpectError: [],
  tsNoCheck: [],
  anyType: [],
  asAny: [],
  emptyCatch: [],
  processExit: [],
  dangerousHTML: [],
  localhost: [],
  evalUsage: [],
  todoComments: [],
  fixmeComments: [],
  hackComments: []
};

// Categorize by exact pattern
console.log('📊 تصنيف الأخطاء حسب النمط...\n');

for (const [category, errors] of Object.entries(systemErrors.categories)) {
  errors.forEach(error => {
    // Console statements
    if (error.code.includes('console.log')) identicalIssues.consoleLog.push(error);
    else if (error.code.includes('console.debug')) identicalIssues.consoleDebug.push(error);
    else if (error.code.includes('console.info')) identicalIssues.consoleInfo.push(error);
    else if (error.code.includes('console.warn')) identicalIssues.consoleWarn.push(error);
    else if (error.code.includes('console.error')) identicalIssues.consoleError.push(error);
    
    // TypeScript suppressions
    else if (error.code.includes('// eslint-disable') || error.code.includes('eslint-disable-next-line')) {
      identicalIssues.eslintDisable.push(error);
    }
    else if (error.code.includes('@ts-ignore')) identicalIssues.tsIgnore.push(error);
    else if (error.code.includes('@ts-expect-error')) identicalIssues.tsExpectError.push(error);
    else if (error.code.includes('@ts-nocheck')) identicalIssues.tsNoCheck.push(error);
    
    // Type issues
    else if (error.code.match(/:\s*any\b/)) identicalIssues.anyType.push(error);
    else if (error.code.includes('as any')) identicalIssues.asAny.push(error);
    
    // Runtime issues
    else if (error.code.match(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/)) {
      identicalIssues.emptyCatch.push(error);
    }
    else if (error.code.includes('process.exit(')) identicalIssues.processExit.push(error);
    
    // Security
    else if (error.code.includes('dangerouslySetInnerHTML')) identicalIssues.dangerousHTML.push(error);
    else if (error.code.includes('eval(')) identicalIssues.evalUsage.push(error);
    
    // Hardcoded values
    else if (error.code.match(/localhost:\d+/)) identicalIssues.localhost.push(error);
    
    // Code smells
    else if (error.code.match(/\/\/\s*TODO/i)) identicalIssues.todoComments.push(error);
    else if (error.code.match(/\/\/\s*FIXME/i)) identicalIssues.fixmeComments.push(error);
    else if (error.code.match(/\/\/\s*HACK/i)) identicalIssues.hackComments.push(error);
  });
}

// Calculate totals
const totals = {};
let grandTotal = 0;
for (const [pattern, issues] of Object.entries(identicalIssues)) {
  totals[pattern] = issues.length;
  grandTotal += issues.length;
}

// Sort by count
const sortedPatterns = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .filter(([_, count]) => count > 0);

console.log('═══════════════════════════════════════════════════════════');
console.log('📈 تقرير المشاكل المتطابقة');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`إجمالي الأنماط المكتشفة: ${sortedPatterns.length}`);
console.log(`إجمالي الحالات: ${grandTotal}\n`);

sortedPatterns.forEach(([pattern, count], index) => {
  const percentage = ((count / grandTotal) * 100).toFixed(1);
  console.log(`${index + 1}. ${pattern}: ${count} (${percentage}%)`);
});

// Generate detailed report
const report = generateDetailedReport(identicalIssues, sortedPatterns, grandTotal);
fs.writeFileSync('IDENTICAL_ISSUES_DETAILED_REPORT.md', report);
console.log('\n✅ تم حفظ التقرير المفصل: IDENTICAL_ISSUES_DETAILED_REPORT.md');

// Generate fix plan
const fixPlan = generateFixPlan(identicalIssues, sortedPatterns);
fs.writeFileSync('ISSUES_FIX_PLAN.md', fixPlan);
console.log('✅ تم حفظ خطة الإصلاح: ISSUES_FIX_PLAN.md');

// Generate CSV for each pattern
generatePatternCSVs(identicalIssues);
console.log('✅ تم إنشاء ملفات CSV لكل نمط\n');

console.log('═══════════════════════════════════════════════════════════');
console.log('✨ اكتمل التحليل!');
console.log('═══════════════════════════════════════════════════════════\n');

function generateDetailedReport(issues, sortedPatterns, grandTotal) {
  const arabicNames = {
    consoleLog: 'console.log',
    consoleDebug: 'console.debug',
    consoleInfo: 'console.info',
    consoleWarn: 'console.warn',
    consoleError: 'console.error',
    eslintDisable: 'ESLint Disable Comments',
    tsIgnore: '@ts-ignore Comments',
    tsExpectError: '@ts-expect-error Comments',
    tsNoCheck: '@ts-nocheck Comments',
    anyType: 'Any Type Declaration',
    asAny: 'Type Cast to Any',
    emptyCatch: 'Empty Catch Blocks',
    processExit: 'process.exit() Calls',
    dangerousHTML: 'dangerouslySetInnerHTML',
    localhost: 'Hardcoded Localhost',
    evalUsage: 'eval() Usage',
    todoComments: 'TODO Comments',
    fixmeComments: 'FIXME Comments',
    hackComments: 'HACK Comments'
  };

  let md = `# تقرير المشاكل المتطابقة والمتشابهة - تفصيلي

> **تاريخ الإنشاء**: ${new Date().toLocaleString('ar-SA')}  
> **إجمالي الحالات المكتشفة**: ${grandTotal.toLocaleString()}  
> **عدد الأنماط**: ${sortedPatterns.length}

---

## 📊 ملخص تنفيذي

هذا التقرير يحتوي على **جميع المشاكل المتطابقة** عبر النظام بأكمله، مع:
- ✅ رقم السطر الدقيق لكل مشكلة
- ✅ اسم الملف الكامل
- ✅ عينة من الكود
- ✅ إحصائيات تفصيلية

---

## 🔝 أهم 10 أنماط متكررة

| # | النمط | العدد | النسبة | الأولوية |
|---|-------|-------|--------|----------|
`;

  sortedPatterns.slice(0, 10).forEach(([pattern, count], index) => {
    const arabicName = arabicNames[pattern] || pattern;
    const percentage = ((count / grandTotal) * 100).toFixed(1);
    const priority = index < 3 ? '🔴 حرج' : index < 6 ? '🟡 مهم' : '🟢 عادي';
    md += `| ${index + 1} | ${arabicName} | ${count.toLocaleString()} | ${percentage}% | ${priority} |\n`;
  });

  md += `\n---\n\n`;
  md += `## 📋 التفاصيل الكاملة حسب النمط\n\n`;

  // Details for each pattern
  sortedPatterns.forEach(([pattern, count]) => {
    if (count === 0) return;
    
    const arabicName = arabicNames[pattern] || pattern;
    const patternIssues = issues[pattern];
    
    md += `### ${arabicName} (${count.toLocaleString()} حالة)\n\n`;
    
    // Group by file
    const byFile = {};
    patternIssues.forEach(issue => {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    });
    
    const fileCount = Object.keys(byFile).length;
    md += `- **عدد الملفات المتأثرة**: ${fileCount}\n`;
    md += `- **متوسط الحالات لكل ملف**: ${(count / fileCount).toFixed(1)}\n\n`;
    
    md += `#### قائمة الملفات المتأثرة:\n\n`;
    
    // Sort files by count
    const sortedFiles = Object.entries(byFile)
      .sort((a, b) => b[1].length - a[1].length);
    
    sortedFiles.forEach(([file, fileIssues]) => {
      md += `##### ${file} (${fileIssues.length} حالة)\n\n`;
      md += `| السطر | الكود |\n`;
      md += `|-------|-------|\n`;
      
      fileIssues.slice(0, 20).forEach(issue => {
        const code = issue.code.substring(0, 80).replace(/\|/g, '\\|');
        md += `| ${issue.line} | \`${code}\` |\n`;
      });
      
      if (fileIssues.length > 20) {
        md += `\n*...و ${fileIssues.length - 20} حالة أخرى في هذا الملف*\n`;
      }
      md += `\n`;
    });
    
    md += `---\n\n`;
  });

  md += `\n## 📊 الإحصائيات التفصيلية\n\n`;
  md += `### توزيع المشاكل حسب المجلدات\n\n`;
  
  // Analyze by directory
  const byDirectory = {};
  sortedPatterns.forEach(([pattern, _]) => {
    issues[pattern].forEach(issue => {
      const dir = path.dirname(issue.file);
      if (!byDirectory[dir]) byDirectory[dir] = 0;
      byDirectory[dir]++;
    });
  });
  
  const topDirs = Object.entries(byDirectory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  md += `| المجلد | عدد المشاكل |\n`;
  md += `|--------|-------------|\n`;
  topDirs.forEach(([dir, count]) => {
    md += `| ${dir} | ${count} |\n`;
  });

  md += `\n---\n*تم إنشاء هذا التقرير تلقائياً*\n`;
  
  return md;
}

function generateFixPlan(issues, sortedPatterns) {
  let md = `# خطة إصلاح المشاكل المتطابقة

> **هدف هذا المستند**: توفير خطة عمل واضحة ومنهجية لإصلاح جميع المشاكل المتطابقة

---

## 🎯 استراتيجية الإصلاح

### المبادئ الأساسية:
1. ✅ ابدأ بالأنماط الأكثر تكراراً
2. ✅ اختبر بعد كل مجموعة إصلاحات
3. ✅ أنشئ PR منفصل لكل نمط
4. ✅ استخدم الأدوات الآلية حيث أمكن

---

## 📋 المراحل التفصيلية\n\n`;

  const priorities = [
    {
      name: 'المرحلة 1: التنظيف الفوري (يوم 1-2)',
      patterns: ['consoleLog', 'consoleDebug', 'consoleInfo', 'consoleWarn'],
      automated: true
    },
    {
      name: 'المرحلة 2: معالجة الأخطاء (يوم 3-4)',
      patterns: ['emptyCatch', 'consoleError'],
      automated: false
    },
    {
      name: 'المرحلة 3: الأمان (يوم 5)',
      patterns: ['dangerousHTML', 'evalUsage'],
      automated: false
    },
    {
      name: 'المرحلة 4: تحسين الأنواع (أسبوع 2)',
      patterns: ['anyType', 'asAny', 'tsIgnore'],
      automated: false
    },
    {
      name: 'المرحلة 5: التنظيف النهائي (أسبوع 3)',
      patterns: ['eslintDisable', 'localhost', 'processExit'],
      automated: false
    }
  ];

  priorities.forEach((phase, phaseIndex) => {
    const phasePatterns = sortedPatterns.filter(([p]) => phase.patterns.includes(p));
    const phaseTotal = phasePatterns.reduce((sum, [_, count]) => sum + count, 0);
    
    if (phaseTotal === 0) return;
    
    md += `### ${phase.name}\n\n`;
    md += `**إجمالي الحالات**: ${phaseTotal.toLocaleString()}  \n`;
    md += `**قابل للأتمتة**: ${phase.automated ? 'نعم ✅' : 'لا ❌'}  \n\n`;
    
    phasePatterns.forEach(([pattern, count]) => {
      md += `#### ${pattern} (${count} حالة)\n\n`;
      md += `**الملف المرجعي**: \`fixes/${pattern}-locations.csv\`\n\n`;
      
      if (pattern === 'consoleLog' || pattern === 'consoleDebug' || pattern === 'consoleInfo' || pattern === 'consoleWarn') {
        md += `**الإصلاح**:\n\`\`\`bash\n`;
        md += `# استبدال آلي (بعد المراجعة اليدوية)\n`;
        md += `# إزالة أو استبدال بـ logger\n`;
        md += `grep -r "console.${pattern.replace('console', '')}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -l\n`;
        md += `\`\`\`\n\n`;
      } else if (pattern === 'emptyCatch') {
        md += `**الإصلاح**:\n\`\`\`typescript\n`;
        md += `// بدلاً من:\n`;
        md += `.catch(() => {})\n\n`;
        md += `// استخدم:\n`;
        md += `.catch((error) => {\n`;
        md += `  logger.error('Operation failed', { error });\n`;
        md += `  // Handle appropriately\n`;
        md += `})\n`;
        md += `\`\`\`\n\n`;
      } else if (pattern === 'anyType') {
        md += `**الإصلاح**: استبدل بأنواع محددة أو interfaces مناسبة\n\n`;
      } else if (pattern === 'eslintDisable') {
        md += `**الإصلاح**: راجع كل حالة وأصلح المشكلة الأساسية بدلاً من التعطيل\n\n`;
      }
      
      md += `**ملفات CSV للمرجعية**:\n`;
      md += `- \`fixes/${pattern}-locations.csv\`\n\n`;
    });
    
    md += `---\n\n`;
  });

  md += `## 🔧 الأدوات والأوامر المفيدة\n\n`;
  md += `### البحث والاستبدال:\n\`\`\`bash\n`;
  md += `# البحث عن نمط معين\n`;
  md += `grep -r "PATTERN" --include="*.ts" --include="*.tsx" -n\n\n`;
  md += `# عد الحالات\n`;
  md += `grep -r "PATTERN" --include="*.ts" --include="*.tsx" | wc -l\n\n`;
  md += `# قائمة الملفات فقط\n`;
  md += `grep -r "PATTERN" --include="*.ts" --include="*.tsx" -l\n`;
  md += `\`\`\`\n\n`;

  md += `### الاختبار:\n\`\`\`bash\n`;
  md += `# بعد كل مجموعة إصلاحات\n`;
  md += `npm run build\n`;
  md += `npm run test\n`;
  md += `npm run lint\n`;
  md += `\`\`\`\n\n`;

  return md;
}

function generatePatternCSVs(issues) {
  const fixesDir = 'fixes';
  if (!fs.existsSync(fixesDir)) {
    fs.mkdirSync(fixesDir);
  }

  for (const [pattern, patternIssues] of Object.entries(issues)) {
    if (patternIssues.length === 0) continue;
    
    let csv = 'File,Line,Code\n';
    patternIssues.forEach(issue => {
      const code = (issue.code || '').replace(/"/g, '""');
      csv += `"${issue.file}",${issue.line},"${code}"\n`;
    });
    
    fs.writeFileSync(`${fixesDir}/${pattern}-locations.csv`, csv);
  }
}
