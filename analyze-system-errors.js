#!/usr/bin/env node
/**
 * Comprehensive System Error Analysis
 * Scans entire codebase for errors categorized by type
 * Provides detailed report with file paths, line numbers, and issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 بدء تحليل الأخطاء في النظام بأكمله...\n');

// Get all source files
const extensions = ['ts', 'tsx', 'js', 'jsx'];
const excludePaths = [
  'node_modules',
  '.next',
  'dist',
  'build',
  '.git',
  'coverage',
  '__pycache__',
  'aws/dist',
  'qa/qa/artifacts',
  '_deprecated'
];

const excludePattern = excludePaths.map(p => `-not -path "*/${p}/*"`).join(' ');
const extensionPattern = extensions.map(ext => `-name "*.${ext}"`).join(' -o ');

console.log('📂 جمع قائمة الملفات...');
const findCommand = `find . -type f \\( ${extensionPattern} \\) ${excludePattern}`;

let files = [];
try {
  const output = execSync(findCommand, { 
    encoding: 'utf8', 
    maxBuffer: 50 * 1024 * 1024 
  });
  files = output.trim().split('\n').filter(Boolean);
} catch (error) {
  console.error('❌ خطأ في جمع الملفات:', error.message);
  process.exit(1);
}

console.log(`✅ تم العثور على ${files.length} ملف للتحليل\n`);

// Error patterns with detailed detection
const errorPatterns = {
  // Build Errors
  buildErrors: [
    { pattern: /webpack.*error/gi, type: 'Webpack Error' },
    { pattern: /compilation\s+error/gi, type: 'Compilation Error' },
    { pattern: /build\s+fail/gi, type: 'Build Failure' },
    { pattern: /SyntaxError/g, type: 'Syntax Error' },
    { pattern: /ReferenceError/g, type: 'Reference Error' }
  ],
  
  // Test Errors
  testErrors: [
    { pattern: /\.skip\(/g, type: 'Skipped Test' },
    { pattern: /\.todo\(/g, type: 'TODO Test' },
    { pattern: /xit\(/g, type: 'Disabled Test (xit)' },
    { pattern: /xdescribe\(/g, type: 'Disabled Test Suite' },
    { pattern: /\/\/\s*TODO.*test/gi, type: 'Missing Test Implementation' }
  ],
  
  // Lint/Code Quality Errors
  lintErrors: [
    { pattern: /\/\/\s*eslint-disable/gi, type: 'ESLint Disabled' },
    { pattern: /\/\/\s*@ts-ignore/g, type: 'TypeScript Error Suppressed' },
    { pattern: /\/\/\s*@ts-expect-error/g, type: 'Expected TypeScript Error' },
    { pattern: /\/\/\s*@ts-nocheck/g, type: 'TypeScript Check Disabled' },
    { pattern: /console\.(log|debug|info|warn)/g, type: 'Console Statement' }
  ],
  
  // TypeScript Errors
  typeErrors: [
    { pattern: /:\s*any\b/g, type: 'Any Type Usage' },
    { pattern: /as\s+any\b/g, type: 'Type Cast to Any' },
    { pattern: /<any>/g, type: 'Generic Any Type' },
    { pattern: /\/\/\s*@ts-ignore/g, type: 'TS Ignore Comment' },
    { pattern: /Record<string,\s*any>/g, type: 'Any in Record Type' }
  ],
  
  // Runtime Errors
  runtimeErrors: [
    { pattern: /throw\s+new\s+Error\(['"]TODO/gi, type: 'TODO Error' },
    { pattern: /throw\s+new\s+Error\(['"]Not\s+implemented/gi, type: 'Not Implemented' },
    { pattern: /console\.error/g, type: 'Console Error' },
    { pattern: /process\.exit\(/g, type: 'Process Exit' },
    { pattern: /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g, type: 'Empty Catch Block' }
  ],
  
  // Security Errors
  securityErrors: [
    { pattern: /eval\(/g, type: 'Eval Usage' },
    { pattern: /dangerouslySetInnerHTML/g, type: 'Dangerous HTML' },
    { pattern: /password\s*=\s*['"][^'"]{1,}/gi, type: 'Hardcoded Password' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]{10,}/gi, type: 'Hardcoded API Key' },
    { pattern: /secret\s*=\s*['"][^'"]{10,}/gi, type: 'Hardcoded Secret' },
    { pattern: /localStorage\.setItem.*token/gi, type: 'Token in LocalStorage' }
  ],
  
  // Import/Dependency Errors
  importErrors: [
    { pattern: /import.*from\s+['"]\.\.\/\.\.\/\.\.\//g, type: 'Deep Relative Import' },
    { pattern: /require\(['"][^'"]*node_modules/g, type: 'Direct Node Modules Require' },
    { pattern: /\/\/\s*TODO.*import/gi, type: 'Missing Import' }
  ],
  
  // Config Errors
  configErrors: [
    { pattern: /process\.env\.\w+\s*\|\|\s*['"]/g, type: 'Fallback Env Variable' },
    { pattern: /TODO.*config/gi, type: 'TODO Configuration' },
    { pattern: /FIXME.*config/gi, type: 'Config Fix Required' }
  ],
  
  // Database Errors
  databaseErrors: [
    { pattern: /\.exec\(\).*\.catch\(\s*\(\)\s*=>/g, type: 'Silent DB Error' },
    { pattern: /findOne.*without.*await/g, type: 'Missing Await on DB Query' },
    { pattern: /TODO.*database/gi, type: 'Database TODO' },
    { pattern: /mongoose\.connect.*without.*catch/g, type: 'Unhandled DB Connection' }
  ],
  
  // API Errors
  apiErrors: [
    { pattern: /fetch\(.*\)\.then.*without.*catch/g, type: 'Unhandled Fetch' },
    { pattern: /axios\.(get|post|put|delete).*without.*catch/g, type: 'Unhandled Axios Request' },
    { pattern: /TODO.*api/gi, type: 'API TODO' },
    { pattern: /FIXME.*api/gi, type: 'API Fix Required' },
    { pattern: /Response\.json\(\).*without.*catch/g, type: 'Unhandled JSON Parse' }
  ],
  
  // Deployment Errors
  deploymentErrors: [
    { pattern: /TODO.*deploy/gi, type: 'Deployment TODO' },
    { pattern: /localhost:\d+/g, type: 'Hardcoded Localhost' },
    { pattern: /http:\/\/127\.0\.0\.1/g, type: 'Hardcoded Local IP' }
  ]
};

// Additional patterns for code smells and issues
const codeSmells = [
  { pattern: /\/\/\s*FIXME/gi, category: 'codeSmells', type: 'FIXME Comment' },
  { pattern: /\/\/\s*TODO/gi, category: 'codeSmells', type: 'TODO Comment' },
  { pattern: /\/\/\s*HACK/gi, category: 'codeSmells', type: 'HACK Comment' },
  { pattern: /\/\/\s*XXX/gi, category: 'codeSmells', type: 'XXX Comment' },
  { pattern: /\/\/\s*BUG/gi, category: 'codeSmells', type: 'BUG Comment' }
];

const analysis = {
  totalFiles: files.length,
  filesWithErrors: 0,
  totalErrors: 0,
  categories: {},
  fileDetails: [],
  summary: {}
};

// Initialize categories
Object.keys(errorPatterns).forEach(category => {
  analysis.categories[category] = [];
  analysis.summary[category] = 0;
});
analysis.categories['codeSmells'] = [];
analysis.summary['codeSmells'] = 0;

let processedCount = 0;

console.log('🔎 تحليل الملفات للكشف عن الأخطاء...\n');

// Analyze each file
for (const filePath of files) {
  processedCount++;
  
  if (processedCount % 50 === 0) {
    process.stdout.write(`\r⏳ تم معالجة ${processedCount}/${files.length} ملف (${Math.round(processedCount/files.length*100)}%)`);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const fileErrors = {
      filePath: filePath.replace('./', ''),
      errors: [],
      errorCount: 0
    };
    
    // Check each line for errors
    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;
      
      // Check main error patterns
      for (const [category, patterns] of Object.entries(errorPatterns)) {
        for (const { pattern, type } of patterns) {
          const matches = line.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const error = {
                category,
                type,
                line: lineNumber,
                code: line.trim().substring(0, 150),
                match: match.substring(0, 100)
              };
              
              fileErrors.errors.push(error);
              fileErrors.errorCount++;
              analysis.totalErrors++;
              analysis.summary[category]++;
              
              analysis.categories[category].push({
                file: filePath.replace('./', ''),
                line: lineNumber,
                type,
                code: line.trim().substring(0, 150),
                match: match.substring(0, 100)
              });
            });
          }
        }
      }
      
      // Check code smells
      for (const { pattern, category, type } of codeSmells) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const error = {
              category,
              type,
              line: lineNumber,
              code: line.trim().substring(0, 150),
              match: match.substring(0, 100)
            };
            
            fileErrors.errors.push(error);
            fileErrors.errorCount++;
            analysis.totalErrors++;
            analysis.summary[category]++;
            
            analysis.categories[category].push({
              file: filePath.replace('./', ''),
              line: lineNumber,
              type,
              code: line.trim().substring(0, 150),
              match: match.substring(0, 100)
            });
          });
        }
      }
    });
    
    if (fileErrors.errorCount > 0) {
      analysis.filesWithErrors++;
      analysis.fileDetails.push(fileErrors);
    }
    
  } catch (error) {
    // Skip files that can't be read
  }
}

console.log('\n\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('📊 تقرير تحليل أخطاء النظام الشامل');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📈 الإحصائيات العامة:');
console.log(`   إجمالي الملفات المحللة: ${analysis.totalFiles}`);
console.log(`   الملفات التي تحتوي على أخطاء: ${analysis.filesWithErrors}`);
console.log(`   إجمالي الأخطاء المكتشفة: ${analysis.totalErrors}\n`);

console.log('🔴 توزيع الأخطاء حسب الفئة:\n');

const categoryNames = {
  buildErrors: 'أخطاء البناء (Build)',
  testErrors: 'أخطاء الاختبار (Tests)',
  lintErrors: 'أخطاء Lint/جودة الكود',
  typeErrors: 'أخطاء الأنواع (TypeScript)',
  runtimeErrors: 'أخطاء وقت التشغيل',
  securityErrors: 'أخطاء الأمان',
  importErrors: 'أخطاء الاستيراد (Imports)',
  configErrors: 'أخطاء الإعدادات',
  databaseErrors: 'أخطاء قاعدة البيانات',
  apiErrors: 'أخطاء API',
  deploymentErrors: 'أخطاء النشر (Deployment)',
  codeSmells: 'تعليقات الصيانة (TODO/FIXME)'
};

// Sort by count
const sortedCategories = Object.entries(analysis.summary)
  .sort((a, b) => b[1] - a[1])
  .filter(([_, count]) => count > 0);

sortedCategories.forEach(([category, count]) => {
  const arabicName = categoryNames[category] || category;
  const percentage = ((count / analysis.totalErrors) * 100).toFixed(1);
  console.log(`   ${arabicName}: ${count} (${percentage}%)`);
});

console.log('\n');

// Top files with most errors
console.log('🔝 أكثر 20 ملف تحتوي على أخطاء:\n');
const topFiles = analysis.fileDetails
  .sort((a, b) => b.errorCount - a.errorCount)
  .slice(0, 20);

topFiles.forEach((file, index) => {
  const errorTypes = [...new Set(file.errors.map(e => e.type))].length;
  console.log(`${index + 1}. ${file.filePath}`);
  console.log(`   عدد الأخطاء: ${file.errorCount} | أنواع مختلفة: ${errorTypes}\n`);
});

// Save detailed JSON report
const jsonPath = 'system-errors-detailed.json';
fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2));
console.log(`✅ تم حفظ التقرير التفصيلي JSON في: ${jsonPath}\n`);

// Generate comprehensive markdown report
const mdReport = generateDetailedMarkdownReport(analysis, categoryNames, topFiles);
const mdPath = 'SYSTEM_ERRORS_DETAILED_REPORT.md';
fs.writeFileSync(mdPath, mdReport);
console.log(`✅ تم حفظ التقرير المفصل في: ${mdPath}\n`);

// Generate CSV for easy filtering
const csvReport = generateCSVReport(analysis);
const csvPath = 'system-errors-report.csv';
fs.writeFileSync(csvPath, csvReport);
console.log(`✅ تم حفظ تقرير CSV في: ${csvPath}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('✨ اكتمل التحليل بنجاح!');
console.log('═══════════════════════════════════════════════════════════\n');

function generateDetailedMarkdownReport(analysis, categoryNames, topFiles) {
  let md = `# تقرير تحليل أخطاء النظام الشامل

> تم إنشاؤه في: ${new Date().toLocaleString('ar-SA')}

## 📊 ملخص تنفيذي

- **إجمالي الملفات المحللة**: ${analysis.totalFiles.toLocaleString()}
- **الملفات التي تحتوي على أخطاء**: ${analysis.filesWithErrors.toLocaleString()}
- **إجمالي الأخطاء المكتشفة**: ${analysis.totalErrors.toLocaleString()}
- **نسبة الملفات المتأثرة**: ${((analysis.filesWithErrors / analysis.totalFiles) * 100).toFixed(2)}%

## 📈 توزيع الأخطاء حسب الفئة

| الفئة | العدد | النسبة | الأولوية |
|-------|-------|--------|----------|
`;

  const sortedCategories = Object.entries(analysis.summary)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count > 0);

  sortedCategories.forEach(([category, count], index) => {
    const arabicName = categoryNames[category] || category;
    const percentage = ((count / analysis.totalErrors) * 100).toFixed(1);
    const priority = index < 3 ? '🔴 عالية' : index < 6 ? '🟡 متوسطة' : '🟢 منخفضة';
    md += `| ${arabicName} | ${count.toLocaleString()} | ${percentage}% | ${priority} |\n`;
  });

  md += `\n## 🔝 أكثر 20 ملف تحتوي على أخطاء\n\n`;

  topFiles.forEach((file, index) => {
    const categoriesInFile = {};
    file.errors.forEach(err => {
      categoriesInFile[err.category] = (categoriesInFile[err.category] || 0) + 1;
    });
    
    md += `### ${index + 1}. \`${file.filePath}\`\n\n`;
    md += `- **إجمالي الأخطاء**: ${file.errorCount}\n`;
    md += `- **توزيع الأخطاء**:\n`;
    
    Object.entries(categoriesInFile)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        md += `  - ${categoryNames[cat] || cat}: ${count}\n`;
      });
    
    md += `\n`;
  });

  md += `\n## 📋 تفاصيل الأخطاء حسب الفئة\n\n`;

  for (const [category, errors] of Object.entries(analysis.categories)) {
    if (errors.length === 0) continue;
    
    const arabicName = categoryNames[category] || category;
    md += `### ${arabicName} (${errors.length} خطأ)\n\n`;
    
    // Group by type
    const byType = {};
    errors.forEach(err => {
      if (!byType[err.type]) byType[err.type] = [];
      byType[err.type].push(err);
    });
    
    Object.entries(byType).forEach(([type, typeErrors]) => {
      md += `#### ${type} (${typeErrors.length})\n\n`;
      
      // Show first 10 examples
      const examples = typeErrors.slice(0, 10);
      examples.forEach((err, idx) => {
        md += `${idx + 1}. **${err.file}:${err.line}**\n`;
        md += `   \`\`\`\n   ${err.code}\n   \`\`\`\n\n`;
      });
      
      if (typeErrors.length > 10) {
        md += `   *...و ${typeErrors.length - 10} حالة أخرى*\n\n`;
      }
    });
  }

  md += `\n## 📌 توصيات الإصلاح\n\n`;
  
  md += `### الأولوية العالية 🔴\n\n`;
  sortedCategories.slice(0, 3).forEach(([category, count]) => {
    const arabicName = categoryNames[category] || category;
    md += `- **${arabicName}** (${count} خطأ): `;
    
    switch(category) {
      case 'securityErrors':
        md += `يجب معالجة الثغرات الأمنية فوراً لحماية النظام\n`;
        break;
      case 'typeErrors':
        md += `تحسين أمان الأنواع للحد من الأخطاء في وقت التشغيل\n`;
        break;
      case 'testErrors':
        md += `إكمال الاختبارات المعطلة لتحسين تغطية الاختبار\n`;
        break;
      case 'apiErrors':
        md += `معالجة أخطاء API لتحسين استقرار النظام\n`;
        break;
      default:
        md += `معالجة هذه الأخطاء لتحسين جودة الكود\n`;
    }
  });

  md += `\n---\n\n`;
  md += `*تم إنشاء هذا التقرير تلقائياً بواسطة أداة تحليل أخطاء النظام*\n`;

  return md;
}

function generateCSVReport(analysis) {
  let csv = 'الفئة,النوع,الملف,السطر,الكود\n';
  
  for (const [category, errors] of Object.entries(analysis.categories)) {
    errors.forEach(err => {
      const escapedCode = (err.code || '').replace(/"/g, '""');
      csv += `"${category}","${err.type}","${err.file}",${err.line},"${escapedCode}"\n`;
    });
  }
  
  return csv;
}
