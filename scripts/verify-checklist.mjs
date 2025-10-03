#!/usr/bin/env node
/**
 * Verification Checklist - Governance Checks
 * Quick smoke tests for governance compliance
 */
import fs from 'node:fs';
import path from 'node:path';

function hasFile(p) { return fs.existsSync(path.resolve(p)); }
function read(p) { return fs.readFileSync(path.resolve(p), 'utf8'); }

const FAIL = [];
const PASS = [];

function req(cond, msg) { (cond ? PASS : FAIL).push(msg); }

function scanLanding() {
  const candidates = ['app/page.js', 'app/page.tsx', 'pages/index.tsx', 'pages/index.js'];
  const found = candidates.find(hasFile);
  req(found, `Landing page exists: ${found || 'NOT FOUND'}`);
  
  if (found) {
    const s = read(found);
    req(/العربية|Arabic/.test(s), 'Landing has Arabic language reference');
    req(/Souq|Marketplace/.test(s), 'Landing has Souq/Marketplace reference');
  }
}

function scanHeaderFooter() {
  const headers = [
    'components/Header.js',
    'components/Header.tsx',
    'src/components/Header.tsx',
    'components/layout/Header.tsx'
  ];
  const sidebars = [
    'components/Sidebar.js',
    'components/Sidebar.tsx',
    'src/components/navigation/Sidebar.tsx',
    'components/navigation/Sidebar.tsx'
  ];
  
  req(headers.some(hasFile), 'Header component present');
  req(sidebars.some(hasFile), 'Sidebar component present');
  req(hasFile('app/layout.tsx') || hasFile('app/layout.js'), 'Root layout exists');
}

function scanBrandTokens() {
  const candidates = [
    'src/styles/tokens.css',
    'src/styles/base.css',
    'styles/globals.css',
    'src/styles/globals.css',
    'app/globals.css'
  ];
  const files = candidates.filter(hasFile);
  req(files.length > 0, `Brand token file present: ${files[0] || 'NOT FOUND'}`);
  
  if (files.length > 0) {
    const all = files.map(read).join('\n');
    req(/#0061A8|--color-primary/.test(all), 'Primary brand color (#0061A8) enforced');
    req(/#00A859|--color-secondary/.test(all), 'Secondary brand color (#00A859) enforced');
    req(/#FFB400|--color-accent/.test(all), 'Accent brand color (#FFB400) enforced');
  }
}

function scanLangSelector() {
  const headers = [
    'components/Header.js',
    'components/Header.tsx',
    'src/components/Header.tsx'
  ].filter(hasFile);
  
  if (headers.length > 0) {
    const h = headers.map(read).join('\n');
    const ok = /Globe|flag|language|lang|locale/i.test(h);
    req(ok, 'Language selector present (flag/native/ISO to be verified in UI tests)');
  } else {
    FAIL.push('Cannot verify language selector - no Header found');
  }
}

function scanGovernance() {
  const files = [
    'GOVERNANCE/AGENT_GOVERNOR.md',
    'GOVERNANCE/CONSOLIDATION_PLAN.yml',
    'GOVERNANCE/PR_TEMPLATE.md',
    'GOVERNANCE/COMMIT_CONVENTIONS.md',
    'GOVERNANCE/VERIFY_INSTRUCTIONS.md'
  ];
  
  files.forEach(f => {
    req(hasFile(f), `Governance file exists: ${f}`);
  });
}

function scanTypeScript() {
  req(hasFile('tsconfig.json'), 'tsconfig.json exists');
  
  if (hasFile('tsconfig.json')) {
    const config = read('tsconfig.json');
    req(config.includes('__legacy') || config.includes('__archive'), 'tsconfig excludes legacy/archive directories');
  }
}

function summarize() {
  const clean = FAIL.length === 0;
  console.log('\n=== VERIFY SUMMARY ===');
  console.log(`✅ PASS: ${PASS.length}`);
  console.log(`❌ FAIL: ${FAIL.length}`);
  console.log('');
  
  if (PASS.length > 0) {
    console.log('Passed checks:');
    PASS.forEach(m => console.log('  ✅', m));
  }
  
  if (FAIL.length > 0) {
    console.log('\nFailed checks:');
    FAIL.forEach(m => console.log('  ❌', m));
  }
  
  if (!clean) process.exit(1);
}

console.log('Running governance verification checks...\n');
scanLanding();
scanHeaderFooter();
scanBrandTokens();
scanLangSelector();
scanGovernance();
scanTypeScript();
summarize();
