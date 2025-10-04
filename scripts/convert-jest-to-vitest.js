#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Converting Jest syntax to Vitest...\n');

// Find all test files
const testFiles = execSync('find . -name "*.test.ts" -o -name "*.test.tsx"', { 
  encoding: 'utf-8',
  cwd: '/workspaces/Fixzit'
})
  .split('\n')
  .filter(f => f && !f.includes('node_modules'));

let filesModified = 0;
let totalReplacements = 0;

testFiles.forEach(filePath => {
  const fullPath = path.join('/workspaces/Fixzit', filePath);
  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;
  let fileReplacements = 0;

  // Replace jest.mock with vi.mock
  const jestMockCount = (content.match(/jest\.mock\(/g) || []).length;
  content = content.replace(/jest\.mock\(/g, 'vi.mock(');
  fileReplacements += jestMockCount;

  // Replace jest.fn with vi.fn
  const jestFnCount = (content.match(/jest\.fn\(/g) || []).length;
  content = content.replace(/jest\.fn\(/g, 'vi.fn(');
  fileReplacements += jestFnCount;

  // Replace jest.spyOn with vi.spyOn
  const jestSpyOnCount = (content.match(/jest\.spyOn\(/g) || []).length;
  content = content.replace(/jest\.spyOn\(/g, 'vi.spyOn(');
  fileReplacements += jestSpyOnCount;

  // Replace jest.requireMock with vi.mocked(require())
  const jestRequireMockCount = (content.match(/jest\.requireMock\(/g) || []).length;
  content = content.replace(/jest\.requireMock\(/g, 'vi.mocked(require(');
  fileReplacements += jestRequireMockCount;

  // Replace jest.Mock type with ReturnType<typeof vi.fn>
  const jestMockTypeCount = (content.match(/:\s*jest\.Mock/g) || []).length;
  content = content.replace(/:\s*jest\.Mock(?!ed)/g, ': ReturnType<typeof vi.fn>');
  fileReplacements += jestMockTypeCount;

  // Replace jest.MockedFunction with ReturnType<typeof vi.fn>
  const jestMockedFunctionCount = (content.match(/:\s*jest\.MockedFunction/g) || []).length;
  content = content.replace(/:\s*jest\.MockedFunction<([^>]+)>/g, ': ReturnType<typeof vi.fn<$1>>');
  fileReplacements += jestMockedFunctionCount;

  // Replace (x as jest.Mock) with vi.mocked(x)
  const asJestMockCount = (content.match(/\([^)]+\s+as\s+jest\.Mock\)/g) || []).length;
  content = content.replace(/\(([^)]+)\s+as\s+jest\.Mock\)/g, 'vi.mocked($1)');
  fileReplacements += asJestMockCount;

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    filesModified++;
    totalReplacements += fileReplacements;
    console.log(`✅ ${filePath} (${fileReplacements} replacements)`);
  }
});

console.log(`\n✨ Conversion complete!`);
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${totalReplacements}`);
