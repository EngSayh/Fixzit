#!/usr/bin/env node
/**
 * Analyze all comments from closed and merged PRs
 * Categorize errors found in PR comments
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Helper function to execute shell commands
function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return null;
  }
}

console.log('🔍 جاري جلب جميع Pull Requests المغلقة والمدمجة...\n');

// Get all closed PRs (both merged and closed without merge)
const prsJson = exec('gh pr list --state closed --limit 200 --json number,title,state,mergedAt,closedAt,author');
if (!prsJson) {
  console.error('❌ فشل في جلب قائمة Pull Requests');
  process.exit(1);
}

const prs = JSON.parse(prsJson);
console.log(`✅ تم العثور على ${prs.length} Pull Request\n`);

const analysis = {
  totalPRs: prs.length,
  mergedPRs: prs.filter(pr => pr.mergedAt).length,
  closedPRs: prs.filter(pr => !pr.mergedAt).length,
  prsWithComments: 0,
  totalComments: 0,
  errorCategories: {
    buildErrors: [],
    testErrors: [],
    lintErrors: [],
    typeErrors: [],
    runtimeErrors: [],
    deploymentErrors: [],
    securityErrors: [],
    importErrors: [],
    configErrors: [],
    databaseErrors: [],
    apiErrors: [],
    otherErrors: []
  },
  prDetails: []
};

// Error patterns to categorize
const errorPatterns = {
  buildErrors: /build.*(fail|error)|compilation.*(fail|error)|webpack.*error|next.*build.*error/i,
  testErrors: /test.*(fail|error)|jest.*error|vitest.*error|playwright.*error|spec.*fail/i,
  lintErrors: /lint.*(error|warning)|eslint.*error|prettier.*error|formatting.*error/i,
  typeErrors: /type.*(error|mismatch)|typescript.*error|ts\(\d+\)|cannot find (name|module)|property.*does not exist/i,
  runtimeErrors: /runtime.*error|undefined is not|cannot read property|reference.*error|null.*error/i,
  deploymentErrors: /deploy.*(fail|error)|vercel.*error|production.*error|ci\/cd.*error/i,
  securityErrors: /security.*(issue|error|vulnerability)|auth.*(fail|error)|permission.*denied|unauthorized/i,
  importErrors: /import.*error|module not found|cannot find module|dependency.*error/i,
  configErrors: /config.*(error|invalid)|env.*error|environment.*error|setting.*error/i,
  databaseErrors: /database.*error|mongo.*error|sql.*error|connection.*error|query.*error/i,
  apiErrors: /api.*(error|fail)|endpoint.*error|request.*fail|response.*error|status.*[45]\d\d/i
};

console.log('📊 جاري تحليل التعليقات من كل PR...\n');

let processedCount = 0;
// Analyze each PR
for (const pr of prs) {
  processedCount++;
  process.stdout.write(`\r⏳ معالجة PR ${processedCount}/${prs.length} (${Math.round(processedCount/prs.length*100)}%)`);
  
  const prNumber = pr.number;
  const prDetail = {
    number: prNumber,
    title: pr.title,
    state: pr.state,
    isMerged: !!pr.mergedAt,
    author: pr.author?.login || 'unknown',
    comments: [],
    errors: []
  };
  
  // Get PR comments
  const commentsJson = exec(`gh pr view ${prNumber} --json comments`);
  if (!commentsJson) continue;
  
  try {
    const prData = JSON.parse(commentsJson);
    const comments = prData.comments || [];
    
    if (comments.length > 0) {
      analysis.prsWithComments++;
      analysis.totalComments += comments.length;
    }
    
    // Analyze each comment
    for (const comment of comments) {
      const body = comment.body || '';
      const author = comment.author?.login || 'unknown';
      
      prDetail.comments.push({
        author,
        body: body.substring(0, 200), // First 200 chars for preview
        createdAt: comment.createdAt
      });
      
      // Check for errors in comment
      let foundError = false;
      for (const [category, pattern] of Object.entries(errorPatterns)) {
        if (pattern.test(body)) {
          foundError = true;
          const errorEntry = {
            pr: prNumber,
            prTitle: pr.title,
            category,
            author,
            commentPreview: body.substring(0, 300),
            createdAt: comment.createdAt
          };
          
          analysis.errorCategories[category].push(errorEntry);
          prDetail.errors.push({ category, preview: body.substring(0, 150) });
        }
      }
    }
    
    if (prDetail.comments.length > 0 || prDetail.errors.length > 0) {
      analysis.prDetails.push(prDetail);
    }
    
  } catch (error) {
    console.error(`\n❌ خطأ في معالجة PR #${prNumber}: ${error.message}`);
  }
}

console.log('\n\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('📈 تقرير تحليل تعليقات Pull Requests');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📊 الإحصائيات العامة:');
console.log(`   إجمالي PRs: ${analysis.totalPRs}`);
console.log(`   PRs المدمجة: ${analysis.mergedPRs}`);
console.log(`   PRs المغلقة (غير مدمجة): ${analysis.closedPRs}`);
console.log(`   PRs التي تحتوي على تعليقات: ${analysis.prsWithComments}`);
console.log(`   إجمالي التعليقات: ${analysis.totalComments}\n`);

console.log('🔴 تصنيف الأخطاء المكتشفة في التعليقات:\n');

const totalErrors = Object.values(analysis.errorCategories).reduce((sum, arr) => sum + arr.length, 0);

const categoryNames = {
  buildErrors: 'أخطاء البناء (Build)',
  testErrors: 'أخطاء الاختبار (Tests)',
  lintErrors: 'أخطاء Lint/التنسيق',
  typeErrors: 'أخطاء الأنواع (TypeScript)',
  runtimeErrors: 'أخطاء وقت التشغيل',
  deploymentErrors: 'أخطاء النشر (Deployment)',
  securityErrors: 'أخطاء الأمان',
  importErrors: 'أخطاء الاستيراد (Imports)',
  configErrors: 'أخطاء الإعدادات',
  databaseErrors: 'أخطاء قاعدة البيانات',
  apiErrors: 'أخطاء API',
  otherErrors: 'أخطاء أخرى'
};

// Sort categories by count
const sortedCategories = Object.entries(analysis.errorCategories)
  .sort((a, b) => b[1].length - a[1].length);

for (const [category, errors] of sortedCategories) {
  const arabicName = categoryNames[category] || category;
  const count = errors.length;
  const percentage = totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(1) : 0;
  
  if (count > 0) {
    console.log(`   ${arabicName}: ${count} (${percentage}%)`);
  }
}

console.log(`\n   📌 إجمالي الأخطاء المكتشفة: ${totalErrors}\n`);

// Show top PRs with most errors
console.log('🔝 أكثر 10 PRs تحتوي على أخطاء:\n');
const prsWithErrors = analysis.prDetails
  .filter(pr => pr.errors.length > 0)
  .sort((a, b) => b.errors.length - a.errors.length)
  .slice(0, 10);

prsWithErrors.forEach((pr, index) => {
  console.log(`${index + 1}. PR #${pr.number}: ${pr.title}`);
  console.log(`   الحالة: ${pr.isMerged ? 'مدمج ✅' : 'مغلق ❌'}`);
  console.log(`   عدد الأخطاء: ${pr.errors.length}`);
  console.log(`   أنواع الأخطاء: ${[...new Set(pr.errors.map(e => e.category))].join(', ')}\n`);
});

// Save detailed report
const reportPath = 'pr-comments-error-analysis.json';
fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
console.log(`\n✅ تم حفظ التقرير التفصيلي في: ${reportPath}\n`);

// Create summary markdown report
const mdReport = generateMarkdownReport(analysis, categoryNames, prsWithErrors);
const mdReportPath = 'PR_COMMENTS_ERROR_ANALYSIS.md';
fs.writeFileSync(mdReportPath, mdReport);
console.log(`✅ تم حفظ التقرير النصي في: ${mdReportPath}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('✨ اكتمل التحليل بنجاح!');
console.log('═══════════════════════════════════════════════════════════\n');

function generateMarkdownReport(analysis, categoryNames, topPRs) {
  const totalErrors = Object.values(analysis.errorCategories).reduce((sum, arr) => sum + arr.length, 0);
  
  let md = `# تحليل الأخطاء في تعليقات Pull Requests

## 📊 الإحصائيات العامة

- **إجمالي PRs المحللة**: ${analysis.totalPRs}
- **PRs المدمجة**: ${analysis.mergedPRs}
- **PRs المغلقة (غير مدمجة)**: ${analysis.closedPRs}
- **PRs التي تحتوي على تعليقات**: ${analysis.prsWithComments}
- **إجمالي التعليقات**: ${analysis.totalComments}
- **إجمالي الأخطاء المكتشفة**: ${totalErrors}

## 🔴 تصنيف الأخطاء

| الفئة | العدد | النسبة |
|-------|-------|--------|
`;

  const sortedCategories = Object.entries(analysis.errorCategories)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [category, errors] of sortedCategories) {
    const arabicName = categoryNames[category] || category;
    const count = errors.length;
    const percentage = totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(1) : 0;
    md += `| ${arabicName} | ${count} | ${percentage}% |\n`;
  }

  md += `\n## 🔝 أكثر PRs تحتوي على أخطاء\n\n`;

  topPRs.forEach((pr, index) => {
    md += `### ${index + 1}. PR #${pr.number}: ${pr.title}\n\n`;
    md += `- **الحالة**: ${pr.isMerged ? 'مدمج ✅' : 'مغلق ❌'}\n`;
    md += `- **المؤلف**: ${pr.author}\n`;
    md += `- **عدد الأخطاء**: ${pr.errors.length}\n`;
    md += `- **عدد التعليقات**: ${pr.comments.length}\n`;
    md += `- **أنواع الأخطاء**: ${[...new Set(pr.errors.map(e => categoryNames[e.category]))].join(', ')}\n\n`;
  });

  md += `\n## 📝 تفاصيل الأخطاء حسب الفئة\n\n`;

  for (const [category, errors] of sortedCategories) {
    if (errors.length === 0) continue;
    
    const arabicName = categoryNames[category] || category;
    md += `### ${arabicName} (${errors.length})\n\n`;
    
    // Show up to 5 examples
    const examples = errors.slice(0, 5);
    examples.forEach((error, index) => {
      md += `${index + 1}. **PR #${error.pr}**: ${error.prTitle}\n`;
      md += `   - المؤلف: ${error.author}\n`;
      md += `   - معاينة: \`${error.commentPreview.substring(0, 150).replace(/\n/g, ' ')}...\`\n\n`;
    });
    
    if (errors.length > 5) {
      md += `   *...و ${errors.length - 5} أخطاء أخرى*\n\n`;
    }
  }

  md += `\n---\n*تم إنشاء هذا التقرير تلقائياً في ${new Date().toLocaleString('ar-SA')}*\n`;

  return md;
}
