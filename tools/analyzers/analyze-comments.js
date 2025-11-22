#!/usr/bin/env node
/**
 * Analyze all comments in the codebase
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Get all TS/JS files
const files = execSync(
  `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) \
   -not -path "*/node_modules/*" \
   -not -path "*/.next/*" \
   -not -path "*/dist/*" \
   -not -path "*/build/*"`,
  { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
).trim().split('\n').filter(Boolean);

console.log(`Analyzing ${files.length} files...`);

const comments = {
  TODO: [],
  FIXME: [],
  HACK: [],
  XXX: [],
  BUG: [],
  NOTE: [],
  other: []
};

let totalComments = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Match single-line comments
      const singleMatch = line.match(/\/\/\s*(.+)/);
      if (singleMatch) {
        totalComments++;
        const comment = singleMatch[1].trim();
        
        // Categorize
        if (comment.match(/^TODO/i)) {
          comments.TODO.push({ file, line: index + 1, text: comment });
        } else if (comment.match(/^FIXME/i)) {
          comments.FIXME.push({ file, line: index + 1, text: comment });
        } else if (comment.match(/^HACK/i)) {
          comments.HACK.push({ file, line: index + 1, text: comment });
        } else if (comment.match(/^XXX/i)) {
          comments.XXX.push({ file, line: index + 1, text: comment });
        } else if (comment.match(/^BUG/i)) {
          comments.BUG.push({ file, line: index + 1, text: comment });
        } else if (comment.match(/^NOTE/i)) {
          comments.NOTE.push({ file, line: index + 1, text: comment });
        } else {
          // Regular comment
          comments.other.push({ file, line: index + 1, text: comment });
        }
      }
    });
  } catch (_err) {
    // Skip files that can't be read
  }
});

// Report
console.log('\n========================================');
console.log('COMMENT ANALYSIS REPORT');
console.log('========================================\n');

console.log(`Total Comments: ${totalComments}`);
console.log(`Files Analyzed: ${files.length}\n`);

console.log('Breakdown by Type:');
console.log(`  TODO:   ${comments.TODO.length}`);
console.log(`  FIXME:  ${comments.FIXME.length}`);
console.log(`  HACK:   ${comments.HACK.length}`);
console.log(`  XXX:    ${comments.XXX.length}`);
console.log(`  BUG:    ${comments.BUG.length}`);
console.log(`  NOTE:   ${comments.NOTE.length}`);
console.log(`  Other:  ${comments.other.length}\n`);

// Show samples
const actionable = comments.TODO.length + comments.FIXME.length + comments.HACK.length + comments.XXX.length + comments.BUG.length;
console.log(`Actionable Comments: ${actionable}`);
console.log(`Documentation Comments: ${comments.NOTE.length + comments.other.length}\n`);

// Save detailed report
const report = {
  summary: {
    totalComments,
    filesAnalyzed: files.length,
    actionable,
    documentation: comments.NOTE.length + comments.other.length
  },
  breakdown: {
    TODO: comments.TODO.length,
    FIXME: comments.FIXME.length,
    HACK: comments.HACK.length,
    XXX: comments.XXX.length,
    BUG: comments.BUG.length,
    NOTE: comments.NOTE.length,
    other: comments.other.length
  },
  details: comments
};

fs.writeFileSync('comment-analysis.json', JSON.stringify(report, null, 2));
console.log('✅ Detailed report saved to: comment-analysis.json\n');

// Show top actionable items
if (actionable > 0) {
  console.log('Top 10 Actionable Items:');
  console.log('------------------------');
  
  const actionableItems = [
    ...comments.TODO,
    ...comments.FIXME,
    ...comments.HACK,
    ...comments.XXX,
    ...comments.BUG
  ].slice(0, 10);
  
  actionableItems.forEach((item, i) => {
    console.log(`${i + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.text.substring(0, 80)}${item.text.length > 80 ? '...' : ''}`);
  });
}
