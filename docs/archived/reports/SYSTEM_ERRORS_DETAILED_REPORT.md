# Comprehensive System Error Analysis Report

> **Generated**: 10/15/2025, 6:45:15 AM UTC  
> **Branch**: fix/deprecated-hook-cleanup  
> **Commit**: ced70a39

## 📊 Executive Summary

- **Total Files Analyzed**: 711
- **Files With Errors**: 327
- **Total Errors Detected**: 3,082
- **Affected Files Rate**: 45.99%
- **Average Errors per Affected File**: 9.4

## 📈 Error Distribution by Category

| Category | Count | Percentage | Priority |
|----------|-------|------------|----------|
| Lint/Code Quality | 1,716 | 55.7% | 🔴 High |
| TypeScript Errors | 632 | 20.5% | 🔴 High |
| Runtime Errors | 423 | 13.7% | 🔴 High |
| Test Errors | 125 | 4.1% | 🟡 Medium |
| Deployment Issues | 92 | 3.0% | 🟡 Medium |
| Configuration Issues | 63 | 2.0% | 🟡 Medium |
| Security Issues | 17 | 0.6% | 🟢 Low |
| Build Errors | 7 | 0.2% | 🟢 Low |
| Code Maintenance (TODO/FIXME) | 3 | 0.1% | 🟢 Low |
| Database Errors | 2 | 0.1% | 🟢 Low |
| API Errors | 2 | 0.1% | 🟢 Low |

## 🔝 Top 20 Files with Most Errors

### 1. `scripts/scanner.js` (76 errors)

**Error Distribution**:

- Lint/Code Quality: 68
- Runtime Errors: 4
- Test Errors: 3
- Security Issues: 1

**Examples**:

1. Line 64: Console Statement
   `console.log(`${colors.cyan}${colors.bold}`

2. Line 70: Console Statement
   `console.log(`${colors.blue}Starting comprehensive scan...${colors.reset}\n`);`

3. Line 116: Console Error
   `console.error(`${colors.red}Scanner Error: ${error.message}${colors.reset}`);`

4. Line 117: Disabled Test (xit)
   `process.exit(1);`

5. Line 117: Process Exit
   `process.exit(1);`

*...and 71 more errors*

### 2. `scripts/unified-audit-system.js` (59 errors)

**Error Distribution**:

- Lint/Code Quality: 54
- Runtime Errors: 3
- Deployment Issues: 1
- Test Errors: 1

**Examples**:

1. Line 13: Hardcoded Localhost
   `const BASE_URL = 'http://localhost:5000';`

2. Line 32: Console Statement
   `console.log('🚀 Initializing FIXZIT ENTERPRISE ECOSYSTEM...\n');`

3. Line 44: Console Statement
   `console.log('✅ Unified authentication successful');`

4. Line 45: Console Statement
   `console.log(`👤 Role: ${response.data.user.role} (Cross-platform access)\n`);`

5. Line 251: Console Statement
   `console.log('🔍 STARTING COMPLETE FIXZIT ENTERPRISE ECOSYSTEM AUDIT');`

*...and 54 more errors*

### 3. `scripts/reality-check.js` (53 errors)

**Error Distribution**:

- Lint/Code Quality: 47
- Deployment Issues: 4
- Code Maintenance (TODO/FIXME): 1
- Runtime Errors: 1

**Examples**:

1. Line 7: Console Statement
   `console.log("\n🔍 EXPOSING TRUTH ABOUT YOUR IMPLEMENTATION\n");`

2. Line 14: Console Statement
   `console.log("Testing Work Orders...");`

3. Line 16: Hardcoded Localhost
   `const res = await fetch('http://localhost:5000/api/workorders', {`

4. Line 29: Console Statement
   `console.log("✅ Work Orders: REAL implementation with SLA");`

5. Line 32: Console Statement
   `console.log("❌ Work Orders: FAKE - Returns placeholder message");`

*...and 48 more errors*

### 4. `test-mongodb-comprehensive.js` (49 errors)

**Error Distribution**:

- Lint/Code Quality: 40
- Runtime Errors: 6
- Test Errors: 3

**Examples**:

1. Line 13: Console Statement
   `console.log('🔌 Testing MongoDB Connection...');`

2. Line 15: Console Statement
   `console.log('✅ Connected to MongoDB');`

3. Line 20: Console Statement
   `console.log('\n📚 Testing Collections...');`

4. Line 22: Console Statement
   `console.log(`✅ Found ${collections.length} collections:`);`

5. Line 23: Console Statement
   `collections.forEach(c => console.log(`  - ${c.name}`));`

*...and 44 more errors*

### 5. `scripts/complete-system-audit.js` (48 errors)

**Error Distribution**:

- Lint/Code Quality: 46
- Deployment Issues: 1
- Runtime Errors: 1

**Examples**:

1. Line 31: Console Statement
   `console.log('🔍 STARTING COMPLETE SYSTEM AUDIT...\n');`

2. Line 32: Console Statement
   `console.log('=' .repeat(80));`

3. Line 60: Console Statement
   `console.log('\n📁 SCANNING SOURCE FILES...\n');`

4. Line 123: Console Statement
   `// Check for console.log (should use proper logging)`

5. Line 124: Console Statement
   `if (line.includes('console.log') && !filePath.includes('test')) {`

*...and 43 more errors*

### 6. `scripts/phase1-truth-verifier.js` (46 errors)

**Error Distribution**:

- Lint/Code Quality: 32
- Deployment Issues: 12
- Code Maintenance (TODO/FIXME): 1
- Runtime Errors: 1

**Examples**:

1. Line 12: Console Statement
   `console.log("\n🔍 VERIFYING PHASE 1 '100% COMPLETE' CLAIM");`

2. Line 13: Console Statement
   `console.log("=".repeat(70));`

3. Line 24: Console Statement
   `console.log(`\n📦 Testing ${moduleName}...`);`

4. Line 30: Console Statement
   `console.log(`  ✅ REAL: ${result.message}`);`

5. Line 33: Console Statement
   `console.log(`  ❌ FAKE: ${result.message}`);`

*...and 41 more errors*

### 7. `scripts/property-owner-verification.js` (46 errors)

**Error Distribution**:

- Lint/Code Quality: 43
- Deployment Issues: 1
- Test Errors: 1
- Runtime Errors: 1

**Examples**:

1. Line 3: Hardcoded Localhost
   `const BASE_URL = 'http://localhost:5000';`

2. Line 21: Console Statement
   `console.log('❌ AUTH FAILED - Backend not running?');`

3. Line 27: Console Statement
   `console.log('\n' + colors.blue + '=' .repeat(80) + colors.reset);`

4. Line 28: Console Statement
   `console.log(colors.blue + '🏢 PROPERTY OWNER & SUBSCRIPTION SYSTEM VERIFICATION' + colors.reset);`

5. Line 29: Console Statement
   `console.log(colors.blue + '=' .repeat(80) + colors.reset + '\n');`

*...and 41 more errors*

### 8. `scripts/add-database-indexes.js` (46 errors)

**Error Distribution**:

- Lint/Code Quality: 41
- Runtime Errors: 3
- Test Errors: 2

**Examples**:

1. Line 11: Console Statement
   `console.log('🔗 Connecting to MongoDB...');`

2. Line 13: Console Statement
   `console.log('✅ Connected to MongoDB');`

3. Line 17: Console Statement
   `console.log('\n📊 Adding database indexes...');`

4. Line 18: Console Statement
   `console.log('=====================================');`

5. Line 21: Console Statement
   `console.log('👤 Adding User indexes...');`

*...and 41 more errors*

### 9. `analyze-imports.js` (45 errors)

**Error Distribution**:

- Lint/Code Quality: 43
- Test Errors: 1
- Runtime Errors: 1

**Examples**:

1. Line 30: Console Statement
   `console.log('==========================================');`

2. Line 31: Console Statement
   `console.log('COMPREHENSIVE IMPORT ANALYSIS');`

3. Line 32: Console Statement
   `console.log('==========================================\n');`

4. Line 33: Console Statement
   `console.log(`Total files: ${files.length}\n`);`

5. Line 106: Console Statement
   `console.log('==========================================');`

*...and 40 more errors*

### 10. `analyze-system-errors.js` (45 errors)

**Error Distribution**:

- Lint/Code Quality: 26
- Build Errors: 5
- TypeScript Errors: 3
- Runtime Errors: 2
- Configuration Issues: 2
- Database Errors: 2
- API Errors: 2
- Test Errors: 1
- Security Issues: 1
- Deployment Issues: 1

**Examples**:

1. Line 12: Console Statement
   `console.log('🔍 Starting comprehensive system error analysis...\n');`

2. Line 33: Console Statement
   `console.log('📂 Collecting file list...');`

3. Line 44: Console Error
   `console.error('❌ Error collecting files:', error.message);`

4. Line 45: Disabled Test (xit)
   `process.exit(1);`

5. Line 45: Process Exit
   `process.exit(1);`

*...and 40 more errors*

### 11. `scripts/verification-checkpoint.js` (45 errors)

**Error Distribution**:

- Lint/Code Quality: 35
- Deployment Issues: 8
- Test Errors: 1
- Runtime Errors: 1

**Examples**:

1. Line 17: Console Statement
   `console.log("🔍 STEP 1: QUICK HEALTH CHECK");`

2. Line 29: Hardcoded Localhost
   `const health = await fetch('http://localhost:5000/');`

3. Line 36: Hardcoded Localhost
   `const landing = await fetch('http://localhost:5000');`

4. Line 40: Hardcoded Localhost
   `const loginTest = await fetch('http://localhost:5000/api/auth/login', {`

5. Line 51: Hardcoded Localhost
   `const dashboard = await fetch('http://localhost:5000/dashboard.html');`

*...and 40 more errors*

### 12. `scripts/fixzit-unified-audit-system.js` (43 errors)

**Error Distribution**:

- Lint/Code Quality: 42
- Runtime Errors: 1

**Examples**:

1. Line 224: Console Statement
   `console.log('✅ Syncing FM RFQs to Souq marketplace...');`

2. Line 229: Console Statement
   `console.log('✅ Creating FM Work Orders from Souq service orders...');`

3. Line 234: Console Statement
   `console.log('✅ Syncing properties to Aqar listings...');`

4. Line 239: Console Statement
   `console.log('✅ Converting Aqar maintenance requests to FM tickets...');`

5. Line 244: Console Statement
   `console.log('✅ Sourcing services for Aqar listings from Souq...');`

*...and 38 more errors*

### 13. `scripts/replace-string-in-file-verbose.ts` (43 errors)

**Error Distribution**:

- Runtime Errors: 40
- Lint/Code Quality: 3

**Examples**:

1. Line 156: Console Error
   `console.error("🔍 VERBOSE MODE - Detailed logging enabled");`

2. Line 157: Console Error
   `console.error("");`

3. Line 160: Console Error
   `console.error("📋 Options:", JSON.stringify(opts, null, 2));`

4. Line 161: Console Error
   `console.error("");`

5. Line 164: Console Error
   `console.error("🎯 Pattern:", pattern);`

*...and 38 more errors*

### 14. `qa/tests/lib-paytabs.create-payment.default.spec.ts` (38 errors)

**Error Distribution**:

- TypeScript Errors: 38

**Examples**:

1. Line 36: Any Type Usage
   `const calls: any[] = [];`

2. Line 37: Any Type Usage
   `globalThis.fetch = ((...args: any[]) => {`

3. Line 39: Type Cast to Any
   `return Promise.resolve({ json: async () => mockResponse } as any);`

4. Line 40: Type Cast to Any
   `}) as any;`

5. Line 89: Type Cast to Any
   `globalThis.fetch = originalFetch as any;`

*...and 33 more errors*

### 15. `final-typescript-fix.js` (36 errors)

**Error Distribution**:

- Lint/Code Quality: 23
- TypeScript Errors: 13

**Examples**:

1. Line 10: Console Statement
   `console.log('🚀 FINAL TYPESCRIPT ERROR CLEANUP\n');`

2. Line 21: Console Statement
   `console.log(`📊 Total errors: ${errorLines.length}\n`);`

3. Line 34: Console Statement
   `console.log(`📁 Files with errors: ${Object.keys(fileErrors).length}\n`);`

4. Line 42: Console Statement
   `console.log(`🔧 ${filePath} (${errors.length} errors)`);`

5. Line 50: Any Type Usage
   `// 1. Replace (param: unknown) with (param: any)`

*...and 31 more errors*

### 16. `scripts/fixzit-comprehensive-audit.js` (36 errors)

**Error Distribution**:

- Lint/Code Quality: 35
- Runtime Errors: 1

**Examples**:

1. Line 153: Console Statement
   `// Check for console.log statements`

2. Line 415: Console Statement
   `console.log('\n' + colors.bright + colors.cyan + '════════════════════════════════════════════════════════════════');`

3. Line 416: Console Statement
   `console.log('                 FIXZIT SOUQ AUDIT REPORT V2                    ');`

4. Line 417: Console Statement
   `console.log('                    POST-FIX ANALYSIS                           ');`

5. Line 418: Console Statement
   `console.log('════════════════════════════════════════════════════════════════' + colors.reset);`

*...and 31 more errors*

### 17. `scripts/setup-production-db.ts` (35 errors)

**Error Distribution**:

- Lint/Code Quality: 21
- Runtime Errors: 10
- Test Errors: 4

**Examples**:

1. Line 12: Console Statement
   `console.log('🔧 Validating Production MongoDB Configuration...\n');`

2. Line 24: Console Error
   `console.error('❌ Missing required environment variables:');`

3. Line 25: Console Error
   `missing.forEach(env => console.error(`   - ${env}`));`

4. Line 26: Disabled Test (xit)
   `process.exit(1);`

5. Line 26: Process Exit
   `process.exit(1);`

*...and 30 more errors*

### 18. `scripts/scan-hex.js` (35 errors)

**Error Distribution**:

- Runtime Errors: 25
- Lint/Code Quality: 7
- Test Errors: 3

**Examples**:

1. Line 94: Console Statement
   `console.log('🎨 Fixzit Brand Color Scanner');`

2. Line 95: Console Statement
   `console.log('================================\n');`

3. Line 106: Console Error
   `console.error('❌ Error: Not a git repository or git not available');`

4. Line 107: Disabled Test (xit)
   `process.exit(1);`

5. Line 107: Process Exit
   `process.exit(1);`

*...and 30 more errors*

### 19. `test-e2e-comprehensive.js` (34 errors)

**Error Distribution**:

- Lint/Code Quality: 26
- Runtime Errors: 4
- Test Errors: 2
- Configuration Issues: 1
- Deployment Issues: 1

**Examples**:

1. Line 11: Fallback Env Variable
   `const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';`

2. Line 11: Hardcoded Localhost
   `const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';`

3. Line 21: Console Statement
   `console.log(`✅ ${name}`);`

4. Line 25: Console Error
   `console.error(`❌ ${name}: ${err.message}`);`

5. Line 64: Console Statement
   `console.log(`  📊 Found ${collections.length} collections`);`

*...and 29 more errors*

### 20. `scripts/deploy-db-verify.ts` (32 errors)

**Error Distribution**:

- Lint/Code Quality: 21
- Runtime Errors: 4
- TypeScript Errors: 3
- Test Errors: 3
- Configuration Issues: 1

**Examples**:

1. Line 21: Any Type Usage
   `details?: any;`

2. Line 27: Generic Any Type
   `private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {`

3. Line 30: Console Statement
   `console.log(`🧪 Testing: ${testName}...`);`

4. Line 41: Console Statement
   `console.log(`✅ ${testName} - ${duration}ms`);`

5. Line 51: Console Statement
   `console.log(`❌ ${testName} - Failed in ${duration}ms: ${error}`);`

*...and 27 more errors*

## 📋 Detailed Error Breakdown by Category

### Lint/Code Quality (1716 errors)

#### Console Statement (1603 occurrences)

1. **fix-imports.js:4**

   ```
   console.log("�� Starting import path fixes...");
   ```

2. **fix-imports.js:23**

   ```
   console.log(`✅ Fixed ${oldPath} → ${newPath}`);
   ```

3. **fix-imports.js:29**

   ```
   console.log("✅ File updated successfully!");
   ```

4. **fix-imports.js:31**

   ```
   console.log("ℹ️ No changes needed in test file");
   ```

5. **fix-imports.js:34**

   ```
   console.log("File not found for testing");
   ```

6. **create-guardrails.js:8**

   ```
   console.log('Created:', file);
   ```

7. **create-guardrails.js:11**

   ```
   console.log('Setting up guardrails...\n');
   ```

8. **create-guardrails.js:25**

   ```
   console.log('Updated: package.json\n');
   ```

9. **create-guardrails.js:29**

   ```
   write('scripts/dedup/consolidate.ts', '#!/usr/bin/env tsx\nconst DRY = process.argv.includes(\"--dry\");\nconsole.log(DRY ? \"DRY RUN\" : \"APPLYING\"
   ```

10. **create-guardrails.js:30**

   ```
   write('scripts/ui/ui_freeze_check.ts', '#!/usr/bin/env tsx\nimport fs from \"fs\";\nif (fs.existsSync(\"app/layout.tsx\")) console.log(\"OK\");');
   ```

   *...and 1593 more occurrences*

#### ESLint Disabled (58 occurrences)

1. **components/CopilotWidget.tsx:101**

   ```
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ```

2. **components/marketplace/CatalogView.tsx:279**

   ```
   // eslint-disable-next-line @next/next/no-img-element
   ```

3. **src/server/models/marketplace/Product.ts:41**

   ```
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ```

4. **lib/markdown.ts:20**

   ```
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ```

5. **lib/db/index.ts:113**

   ```
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   ```

6. **lib/marketplace/context.ts:28**

   ```
   // eslint-disable-next-line no-console
   ```

7. **lib/marketplace/context.ts:46**

   ```
   // eslint-disable-next-line no-console
   ```

8. **lib/marketplace/context.ts:64**

   ```
   // eslint-disable-next-line no-console
   ```

9. **lib/marketplace/serverFetch.ts:24**

   ```
   // eslint-disable-next-line no-console
   ```

10. **lib/marketplace/serverFetch.ts:60**

   ```
   // eslint-disable-next-line no-console
   ```

   *...and 48 more occurrences*

#### TypeScript Error Suppressed (28 occurrences)

1. **lib/sla.spec.ts:89**

   ```
   // @ts-ignore
   ```

2. **lib/sla.spec.ts:98**

   ```
   // @ts-ignore
   ```

3. **lib/ats/scoring.test.ts:4**

   ```
   // @ts-ignore
   ```

4. **lib/ats/scoring.test.ts:11**

   ```
   // @ts-ignore testing runtime with non-string-like falsy converted upstream
   ```

5. **lib/ats/scoring.test.ts:13**

   ```
   // @ts-ignore null as unexpected input
   ```

6. **analyze-system-errors.js:447**

   ```
   md += `  - Replace \`// @ts-ignore\` with proper type fixes\n`;
   ```

7. **qa/qaPatterns.ts:32**

   ```
   //@ts-ignore
   ```

8. **scripts/fixzit-pack.ts:4**

   ```
   // @ts-ignore - No type declarations available
   ```

9. **scripts/dedupe-merge.ts:5**

   ```
   // @ts-ignore - No type declarations available
   ```

10. **app/test/help_support_ticket_page.test.tsx:23**

   ```
   // @ts-ignore
   ```

   *...and 18 more occurrences*

#### Expected TypeScript Error (25 occurrences)

1. **lib/utils.test.ts:64**

   ```
   // @ts-expect-error Testing runtime robustness against undefined
   ```

2. **lib/utils.test.ts:66**

   ```
   // @ts-expect-error Testing runtime robustness against null
   ```

3. **lib/utils.test.ts:68**

   ```
   // @ts-expect-error Testing runtime robustness against number
   ```

4. **lib/utils.test.ts:70**

   ```
   // @ts-expect-error Testing runtime robustness against object
   ```

5. **lib/ats/scoring.test.ts:72**

   ```
   // @ts-expect-error testing runtime behavior on null
   ```

6. **lib/ats/scoring.test.ts:74**

   ```
   // @ts-expect-error testing runtime behavior on undefined
   ```

7. **qa/qaPatterns.ts:30**

   ```
   // @ts-expect-error
   ```

8. **tests/ats.scoring.test.ts:87**

   ```
   // @ts-expect-error - intentional invalid type to test runtime behavior
   ```

9. **tests/ats.scoring.test.ts:89**

   ```
   // @ts-expect-error
   ```

10. **tests/scripts/seed-marketplace.mjs.test.ts:150**

   ```
   // @ts-expect-error - Restoring original Date.now implementation
   ```

   *...and 15 more occurrences*

#### TypeScript Check Disabled (2 occurrences)

1. **tests/api/marketplace/search.route.impl.ts:1**

   ```
   // @ts-nocheck
   ```

2. **tests/pages/product.slug.page.test.ts:12**

   ```
   // @ts-nocheck
   ```

### TypeScript Errors (632 errors)

#### Type Cast to Any (320 occurrences)

1. **components/fm/**tests**/WorkOrdersView.test.tsx:34**

   ```
   (global as any).fetch = jest.fn();
   ```

2. **components/fm/**tests**/WorkOrdersView.test.tsx:35**

   ```
   (window.localStorage as any).clear();
   ```

3. **components/fm/**tests**/WorkOrdersView.test.tsx:36**

   ```
   (window as any).alert = jest.fn();
   ```

4. **components/marketplace/CatalogView.test.tsx:31**

   ```
   const jestLike = (global as any).vi ?? (global as any).jest
   ```

5. **components/marketplace/CatalogView.test.tsx:31**

   ```
   const jestLike = (global as any).vi ?? (global as any).jest
   ```

6. **components/marketplace/CatalogView.test.tsx:95**

   ```
   productsState.mutate = state.mutate as any
   ```

7. **components/marketplace/CatalogView.test.tsx:109**

   ```
   ;(swrModule as any).default = (key: any, fetcher: any, opts: any) => {
   ```

8. **components/marketplace/CatalogView.test.tsx:176**

   ```
   ;(global as any).fetch = undefined
   ```

9. **components/marketplace/CatalogView.test.tsx:282**

   ```
   ;(global as any).fetch = fetchSpy
   ```

10. **components/marketplace/CatalogView.test.tsx:298**

   ```
   ;(global as any).fetch = fetchSpy
   ```

   *...and 310 more occurrences*

#### Any Type Usage (277 occurrences)

1. **components/fm/**tests**/WorkOrdersView.test.tsx:46**

   ```
   const makeApiResponse = (items: any[], page = 1, limit = 10, total?: number) => ({
   ```

2. **components/marketplace/CatalogView.test.tsx:37**

   ```
   default: ({ isOpen, title = 'Sign in to continue' }: any) => (
   ```

3. **components/marketplace/CatalogView.test.tsx:47**

   ```
   data?: any
   ```

4. **components/marketplace/CatalogView.test.tsx:48**

   ```
   error?: any
   ```

5. **components/marketplace/CatalogView.test.tsx:50**

   ```
   mutate?: jest.Mock | ((...args: any[]) => any)
   ```

6. **components/marketplace/CatalogView.test.tsx:53**

   ```
   data?: any
   ```

7. **components/marketplace/CatalogView.test.tsx:54**

   ```
   error?: any
   ```

8. **components/marketplace/CatalogView.test.tsx:61**

   ```
   const useSWRCalls: Array<{ key: any; fetcher: any; opts: any }> = []
   ```

9. **components/marketplace/CatalogView.test.tsx:61**

   ```
   const useSWRCalls: Array<{ key: any; fetcher: any; opts: any }> = []
   ```

10. **components/marketplace/CatalogView.test.tsx:61**

   ```
   const useSWRCalls: Array<{ key: any; fetcher: any; opts: any }> = []
   ```

   *...and 267 more occurrences*

#### Any in Record Type (22 occurrences)

1. **components/CopilotWidget.tsx:102**

   ```
   type ToolFormState = Record<string, any>;
   ```

2. **src/server/models/marketplace/Product.ts:42**

   ```
   specs: Record<string, any>;
   ```

3. **lib/marketplace/search.ts:107**

   ```
   const query: Record<string, any> = { orgId: filters.orgId, status: 'ACTIVE' };
   ```

4. **final-typescript-fix.js:59**

   ```
   // 4. Replace Record<string, unknown> with Record<string, any>
   ```

5. **final-typescript-fix.js:60**

   ```
   content = content.replace(/Record<string,\s*unknown>/g, 'Record<string, any>');
   ```

6. **qa/tests/api-projects.spec.ts:25**

   ```
   function validProjectPayload(overrides: Partial<Record<string, any>> = {}) {
   ```

7. **qa/tests/i18n-en.unit.spec.ts:10**

   ```
   type Dict = Record<string, any>;
   ```

8. **app/api/public/rfqs/route.test.ts:24**

   ```
   type RFQDoc = Record<string, any>;
   ```

9. **tests/scripts/seed-marketplace.ts.test.ts:18**

   ```
   type AnyRec = Record<string, any>;
   ```

10. **tests/scripts/seed-marketplace.mjs.test.ts:25**

   ```
   type Doc = Record<string, any>;
   ```

   *...and 12 more occurrences*

#### Generic Any Type (13 occurrences)

1. **components/marketplace/CatalogView.test.tsx:123**

   ```
   function makeProduct(overrides: Partial<any> = {}) {
   ```

2. **lib/auth.test.ts:175**

   ```
   const makeUser = (overrides: Partial<any> = {}) => ({
   ```

3. **analyze-system-errors.js:83**

   ```
   { pattern: /<any>/g, type: 'Generic Any Type' },
   ```

4. **qa/AutoFixAgent.tsx:42**

   ```
   const originalFetchRef = useRef<any>(null);
   ```

5. **scripts/deploy-db-verify.ts:27**

   ```
   private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
   ```

6. **app/product/[slug]/**tests**/page.spec.tsx:34**

   ```
   const makeData = (overrides?: Partial<any>) => {
   ```

7. **app/fm/marketplace/page.test.tsx:29**

   ```
   const [Comp, setComp] = React.useState<React.ComponentType<any> | null>(null);
   ```

8. **app/fm/marketplace/page.test.tsx:34**

   ```
   setComp(() => ((mod && (mod.default || mod)) as React.ComponentType<any>));
   ```

9. **app/test/api_help_articles_route.test.ts:40**

   ```
   let GET: (req: NextRequest) => Promise<any>
   ```

10. **tests/unit/api/qa/alert.route.test.ts:23**

   ```
   json: () => Promise<any>;
   ```

   *...and 3 more occurrences*

### Runtime Errors (423 errors)

#### Console Error (323 occurrences)

1. **components/AIChat.tsx:79**

   ```
   console.error('AI Chat error:', error);
   ```

2. **components/ErrorBoundary.tsx:218**

   ```
   console.error('🚨 UI Error Caught:', {
   ```

3. **components/ErrorBoundary.tsx:309**

   ```
   console.error('❌ Auto-fix failed:', fixError);
   ```

4. **components/ErrorBoundary.tsx:460**

   ```
   console.error('Failed to send welcome email:', error);
   ```

5. **components/ClientLayout.tsx:71**

   ```
   console.error('Failed to fetch user role:', error);
   ```

6. **components/CopilotWidget.tsx:188**

   ```
   console.error('Copilot profile error', err);
   ```

7. **components/CopilotWidget.tsx:238**

   ```
   console.error('Copilot chat error', error);
   ```

8. **components/CopilotWidget.tsx:281**

   ```
   console.error('Tool error', error);
   ```

9. **components/fm/WorkOrdersView.tsx:384**

   ```
   console.error('Failed to create work order', error);
   ```

10. **components/marketplace/ProductCard.tsx:53**

   ```
   console.error('Failed to add product to cart', error);
   ```

   *...and 313 more occurrences*

#### Process Exit (96 occurrences)

1. **lib/database.ts:39**

   ```
   process.exit(0);
   ```

2. **lib/database.ts:45**

   ```
   process.exit(0);
   ```

3. **lib/database.ts:51**

   ```
   process.exit(1);
   ```

4. **lib/database.ts:57**

   ```
   process.exit(1);
   ```

5. **lib/auth.ts:42**

   ```
   process.exit(1);
   ```

6. **analyze-imports.js:194**

   ```
   process.exit(totalIssues > 0 ? 1 : 0);
   ```

7. **analyze-system-errors.js:45**

   ```
   process.exit(1);
   ```

8. **scripts/verify-core.ts:57**

   ```
   process.exit(success ? 0 : 1);
   ```

9. **scripts/ensure-indexes.ts:25**

   ```
   process.exit(0);
   ```

10. **scripts/ensure-indexes.ts:28**

   ```
   process.exit(1);
   ```

   *...and 86 more occurrences*

#### Empty Catch Block (4 occurrences)

1. **components/ErrorBoundary.tsx:285**

   ```
   }).catch(() => {}); // Fire and forget
   ```

2. **components/ErrorBoundary.tsx:339**

   ```
   }).catch(() => {}); // Fire and forget
   ```

3. **components/AutoIncidentReporter.tsx:33**

   ```
   fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(()=>{});
   ```

4. **packages/fixzit-souq-server/server.js:122**

   ```
   connectDatabase().catch(() => {});
   ```

### Test Errors (125 errors)

#### Disabled Test (xit) (96 occurrences)

1. **lib/database.ts:39**

   ```
   process.exit(0);
   ```

2. **lib/database.ts:45**

   ```
   process.exit(0);
   ```

3. **lib/database.ts:51**

   ```
   process.exit(1);
   ```

4. **lib/database.ts:57**

   ```
   process.exit(1);
   ```

5. **lib/auth.ts:42**

   ```
   process.exit(1);
   ```

6. **analyze-imports.js:194**

   ```
   process.exit(totalIssues > 0 ? 1 : 0);
   ```

7. **analyze-system-errors.js:45**

   ```
   process.exit(1);
   ```

8. **scripts/verify-core.ts:57**

   ```
   process.exit(success ? 0 : 1);
   ```

9. **scripts/ensure-indexes.ts:25**

   ```
   process.exit(0);
   ```

10. **scripts/ensure-indexes.ts:28**

   ```
   process.exit(1);
   ```

   *...and 86 more occurrences*

#### Skipped Test (29 occurrences)

1. **modules/organizations/service.ts:23**

   ```
   Organization.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
   ```

2. **modules/users/service.ts:25**

   ```
   User.find(query).sort(sort).skip(skip).limit(limit).select('-passwordHash').lean().exec(),
   ```

3. **lib/marketplace/search.ts:141**

   ```
   Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
   ```

4. **packages/fixzit-souq-server/routes/marketplace.js:48**

   ```
   .skip(skip)
   ```

5. **qa/tests/07-marketplace-page.spec.ts:78**

   ```
   if (!usedStub) test.skip();
   ```

6. **qa/tests/07-marketplace-page.spec.ts:117**

   ```
   if (!usedStub) test.skip();
   ```

7. **qa/tests/07-marketplace-page.spec.ts:149**

   ```
   if (!usedStub) test.skip();
   ```

8. **qa/tests/07-marketplace-page.spec.ts:166**

   ```
   if (!usedStub) test.skip();
   ```

9. **qa/tests/07-marketplace-page.spec.ts:182**

   ```
   if (!usedStub) test.skip();
   ```

10. **qa/tests/07-marketplace-page.spec.ts:198**

   ```
   if (!usedStub) test.skip();
   ```

   *...and 19 more occurrences*

### Deployment Issues (92 errors)

#### Hardcoded Localhost (91 occurrences)

1. **next.config.js:112**

   ```
   destination: 'http://localhost:5000/api/marketplace/:path*',
   ```

2. **next.config.js:116**

   ```
   destination: 'http://localhost:5000/api/properties/:path*',
   ```

3. **next.config.js:120**

   ```
   destination: 'http://localhost:5000/api/workorders/:path*',
   ```

4. **next.config.js:124**

   ```
   destination: 'http://localhost:5000/api/finance/:path*',
   ```

5. **next.config.js:128**

   ```
   destination: 'http://localhost:5000/api/hr/:path*',
   ```

6. **next.config.js:132**

   ```
   destination: 'http://localhost:5000/api/crm/:path*',
   ```

7. **next.config.js:136**

   ```
   destination: 'http://localhost:5000/api/compliance/:path*',
   ```

8. **next.config.js:140**

   ```
   destination: 'http://localhost:5000/api/analytics/:path*',
   ```

9. **lib/mongo.ts:44**

   ```
   const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
   ```

10. **lib/marketplace/serverFetch.ts:46**

   ```
   return headerUrl ?? 'http://localhost:3000';
   ```

   *...and 81 more occurrences*

#### Deployment TODO (1 occurrences)

1. **analyze-system-errors.js:139**

   ```
   { pattern: /TODO.*deploy/gi, type: 'Deployment TODO' },
   ```

### Configuration Issues (63 errors)

#### Fallback Env Variable (61 occurrences)

1. **components/AutoIncidentReporter.tsx:9**

   ```
   const enabled = String(process.env.NEXT_PUBLIC_ENABLE_INCIDENTS || 'true') !== 'false';
   ```

2. **components/marketplace/CatalogView.tsx:86**

   ```
   const DEFAULT_TENANT = process.env.NEXT_PUBLIC_MARKETPLACE_TENANT || 'demo-tenant';
   ```

3. **src/server/models/AtsSettings.ts:68**

   ```
   const targetOrg = orgId || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
   ```

4. **lib/mongo.ts:44**

   ```
   const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
   ```

5. **lib/mongo.ts:45**

   ```
   const dbName = process.env.MONGODB_DB || 'fixzit';
   ```

6. **lib/storage/s3.ts:4**

   ```
   const REGION = process.env.AWS_REGION || 'us-east-1';
   ```

7. **lib/storage/s3.ts:5**

   ```
   const BUCKET = process.env.AWS_S3_BUCKET || '';
   ```

8. **lib/paytabs/config.ts:21**

   ```
   baseUrl: process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa',
   ```

9. **lib/paytabs.config.ts:9**

   ```
   baseUrl: process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa'
   ```

10. **lib/edge-auth-middleware.ts:23**

   ```
   const secret = process.env.JWT_SECRET || 'dev-secret';
   ```

   *...and 51 more occurrences*

#### TODO Configuration (1 occurrences)

1. **analyze-system-errors.js:116**

   ```
   { pattern: /TODO.*config/gi, type: 'TODO Configuration' },
   ```

#### Config Fix Required (1 occurrences)

1. **analyze-system-errors.js:117**

   ```
   { pattern: /FIXME.*config/gi, type: 'Config Fix Required' }
   ```

### Security Issues (17 errors)

#### Dangerous HTML (5 occurrences)

1. **analyze-system-errors.js:99**

   ```
   { pattern: /dangerouslySetInnerHTML/g, type: 'Dangerous HTML' },
   ```

2. **qa/tests/07-help-article-page-code.spec.ts:75**

   ```
   test("renders content via dangerouslySetInnerHTML with await renderMarkdown(a.content)", async () => {
   ```

3. **qa/tests/07-help-article-page-code.spec.ts:76**

   ```
   expect(code).toMatch(/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*await\s+renderMarkdown\(\s*a\.content\s*\)\s*\}\}/);
   ```

4. **app/cms/[slug]/page.tsx:45**

   ```
   dangerouslySetInnerHTML={{ __html: await renderMarkdown(page.content) }}
   ```

5. **app/help/[slug]/page.tsx:47**

   ```
   dangerouslySetInnerHTML={{ __html: await renderMarkdownSanitized(a.content) }}
   ```

#### Token in LocalStorage (4 occurrences)

1. **components/fm/**tests**/WorkOrdersView.test.tsx:368**

   ```
   window.localStorage.setItem('fixzit_token', 'tkn-123');
   ```

2. **public/ui-bootstrap.js:103**

   ```
   localStorage.setItem("token", data.token);
   ```

3. **public/app.js:75**

   ```
   localStorage.setItem('fixzit_token', this.token);
   ```

4. **tests/unit/components/SupportPopup.test.tsx:165**

   ```
   window.localStorage.setItem("x-user", "user-token");
   ```

#### Hardcoded Secret (4 occurrences)

1. **lib/auth.test.ts:149**

   ```
   process.env.JWT_SECRET = 'fixed-secret';
   ```

2. **scripts/server.js:104**

   ```
   if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'dev-jwt-secret-fixzit-2024';
   ```

3. **scripts/server.js:105**

   ```
   if (!process.env.REFRESH_TOKEN_SECRET) process.env.REFRESH_TOKEN_SECRET = 'dev-refresh-secret-fixzit-2024';
   ```

4. **scripts/test-auth-fix.js:6**

   ```
   process.env.JWT_SECRET = 'test-secret-key-change-in-production';
   ```

#### Hardcoded Password (3 occurrences)

1. **lib/auth.test.ts:74**

   ```
   const password = 'P@ssw0rd!';
   ```

2. **scripts/create-test-data.js:23**

   ```
   console.error('💡 Set it with: export DEFAULT_PASSWORD="your-secure-password"');
   ```

3. **public/ui-bootstrap.js:92**

   ```
   window.loginToBackend = async function(email = "admin@test.com", password = "password123") {
   ```

#### Eval Usage (1 occurrences)

1. **scripts/scanner.js:213**

   ```
   { pattern: /eval\s*\(/g, issue: 'eval() usage detected', severity: Severity.CRITICAL },
   ```

### Build Errors (7 errors)

#### Reference Error (3 occurrences)

1. **components/ErrorBoundary.tsx:179**

   ```
   pattern: /TypeError|ReferenceError/,
   ```

2. **analyze-system-errors.js:58**

   ```
   { pattern: /ReferenceError/g, type: 'Reference Error' }
   ```

3. **tests/unit/components/ErrorBoundary.test.tsx:268**

   ```
   <ChildThatThrows message={"Stack gen"} name="ReferenceError" />
   ```

#### Webpack Error (1 occurrences)

1. **analyze-system-errors.js:54**

   ```
   { pattern: /webpack.*error/gi, type: 'Webpack Error' },
   ```

#### Compilation Error (1 occurrences)

1. **analyze-system-errors.js:55**

   ```
   { pattern: /compilation\s+error/gi, type: 'Compilation Error' },
   ```

#### Build Failure (1 occurrences)

1. **analyze-system-errors.js:56**

   ```
   { pattern: /build\s+fail/gi, type: 'Build Failure' },
   ```

#### Syntax Error (1 occurrences)

1. **analyze-system-errors.js:57**

   ```
   { pattern: /SyntaxError/g, type: 'Syntax Error' },
   ```

### Code Maintenance (TODO/FIXME) (3 errors)

#### TODO Comment (3 occurrences)

1. **scripts/phase1-truth-verifier.js:252**

   ```
   content.includes('// TODO') ||
   ```

2. **scripts/reality-check.js:134**

   ```
   content.includes('// TODO') ||
   ```

3. **smart-merge-conflicts.ts:138**

   ```
   '// TODO: Review this merge - both sides had changes',
   ```

### Database Errors (2 errors)

#### Missing Await on DB Query (1 occurrences)

1. **analyze-system-errors.js:123**

   ```
   { pattern: /findOne.*without.*await/g, type: 'Missing Await on DB Query' },
   ```

#### Database TODO (1 occurrences)

1. **analyze-system-errors.js:124**

   ```
   { pattern: /TODO.*database/gi, type: 'Database TODO' },
   ```

### API Errors (2 errors)

#### API TODO (1 occurrences)

1. **analyze-system-errors.js:132**

   ```
   { pattern: /TODO.*api/gi, type: 'API TODO' },
   ```

#### API Fix Required (1 occurrences)

1. **analyze-system-errors.js:133**

   ```
   { pattern: /FIXME.*api/gi, type: 'API Fix Required' },
   ```

## 🎯 Recommended Fix Strategy

### Phase 1: Quick Wins (Estimated 2-3 hours)

- **Lint/Code Quality** (1716 errors)
  - Remove unnecessary `console.log` statements
  - Replace `// @ts-ignore` with proper type fixes
  - Clean up ESLint disable comments

- **TypeScript Errors** (632 errors)
  - Replace `: any` with proper types
  - Fix `as any` type casts
  - Add proper type definitions

### Phase 2: Medium Priority (Estimated 4-6 hours)

- **Runtime Errors** (423 errors)

- **Test Errors** (125 errors)

- **Deployment Issues** (92 errors)

### Phase 3: Long-term Improvements (Ongoing)

- **Configuration Issues** (63 errors)
- **Security Issues** (17 errors)
- **Build Errors** (7 errors)
- **Code Maintenance (TODO/FIXME)** (3 errors)
- **Database Errors** (2 errors)
- **API Errors** (2 errors)

## 📊 Progress Tracking

Use the CSV file (`system-errors-report.csv`) to track progress:

```bash
# Count remaining errors by category
grep "lintErrors" system-errors-report.csv | wc -l

# Find all errors in a specific file
grep "your-file.ts" system-errors-report.csv

# Export specific category to work on
grep "Console Statement" system-errors-report.csv > console-cleanup.csv
```

---

*This report was automatically generated by the System Error Analysis Tool*  
*Generated at: 2025-10-15T06:45:14.571Z*
