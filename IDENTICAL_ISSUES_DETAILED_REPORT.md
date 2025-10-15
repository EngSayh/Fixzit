# تقرير المشاكل المتطابقة والمتشابهة - تفصيلي

> **تاريخ الإنشاء**: ١٥‏/١٠‏/٢٠٢٥، ٣:٤٥:٠٢ م  
> **إجمالي الحالات المكتشفة**: 3,002  
> **عدد الأنماط**: 17

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
| 1 | console.log | 1,576 | 52.5% | 🔴 حرج |
| 2 | console.error | 327 | 10.9% | 🔴 حرج |
| 3 | Type Cast to Any | 307 | 10.2% | 🔴 حرج |
| 4 | Any Type Declaration | 288 | 9.6% | 🟡 مهم |
| 5 | process.exit() Calls | 192 | 6.4% | 🟡 مهم |
| 6 | Hardcoded Localhost | 103 | 3.4% | 🟡 مهم |
| 7 | ESLint Disable Comments | 59 | 2.0% | 🟢 عادي |
| 8 | @ts-ignore Comments | 54 | 1.8% | 🟢 عادي |
| 9 | console.warn | 43 | 1.4% | 🟢 عادي |
| 10 | @ts-expect-error Comments | 25 | 0.8% | 🟢 عادي |

---

## 📋 التفاصيل الكاملة حسب النمط

### console.log (1,576 حالة)

- **عدد الملفات المتأثرة**: 139
- **متوسط الحالات لكل ملف**: 11.3

#### قائمة الملفات المتأثرة:

##### scripts/scanner.js (68 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `console.log(`${colors.cyan}${colors.bold}` |
| 70 | `console.log(`${colors.blue}Starting comprehensive scan...${colors.reset}\n`);` |
| 175 | `console.log(`${colors.yellow}📁 Scanning file system...${colors.reset}`);` |
| 202 | `console.log(`  ✓ Scanned ${config.stats.filesScanned} files\n`);` |
| 207 | `console.log(`${colors.yellow}🔒 Scanning security vulnerabilities...${colors.res` |
| 249 | `console.log(`  ✓ Security scan complete\n`);` |
| 254 | `console.log(`${colors.yellow}🛣️  Scanning route configuration...${colors.reset}` |
| 289 | `console.log(`  ✓ Route scan complete\n`);` |
| 294 | `console.log(`${colors.yellow}🗄️  Scanning database issues...${colors.reset}`);` |
| 326 | `console.log(`  ✓ Database scan complete\n`);` |
| 331 | `console.log(`${colors.yellow}🔌 Scanning API & integrations...${colors.reset}`);` |
| 364 | `console.log(`  ✓ API scan complete\n`);` |
| 369 | `console.log(`${colors.yellow}🚀 Scanning performance issues...${colors.reset}`);` |
| 400 | `console.log(`  ✓ Performance scan complete\n`);` |
| 405 | `console.log(`${colors.yellow}📝 Scanning TypeScript/JavaScript errors...${colors` |
| 438 | `console.log(`  ✓ TypeScript scan complete\n`);` |
| 443 | `console.log(`${colors.yellow}📦 Scanning dependencies...${colors.reset}`);` |
| 475 | `console.log(`  ✓ Dependencies scan complete\n`);` |
| 480 | `console.log(`${colors.yellow}🏢 Scanning multi-tenant issues...${colors.reset}`)` |
| 508 | `console.log(`  ✓ Multi-tenant scan complete\n`);` |

*...و 48 حالة أخرى في هذا الملف*

##### scripts/unified-audit-system.js (54 حالة)

| السطر | الكود |
|-------|-------|
| 32 | `console.log('🚀 Initializing FIXZIT ENTERPRISE ECOSYSTEM...\n');` |
| 44 | `console.log('✅ Unified authentication successful');` |
| 45 | `console.log(`👤 Role: ${response.data.user.role} (Cross-platform access)\n`);` |
| 251 | `console.log('🔍 STARTING COMPLETE FIXZIT ENTERPRISE ECOSYSTEM AUDIT');` |
| 252 | `console.log('=====================================================\n');` |
| 297 | `console.log('📊 AUDITING INTEGRATED PLATFORM ECOSYSTEM');` |
| 298 | `console.log('------------------------------------------');` |
| 311 | `console.log(`🔎 Auditing ${platformName} Platform Face...`);` |
| 331 | `console.log(`  ✅ ${platformName}: ${passedModules}/${platform.modules.length} mo` |
| 383 | `console.log('\n🌉 AUDITING CROSS-PLATFORM BRIDGES');` |
| 384 | `console.log('----------------------------------');` |
| 390 | `console.log(`  Testing ${bridge.from} → ${bridge.to} bridge...`);` |
| 395 | `console.log(`    ✅ Connected (${result.latency}ms)`);` |
| 398 | `console.log(`    ❌ ${result.error}`);` |
| 418 | `console.log('\n👥 AUDITING UNIFIED ROLE MATRIX (14 ROLES)');` |
| 419 | `console.log('------------------------------------------');` |
| 428 | `console.log(`  ✅ ${roleConfig.role}: Cross-platform access verified`);` |
| 431 | `console.log(`  ❌ ${roleConfig.role}: Issues detected`);` |
| 452 | `console.log('\n⚙️ AUDITING TECHNICAL INFRASTRUCTURE');` |
| 453 | `console.log('-----------------------------------');` |

*...و 34 حالة أخرى في هذا الملف*

##### scripts/reality-check.js (47 حالة)

| السطر | الكود |
|-------|-------|
| 7 | `console.log("\n🔍 EXPOSING TRUTH ABOUT YOUR IMPLEMENTATION\n");` |
| 14 | `console.log("Testing Work Orders...");` |
| 29 | `console.log("✅ Work Orders: REAL implementation with SLA");` |
| 32 | `console.log("❌ Work Orders: FAKE - Returns placeholder message");` |
| 33 | `console.log("   FIX: Search chat for 'const workOrderSchema = new mongoose.Schem` |
| 34 | `console.log("   OR: Use attached file 'workorder-module-complete.js'");` |
| 38 | `console.log("❌ Work Orders: MISSING completely");` |
| 39 | `console.log("   ERROR:", e.message);` |
| 44 | `console.log("\nTesting Finance/ZATCA...");` |
| 58 | `console.log("✅ ZATCA: REAL QR code generation working");` |
| 61 | `console.log("❌ ZATCA: FAKE - No QR generation");` |
| 62 | `console.log("   FIX: Search chat for 'function generateZATCAQR'");` |
| 63 | `console.log("   OR: Use attached file 'finance-zatca-complete.js'");` |
| 67 | `console.log("❌ Finance: MISSING completely");` |
| 68 | `console.log("   ERROR:", e.message);` |
| 73 | `console.log("\nTesting Marketplace...");` |
| 83 | `console.log("✅ Marketplace: REAL RFQ system");` |
| 86 | `console.log("❌ Marketplace: FAKE - Placeholder response");` |
| 87 | `console.log("   FIX: Search chat for 'const RFQSchema = new mongoose.Schema'");` |
| 88 | `console.log("   OR: Use attached file 'marketplace-rfq-complete.js'");` |

*...و 27 حالة أخرى في هذا الملف*

##### scripts/complete-system-audit.js (46 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `console.log('🔍 STARTING COMPLETE SYSTEM AUDIT...\n');` |
| 32 | `console.log('=' .repeat(80));` |
| 60 | `console.log('\n📁 SCANNING SOURCE FILES...\n');` |
| 123 | `// Check for console.log (should use proper logging)` |
| 124 | `if (line.includes('console.log') && !filePath.includes('test')) {` |
| 129 | `issue: 'Using console.log instead of proper logging'` |
| 224 | `console.log('\n🌐 TESTING ALL API ENDPOINTS...\n');` |
| 295 | `console.log('\n💾 CHECKING DATABASE MODELS...\n');` |
| 343 | `console.log('\n⚙️ VERIFYING BUSINESS LOGIC...\n');` |
| 404 | `console.log('\n🔒 SECURITY AUDIT...\n');` |
| 452 | `console.log('\n⚡ PERFORMANCE CHECK...\n');` |
| 487 | `console.log('\n' + '=' .repeat(80));` |
| 488 | `console.log('📊 SYSTEM AUDIT REPORT');` |
| 489 | `console.log('=' .repeat(80) + '\n');` |
| 493 | `console.log(`🔴 TOTAL ISSUES FOUND: ${totalIssues}\n`);` |
| 497 | `console.log(`\n❌ CRITICAL ERRORS (${this.issues.errors.length}):`);` |
| 498 | `console.log('-'.repeat(80));` |
| 500 | `console.log(`${i + 1}. ${JSON.stringify(error, null, 2)}`);` |
| 506 | `console.log(`\n🔒 SECURITY ISSUES (${this.issues.security.length}):`);` |
| 507 | `console.log('-'.repeat(80));` |

*...و 26 حالة أخرى في هذا الملف*

##### scripts/property-owner-verification.js (43 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `console.log('❌ AUTH FAILED - Backend not running?');` |
| 27 | `console.log('\n' + colors.blue + '=' .repeat(80) + colors.reset);` |
| 28 | `console.log(colors.blue + '🏢 PROPERTY OWNER & SUBSCRIPTION SYSTEM VERIFICATION'` |
| 29 | `console.log(colors.blue + '=' .repeat(80) + colors.reset + '\n');` |
| 33 | `console.log('❌ Cannot proceed without authentication');` |
| 50 | `console.log(colors.yellow + '\n1️⃣ PROPERTY OWNER ROLE FEATURES' + colors.reset)` |
| 51 | `console.log('-'.repeat(60));` |
| 95 | `console.log(`  ${status} ${test.name}`);` |
| 98 | `console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}: ${e.message}`);` |
| 106 | `console.log(colors.yellow + '\n2️⃣ DEPUTY SYSTEM' + colors.reset);` |
| 107 | `console.log('-'.repeat(60));` |
| 142 | `console.log(`  ${status} ${test.name}`);` |
| 145 | `console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}`);` |
| 153 | `console.log(colors.yellow + '\n3️⃣ CORPORATE SUBSCRIPTION SYSTEM' + colors.reset` |
| 154 | `console.log('-'.repeat(60));` |
| 205 | `console.log(`  ${status} ${test.name}`);` |
| 208 | `console.log(`  ${colors.red}❌ ERROR${colors.reset} ${test.name}`);` |
| 216 | `console.log(colors.yellow + '\n4️⃣ DELEGATION OF AUTHORITY (DoA) SYSTEM' + color` |
| 217 | `console.log('-'.repeat(60));` |
| 267 | `console.log(`  ${status} ${test.name}`);` |

*...و 23 حالة أخرى في هذا الملف*

##### analyze-imports.js (43 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `console.log('==========================================');` |
| 31 | `console.log('COMPREHENSIVE IMPORT ANALYSIS');` |
| 32 | `console.log('==========================================\n');` |
| 33 | `console.log(`Total files: ${files.length}\n`);` |
| 106 | `console.log('==========================================');` |
| 107 | `console.log('IMPORT STATISTICS');` |
| 108 | `console.log('==========================================\n');` |
| 110 | `console.log(`External packages: ${importStats.external.size}`);` |
| 111 | `console.log(`Relative imports: ${importStats.relative.length}`);` |
| 112 | `console.log(`Absolute imports (@/): ${importStats.absolute.length}`);` |
| 113 | `console.log(`Node builtins: ${importStats.nodeBuiltin.size}\n`);` |
| 115 | `console.log('==========================================');` |
| 116 | `console.log('TOP 20 EXTERNAL PACKAGES');` |
| 117 | `console.log('==========================================\n');` |
| 125 | `console.log(`${status} ${pkg.padEnd(40)} (${count} imports)`);` |
| 128 | `console.log('\n==========================================');` |
| 129 | `console.log('NODE BUILTIN MODULES');` |
| 130 | `console.log('==========================================\n');` |
| 133 | `console.log(`  - ${mod}`);` |
| 136 | `console.log('\n==========================================');` |

*...و 23 حالة أخرى في هذا الملف*

##### scripts/fixzit-unified-audit-system.js (42 حالة)

| السطر | الكود |
|-------|-------|
| 224 | `console.log('✅ Syncing FM RFQs to Souq marketplace...');` |
| 229 | `console.log('✅ Creating FM Work Orders from Souq service orders...');` |
| 234 | `console.log('✅ Syncing properties to Aqar listings...');` |
| 239 | `console.log('✅ Converting Aqar maintenance requests to FM tickets...');` |
| 244 | `console.log('✅ Sourcing services for Aqar listings from Souq...');` |
| 267 | `console.log('🔍 Starting COMPLETE FIXZIT ECOSYSTEM AUDIT...\n');` |
| 294 | `console.log('📊 Auditing Facility Management Platform...');` |
| 324 | `console.log('🛒 Auditing Fixzit Souq Platform...');` |
| 354 | `console.log('🏠 Auditing Aqar Souq Platform...');` |
| 386 | `console.log('🌉 Auditing Cross-Platform Bridges...');` |
| 408 | `console.log('👥 Auditing Role Matrix (14 Roles)...');` |
| 432 | `console.log('⚙️ Auditing Technical Requirements...');` |
| 452 | `console.log('💾 Auditing Database...');` |
| 465 | `console.log('🎨 Auditing UI/UX Requirements...');` |
| 479 | `console.log('🔄 Auditing Critical Workflows...');` |
| 489 | `console.log('📋 Auditing Compliance...');` |
| 646 | `console.log('\n==================================================');` |
| 647 | `console.log('🎯 FIXZIT ECOSYSTEM AUDIT RESULTS');` |
| 648 | `console.log('==================================================');` |
| 650 | `console.log('\n📊 PLATFORM SCORES:');` |

*...و 22 حالة أخرى في هذا الملف*

##### scripts/add-database-indexes.js (40 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `console.log('🔗 Connecting to MongoDB...');` |
| 13 | `console.log('✅ Connected to MongoDB');` |
| 17 | `console.log('\n📊 Adding database indexes...');` |
| 18 | `console.log('=====================================');` |
| 21 | `console.log('👤 Adding User indexes...');` |
| 29 | `console.log('✅ User indexes created');` |
| 32 | `console.log('🏢 Adding Property indexes...');` |
| 41 | `console.log('✅ Property indexes created');` |
| 44 | `console.log('🔧 Adding WorkOrder indexes...');` |
| 54 | `console.log('✅ WorkOrder indexes created');` |
| 57 | `console.log('📄 Adding Contract indexes...');` |
| 64 | `console.log('✅ Contract indexes created');` |
| 67 | `console.log('💰 Adding Invoice indexes...');` |
| 75 | `console.log('✅ Invoice indexes created');` |
| 78 | `console.log('💳 Adding Payment indexes...');` |
| 85 | `console.log('✅ Payment indexes created');` |
| 88 | `console.log('🏪 Adding Vendor indexes...');` |
| 95 | `console.log('✅ Vendor indexes created');` |
| 98 | `console.log('📋 Adding RFQ indexes...');` |
| 105 | `console.log('✅ RFQ indexes created');` |

*...و 20 حالة أخرى في هذا الملف*

##### test-mongodb-comprehensive.js (39 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `console.log('🔌 Testing MongoDB Connection...');` |
| 15 | `console.log('✅ Connected to MongoDB');` |
| 20 | `console.log('\n📚 Testing Collections...');` |
| 22 | `console.log(`✅ Found ${collections.length} collections:`);` |
| 23 | `collections.forEach(c => console.log(`  - ${c.name}`));` |
| 28 | `console.log('\n🔍 Testing Indexes...');` |
| 34 | `console.log(`✅ ${collName}: ${indexes.length} indexes`);` |
| 37 | `console.log(`    - ${idx.name}: ${keys}${idx.unique ? ' (unique)' : ''}`);` |
| 40 | `console.log(`⚠️  ${collName}: Collection not found`);` |
| 46 | `console.log('\n✍️  Testing CRUD Operations...');` |
| 57 | `console.log(`✅ CREATE: Inserted document with ID ${insertResult.insertedId}`);` |
| 64 | `console.log(`✅ READ: Retrieved document successfully`);` |
| 74 | `console.log(`✅ UPDATE: Updated document successfully`);` |
| 81 | `console.log(`✅ DELETE: Deleted document successfully`);` |
| 85 | `console.log(`✅ CLEANUP: Dropped test collection`);` |
| 89 | `console.log('\n⚡ Testing Query Performance...');` |
| 99 | `console.log(`✅ ${collName}: ${count} documents (${duration}ms)`);` |
| 105 | `console.log(`⚠️  ${collName}: ${err.message}`);` |
| 111 | `console.log('\n💼 Testing Business Logic...');` |
| 122 | `console.log(`⚠️  Found ${duplicates.length} duplicate work order numbers`);` |

*...و 19 حالة أخرى في هذا الملف*

##### scripts/fixzit-comprehensive-audit.js (35 حالة)

| السطر | الكود |
|-------|-------|
| 153 | `// Check for console.log statements` |
| 415 | `console.log('\n' + colors.bright + colors.cyan + '══════════════════════════════` |
| 416 | `console.log('                 FIXZIT SOUQ AUDIT REPORT V2                    ');` |
| 417 | `console.log('                    POST-FIX ANALYSIS                           ');` |
| 418 | `console.log('════════════════════════════════════════════════════════════════' +` |
| 420 | `console.log('\n' + colors.bright + '📊 SUMMARY' + colors.reset);` |
| 421 | `console.log('├─ Timestamp: ' + auditResults.timestamp);` |
| 422 | `console.log('├─ Files Scanned: ' + auditResults.statistics.totalFiles);` |
| 423 | `console.log('├─ Files with Issues: ' + colors.red + auditResults.statistics.file` |
| 424 | `console.log('├─ Files Fixed: ' + colors.green + auditResults.statistics.filesFix` |
| 425 | `console.log('├─ Security Score: ' + getScoreColor(auditResults.statistics.securi` |
| 426 | `console.log('└─ Total Issues: ' + colors.yellow + issuesFound + colors.reset + '` |
| 428 | `console.log('\n' + colors.bright + '✅ FIXES APPLIED' + colors.reset);` |
| 429 | `console.log('├─ Issues Fixed: ' + colors.green + issuesFixed + colors.reset);` |
| 430 | `console.log('├─ Success Rate: ' + colors.green + Math.round((issuesFixed / 620) ` |
| 431 | `console.log('└─ Improvement: ' + colors.green + (620 - issuesFound) + ' issues r` |
| 434 | `console.log('\n' + colors.bright + '🔴 REMAINING ISSUES' + colors.reset);` |
| 439 | `console.log('\n' + colors.yellow + category.toUpperCase() + ' (' + issues.length` |
| 450 | `console.log('  📁 ' + file);` |
| 452 | `console.log('     └─ ' + issue.issue);` |

*...و 15 حالة أخرى في هذا الملف*

##### scripts/verification-checkpoint.js (35 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `console.log("🔍 STEP 1: QUICK HEALTH CHECK");` |
| 55 | `console.log("⚠️ Some checks failed - this is normal on first run");` |
| 62 | `console.log("✅ SYSTEM IS WORKING - DO NOT MODIFY!");` |
| 63 | `console.log("📌 Move to NEXT TASK in the implementation");` |
| 66 | `console.log("❌ System needs fixes:", checks);` |
| 73 | `console.log("🔍 STEP 2: MODULE CHECK");` |
| 98 | `console.log(`✅ ${module}: Server responds`);` |
| 100 | `console.log(`❌ ${module}: Not responding`);` |
| 103 | `console.log(`❌ ${module}: Error - ${error.message}`);` |
| 109 | `console.log(`✅ ${workingModules}/13 MODULES WORKING - ACCEPTABLE`);` |
| 110 | `console.log("📌 DO NOT REFACTOR - Move to missing modules only");` |
| 113 | `console.log(`❌ Only ${workingModules}/13 modules working - needs fix`);` |
| 120 | `console.log("🔍 STEP 3: WORKFLOW CHECK");` |
| 143 | `console.log("⚠️ Workflow checks incomplete");` |
| 150 | `console.log("✅ CRITICAL WORKFLOWS FUNCTIONAL");` |
| 153 | `console.log("❌ Critical workflows need implementation");` |
| 160 | `console.log("============================================================");` |
| 161 | `console.log("🛑 FIXZIT SOUQ VERIFICATION CHECKPOINT");` |
| 162 | `console.log("⏰ Time check: " + new Date().toISOString());` |
| 163 | `console.log("============================================================");` |

*...و 15 حالة أخرى في هذا الملف*

##### scripts/phase1-truth-verifier.js (32 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log("\n🔍 VERIFYING PHASE 1 '100% COMPLETE' CLAIM");` |
| 13 | `console.log("=".repeat(70));` |
| 24 | `console.log(`\n📦 Testing ${moduleName}...`);` |
| 30 | `console.log(`  ✅ REAL: ${result.message}`);` |
| 33 | `console.log(`  ❌ FAKE: ${result.message}`);` |
| 37 | `console.log(`  ❌ MISSING: ${error.message}`);` |
| 238 | `console.log("\n🔍 Checking for Placeholder Code...");` |
| 271 | `console.log("\n" + "=".repeat(70));` |
| 272 | `console.log("📊 PHASE 1 VERIFICATION RESULTS");` |
| 273 | `console.log("=".repeat(70));` |
| 275 | `console.log("\n🎭 CLAIMED vs REALITY:");` |
| 276 | `console.log("  Claimed: ✅ 100% Complete");` |
| 277 | `console.log(`  Reality: ${realPercentage}% Actually Working`);` |
| 279 | `console.log("\n✅ REAL IMPLEMENTATIONS (" + results.real.length + "):");` |
| 280 | `results.real.forEach(r => console.log("  • " + r));` |
| 282 | `console.log("\n❌ FAKE/PLACEHOLDER (" + results.fake.length + "):");` |
| 283 | `results.fake.forEach(f => console.log("  • " + f));` |
| 285 | `console.log("\n⚠️ MISSING COMPLETELY (" + results.missing.length + "):");` |
| 286 | `results.missing.forEach(m => console.log("  • " + m));` |
| 288 | `console.log("\n" + "=".repeat(70));` |

*...و 12 حالة أخرى في هذا الملف*

##### smart-merge-conflicts.ts (28 حالة)

| السطر | الكود |
|-------|-------|
| 129 | `console.log('  → Keeping PR #84 enhancements (ours)');` |
| 135 | `console.log('  → Merging both sides (complex)');` |
| 146 | `console.log('  → Keeping main\'s business logic (theirs)');` |
| 151 | `console.log('  → Keeping theirs (has enhancements)');` |
| 157 | `console.log(`❌ File not found: ${filePath}`);` |
| 165 | `console.log(`✓ No conflicts: ${filePath}`);` |
| 169 | `console.log(`\n🔧 Resolving: ${filePath}`);` |
| 170 | `console.log(`   Found ${parsed.conflicts.length} conflict(s)`);` |
| 175 | `console.log(`   Conflict ${i + 1}/${parsed.conflicts.length}:`);` |
| 184 | `console.log(`✅ Resolved: ${filePath}`);` |
| 216 | `console.log('==========================================');` |
| 217 | `console.log('Smart Conflict Resolution for PR #84');` |
| 218 | `console.log('==========================================\n');` |
| 238 | `console.log(`❌ Error resolving ${file}: ${error.message}`);` |
| 243 | `console.log('\n==========================================');` |
| 244 | `console.log('Summary');` |
| 245 | `console.log('==========================================');` |
| 246 | `console.log(`✅ Auto-resolved: ${resolved}`);` |
| 247 | `console.log(`⚠️  Needs review: ${needsReview}`);` |
| 248 | `console.log(`❌ Failed: ${failed}`);` |

*...و 8 حالة أخرى في هذا الملف*

##### scripts/analyze-project.js (27 حالة)

| السطر | الكود |
|-------|-------|
| 300 | `console.log('\n🔍 Analyzing FIXZIT SOUQ Project...\n');` |
| 301 | `console.log(`📁 Project Path: ${path.resolve(CONFIG.projectPath)}`);` |
| 302 | `console.log('⏳ This may take a few minutes for large projects...\n');` |
| 651 | `console.log('\n📊 FIXZIT SOUQ PROJECT ANALYSIS COMPLETE\n');` |
| 652 | `console.log('=' .repeat(60));` |
| 653 | `console.log(`📁 Total Project Size: ${report.summary.totalSizeFormatted}`);` |
| 654 | `console.log(`📄 Files Analyzed: ${report.summary.fileCount.toLocaleString()}`);` |
| 655 | `console.log(`📂 Folders Scanned: ${report.summary.folderCount.toLocaleString()}`` |
| 656 | `console.log('=' .repeat(60));` |
| 659 | `console.log('\n🗑️  BLOAT SOURCES:');` |
| 664 | `console.log(`   ${folder.padEnd(15)} ${data.sizeFormatted.padStart(10)} (${data.` |
| 668 | `console.log('\n📊 TOP 10 LARGEST FILES:');` |
| 672 | `console.log(`   ${marker} ${file.sizeFormatted.padStart(10)} ${file.path}`);` |
| 676 | `console.log('\n📦 TOP FILE EXTENSIONS:');` |
| 680 | `console.log(`   ${(ext \|\| 'none').padEnd(10)} ${this.formatBytes(data.totalSize)` |
| 684 | `console.log('\n💡 QUICK CLEANUP RECOMMENDATIONS:');` |
| 689 | `console.log('   🔴 CRITICAL: Over 70% of project is bloat!');` |
| 691 | `console.log('   🟡 WARNING: Over 50% of project is bloat');` |
| 693 | `console.log('   🟢 GOOD: Reasonable bloat levels');` |
| 698 | `console.log(`   • Clean node_modules: rm -rf node_modules && npm install`);` |

*...و 7 حالة أخرى في هذا الملف*

##### scripts/test-server.js (26 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `console.log('🧪 Testing Fixzit Souq Server Components...\n');` |
| 7 | `console.log('1️⃣ Environment Check:');` |
| 8 | `console.log('   ✅ NODE_ENV:', process.env.NODE_ENV \|\| 'not set');` |
| 9 | `console.log('   ✅ JWT_SECRET:', process.env.JWT_SECRET ? 'configured' : '❌ missi` |
| 10 | `console.log('   ✅ MONGODB_URI:', process.env.MONGODB_URI ? 'configured' : '❌ mis` |
| 13 | `console.log('\n2️⃣ Dependencies Check:');` |
| 16 | `console.log('   ✅ express installed');` |
| 18 | `console.log('   ✅ jsonwebtoken installed');` |
| 20 | `console.log('   ✅ bcryptjs installed');` |
| 22 | `console.log('   ✅ express-validator installed');` |
| 24 | `console.log('   ❌ Missing dependency:', e.message);` |
| 28 | `console.log('\n3️⃣ Middleware Check:');` |
| 31 | `console.log('   ✅ asyncHandler loaded');` |
| 33 | `console.log('   ✅ auth middleware loaded');` |
| 35 | `console.log('   ✅ validation middleware loaded');` |
| 37 | `console.log('   ❌ Middleware error:', e.message);` |
| 41 | `console.log('\n4️⃣ Models Check:');` |
| 44 | `console.log('   ✅ User model loaded');` |
| 46 | `console.log('   ✅ Tenant model loaded');` |
| 48 | `console.log('   ❌ Model error:', e.message);` |

*...و 6 حالة أخرى في هذا الملف*

##### analyze-pr-comments.js (26 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `console.log('🔍 جاري جلب جميع Pull Requests المغلقة والمدمجة...\n');` |
| 31 | `console.log(`✅ تم العثور على ${prs.length} Pull Request\n`);` |
| 71 | `console.log('📊 جاري تحليل التعليقات من كل PR...\n');` |
| 143 | `console.log('\n\n');` |
| 144 | `console.log('═══════════════════════════════════════════════════════════');` |
| 145 | `console.log('📈 تقرير تحليل تعليقات Pull Requests');` |
| 146 | `console.log('═══════════════════════════════════════════════════════════\n');` |
| 148 | `console.log('📊 الإحصائيات العامة:');` |
| 149 | `console.log(`   إجمالي PRs: ${analysis.totalPRs}`);` |
| 150 | `console.log(`   PRs المدمجة: ${analysis.mergedPRs}`);` |
| 151 | `console.log(`   PRs المغلقة (غير مدمجة): ${analysis.closedPRs}`);` |
| 152 | `console.log(`   PRs التي تحتوي على تعليقات: ${analysis.prsWithComments}`);` |
| 153 | `console.log(`   إجمالي التعليقات: ${analysis.totalComments}\n`);` |
| 155 | `console.log('🔴 تصنيف الأخطاء المكتشفة في التعليقات:\n');` |
| 184 | `console.log(`   ${arabicName}: ${count} (${percentage}%)`);` |
| 188 | `console.log(`\n   📌 إجمالي الأخطاء المكتشفة: ${totalErrors}\n`);` |
| 191 | `console.log('🔝 أكثر 10 PRs تحتوي على أخطاء:\n');` |
| 198 | `console.log(`${index + 1}. PR #${pr.number}: ${pr.title}`);` |
| 199 | `console.log(`   الحالة: ${pr.isMerged ? 'مدمج ✅' : 'مغلق ❌'}`);` |
| 200 | `console.log(`   عدد الأخطاء: ${pr.errors.length}`);` |

*...و 6 حالة أخرى في هذا الملف*

##### scripts/rapid-enhance-all.js (25 حالة)

| السطر | الكود |
|-------|-------|
| 160 | `console.log(`✅ SKIP: ${filePath} (already enhanced)`);` |
| 164 | `console.log(`🔧 ENHANCING: ${filePath}`);` |
| 175 | `console.log(`   ✓ Added imports`);` |
| 176 | `console.log(`   ✓ Added rate limiting`);` |
| 177 | `console.log(`   ✓ Added OpenAPI docs`);` |
| 178 | `console.log(`   ✓ Replaced responses`);` |
| 200 | `console.log('🚀 RAPID API ROUTE ENHANCEMENT');` |
| 201 | `console.log('================================\n');` |
| 204 | `console.log(`📊 Found ${allRoutes.length} total route files`);` |
| 205 | `console.log(`📊 Already enhanced: ${ENHANCED_ROUTES.size} routes`);` |
| 206 | `console.log(`📊 Remaining: ${allRoutes.length - ENHANCED_ROUTES.size} routes\n`)` |
| 230 | `console.log('\n================================');` |
| 231 | `console.log('📊 ENHANCEMENT COMPLETE');` |
| 232 | `console.log('================================');` |
| 233 | `console.log(`✅ Enhanced: ${results.enhanced.length} routes`);` |
| 234 | `console.log(`⏭️  Skipped: ${results.skipped.length} routes`);` |
| 235 | `console.log(`❌ Errors: ${results.errors.length} routes`);` |
| 238 | `console.log('\n❌ ERRORS:');` |
| 240 | `console.log(`   ${path}: ${error}`);` |
| 244 | `console.log('\n💡 Next steps:');` |

*...و 5 حالة أخرى في هذا الملف*

##### test-e2e-comprehensive.js (25 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `console.log(`✅ ${name}`);` |
| 64 | `console.log(`  📊 Found ${collections.length} collections`);` |
| 93 | `console.log('\n🚀 COMPREHENSIVE E2E TEST SUITE\n');` |
| 94 | `console.log('━'.repeat(60));` |
| 97 | `console.log('\n📊 MONGODB TESTS');` |
| 101 | `console.log('\n🌐 PAGE TESTS');` |
| 113 | `console.log('\n🔧 API HEALTH TESTS');` |
| 117 | `console.log('\n🔐 AUTH API TESTS');` |
| 130 | `console.log('\n📋 WORK ORDERS API TESTS');` |
| 134 | `console.log('\n✅ VALIDATION TESTS');` |
| 145 | `console.log('  ⏭️  Skipping (ATS_ENABLED not true)');` |
| 156 | `console.log('\n💼 BUSINESS LOGIC TESTS');` |
| 169 | `console.log('\n🚨 ERROR HANDLING TESTS');` |
| 179 | `console.log('\n⚡ PERFORMANCE TESTS');` |
| 187 | `console.log(`  ⏱️  Load time: ${duration}ms`);` |
| 191 | `console.log('\n🔒 SECURITY TESTS');` |
| 200 | `console.log('\n' + '━'.repeat(60));` |
| 201 | `console.log('\n📊 TEST SUMMARY\n');` |
| 202 | `console.log(`✅ Passed: ${passedTests}`);` |
| 203 | `console.log(`❌ Failed: ${failedTests}`);` |

*...و 5 حالة أخرى في هذا الملف*

##### analyze-system-errors.js (24 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log('🔍 بدء تحليل الأخطاء في النظام بأكمله...\n');` |
| 32 | `console.log('📂 جمع قائمة الملفات...');` |
| 47 | `console.log(`✅ تم العثور على ${files.length} ملف للتحليل\n`);` |
| 173 | `console.log('🔎 تحليل الملفات للكشف عن الأخطاء...\n');` |
| 268 | `console.log('\n\n');` |
| 269 | `console.log('═══════════════════════════════════════════════════════════');` |
| 270 | `console.log('📊 تقرير تحليل أخطاء النظام الشامل');` |
| 271 | `console.log('═══════════════════════════════════════════════════════════\n');` |
| 273 | `console.log('📈 الإحصائيات العامة:');` |
| 274 | `console.log(`   إجمالي الملفات المحللة: ${analysis.totalFiles}`);` |
| 275 | `console.log(`   الملفات التي تحتوي على أخطاء: ${analysis.filesWithErrors}`);` |
| 276 | `console.log(`   إجمالي الأخطاء المكتشفة: ${analysis.totalErrors}\n`);` |
| 278 | `console.log('🔴 توزيع الأخطاء حسب الفئة:\n');` |
| 303 | `console.log(`   ${arabicName}: ${count} (${percentage}%)`);` |
| 306 | `console.log('\n');` |
| 309 | `console.log('🔝 أكثر 20 ملف تحتوي على أخطاء:\n');` |
| 316 | `console.log(`${index + 1}. ${file.filePath}`);` |
| 317 | `console.log(`   عدد الأخطاء: ${file.errorCount} \| أنواع مختلفة: ${errorTypes}\n`` |
| 323 | `console.log(`✅ تم حفظ التقرير التفصيلي JSON في: ${jsonPath}\n`);` |
| 329 | `console.log(`✅ تم حفظ التقرير المفصل في: ${mdPath}\n`);` |

*...و 4 حالة أخرى في هذا الملف*

##### scripts/seedData.js (23 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `console.log('🌱 Starting database seeding...');` |
| 21 | `console.log('❌ SEEDING BLOCKED: Cannot run seeding in production environment');` |
| 22 | `console.log('   Set NODE_ENV to development or remove this check to proceed');` |
| 31 | `console.log('✅ Connected to MongoDB');` |
| 44 | `console.log('🧹 Cleared existing data');` |
| 67 | `console.log(`📊 Created Organization ${i} and Tenant ${i}`);` |
| 81 | `console.log('🔑 Created deterministic admin account: admin@fixzit.co / Admin@123` |
| 107 | `console.log(`👥 Created ${users.length} users across all organizations`);` |
| 150 | `console.log(`🏢 Created ${properties.length} properties`);` |
| 167 | `console.log('🏠 Created property owners');` |
| 200 | `console.log(`🔧 Created ${workOrders.length} work orders`);` |
| 239 | `console.log(`🏪 Created ${vendors.length} vendors`);` |
| 279 | `console.log('💳 Created subscriptions for all organizations');` |
| 282 | `console.log('\n🎉 Database seeding completed successfully!');` |
| 283 | `console.log('📊 Summary:');` |
| 284 | `console.log(`   • ${organizations.length} Organizations & Tenants`);` |
| 285 | `console.log(`   • ${users.length} Users (all roles)`);` |
| 286 | `console.log(`   • ${properties.length} Properties`);` |
| 287 | `console.log(`   • ${workOrders.length} Work Orders`);` |
| 288 | `console.log(`   • ${vendors.length} Vendors`);` |

*...و 3 حالة أخرى في هذا الملف*

##### scripts/production-check.js (23 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `console.log('🔍 PRODUCTION READINESS CHECK\n');` |
| 21 | `console.log('='.repeat(50));` |
| 35 | `console.log('\n📋 Checking Environment Variables...');` |
| 59 | `console.log(`  ${exists ? '✅' : '⚠️'} Optional: ${env} ${exists ? 'SET' : 'NOT S` |
| 64 | `console.log('\n📋 Checking Dependencies...');` |
| 80 | `console.log('\n📋 Checking Security...');` |
| 97 | `console.log('\n📋 Checking Performance...');` |
| 105 | `console.log('\n📋 Checking API...');` |
| 127 | `console.log('\n📋 Checking Database...');` |
| 138 | `console.log(`  ✅ ${name}`);` |
| 141 | `console.log(`  ❌ ${name}`);` |
| 175 | `console.log('\n' + '='.repeat(50));` |
| 176 | `console.log('🎯 PRODUCTION READINESS RESULTS');` |
| 177 | `console.log('='.repeat(50));` |
| 178 | `console.log(`✅ Passed: ${this.passed}`);` |
| 179 | `console.log(`❌ Failed: ${this.failed}`);` |
| 183 | `console.log(`📊 Success Rate: ${percentage}%`);` |
| 186 | `console.log('\n🎉 PRODUCTION READY!');` |
| 187 | `console.log('🚀 All checks passed - safe to deploy!');` |
| 189 | `console.log('\n⚠️  NOT READY FOR PRODUCTION');` |

*...و 3 حالة أخرى في هذا الملف*

##### final-typescript-fix.js (23 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log('🚀 FINAL TYPESCRIPT ERROR CLEANUP\n');` |
| 21 | `console.log(`📊 Total errors: ${errorLines.length}\n`);` |
| 34 | `console.log(`📁 Files with errors: ${Object.keys(fileErrors).length}\n`);` |
| 42 | `console.log(`🔧 ${filePath} (${errors.length} errors)`);` |
| 79 | `console.log(`   ✅ Applied automatic fixes\n`);` |
| 81 | `console.log(`   ⚠️  No automatic fixes available\n`);` |
| 84 | `console.log(`   ❌ Error: ${error.message}\n`);` |
| 88 | `console.log(`\n${'='.repeat(60)}`);` |
| 89 | `console.log(`✨ Fixed ${filesFixed} files automatically\n`);` |
| 92 | `console.log('📋 Fixed files:');` |
| 94 | `console.log(`   - ${file} (${errors} errors)`);` |
| 96 | `console.log();` |
| 100 | `console.log('🔍 Running final TypeScript check...\n');` |
| 113 | `console.log(`${'='.repeat(60)}`);` |
| 114 | `console.log(`📊 FINAL RESULTS:`);` |
| 115 | `console.log(`   Before: ${errorLines.length} errors`);` |
| 116 | `console.log(`   After:  ${finalErrors} errors`);` |
| 117 | `console.log(`   Fixed:  ${improvement} errors (${percentImproved}% improvement)`` |
| 118 | `console.log(`${'='.repeat(60)}\n`);` |
| 121 | `console.log('🎉🎉🎉 ZERO TYPESCRIPT ERRORS! PERFECT! 🎉🎉🎉\n');` |

*...و 3 حالة أخرى في هذا الملف*

##### scripts/setup-production-db.ts (21 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log('🔧 Validating Production MongoDB Configuration...\n');` |
| 38 | `console.log('🔌 Testing MongoDB connection...');` |
| 40 | `console.log('✅ MongoDB connection successful');` |
| 48 | `console.log('✅ Production configuration validated successfully\n');` |
| 52 | `console.log('🗂️  Setting up production indexes...\n');` |
| 83 | `console.log(`✅ Index created on ${collection}:`, Object.keys(index));` |
| 87 | `console.log(`⚠️  Index already exists on ${collection}:`, Object.keys(index));` |
| 94 | `console.log('✅ Production indexes setup complete\n');` |
| 101 | `console.log('👥 Setting up default tenant...\n');` |
| 120 | `console.log('⚠️  Default organization already exists:', existing.name);` |
| 125 | `console.log('✅ Default organization created:', orgId.toString());` |
| 128 | `console.log(`📝 Add this to your .env.local: DEFAULT_TENANT_ID=${orgId.toString(` |
| 136 | `console.log('🚀 MongoDB Production Deployment Setup\n');` |
| 137 | `console.log('=' .repeat(50));` |
| 144 | `console.log('=' .repeat(50));` |
| 145 | `console.log('✅ Production deployment setup complete!');` |
| 146 | `console.log('\nNext steps:');` |
| 147 | `console.log('1. Run: npm run verify:db:deploy');` |
| 148 | `console.log('2. Run: npm run test:e2e:db');` |
| 149 | `console.log('3. Deploy to production');` |

*...و 1 حالة أخرى في هذا الملف*

##### scripts/deploy-db-verify.ts (21 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `console.log(`🧪 Testing: ${testName}...`);` |
| 41 | `console.log(`✅ ${testName} - ${duration}ms`);` |
| 51 | `console.log(`❌ ${testName} - Failed in ${duration}ms: ${error}`);` |
| 241 | `console.log('\n' + '='.repeat(60));` |
| 242 | `console.log('📊 DATABASE DEPLOYMENT VERIFICATION REPORT');` |
| 243 | `console.log('='.repeat(60));` |
| 250 | `console.log(`\n📈 Summary:`);` |
| 251 | `console.log(`   Total Tests: ${totalTests}`);` |
| 252 | `console.log(`   Passed: ${passedTests} ✅`);` |
| 253 | `console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);` |
| 254 | `console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)` |
| 255 | `console.log(`   Total Time: ${totalTime}ms`);` |
| 258 | `console.log(`\n❌ Failed Tests:`);` |
| 260 | `console.log(`   • ${result.test}: ${result.error}`);` |
| 264 | `console.log(`\n✅ Passed Tests:`);` |
| 266 | `console.log(`   • ${result.test} (${result.duration}ms)`);` |
| 269 | `console.log('\n' + '='.repeat(60));` |
| 273 | `console.log('❌ DEPLOYMENT VERIFICATION FAILED');` |
| 276 | `console.log('✅ DEPLOYMENT VERIFICATION PASSED');` |
| 282 | `console.log('🚀 Starting Database Deployment Verification...\n');` |

*...و 1 حالة أخرى في هذا الملف*

##### scripts/complete-scope-verification.js (21 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log('❌ AUTH FAILED - Backend not running?');` |
| 18 | `console.log('\n🔍 COMPLETE SCOPE VERIFICATION - ALL 80+ ENDPOINTS\n');` |
| 19 | `console.log('=' * 60);` |
| 23 | `console.log('❌ Cannot proceed without authentication');` |
| 182 | `console.log(`\n📦 ${module.name.toUpperCase()} MODULE (${module.target} endpoint` |
| 183 | `console.log('-'.repeat(50));` |
| 210 | `console.log(`✅ ${test.name}`);` |
| 214 | `console.log(`❌ ${test.name} - PLACEHOLDER/FAKE`);` |
| 217 | `console.log(`❌ ${test.name} - ERROR/NOT IMPLEMENTED`);` |
| 230 | `console.log(`📊 ${module.name}: ${moduleWorking}/${module.target} = ${modulePerc` |
| 235 | `console.log('\n' + '='.repeat(60));` |
| 236 | `console.log('📊 COMPLETE SCOPE VERIFICATION RESULTS');` |
| 237 | `console.log('='.repeat(60));` |
| 241 | `console.log(`${status} ${result.name}: ${result.working}/${result.total} (${resu` |
| 244 | `console.log('\n' + '='.repeat(60));` |
| 245 | `console.log(`🎯 OVERALL COMPLETION: ${totalWorking}/${totalEndpoints} = ${overal` |
| 246 | `console.log('='.repeat(60));` |
| 249 | `console.log('✅ PHASE 1 TRULY COMPLETE - Can proceed to Phase 2');` |
| 251 | `console.log('⚠️ SIGNIFICANT WORK NEEDED - Fix broken endpoints');` |
| 253 | `console.log('❌ PHASE 1 LARGELY INCOMPLETE - Major implementation required');` |

*...و 1 حالة أخرى في هذا الملف*

##### analyze-comments.js (21 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `console.log(`Analyzing ${files.length} files...`);` |
| 71 | `console.log('\n========================================');` |
| 72 | `console.log('COMMENT ANALYSIS REPORT');` |
| 73 | `console.log('========================================\n');` |
| 75 | `console.log(`Total Comments: ${totalComments}`);` |
| 76 | `console.log(`Files Analyzed: ${files.length}\n`);` |
| 78 | `console.log('Breakdown by Type:');` |
| 79 | `console.log(`  TODO:   ${comments.TODO.length}`);` |
| 80 | `console.log(`  FIXME:  ${comments.FIXME.length}`);` |
| 81 | `console.log(`  HACK:   ${comments.HACK.length}`);` |
| 82 | `console.log(`  XXX:    ${comments.XXX.length}`);` |
| 83 | `console.log(`  BUG:    ${comments.BUG.length}`);` |
| 84 | `console.log(`  NOTE:   ${comments.NOTE.length}`);` |
| 85 | `console.log(`  Other:  ${comments.other.length}\n`);` |
| 89 | `console.log(`Actionable Comments: ${actionable}`);` |
| 90 | `console.log(`Documentation Comments: ${comments.NOTE.length + comments.other.len` |
| 113 | `console.log('✅ Detailed report saved to: comment-analysis.json\n');` |
| 117 | `console.log('Top 10 Actionable Items:');` |
| 118 | `console.log('------------------------');` |
| 129 | `console.log(`${i + 1}. ${item.file}:${item.line}`);` |

*...و 1 حالة أخرى في هذا الملف*

##### public/sw.js (21 حالة)

| السطر | الكود |
|-------|-------|
| 78 | `console.log('[SW] Installing service worker with Arabic support');` |
| 84 | `console.log('[SW] Caching static assets');` |
| 89 | `console.log('[SW] Caching Arabic fonts');` |
| 96 | `console.log('[SW] All assets cached successfully');` |
| 107 | `console.log('[SW] Activating service worker with Arabic support');` |
| 123 | `console.log('[SW] Deleting old cache:', cacheName);` |
| 130 | `console.log('[SW] Service worker activated with Arabic support');` |
| 232 | `console.log('[SW] Network failed, trying cache:', request.url);` |
| 366 | `console.log('[SW] Could not determine language preference');` |
| 544 | `console.log('[SW] Arabic content fetch failed:', error);` |
| 568 | `console.log('[SW] Performing background sync');` |
| 581 | `console.log('[SW] Background sync failed for:', request.url);` |
| 585 | `console.log('[SW] Background sync completed');` |
| 651 | `console.log('[SW] Network connection restored - Saudi optimized');` |
| 657 | `console.log('[SW] Network connection lost - activating offline mode');` |
| 677 | `console.log('[SW] Arabic content preload failed for:', url);` |
| 682 | `console.log('[SW] Service worker with Arabic and Saudi optimizations loaded succ` |
| 683 | `console.log('[SW] RTL support: ✓');` |
| 684 | `console.log('[SW] Arabic fonts caching: ✓');` |
| 685 | `console.log('[SW] Saudi network optimizations: ✓');` |

*...و 1 حالة أخرى في هذا الملف*

##### tools/wo-smoke.ts (21 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `console.log(`API Call: ${init.method \|\| 'GET'} ${path}`);` |
| 17 | `console.log(`Response: ${res.status} - ${txt.substring(0, 200)}...`);` |
| 26 | `console.log("🧪 Testing Work Orders API endpoints...");` |
| 30 | `console.log("\n1️⃣ Testing POST /api/work-orders...");` |
| 33 | `console.log("⚠️  Create endpoint not ready yet - this is expected for initial se` |
| 36 | `console.log("✅ Create endpoint working");` |
| 39 | `console.log("\n2️⃣ Testing GET /api/work-orders...");` |
| 42 | `console.log("⚠️  List endpoint not ready yet");` |
| 45 | `console.log("✅ List endpoint working");` |
| 48 | `console.log("\n3️⃣ Testing POST /api/work-orders/[id]/assign...");` |
| 51 | `console.log("⚠️  Assign endpoint not ready yet");` |
| 54 | `console.log("✅ Assign endpoint working");` |
| 57 | `console.log("\n4️⃣ Testing POST /api/work-orders/[id]/status...");` |
| 60 | `console.log("⚠️  Status endpoint not ready yet");` |
| 63 | `console.log("✅ Status endpoint working");` |
| 69 | `console.log("\n🎉 Work Orders API structure is in place!");` |
| 70 | `console.log("📋 Next steps:");` |
| 71 | `console.log("   1. Set up MongoDB connection (MONGODB_URI)");` |
| 72 | `console.log("   2. Install dependencies if needed");` |
| 73 | `console.log("   3. Start the development server");` |

*...و 1 حالة أخرى في هذا الملف*

##### scripts/security-audit.js (20 حالة)

| السطر | الكود |
|-------|-------|
| 40 | `console.log(`${statusColor} ${severityColor}[${severity.toUpperCase()}]${colors.` |
| 43 | `console.log(colors.bright + colors.cyan + '🔐 FIXZIT SOUQ SECURITY AUDIT' + colo` |
| 44 | `console.log('═══════════════════════════════════════════════════════');` |
| 47 | `console.log('\n' + colors.bright + '1. JWT Security Configuration' + colors.rese` |
| 66 | `console.log('\n' + colors.bright + '2. Authentication Middleware' + colors.reset` |
| 100 | `console.log('\n' + colors.bright + '3. Input Validation Security' + colors.reset` |
| 127 | `console.log('\n' + colors.bright + '4. Security Package Dependencies' + colors.r` |
| 154 | `console.log('\n' + colors.bright + '5. Environment Configuration' + colors.reset` |
| 187 | `console.log('\n' + colors.bright + colors.cyan + '🎯 SECURITY AUDIT RESULTS' + c` |
| 188 | `console.log('═══════════════════════════════════════════════════════');` |
| 189 | `console.log(`📊 Security Score: ${auditResults.securityScore >= 80 ? colors.gree` |
| 190 | `console.log(`✅ Passed Checks: ${colors.green}${passedChecks}${colors.reset}/${to` |
| 191 | `console.log(`🚨 Critical Issues: ${auditResults.criticalIssues > 0 ? colors.red ` |
| 194 | `console.log('\n' + colors.green + colors.bright + '🎉 SECURITY STATUS: EXCELLENT` |
| 195 | `console.log(colors.green + '   Your Fixzit Souq platform is properly secured!' +` |
| 197 | `console.log('\n' + colors.yellow + colors.bright + '⚠️  SECURITY STATUS: GOOD' +` |
| 198 | `console.log(colors.yellow + '   Most security measures implemented, minor improv` |
| 200 | `console.log('\n' + colors.red + colors.bright + '🚨 SECURITY STATUS: CRITICAL IS` |
| 201 | `console.log(colors.red + '   Immediate action required to fix critical vulnerabi` |
| 207 | `console.log(`\n📄 Detailed report saved to: ${reportFile}`);` |

##### scripts/test-all.ts (20 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log('🚀 Running comprehensive tests...\n');` |
| 15 | `console.log('1️⃣ Testing core functionality...');` |
| 19 | `console.log(success ? '✅ Core tests passed\n' : '❌ Core tests failed\n');` |
| 22 | `console.log('❌ Core tests failed with error:', error, '\n');` |
| 26 | `console.log('2️⃣ Testing build process...');` |
| 31 | `console.log('✅ Build test passed\n');` |
| 34 | `console.log('❌ Build test failed:', error, '\n');` |
| 38 | `console.log('3️⃣ Testing TypeScript validation...');` |
| 43 | `console.log('✅ TypeScript test passed\n');` |
| 46 | `console.log('❌ TypeScript test failed:', error, '\n');` |
| 50 | `console.log('4️⃣ Testing model loading...');` |
| 67 | `console.log('✅ Model loading test passed\n');` |
| 70 | `console.log('❌ Model loading test failed:', error, '\n');` |
| 74 | `console.log('📊 Test Summary:');` |
| 75 | `console.log('================');` |
| 83 | `console.log(`${status} ${result.name}`);` |
| 85 | `console.log(`   Error: ${result.error.message \|\| result.error}`);` |
| 89 | `console.log(`\n📈 Results: ${passedTests}/${totalTests} tests passed`);` |
| 92 | `console.log('🎉 All tests passed! Ready to push PR updates.');` |
| 95 | `console.log(`⚠️  ${failedTests} tests failed. Please review and fix.`);` |

##### scripts/fix-eslint-errors.js (19 حالة)

| السطر | الكود |
|-------|-------|
| 111 | `console.log(`  ✅ Applied: ${fix.name}`);` |
| 135 | `console.log('🚀 Starting ESLint Error Fix Script');` |
| 136 | `console.log(`📁 Processing directory: ${process.cwd()}`);` |
| 137 | `console.log(`🔍 Extensions: ${CONFIG.extensions.join(', ')}`);` |
| 138 | `console.log(`📝 Dry run: ${CONFIG.dryRun ? 'YES' : 'NO'}\n`);` |
| 142 | `console.log(`📊 Found ${files.length} files to process\n`);` |
| 147 | `console.log(`🔧 Processing: ${file}`);` |
| 151 | `console.log('  ℹ️  No fixes needed');` |
| 156 | `console.log('\n📈 Summary:');` |
| 157 | `console.log(`   Files processed: ${stats.filesProcessed}`);` |
| 158 | `console.log(`   Fixes applied: ${stats.fixesApplied}`);` |
| 159 | `console.log(`   Errors: ${stats.errors.length}`);` |
| 162 | `console.log('\n❌ Errors encountered:');` |
| 164 | `console.log(`   ${file}: ${error}`);` |
| 169 | `console.log('\n🔍 Running ESLint check...');` |
| 172 | `console.log('ESLint found remaining issues:');` |
| 173 | `console.log(stdout);` |
| 175 | `console.log('✅ ESLint check passed!');` |
| 178 | `console.log('\n🎉 ESLint fix script completed!');` |

##### scripts/truth-verification.js (19 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `console.log('🔍 EXPOSING THE TRUTH ABOUT YOUR "100% COMPLETE" CLAIM...\n');` |
| 92 | `console.log(`✅ ${test.name}: REAL IMPLEMENTATION`);` |
| 95 | `console.log(`❌ ${test.name}: PLACEHOLDER - Returns "${response.data.message}"`);` |
| 98 | `console.log(`⚠️ ${test.name}: SUSPICIOUS - Incomplete implementation`);` |
| 102 | `console.log(`❌ ${test.name}: MISSING - ${error.message}`);` |
| 107 | `console.log('\n' + '='.repeat(60));` |
| 108 | `console.log('📊 THE TRUTH:');` |
| 109 | `console.log('='.repeat(60));` |
| 110 | `console.log(`Real Endpoints: ${realEndpoints}/8 (${Math.round(realEndpoints/8*10` |
| 111 | `console.log(`Placeholders: ${placeholderEndpoints}/8`);` |
| 112 | `console.log(`Missing: ${missingEndpoints}/8`);` |
| 115 | `console.log('\n🔴 YOU ARE LYING ABOUT COMPLETION!');` |
| 116 | `console.log('The system is NOT complete. Stop claiming 100%.');` |
| 117 | `console.log('\n📋 MISSING CRITICAL FEATURES:');` |
| 118 | `if (!realEndpoints) console.log('- Property Owner Dashboard (THE PAYING CUSTOMER` |
| 119 | `console.log('- Deputy System (delegation)');` |
| 120 | `console.log('- Subscription Management (how platform makes MONEY)');` |
| 121 | `console.log('- DoA Approvals (prevent unauthorized spending)');` |
| 122 | `console.log('- ZATCA Compliance (LEGALLY REQUIRED)');` |

##### scripts/enhance-api-routes.js (19 حالة)

| السطر | الكود |
|-------|-------|
| 162 | `console.log(`✓ ${filePath} - Already enhanced`);` |
| 219 | `console.log(`✓ ${filePath}`);` |
| 220 | `changes.forEach(change => console.log(`  - ${change}`));` |
| 222 | `console.log(`[DRY RUN] ${filePath}`);` |
| 223 | `changes.forEach(change => console.log(`  - ${change}`));` |
| 299 | `console.log('🚀 API Routes Enhancement Tool\n');` |
| 313 | `console.log(`Found ${routes.length} API routes\n`);` |
| 336 | `console.log('\n📊 Summary:');` |
| 337 | `console.log(`  Total routes: ${results.total}`);` |
| 338 | `console.log(`  Enhanced: ${results.enhanced}`);` |
| 339 | `console.log(`  Already good: ${results.alreadyGood}`);` |
| 340 | `console.log(`  Errors: ${results.errors}`);` |
| 343 | `console.log('\n⚠️  This was a dry run. Use --apply to make changes.');` |
| 345 | `console.log('\n✅ Changes applied successfully!');` |
| 347 | `console.log('\n💡 Use --dry-run to preview or --apply to make changes.');` |
| 352 | `console.log('Usage:');` |
| 353 | `console.log('  node scripts/enhance-api-routes.js --dry-run  # Preview changes')` |
| 354 | `console.log('  node scripts/enhance-api-routes.js --apply    # Apply changes');` |
| 355 | `console.log('  node scripts/enhance-api-routes.js --route=/path/to/route.ts  # S` |

##### scripts/test-mongo-connection.ts (18 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `console.log('🚀 MongoDB Connection Test Suite');` |
| 12 | `console.log('================================\n');` |
| 15 | `console.log('🔍 Testing MongoDB connection...');` |
| 16 | `console.log('📊 Using unified MongoDB connection');` |
| 20 | `console.log('✅ Database connection established');` |
| 24 | `console.log('✅ Database handle retrieved');` |
| 35 | `console.log(`✅ Insert operation successful: ${insertResult.insertedId}`);` |
| 39 | `console.log(`✅ Find operation successful, found: ${findResult.length} documents`` |
| 43 | `console.log(`✅ FindOne operation successful: ${findOneResult ? 'Found document' ` |
| 50 | `console.log(`✅ Update operation successful: ${updateResult.modifiedCount} modifi` |
| 54 | `console.log(`✅ Delete operation successful: ${deleteResult.deletedCount} deleted` |
| 56 | `console.log('🎉 All database operations completed successfully!\n');` |
| 71 | `console.log('📋 Test Results:');` |
| 72 | `console.log('================');` |
| 73 | `console.log(JSON.stringify(results, null, 2));` |
| 93 | `console.log('\n📋 Test Results:');` |
| 94 | `console.log('================');` |
| 95 | `console.log(JSON.stringify(results, null, 2));` |

##### scripts/fix-workorder-index.js (18 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `console.log('🔧 Starting WorkOrder Index Migration...');` |
| 25 | `console.log('🔗 Connecting to MongoDB...');` |
| 30 | `console.log('✅ Connected to MongoDB');` |
| 36 | `console.log('📋 Checking existing indexes...');` |
| 38 | `console.log('Current indexes:', indexes.map(idx => idx.name));` |
| 43 | `console.log('✅ Dropped problematic workOrderNumber_1 index');` |
| 46 | `console.log('ℹ️ workOrderNumber_1 index not found (already dropped)');` |
| 48 | `console.log('⚠️ Error dropping index:', error.message);` |
| 54 | `console.log('🔨 Creating partial unique index...');` |
| 67 | `console.log('✅ Created partial unique index: workOrderNumber_partial_unique');` |
| 73 | `console.log('✅ Verification: New index created successfully');` |
| 74 | `console.log('Index details:', JSON.stringify(partialIndex, null, 2));` |
| 76 | `console.log('❌ Verification failed: New index not found');` |
| 80 | `console.log('🧹 Cleaning up documents with null workOrderNumber...');` |
| 85 | `console.log(`✅ Cleaned up ${result.modifiedCount} documents with null workOrderN` |
| 87 | `console.log('🎉 WorkOrder Index Migration completed successfully!');` |
| 95 | `console.log('🔌 Database connection closed');` |
| 102 | `console.log('✨ Migration script completed');` |

##### scripts/test-auth-config.js (16 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `console.log('\n=== PHASE 1.2: AUTHENTICATION CONFIG VERIFICATION ===\n');` |
| 8 | `console.log('[1/4] Checking JWT_SECRET...');` |
| 11 | `console.log('❌ JWT_SECRET not found');` |
| 14 | `console.log('✅ JWT_SECRET configured (********)');` |
| 17 | `console.log(`✅ JWT_SECRET length: ${jwtSecret.length} bytes (secure)`);` |
| 21 | `console.log('\n[2/4] Checking MONGODB_URI...');` |
| 25 | `console.log('✅ MONGODB_URI configured (Atlas)');` |
| 28 | `console.log('\n[3/4] Testing auth module...');` |
| 32 | `console.log('✅ Auth module loaded');` |
| 34 | `console.log('\n[4/4] Testing JWT operations...');` |
| 36 | `console.log('✅ Token generation successful');` |
| 38 | `if (decoded) console.log('✅ Token verification successful');` |
| 40 | `console.log('❌ Auth module failed:', e.message);` |
| 44 | `console.log('\n' + '='.repeat(60));` |
| 46 | `console.log('✅✅✅ PHASE 1.2 COMPLETE: AUTHENTICATION VERIFIED ✅✅✅\n');` |
| 49 | `console.log('❌ PHASE 1.2 INCOMPLETE\n');` |

##### scripts/fixzit-security-fixes.js (15 حالة)

| السطر | الكود |
|-------|-------|
| 134 | `console.log('Admin user created. Password stored securely in environment variabl` |
| 151 | `console.log(\`Created \${userData.role} with secure password\`);` |
| 154 | `console.log('Database seeded successfully');` |
| 163 | `console.log('✅ Fixed database/seed.js - removed hardcoded passwords');` |
| 231 | `console.log(\`Server running securely on port \${PORT}\`);` |
| 235 | `console.log('✅ Fixed server.js - added proper CORS configuration and security mi` |
| 327 | `console.log('✅ Fixed public/app.js - removed localStorage token storage and inne` |
| 332 | `console.log('✅ Created .env.example with secure configuration template');` |
| 337 | `console.log('🔒 Applying FIXZIT SOUQ Security Fixes...\n');` |
| 350 | `console.log('\n🎉 Security fixes applied successfully!');` |
| 351 | `console.log('\n📋 Next steps:');` |
| 352 | `console.log('1. Install security packages: npm install helmet express-rate-limit` |
| 353 | `console.log('2. Create .env file: cp .env.example .env');` |
| 354 | `console.log('3. Replace files with fixed versions');` |
| 355 | `console.log('4. Restart your application');` |

##### scripts/verify-core.ts (15 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log('🔍 Verifying core functionality...');` |
| 14 | `console.log('📊 Testing database connection...');` |
| 16 | `console.log('✅ Database connection successful');` |
| 17 | `console.log('📋 Using unified MongoDB connection');` |
| 20 | `console.log('🔐 Testing JWT configuration...');` |
| 22 | `console.log('✅ JWT auth module loaded successfully');` |
| 25 | `console.log('🏢 Testing tenant isolation models...');` |
| 30 | `console.log('✅ HelpArticle model loaded');` |
| 31 | `console.log('✅ CmsPage model loaded');` |
| 32 | `console.log('✅ SupportTicket model loaded');` |
| 35 | `console.log('⚙️ Testing work order functionality...');` |
| 38 | `console.log('✅ Work order repository loaded');` |
| 41 | `console.log('🔄 Testing idempotency system...');` |
| 44 | `console.log(`✅ Idempotency key generated: ${testKey.substring(0, 20)}...`);` |
| 46 | `console.log('🎉 All core functionality verified successfully!');` |

##### scripts/fix-duplicate-keys.js (15 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `console.log(`\n🔍 Processing: ${filePath}`);` |
| 39 | `console.log(`   ⚠️  Duplicate found: '${key}' at line ${i + 1}`);` |
| 46 | `console.log(`\n📊 Found ${duplicates.length} duplicate keys`);` |
| 49 | `console.log('   ✅ No duplicates found!');` |
| 62 | `console.log(`\n🔧 Processing duplicates...`);` |
| 70 | `console.log(`   📝 '${key}': Keeping line ${toKeep}, removing lines ${toDelete.j` |
| 109 | `console.log(`\n🗑️  Removing ${toRemove.length} duplicate sections...`);` |
| 114 | `console.log(`   Removing lines ${range.start + 1} to ${range.end + 1}`);` |
| 122 | `console.log(`\n✅ Fixed! Removed ${toRemove.length} duplicate sections`);` |
| 131 | `console.log('🚀 Starting duplicate key removal...\n');` |
| 136 | `console.log(`\n${'='.repeat(60)}`);` |
| 137 | `console.log(`✅ COMPLETE!`);` |
| 138 | `console.log(`   en.ts: ${enFixed} sections removed`);` |
| 139 | `console.log(`   ar.ts: ${arFixed} sections removed`);` |
| 140 | `console.log(`${'='.repeat(60)}\n`);` |

##### scripts/assess-system.ts (15 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `console.log(pc.cyan('\n=== COMPREHENSIVE SYSTEM ASSESSMENT ===\n'));` |
| 10 | `console.log(pc.yellow('1. Code Statistics:'));` |
| 11 | `console.log(`   - Source files: ${files.length}`);` |
| 25 | `console.log(`   - Total lines: ${totalLines.toLocaleString()}`);` |
| 26 | `console.log(`   - Comment lines: ${commentedLines.toLocaleString()}`);` |
| 27 | `console.log(`   - TODO/FIXME comments: ${todoComments}`);` |
| 29 | `console.log(pc.yellow('\n2. Import Pattern Analysis:'));` |
| 39 | `console.log(`   - Legacy @/src/ imports: ${legacySrcImports}`);` |
| 40 | `console.log(`   - Modern @/lib/ imports: ${modernLibImports}`);` |
| 42 | `console.log(pc.yellow('\n3. Dead Code Indicators:'));` |
| 54 | `console.log(`   - Commented-out code lines: ${commentedCode}`);` |
| 56 | `console.log(pc.yellow('\n4. MongoDB Pattern Check:'));` |
| 66 | `console.log(`   - Direct MongoClient.connect(): ${directMongoClient}`);` |
| 67 | `console.log(`   - Scattered mongoose.connect(): ${legacyMongoose}`);` |
| 69 | `console.log(pc.green('\n=== Assessment complete ===\n'));` |

##### test_mongodb.js (14 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `console.log("🔄 Testing MongoDB Cloud Connection...");` |
| 9 | `console.log("📋 Configuration Check:");` |
| 10 | `console.log(`- MONGODB_URI: ${mongoUri ? "✅ Set" : "❌ Missing"}`);` |
| 11 | `console.log(`- MONGODB_DB: ${dbName}`);` |
| 14 | `console.log("❌ MongoDB URI not found in environment variables.");` |
| 15 | `console.log("🔧 Please set MONGODB_URI in your .env.local file");` |
| 16 | `console.log("Format: mongodb+srv://username:password@cluster.mongodb.net/databas` |
| 21 | `console.log(`🔗 Connecting to: ${safeUri}`);` |
| 25 | `console.log("⏳ Attempting connection...");` |
| 27 | `console.log("✅ Successfully connected to MongoDB!");` |
| 31 | `console.log(`📊 Database: ${dbName}`);` |
| 32 | `console.log(`📁 Collections found: ${collections.length}`);` |
| 35 | `console.log("🎉 MongoDB connection test completed successfully!");` |
| 38 | `console.log(`❌ MongoDB connection failed: ${error.message}`);` |

##### test-auth.js (14 حالة)

| السطر | الكود |
|-------|-------|
| 38 | `console.log(`${typeColors[type]}[${timestamp}] ${message}${colors.reset}`);` |
| 111 | `console.log('Response:', response.data);` |
| 126 | `console.log('Available providers:', response.data);` |
| 164 | `console.log('Response:', loginResponse.data);` |
| 191 | `console.log(colors.bright + '\n' + '='.repeat(60));` |
| 192 | `console.log('   FIXZIT SOUQ - Authentication Test Suite');` |
| 193 | `console.log('='.repeat(60) + colors.reset + '\n');` |
| 208 | `console.log(colors.bright + '\n--- Login Tests ---' + colors.reset);` |
| 214 | `console.log(colors.bright + '\n' + '='.repeat(60));` |
| 215 | `console.log('   TEST SUMMARY');` |
| 216 | `console.log('='.repeat(60) + colors.reset);` |
| 217 | `console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);` |
| 218 | `console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);` |
| 219 | `console.log(`Total: ${passed + failed}\n`);` |

##### scripts/seed-marketplace.js (13 حالة)

| السطر | الكود |
|-------|-------|
| 75 | `console.log('Connecting to MongoDB...');` |
| 77 | `console.log('Connected to MongoDB');` |
| 80 | `console.log('Clearing existing data...');` |
| 87 | `console.log('Creating users...');` |
| 115 | `console.log('Creating categories...');` |
| 126 | `console.log('Creating vendors...');` |
| 141 | `console.log('Creating products...');` |
| 293 | `console.log('✅ Database seeded successfully!');` |
| 294 | `console.log('\nTest credentials:');` |
| 295 | `console.log('- Admin: admin@fixzit.co / password123');` |
| 296 | `console.log('- Vendor: vendor@fixzit.co / password123');` |
| 297 | `console.log('- Customer: customer@fixzit.co / password123');` |
| 303 | `console.log('Disconnected from MongoDB');` |

##### scripts/test-mongodb-atlas.js (13 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log('\n=== PHASE 1.1: MONGODB ATLAS CONNECTION TEST ===\n');` |
| 17 | `console.log('✓ Atlas URI detected and validated\n');` |
| 22 | `console.log('⏳ Connecting to MongoDB Atlas...');` |
| 24 | `console.log('✅ Connected to MongoDB Atlas successfully!\n');` |
| 26 | `console.log('⏳ Pinging database...');` |
| 31 | `console.log('✅ Ping successful! Database is responsive.\n');` |
| 34 | `console.log('⏳ Listing available databases...');` |
| 36 | `console.log(`✅ Number of available databases: ${dbList.databases.length}`);` |
| 39 | `console.log('\n⏳ Checking "fixzit" database...');` |
| 44 | `console.log('⚠️  "fixzit" database exists but has no collections yet');` |
| 46 | `console.log(`✅ "fixzit" database contains ${collections.length} collection(s).`)` |
| 49 | `console.log('\n✅✅✅ PHASE 1.1 COMPLETE: MONGODB ATLAS CONNECTION VERIFIED ✅✅✅\n')` |
| 57 | `console.log('✓ Connection closed.\n');` |

##### scripts/fix-empty-catches.js (13 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `console.log(`Directory ${directory} does not exist, skipping...`);` |
| 42 | `// Pattern 2: Catch blocks with only console.log` |
| 97 | `console.log(`✅ Fixed ${fileFixCount} empty catch blocks in: ${fullPath}`);` |
| 105 | `console.log('🔧 Starting to fix empty catch blocks...');` |
| 106 | `console.log('=============================================');` |
| 112 | `console.log(`\n📁 Processing directory: ${dir}`);` |
| 116 | `console.log('\n=============================================');` |
| 117 | `console.log('📊 EMPTY CATCH BLOCKS FIX SUMMARY');` |
| 118 | `console.log('=============================================');` |
| 119 | `console.log(`Files modified: ${fixedFiles}`);` |
| 120 | `console.log(`Total fixes applied: ${totalFixes}`);` |
| 121 | `console.log('✅ Empty catch blocks fixed successfully!');` |
| 124 | `console.log('ℹ️  No empty catch blocks found or all already properly handled');` |

##### fix-all-unknown-types.js (13 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log('🔍 Analyzing all TypeScript errors...\n');` |
| 21 | `console.log(`Total errors found: ${allErrors.length}\n`);` |
| 25 | `console.log(`Unknown type errors (TS18046): ${unknownErrors.length}\n`);` |
| 38 | `console.log(`Files with unknown type errors: ${Object.keys(fileErrors).length}\n` |
| 61 | `console.log(`✅ Fixed ${filePath} (${varNames.size} variables)`);` |
| 66 | `console.log(`❌ Error processing ${filePath}: ${error.message}`);` |
| 70 | `console.log(`\n📊 Summary:`);` |
| 71 | `console.log(`   Files fixed: ${totalFixed}`);` |
| 72 | `console.log(`   Lines processed: ${totalLinesChanged}`);` |
| 75 | `console.log('\n🔍 Re-checking TypeScript errors...');` |
| 85 | `console.log(`\n✨ Results:`);` |
| 86 | `console.log(`   Total errors: ${allErrors.length} → ${remainingErrors} (fixed ${` |
| 87 | `console.log(`   Unknown type errors: ${unknownErrors.length} → ${remainingUnknow` |

##### scripts/apply-auth-to-routes.js (12 حالة)

| السطر | الكود |
|-------|-------|
| 14 | `console.log(`Directory ${directory} does not exist, skipping...`);` |
| 98 | `console.log(`✅ Applied ${fileModifications} security fixes to: ${fullPath}`);` |
| 106 | `console.log('🔒 Applying authentication middleware to all routes...');` |
| 107 | `console.log('=======================================================');` |
| 113 | `console.log(`\n📁 Processing directory: ${dir}`);` |
| 117 | `console.log('\n=======================================================');` |
| 118 | `console.log('📊 AUTHENTICATION APPLICATION SUMMARY');` |
| 119 | `console.log('=======================================================');` |
| 120 | `console.log(`Files modified: ${modifiedFiles}`);` |
| 121 | `console.log(`Security fixes applied: ${routesFixed}`);` |
| 122 | `console.log('✅ Authentication middleware applied successfully!');` |
| 125 | `console.log('ℹ️  All routes already have proper authentication or were skipped')` |

##### components/ErrorBoundary.tsx (12 حالة)

| السطر | الكود |
|-------|-------|
| 75 | `console.log('🔧 Auto-fixing JSON parsing error...');` |
| 90 | `console.log('⚠️ JSON fix fallback triggered');` |
| 100 | `console.log('🔧 Auto-fixing module resolution...');` |
| 122 | `console.log('⚠️ Module fix fallback triggered');` |
| 132 | `console.log('🔧 Auto-fixing network error...');` |
| 150 | `console.log('⚠️ Network fix fallback triggered');` |
| 160 | `console.log('🔧 Auto-fixing hydration error...');` |
| 172 | `console.log('⚠️ Hydration fix fallback triggered');` |
| 182 | `console.log('🔧 Auto-fixing runtime error...');` |
| 201 | `console.log('⚠️ Runtime fix fallback triggered');` |
| 289 | `console.log('🤖 Attempting auto-fix for:', error.message);` |
| 293 | `console.log(`🔧 Applying ${fix.type} fix...`);` |

##### scripts/auto-enhance-routes.js (11 حالة)

| السطر | الكود |
|-------|-------|
| 130 | `console.log(`\n🔧 Enhancing: ${filePath}`);` |
| 133 | `console.log(`❌ File not found: ${filePath}`);` |
| 141 | `console.log(`✅ Already enhanced, skipping`);` |
| 151 | `console.log(`⚠️  Imports added, needs manual OpenAPI docs and rate limiting logi` |
| 152 | `console.log(`   Please review and add:`);` |
| 153 | `console.log(`   1. Rate limiting at start of handler`);` |
| 154 | `console.log(`   2. OpenAPI documentation above handler`);` |
| 155 | `console.log(`   3. Replace NextResponse.json with createSecureResponse`);` |
| 156 | `console.log(`   4. Replace manual errors with standardized handlers`);` |
| 168 | `console.log('❌ Usage: node scripts/auto-enhance-routes.js <route-file>');` |
| 169 | `console.log('   Example: node scripts/auto-enhance-routes.js app/api/work-orders` |

##### scripts/create-test-data.js (11 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `console.log('🚀 Creating test data...');` |
| 41 | `console.log('✅ Admin user created:', admin.email);` |
| 58 | `console.log('✅ Test property created:', property.name);` |
| 76 | `console.log('✅ Test work order created:', workOrder.workOrderNumber);` |
| 92 | `console.log('✅ Test vendor created:', vendor.name);` |
| 115 | `console.log('✅ Test invoice created:', invoice.invoiceNumber);` |
| 126 | `console.log('\n📊 Database Status:');` |
| 128 | `console.log(`✅ ${collection}: ${count} documents`);` |
| 131 | `console.log('\n🎯 Test Credentials:');` |
| 132 | `console.log('Email: admin@fixzit.com');` |
| 133 | `console.log('Password: [REDACTED - check .env.local]');` |

##### batch-fix-unknown.js (11 حالة)

| السطر | الكود |
|-------|-------|
| 9 | `console.log('🔧 Batch fixing remaining unknown type errors...\n');` |
| 20 | `console.log(`Found ${errorLines.length} unknown type errors\n`);` |
| 36 | `console.log(`📝 ${filePath} (${count} errors)`);` |
| 50 | `console.log(`   ✅ Fixed\n`);` |
| 53 | `console.log(`   ⚠️  No changes needed\n`);` |
| 56 | `console.log(`   ❌ Error: ${error.message}\n`);` |
| 60 | `console.log(`\n✨ Fixed ${totalFixed} files`);` |
| 61 | `console.log('\n🔍 Checking final error count...');` |
| 72 | `console.log(`\nFinal TypeScript errors: ${finalCount}`);` |
| 73 | `console.log(`Unknown type errors remaining: ${unknownCount}`);` |
| 75 | `console.log('Could not count final errors');` |

##### lib/AutoFixManager.ts (11 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `console.log('🔧 Fixing auth API...');` |
| 75 | `console.log('🔧 Fixing help API...');` |
| 99 | `console.log('🔧 Fixing notifications API...');` |
| 125 | `console.log('🔧 Fixing database connection...');` |
| 147 | `console.log('🔧 Network offline - waiting for connection...');` |
| 194 | `console.log('🔧 Fixing localStorage...');` |
| 224 | `console.log('🔧 Fixing session management...');` |
| 247 | `console.log(`❌ ${check.name} failed, attempting fix...`);` |
| 293 | `console.log('🤖 Auto-fix monitoring started');` |
| 313 | `console.log('⏹️ Auto-fix monitoring stopped');` |
| 368 | `console.log('🚨 Emergency recovery initiated');` |

##### scripts/serve-frontend.js (10 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `console.log(`🔗 Proxying: ${req.method} ${backendUrl}`);` |
| 43 | `console.log('✅ Fixzit Frontend running on http://localhost:3000');` |
| 44 | `console.log('🔗 Connecting to Backend API at http://localhost:5000');` |
| 45 | `console.log('📱 Features:');` |
| 46 | `console.log('   - Landing page with 3 buttons');` |
| 47 | `console.log('   - Monday.com style interface');` |
| 48 | `console.log('   - RTL Arabic support');` |
| 49 | `console.log('   - Connected to working backend API');` |
| 43 | `console.log('✅ Fixzit Frontend running on http://localhost:3000');` |
| 44 | `console.log('🔗 Connecting to Backend API at http://localhost:5000');` |

##### scripts/fix-en-duplicates.js (10 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `console.log('🔧 Fixing en.ts duplicates and structure...');` |
| 25 | `console.log(`Found ${matches.length} top-level object(s)`);` |
| 29 | `console.log('⚠️  Multiple top-level objects detected. Merging...');` |
| 41 | `console.log('Removing duplicate const en declaration...');` |
| 97 | `console.log('✅ Fixed en.ts structure');` |
| 98 | `console.log('📊 Running TypeScript check...');` |
| 107 | `console.log('✅ TypeScript validation passed');` |
| 109 | `console.log('⚠️  TypeScript validation found issues (will be fixed in next step)` |
| 113 | `console.log(`Found ${duplicateErrors.length} duplicate key errors`);` |
| 117 | `console.log('✅ en.ts fix complete!');` |

##### scripts/test-auth-fix.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 7 | `console.log('⚠️  Using test JWT_SECRET - change this in production!');` |
| 17 | `console.log('✅ JWT generation works');` |
| 21 | `console.log('✅ JWT verification works');` |
| 22 | `console.log('   Decoded:', decoded);` |
| 27 | `console.log('\n✅ Auth fixes applied successfully!');` |
| 28 | `console.log('\nNext steps:');` |
| 29 | `console.log('1. Set JWT_SECRET in your .env file');` |
| 30 | `console.log('2. Restart your server: npm run dev');` |
| 31 | `console.log('3. Test login endpoint: POST /api/auth/login');` |

##### scripts/remove-duplicates-safe.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log(`\n📝 Processing: ${filePath}`);` |
| 72 | `console.log(`   ⚠️  Duplicate '${key}' at line ${lineNum} (first at ${firstOccur` |
| 120 | `console.log(`   ✅ No duplicates found`);` |
| 130 | `console.log(`   ✅ Removed ${linesToRemove.size} lines`);` |
| 138 | `console.log('🔧 Removing duplicate keys (structure-aware)...');` |
| 143 | `console.log(`\n📊 Summary:`);` |
| 144 | `console.log(`   en.ts: ${enRemoved} lines removed`);` |
| 145 | `console.log(`   ar.ts: ${arRemoved} lines removed`);` |
| 146 | `console.log(`\n✅ Done! Run 'npm run typecheck' to verify.`);` |

##### scripts/universal-verification.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log('❌ AUTH FAILED - Backend not running?');` |
| 18 | `console.log(`\n🔍 VERIFYING ${phase} IMPLEMENTATION...\n`);` |
| 84 | `console.log(`${test.name}: ${result}`);` |
| 88 | `console.log(`${test.name}: ❌ ERROR/NOT IMPLEMENTED`);` |
| 94 | `console.log(`\n📊 ${phase.toUpperCase()} REAL COMPLETION: ${percentage}%\n`);` |
| 105 | `console.log('❌ PHASE 1 INCOMPLETE - FIX THIS FIRST!');` |
| 106 | `console.log('SEARCH FOR: "workOrderSchema", "generateZATCAQR", "RFQSchema"');` |
| 108 | `console.log('✅ Phase 1 Complete');` |
| 109 | `console.log('🔧 Working on Phase 2 - Mobile Apps');` |

##### scripts/security-migration.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),` |
| 18 | `warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),` |
| 19 | `error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),` |
| 20 | `info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),` |
| 21 | `header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(50)}\` |
| 130 | `// Remove console.log, console.error, console.warn statements` |
| 130 | `// Remove console.log, console.error, console.warn statements` |
| 358 | `// Replace console.log with logger` |
| 130 | `// Remove console.log, console.error, console.warn statements` |

##### scripts/remove-duplicates-v2.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `console.log(`\n📝 Processing: ${filePath}`);` |
| 53 | `console.log(`   ⚠️  Duplicate '${keyName}' at line ${i + 1} (first at ${firstOcc` |
| 84 | `console.log(`      ↳ Removing lines ${duplicateStart + 1}-${i + 1}`);` |
| 101 | `console.log(`   ✅ Removed ${totalRemoved} lines`);` |
| 110 | `console.log('🔍 Removing duplicate keys...\n');` |
| 120 | `console.log(`\n📊 Summary:`);` |
| 121 | `console.log(`   en.ts: ${totalRemovedEn} lines removed`);` |
| 122 | `console.log(`   ar.ts: ${totalRemovedAr} lines removed`);` |
| 123 | `console.log(`\n✅ Done! Run 'npm run typecheck' to verify.`);` |

##### test-system-e2e.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `console.log(`✅ ${description}: ${res.statusCode} ${res.statusMessage}`);` |
| 21 | `console.log(`❌ ${description}: ${err.message}`);` |
| 26 | `console.log(`⏱️  ${description}: Timeout after 5s`);` |
| 36 | `console.log('🚀 Starting E2E System Tests...\n');` |
| 67 | `console.log('\n📊 Test Summary:');` |
| 71 | `console.log(`✅ Successful: ${successful}/${total} (${Math.round(successful/total` |
| 74 | `console.log('\n❌ Failed Routes:');` |
| 76 | `console.log(`   ${r.path} - ${r.error \|\| r.status}`);` |
| 80 | `console.log(`\n🎯 Target: 100% completions - Current: ${Math.round(successful/to` |

##### fix-unknown-smart.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 80 | `console.log('🔍 Finding files with unknown type errors...');` |
| 100 | `console.log(`📁 Found ${Object.keys(fileErrors).length} files with unknown type ` |
| 108 | `console.log(`🔧 Processing: ${filePath}`);` |
| 170 | `console.log(`   ✅ Fixed ${errors.length} errors`);` |
| 173 | `console.log(`   ❌ Error: ${error.message}`);` |
| 177 | `console.log(`\n✨ Fixed ${totalFixed} files`);` |
| 178 | `console.log('\n🔍 Checking remaining errors...');` |
| 187 | `console.log(`Remaining TypeScript errors: ${errorCount}`);` |
| 189 | `console.log('Could not count remaining errors');` |

##### public/app.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log('🚀 Fixzit Souq Enterprise Platform Loading...');` |
| 78 | `console.log('✅ Login successful:', this.user.name);` |
| 99 | `console.log('🚪 Logging out...');` |
| 175 | `console.log('📊 Loading dashboard data...');` |
| 184 | `console.log('✅ Dashboard data loaded successfully');` |
| 335 | `console.log(`🔗 Navigating to module: ${module}`);` |
| 344 | `console.log('✅ Fixzit Souq Enterprise Platform Initialized');` |
| 351 | `.then(data => console.log('System health check:', data.status))` |
| 352 | `.catch(error => console.log('Health check failed:', error));` |

##### fix_merge_conflicts.js (9 حالة)

| السطر | الكود |
|-------|-------|
| 42 | `console.log(`File not found: ${filePath}`);` |
| 51 | `console.log(`No conflicts found in: ${filePath}`);` |
| 60 | `console.log(`✅ Fixed conflicts in: ${filePath}`);` |
| 68 | `console.log('🔧 Fixing merge conflicts...\n');` |
| 81 | `console.log(`\n📊 Summary:`);` |
| 82 | `console.log(`✅ Successfully fixed: ${successCount} files`);` |
| 83 | `console.log(`❌ Errors: ${errorCount} files`);` |
| 86 | `console.log('\n🎉 All merge conflicts have been resolved!');` |
| 88 | `console.log('\n⚠️  Some files still need manual attention.');` |

##### scripts/create-project-text-index.js (8 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `console.log('✓ Connected to MongoDB');` |
| 24 | `console.log('⚠ Projects collection does not exist yet - will be created on first` |
| 25 | `console.log('✓ Index will be created automatically when collection is populated'` |
| 36 | `console.log('✓ Text index already exists on projects collection');` |
| 47 | `console.log('✓ Created text index on projects.name and projects.description');` |
| 52 | `console.log('\nCurrent indexes on projects collection:');` |
| 54 | `console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);` |
| 62 | `console.log('\n✓ Connection closed');` |

##### scripts/server-broken.js (8 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `console.log(`✅ Fixzit Enterprise Platform running on http://localhost:${PORT}`);` |
| 17 | `console.log('🎯 Features:');` |
| 18 | `console.log('   - Landing page with 3 buttons (Yellow Arabic, White Souq, Blue A` |
| 19 | `console.log('   - Monday.com style interface');` |
| 20 | `console.log('   - RTL support for Arabic');` |
| 21 | `console.log('   - All 13 FM modules structure');` |
| 22 | `console.log('   - Your exact brand colors');` |
| 44 | `console.log("✅ All 13 module routes mounted");` |

##### fix-unknown-types.js (8 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log('🔍 Analyzing TypeScript errors...');` |
| 16 | `console.log(`Found ${errorLines.length} 'unknown' type errors`);` |
| 31 | `console.log(`\n📁 Errors found in ${Object.keys(errorsByFile).length} files`);` |
| 75 | `console.log(`\n🔧 Processing ${file} (${errors.length} errors)`);` |
| 78 | `console.log(`   ✅ Fixed ${file}`);` |
| 83 | `console.log(`\n✨ Fixed ${fixedFiles} files`);` |
| 84 | `console.log('\n🔍 Re-running TypeScript check...');` |
| 86 | `console.log(`Remaining errors: ${newErrors.trim()}`);` |

##### scripts/scan-hex.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 94 | `console.log('🎨 Fixzit Brand Color Scanner');` |
| 95 | `console.log('================================\n');` |
| 111 | `console.log('⚠️  No files found to scan');` |
| 115 | `console.log(`📁 Scanning ${files.length} files...\n`);` |
| 160 | `console.log('✅ All colors are approved!');` |
| 161 | `console.log(`   Scanned: ${files.length} files`);` |
| 162 | `console.log(`   Violations: 0\n`);` |

##### scripts/fix-error-messages.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `console.log(`\n🔍 Processing ${apiFiles.length} API route files...`);` |
| 39 | `console.log(`  ✓ Fixed: ${file}`);` |
| 43 | `console.log(`\n✅ Complete!`);` |
| 44 | `console.log(`   Fixed ${fixed} files`);` |
| 45 | `console.log(`   Total checked: ${apiFiles.length}`);` |
| 48 | `console.log(`\n📝 Files modified:`);` |
| 49 | `filesChanged.forEach(f => console.log(`   - ${f}`));` |

##### scripts/cleanup-duplicate-imports.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 9 | `console.log('🧹 CLEANING UP DUPLICATE IMPORTS...\n');` |
| 26 | `console.log(`🔴 ${file} - Has duplicate imports!`);` |
| 40 | `console.log(`✅ ${file} - Removed duplicate imports`);` |
| 44 | `console.log(`⚠️  ${file} - Only has enhancedAuth import, converting...`);` |
| 58 | `console.log(`✅ ${file} - Converted to standard auth import`);` |
| 64 | `console.log(`\n📊 CLEANED UP ${cleanedCount} FILES\n`);` |
| 65 | `console.log('🚀 Ready to restart server!\n');` |

##### scripts/test-data.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `console.log('✅ Admin user created:', admin.email);` |
| 46 | `console.log('✅ Test property created:', property.name);` |
| 63 | `console.log('✅ Test work order created:', workOrder.workOrderNumber);` |
| 70 | `console.log('\n📊 Database Status:');` |
| 71 | `console.log(`- Users: ${userCount}`);` |
| 72 | `console.log(`- Properties: ${propertyCount}`);` |
| 73 | `console.log(`- Work Orders: ${workOrderCount}`);` |

##### scripts/fix-null-property-codes.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.log('🔗 Connecting to MongoDB...');` |
| 12 | `console.log('✅ Connected to MongoDB');` |
| 25 | `console.log(`🔍 Found ${nullProperties.length} properties with null/missing prop` |
| 51 | `console.log(`✅ Updated property ${property._id} with code: ${newCode}`);` |
| 55 | `console.log('\n🏢 Now creating property indexes with cleaned data...');` |
| 65 | `console.log('✅ Property indexes created successfully!');` |
| 72 | `console.log('🔚 Disconnected from MongoDB');` |

##### create-guardrails.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `console.log('Created:', file);` |
| 11 | `console.log('Setting up guardrails...\n');` |
| 25 | `console.log('Updated: package.json\n');` |
| 29 | `write('scripts/dedup/consolidate.ts', '#!/usr/bin/env tsx\nconst DRY = process.a` |
| 30 | `write('scripts/ui/ui_freeze_check.ts', '#!/usr/bin/env tsx\nimport fs from \"fs\` |
| 32 | `write('scripts/i18n/check_language_selector.ts', '#!/usr/bin/env tsx\nconsole.lo` |
| 48 | `console.log('\nAll files created successfully!');` |

##### scripts/fix-translation-duplicates.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 74 | `console.log(`Fixed ${fixes.length} duplicates in ${path.basename(filePath)}:`);` |
| 76 | `console.log(`  Line ${f.line}: ${f.oldKey} → ${f.newKey}`);` |
| 79 | `console.log(`No duplicates found in ${path.basename(filePath)}`);` |
| 83 | `console.log('Fixing duplicate keys in translation dictionaries...\n');` |
| 85 | `console.log('');` |
| 87 | `console.log('\nDone!');` |

##### scripts/verify.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `console.log(pc.cyan(`\n▶ ${g.name}`));` |
| 23 | `console.log(pc.green(`✓ ${g.name} passed`));` |
| 25 | `console.log(pc.red(`✗ ${g.name} failed`));` |
| 27 | `console.log(pc.gray(error?.stdout \|\| error?.message \|\| String(e)));` |
| 32 | `console.log(pc.bold('Fixzit Halt–Fix–Verify'));` |
| 34 | `console.log(pc.bold(pc.green('\nAll core gates passed.')));` |

##### public/ui-bootstrap.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 116 | `console.log('🚀 UI Bootstrap initialized');` |
| 131 | `console.log('✅ Sidebar toggle added');` |
| 170 | `console.log('✅ Footer added');` |
| 186 | `console.log('✅ Login successful');` |
| 196 | `console.log('✅ Login form wired');` |
| 209 | `console.log('🎉 All UI components ready!');` |

##### fix-imports.js (5 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `console.log("�� Starting import path fixes...");` |
| 23 | `console.log(`✅ Fixed ${oldPath} → ${newPath}`);` |
| 29 | `console.log("✅ File updated successfully!");` |
| 31 | `console.log("ℹ️ No changes needed in test file");` |
| 34 | `console.log("File not found for testing");` |

##### scripts/seed-cms.js (5 حالة)

| السطر | الكود |
|-------|-------|
| 127 | `console.log(`✅ Seeded page: ${page.slug}`);` |
| 181 | `console.log(`✅ Seeded help article: ${article.slug}`);` |
| 192 | `console.log('🌱 Starting CMS seeding...');` |
| 194 | `console.log('🌱 Seeding help articles...');` |
| 197 | `console.log('✅ Seeding complete!');` |

##### scripts/combine-all-models.js (5 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `console.log('📦 COMBINING ALL 15 MODELS FROM 3 PARTS...\n');` |
| 22 | `console.log(`Reading Part ${index + 1}: ${file}`);` |
| 76 | `console.log('\n✅ Successfully combined all 15 models into models/index.js');` |
| 79 | `console.log('\n📋 Exported Models:');` |
| 85 | `modelList.forEach((model, i) => console.log(`  ${i+1}. ${model}`));` |

##### public/simple-app.js (5 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `console.log('App.js loading...');` |
| 7 | `console.log('Waiting for React...');` |
| 12 | `console.log('React loaded, initializing app...');` |
| 27 | `console.log('App mounted');` |
| 152 | `console.log('App rendered successfully');` |

##### scripts/fix-tsx-entities.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 39 | `console.log(`✅ Fixed ${filePath}`);` |
| 51 | `console.log('🔧 Fixing HTML entities in TSX files...\n');` |
| 54 | `console.log(`📁 Found ${files.length} TSX files to check\n`);` |
| 64 | `console.log(`\n✨ Fixed ${modifiedCount} TSX files`);` |

##### scripts/seed-users.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 240 | `console.log('🌱 Seeding users...');` |
| 253 | `console.log(`✅ Created user: ${userData.email}`);` |
| 255 | `console.log(`⏭️  User already exists: ${userData.email}`);` |
| 259 | `console.log('✅ User seeding completed!');` |

##### scripts/fix-html-entities.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 56 | `console.log(`✅ Fixed HTML entities in ${filePath}`);` |
| 68 | `console.log('🔧 Fixing HTML entities in JavaScript files...\n');` |
| 73 | `console.log(`📁 Found ${files.length} JavaScript files to check\n`);` |
| 86 | `console.log(`\n✨ Completed! Fixed ${modifiedCount} out of ${processedCount} file` |

##### scripts/create-file.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `console.log(JSON.stringify(result));` |
| 61 | `console.log(JSON.stringify(result));` |
| 76 | `console.log(JSON.stringify(result, null, 2));` |
| 82 | `console.log(JSON.stringify(result));` |

##### scripts/replace-string-in-file-verbose.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 191 | `console.log(JSON.stringify({ success: false, message: msg, totalFiles: 0, totalR` |
| 291 | `console.log(JSON.stringify(summary, null, 2));` |
| 299 | `console.log(JSON.stringify({ success: false, message: msg }));` |

##### scripts/replace-string-in-file.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 194 | `console.log(JSON.stringify({ success: false, message: msg, totalFiles: 0, totalR` |
| 253 | `console.log(JSON.stringify(summary, null, 2));` |
| 260 | `console.log(JSON.stringify({ success: false, message: msg }));` |

##### scripts/setup-indexes.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `console.log('Setting up database indexes...');` |
| 7 | `console.log('⚠️  MONGODB_URI not set - skipping index creation');` |
| 11 | `console.log('✅ Database indexes created successfully');` |

##### scripts/verify-routes.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `console.log("Discovered routes:", unique);` |
| 38 | `console.log(`✅ ${res.status} ${url}`);` |
| 49 | `console.log("All discovered routes OK ✅");` |

##### scripts/ensure-indexes.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `console.log('🚀 Starting index creation process...\n');` |
| 18 | `console.log('✅ Connected to database\n');` |
| 22 | `console.log('\n✅ All indexes created successfully!');` |

##### scripts/dedupe-merge.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 41 | `console.log(pc.yellow(`Report written to ${reportPath}`));` |
| 56 | `console.log(pc.green(`Rewired duplicate to canonical: ${f} -> ${canonical}`));` |
| 59 | `console.log(pc.green('De-dupe apply complete (non-destructive re-exports).'));` |

##### scripts/setup-guardrails.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `console.log("Created: " + filePath.replace(ROOT, "."));` |
| 18 | `console.log("Setting up Consolidation Guardrails...\n");` |
| 23 | `console.log("\nAll files created!");` |

##### scripts/fixzit-server.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `console.log(`🚀 FIXZIT SOUQ running on port ${PORT}`);` |
| 21 | `console.log(`✅ Serving static files from public/ directory`);` |
| 22 | `console.log(`🌐 Access: http://localhost:${PORT}`);` |

##### scripts/janitor.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 52 | `console.log("Nothing to move. Root is clean ✅");` |
| 62 | `console.log(`Moved: ${f} -> ${ARCHIVE_DIR}/`);` |
| 67 | `console.log(`\nDone. Moved ${toMove.length} file(s) into ${ARCHIVE_DIR}`);` |

##### packages/fixzit-souq-server/server.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 125 | `console.log(`✅ Fixzit Souq Server running on port ${PORT}`);` |
| 126 | `console.log(`   Health check: http://localhost:${PORT}/health`);` |
| 128 | `console.log(`   DB: ${db.connected ? 'connected' : 'disconnected'}${db.error ? '` |

##### lib/db/index.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `console.log('📊 Creating indexes for core collections...');` |
| 119 | `console.log(`  ✓ ${collection}: ${JSON.stringify(indexSpec.key)}`);` |
| 135 | `console.log(`✅ Index creation complete: ${created} created, ${skipped} already e` |

##### lib/database.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `console.log('✅ MongoDB connection closed gracefully');` |
| 37 | `console.log('📡 Received SIGTERM, starting graceful shutdown...');` |
| 43 | `console.log('📡 Received SIGINT, starting graceful shutdown...');` |

##### test_zatca.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 1 | `console.log("Testing ZATCA system..."); const crypto = require("crypto"); const ` |
| 1 | `console.log("Testing ZATCA system..."); const crypto = require("crypto"); const ` |
| 1 | `console.log("Testing ZATCA system..."); const crypto = require("crypto"); const ` |

##### scripts/fix-imports-now.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 22 | `if (fixedCount <= 10) console.log('Fixed: ' + file);` |
| 31 | `console.log('\n✅ Fixed ' + fixedCount + ' files');` |

##### scripts/seed-marketplace.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `console.log(`[Marketplace seed] Preparing data for tenant: ${tenantId}`);` |
| 72 | `console.log('✔ Marketplace seed complete (MockDB)');` |

##### scripts/dedup/consolidate.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 6 | `console.log(DRY ? "DRY RUN - No changes will be made" : "APPLYING CHANGES");` |
| 7 | `console.log("Consolidation script ready");` |

##### scripts/fix-routes.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 55 | `console.log(`✅ Created ${routeFile}`);` |
| 59 | `console.log('✅ All routes fixed');` |

##### scripts/kb-change-stream.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `console.log('KB Change Stream watcher started…');` |
| 49 | `console.log(`Upserted embeddings for ${articleId} (chunks=${ops.length})`);` |

##### scripts/mongo-check.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 3 | `console.log("MONGODB_URI not set — skipping DB check.");` |
| 16 | `console.log("MongoDB ping OK ✅");` |

##### scripts/i18n/check_language_selector.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `console.log("Checking Language Selector standards...");` |
| 3 | `console.log("✓ Language selector OK");` |

##### scripts/verify-api.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `console.log("No API routes found. Skipping.");` |
| 39 | `console.log(`✅ ${m} ${res.status} ${url}`);` |

##### scripts/sidebar/snapshot_check.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `console.log("✓ Created sidebar snapshot");` |
| 10 | `console.log("✓ Sidebar snapshot exists");` |

##### scripts/copilot-index.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 51 | `console.log('No documents found for ingestion.');` |
| 71 | `console.log(`Indexed ${json.count ?? docs.length} documents into Copilot knowled` |

##### packages/fixzit-souq-server/routes/auth.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `console.log('Connected to MongoDB');` |
| 66 | `console.log('Demo users created in MongoDB');` |

##### components/AutoFixInitializer.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 9 | `console.log('🚀 Initializing Auto-Fix System...');` |
| 20 | `console.log('✅ System health check passed on startup');` |

##### public/js/saudi-mobile-optimizations.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 229 | `console.log('Weekend greeting:', greeting);` |
| 399 | `console.log('Arabic voice navigation available');` |

##### server/work-orders/wo.service.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 63 | `console.log(`Work order created: ${wo.code} by ${actorId} from ${ip \|\| 'unknown'` |
| 80 | `console.log(`Work order updated: ${updated?.code} by ${actorId} from ${ip \|\| 'un` |

##### app/fm/invoices/page.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 246 | `console.log('View invoice:', invoice._id);` |
| 251 | `console.log('Download invoice:', invoice._id);` |

##### app/fm/assets/page.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 151 | `console.log('View asset:', asset._id);` |
| 156 | `console.log('Edit asset:', asset._id);` |

##### scripts/seed-realdb.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 119 | `console.log('✅ Real DB seed complete (FM):', {` |

##### scripts/seed-aqar-properties.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 57 | `console.log('Seeded Aqar sample properties');` |

##### scripts/ui/ui_freeze_check.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 1 | `console.log('OK');` |

##### scripts/server-fixed.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 81 | `console.log(`Server running securely on port ${PORT}`);` |

##### scripts/generate-marketplace-bible.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 82 | `console.log(`[${correlationId}] ✔ Marketplace Bible generated at`, OUT_FILE);` |

##### scripts/_shared/marketplace.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 210 | `console.log(prefix, message, ...args);` |

##### scripts/seed-db.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `console.log('Seeding completed successfully');` |

##### scripts/codemods/update-mongodb-imports.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `console.log(`Rewired Mongo import in ${f}`);` |

##### scripts/seedMarketplace.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 148 | `console.log('Marketplace seed complete');` |

##### scripts/fixzit-pack.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 90 | `console.log(pc.green(`Built pack "${task}": ~${approxTokenCount(totalChars)} tok` |

##### scripts/seed-subscriptions.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 118 | `console.log('✅ Seed complete.');` |

##### scripts/replace.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `console.log(`` |

##### scripts/verify-sanitize-and-signed-urls.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `console.log('OK: sanitize');` |

##### lib/mongodb-unified.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 61 | `console.log('✅ MongoDB connected successfully');` |

##### tests/unit/components/ErrorBoundary.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 142 | `(console.log as ReturnType<typeof vi.fn>).mockRestore?.();` |

##### tests/unit/models/HelpArticle.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 63 | `console.log(JSON.stringify({ branch, hasCreate: !!HelpArticle?.create, hasFindOn` |

##### tests/e2e/database.spec.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 222 | `console.log(`Database query performance: ${responseTime}ms for ${data.items?.len` |

##### public/js/hijri-calendar-mobile.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 294 | `console.log('Islamic holidays for current year:', holidays);` |

##### public/prayer-times.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `console.log('Location access denied, using Riyadh as default');` |

##### tools/wo-scanner.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 83 | `console.log(JSON.stringify(out, null, 2));` |

##### app/api/payments/paytabs/callback/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 76 | `console.log('Payment successful', { order: String(cart_id).slice(0,8) + '...' })` |

##### app/api/support/welcome-email/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 58 | `console.log('📧 Welcome Email Request:', {` |

##### app/api/qa/reconnect/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 35 | `console.log('🔄 Database reconnected successfully');` |

##### app/api/qa/log/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 49 | `console.log(`📝 QA Log: ${event}`, data);` |

##### app/api/careers/apply/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 130 | `console.log('🎯 Job Application Received:', {` |

##### app/api/help/ask/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 330 | `console.log(`Metrics: action=${action}, success=${success}, duration=${duration}` |

##### app/work-orders/[id]/parts/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 99 | `console.log('Creating PO:', po);` |

---

### console.error (327 حالة)

- **عدد الملفات المتأثرة**: 166
- **متوسط الحالات لكل ملف**: 2.0

#### قائمة الملفات المتأثرة:

##### scripts/replace-string-in-file-verbose.ts (40 حالة)

| السطر | الكود |
|-------|-------|
| 156 | `console.error("🔍 VERBOSE MODE - Detailed logging enabled");` |
| 157 | `console.error("");` |
| 160 | `console.error("📋 Options:", JSON.stringify(opts, null, 2));` |
| 161 | `console.error("");` |
| 164 | `console.error("🎯 Pattern:", pattern);` |
| 165 | `console.error("");` |
| 169 | `console.error(`🔎 Searching for files matching: ${p}`);` |
| 182 | `console.error(`   Found ${matches.length} file(s)`);` |
| 185 | `console.error("");` |
| 189 | `console.error(`❌ ${msg}`);` |
| 195 | `console.error(`📁 Processing ${files.size} file(s)...`);` |
| 196 | `console.error("");` |
| 203 | `console.error(`📄 File: ${file}`);` |
| 205 | `console.error(`   📖 Reading file...`);` |
| 207 | `console.error(`   📏 Original size: ${original.length} bytes`);` |
| 208 | `console.error(`   🔍 Searching for pattern...`);` |
| 211 | `console.error(`   ✨ Found ${count} match(es)`);` |
| 214 | `console.error(`   ⏭️  Skipping (no matches)`);` |
| 216 | `console.error("");` |
| 220 | `console.error(`   📏 New size: ${result.length} bytes`);` |

*...و 20 حالة أخرى في هذا الملف*

##### scripts/scan-hex.js (22 حالة)

| السطر | الكود |
|-------|-------|
| 106 | `console.error('❌ Error: Not a git repository or git not available');` |
| 168 | `console.error('🚫 BANNED COLORS FOUND (MUST BE REPLACED):');` |
| 169 | `console.error('==========================================\n');` |
| 172 | `console.error(`  ❌ ${file}:${line}`);` |
| 173 | `console.error(`     Found: ${color}`);` |
| 174 | `console.error(`     Replace with: ${replacement}\n`);` |
| 180 | `console.error('⚠️  OFF-PALETTE COLORS FOUND:');` |
| 181 | `console.error('=============================\n');` |
| 191 | `console.error(`  ${color} (${locations.length} occurrence${locations.length > 1 ` |
| 193 | `console.error(`    - ${loc}`);` |
| 196 | `console.error(`    ... and ${locations.length - 5} more`);` |
| 198 | `console.error('');` |
| 203 | `console.error('❌ BRAND SCAN FAILED');` |
| 204 | `console.error('===================\n');` |
| 205 | `console.error(`   Banned colors: ${banned.length}`);` |
| 206 | `console.error(`   Off-palette colors: ${violations.length}`);` |
| 207 | `console.error(`   Total violations: ${banned.length + violations.length}\n`);` |
| 209 | `console.error('💡 Fix Options:');` |
| 210 | `console.error('   1. Replace with approved brand colors from WHITELIST');` |
| 211 | `console.error('   2. Use Tailwind theme tokens instead of hex');` |

*...و 2 حالة أخرى في هذا الملف*

##### scripts/setup-production-db.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 24 | `console.error('❌ Missing required environment variables:');` |
| 25 | `missing.forEach(env => console.error(`   - ${env}`));` |
| 32 | `console.error('❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongo` |
| 42 | `console.error('❌ MongoDB connection failed:', error);` |
| 89 | `console.error(`❌ Failed to create index on ${collection}:`, err.message \|\| Strin` |
| 153 | `console.error('💥 Production setup failed:', error);` |

##### public/sw.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 100 | `console.error('[SW] Failed to cache assets:', error);` |
| 194 | `console.error('[SW] Request failed:', error);` |
| 215 | `console.error('[SW] Network request failed:', error);` |
| 258 | `console.error('[SW] Background fetch failed:', error);` |
| 525 | `console.error('[SW] Font request failed:', error);` |
| 587 | `console.error('[SW] Background sync error:', error);` |

##### qa/tests/lib-paytabs.create-payment.custom-base.spec.ts (5 حالة)

| السطر | الكود |
|-------|-------|
| 66 | `console.error = (() => {}) as any;` |
| 64 | `// Stub console.error` |
| 65 | `const originalConsoleError = console.error;` |
| 66 | `console.error = (() => {}) as any;` |
| 93 | `console.error = originalConsoleError;` |

##### scripts/seed-cms.js (5 حالة)

| السطر | الكود |
|-------|-------|
| 129 | `console.error(`❌ Failed to seed ${page.slug}:`, await response.text());` |
| 132 | `console.error(`❌ Error seeding ${page.slug}:`, error);` |
| 183 | `console.error(`❌ Failed to seed ${article.slug}:`, await response.text());` |
| 186 | `console.error(`❌ Error seeding ${article.slug}:`, error);` |
| 200 | `console.error('❌ Seeding failed:', error);` |

##### providers/Providers.test.tsx (4 حالة)

| السطر | الكود |
|-------|-------|
| 39 | `console.error = (...args: any[]) => {` |
| 36 | `const ConsoleError = console.error;` |
| 39 | `console.error = (...args: any[]) => {` |
| 48 | `console.error = ConsoleError;` |

##### scripts/create-test-data.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 22 | `console.error('❌ DEFAULT_PASSWORD environment variable is required');` |
| 23 | `console.error('💡 Set it with: export DEFAULT_PASSWORD="your-secure-password"');` |
| 138 | `console.error('❌ Error creating test data:', error);` |
| 23 | `console.error('💡 Set it with: export DEFAULT_PASSWORD="your-secure-password"');` |

##### packages/fixzit-souq-server/routes/auth.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `console.error('MongoDB connection error:', error);` |
| 68 | `console.error('Error initializing users:', error);` |
| 126 | `console.error('Login error:', error);` |
| 170 | `console.error('Auth check error:', error);` |

##### lib/auth.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 38 | `console.error(errorMessage);` |
| 41 | `console.error('Authentication system cannot start without User model in producti` |
| 71 | `console.error('🚨 FATAL: JWT_SECRET is not configured in production environment'` |
| 72 | `console.error('🚨 Application cannot start without JWT_SECRET in production');` |

##### analyze-pr-comments.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `console.error(`Error executing command: ${command}`);` |
| 16 | `console.error(error.message);` |
| 26 | `console.error('❌ فشل في جلب قائمة Pull Requests');` |
| 139 | `console.error(`\n❌ خطأ في معالجة PR #${prNumber}: ${error.message}`);` |

##### app/api/help/ask/route.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 191 | `} catch (e) { console.error('Vector search failed, falling back to lexical searc` |
| 238 | `console.error('help/ask error', { correlationId, error: _err });` |
| 266 | `console.error('Failed to initialize Redis client:', err);` |
| 291 | `console.error('Redis rate limit check failed, falling back to in-memory:', _err)` |

##### scripts/verify-sanitize-and-signed-urls.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `run().catch((e) => { console.error(e); process.exit(1); });` |
| 21 | `run().catch((e) => { console.error(e); process.exit(1); });` |
| 21 | `run().catch((e) => { console.error(e); process.exit(1); });` |

##### scripts/rapid-enhance-all.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 182 | `console.error(`❌ ERROR: ${filePath}`, error.message);` |
| 193 | `console.error('Error finding routes:', error);` |
| 254 | `main().catch(console.error);` |

##### scripts/fixzit-security-fixes.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 156 | `console.error('Seeding error:', error);` |
| 221 | `console.error(err.stack);` |
| 358 | `console.error('❌ Error applying security fixes:', error);` |

##### scripts/verify-routes.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 36 | `console.error(`❌ ${res.status} ${url}`);` |
| 42 | `console.error(`❌ ERR ${url}`, e);` |
| 46 | `console.error(`Route failures: ${failures}`);` |

##### scripts/_shared/marketplace.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `console.error(`Failed to read JSON file ${filePath}:`, error.message);` |
| 49 | `console.error(`Failed to write JSON file ${filePath}:`, error.message);` |
| 203 | `console.error(prefix, message, ...args);` |

##### components/CopilotWidget.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 188 | `console.error('Copilot profile error', err);` |
| 238 | `console.error('Copilot chat error', error);` |
| 281 | `console.error('Tool error', error);` |

##### components/ErrorBoundary.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 218 | `console.error('🚨 UI Error Caught:', {` |
| 309 | `console.error('❌ Auto-fix failed:', fixError);` |
| 460 | `console.error('Failed to send welcome email:', error);` |

##### test-mongodb-comprehensive.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 205 | `console.error('❌ MONGODB_URI environment variable not set');` |
| 227 | `console.error('\n❌ TEST FAILED:', err.message);` |
| 228 | `console.error(err.stack);` |

##### lib/database.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 32 | `console.error('❌ Error during database cleanup:', error);` |
| 49 | `console.error('💥 Uncaught exception:', error);` |
| 55 | `console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);` |

##### tests/api/marketplace/search.route.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `const originalConsoleError = console.error;` |
| 19 | `console.error = vi.fn();` |
| 23 | `console.error = originalConsoleError;` |

##### public/app.js (3 حالة)

| السطر | الكود |
|-------|-------|
| 87 | `console.error('❌ Login error:', error);` |
| 186 | `console.error('❌ Failed to load dashboard data:', error);` |
| 281 | `console.error('❌ Error:', message);` |

##### server/utils/errorResponses.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 101 | `console.error('Internal server error:', {` |
| 140 | `console.error('Unhandled API error:', {` |
| 151 | `console.error('Unknown error type:', error);` |

##### scripts/fix-imports-now.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `console.error(`Failed to process ${file}:`, error?.message \|\| String(e));` |
| 27 | `if (error?.stack) console.error(error.stack);` |

##### scripts/replace-string-in-file.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 192 | `console.error(msg);` |
| 258 | `console.error(msg);` |

##### scripts/generate-marketplace-bible.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 76 | `console.error(`[${correlationId}] Forced write failure:`, error.message);` |
| 93 | `console.error(`[${correlationId}] Failed to generate marketplace bible:`, messag` |

##### scripts/test-mongodb-atlas.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `console.error('❌ FATAL: Invalid MONGODB_URI in .env.local');` |
| 52 | `console.error('\n❌ CONNECTION FAILED:', error.message);` |

##### scripts/fix-workorder-index.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 90 | `console.error('❌ Migration failed:', error);` |
| 105 | `console.error('💥 Migration script failed:', error);` |

##### scripts/verify-api.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 37 | `console.error(`❌ ${m} ${res.status} ${url}`);` |
| 43 | `console.error(`❌ ${m} ERR ${url}`, e);` |

##### scripts/analyze-project.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 723 | `console.error('❌ Analysis failed:', error.message);` |
| 724 | `console.error('Stack trace:', error.stack);` |

##### scripts/unified-audit-system.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 291 | `console.error('❌ Audit failed:', error.message);` |
| 801 | `console.error('❌ Unified audit failed:', error.message);` |

##### scripts/copilot-index.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 77 | `console.error('Usage: tsx scripts/copilot-index.ts "docs/**/*.md"');` |
| 85 | `console.error(error);` |

##### scripts/enhance-api-routes.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 331 | `console.error(`✗ ${route} - Error: ${error.message}`);` |
| 359 | `main().catch(console.error);` |

##### components/TopBar.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 111 | `console.error('Failed to fetch notifications:', error);` |
| 209 | `console.error('Logout error:', error);` |

##### lib/mongo.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 70 | `console.error('ERROR: mongoose.connect() failed:', err?.message \|\| err);` |
| 103 | `console.error('Database connection error:', {` |

##### lib/paytabs.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 85 | `console.error('PayTabs error:', error);` |
| 108 | `console.error('PayTabs verification error:', error);` |

##### lib/paytabs/core.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 132 | `console.error('PayTabs error:', error);` |
| 163 | `console.error('PayTabs verification error:', error);` |

##### lib/paytabs.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 119 | `console.error('PayTabs error:', error);` |
| 146 | `console.error('PayTabs verification error:', error);` |

##### lib/mongodb-unified.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `console.error('❌ MongoDB connection error:', error);` |
| 90 | `console.error('Database health check failed:', error);` |

##### public/ui-bootstrap.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 109 | `console.error("Login failed:", error);` |
| 191 | `console.error('Login error:', error);` |

##### tools/wo-smoke.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 19 | `console.error("❌ ERR", res.status, body);` |
| 77 | `console.error("❌ Test failed:", e);` |

##### test-e2e-comprehensive.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 25 | `console.error(`❌ ${name}: ${err.message}`);` |
| 220 | `console.error('\n💥 FATAL ERROR:', err);` |

##### app/api/payments/callback/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 65 | `console.error('Invoice not found for payment callback:', cart_id);` |
| 118 | `console.error('Payment callback error:', error);` |

##### app/api/projects/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 106 | `console.error('[POST /api/projects] Error creating project:', {` |
| 165 | `console.error(`[${correlationId}] Projects fetch failed:`, error);` |

##### app/api/support/tickets/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 77 | `console.error('Support ticket creation failed:', error);` |
| 116 | `console.error('Support tickets query failed:', error);` |

##### app/api/invoices/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 186 | `console.error('[POST /api/invoices] Error creating invoice:', {` |
| 260 | `console.error('[GET /api/invoices] Error fetching invoices:', {` |

##### app/api/invoices/[id]/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 134 | `console.error("ZATCA generation failed:", error);` |
| 248 | `console.error('Invoice DELETE error:', error);` |

##### app/api/qa/alert/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 52 | `console.error('Failed to process QA alert:', error);` |
| 75 | `console.error('Failed to fetch QA alerts:', error);` |

##### app/api/qa/log/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `console.error('Failed to log QA event:', error);` |
| 88 | `console.error('Failed to fetch QA logs:', error);` |

##### app/api/careers/apply/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 181 | `console.error('🚨 Job application error:', error);` |
| 189 | `console.error('Job application error details:', error.message, error.stack);` |

##### app/api/vendors/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 101 | `console.error('[POST /api/vendors] Error creating vendor:', {` |
| 164 | `console.error('[GET /api/vendors] Error fetching vendors:', {` |

##### app/api/assets/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 114 | `console.error('POST /api/assets error:', error);` |
| 187 | `console.error('GET /api/assets error:', error);` |

##### app/api/admin/discounts/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 74 | `console.error('Discount fetch failed:', error);` |
| 117 | `console.error('Discount update failed:', error);` |

##### app/api/admin/price-tiers/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 86 | `console.error('Price tier fetch failed:', error);` |
| 138 | `console.error('Price tier creation failed:', error);` |

##### app/api/slas/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 156 | `console.error('SLA creation failed:', error);` |
| 215 | `console.error('Failed to fetch SLAs:', error);` |

##### app/api/marketplace/products/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 94 | `console.error('Marketplace products list failed', error);` |
| 137 | `console.error('Marketplace product creation failed:', error);` |

##### app/api/marketplace/cart/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `console.error('Marketplace cart fetch failed', error);` |
| 116 | `console.error('Marketplace add to cart failed', error);` |

##### app/api/ats/applications/[id]/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `console.error('Application fetch error:', error);` |
| 83 | `console.error('Application update error:', error);` |

##### app/api/ats/jobs/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 69 | `console.error('Jobs list error:', error);` |
| 110 | `console.error('Job creation error:', error);` |

##### app/api/ats/jobs/[id]/apply/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 107 | `console.error('Resume save failed:', err);` |
| 234 | `console.error('Job application error:', error);` |

##### app/api/properties/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 116 | `console.error('[POST /api/properties] Error creating property:', {` |
| 191 | `console.error(`[${correlationId}] Properties fetch failed:`, error);` |

##### app/api/finance/invoices/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 86 | `console.error('[GET /api/finance/invoices] Error fetching invoices:', {` |
| 148 | `console.error('[POST /api/finance/invoices] Error creating invoice:', {` |

##### app/api/tenants/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 118 | `console.error('POST /api/tenants error:', error);` |
| 169 | `console.error('GET /api/tenants error:', error);` |

##### app/api/help/articles/[id]/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 69 | `.catch((e) => console.error(`Failed to trigger KB ingest for article ${article.s` |
| 80 | `console.error('PATCH /api/help/articles/[id] failed', _err);` |

##### scripts/add-database-indexes.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 162 | `console.error('❌ Error creating database indexes:', error);` |

##### scripts/fixzit-comprehensive-audit.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 534 | `main().catch(console.error);` |

##### scripts/test-auth-fix.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 24 | `console.error('❌ JWT test failed:', error.message);` |

##### scripts/seed-marketplace.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 94 | `console.error('Failed to seed marketplace (MockDB)', error);` |

##### scripts/seedData.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 293 | `console.error('❌ Seeding failed:', error);` |

##### scripts/setup-indexes.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 14 | `console.error('❌ Index creation failed:', error);` |

##### scripts/seed-realdb.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 126 | `console.error('❌ Real DB seed failed:', err);` |

##### scripts/test-mongo-connection.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 78 | `console.error('❌ Connection test failed:', error);` |

##### scripts/complete-system-audit.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 618 | `scanner.runCompleteAudit().catch(console.error);` |

##### scripts/seed-marketplace.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 300 | `console.error('Error seeding database:', error);` |

##### scripts/seed-aqar-properties.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 60 | `console.error(e);` |

##### scripts/create-project-text-index.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 58 | `console.error('✗ Error:', error.message);` |

##### scripts/deploy-db-verify.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 309 | `console.error('💥 Verification failed:', error);` |

##### scripts/fixzit-unified-audit-system.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 695 | `runFullAudit().catch(console.error);` |

##### scripts/kb-change-stream.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 57 | `console.error(err);` |

##### scripts/scanner.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 116 | `console.error(`${colors.red}Scanner Error: ${error.message}${colors.reset}`);` |

##### scripts/fix-tsx-entities.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 45 | `console.error(`❌ Error processing ${filePath}:`, error.message);` |

##### scripts/serve-frontend.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `console.error('Proxy error:', err.message);` |

##### scripts/server-fixed.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 71 | `console.error(err.stack);` |

##### scripts/fix-eslint-errors.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 126 | `console.error(`❌ Error processing ${filePath}: ${error.message}`);` |

##### scripts/phase1-truth-verifier.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 310 | `console.error("❌ Critical error:", err.message);` |

##### scripts/mongo-check.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `console.error("MongoDB ping FAILED ❌", e);` |

##### scripts/reality-check.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 179 | `console.error("Error running verification:", error);` |

##### scripts/complete-scope-verification.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 261 | `testAllEndpoints().catch(console.error);` |

##### scripts/seed-db.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `console.error('Seeding failed:', error);` |

##### scripts/ensure-indexes.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 27 | `console.error('\n❌ Error creating indexes:', error);` |

##### scripts/test-data.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 77 | `console.error('Error creating test data:', error);` |

##### scripts/seed-users.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 261 | `console.error('❌ Error seeding users:', error);` |

##### scripts/verify-core.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `console.error('❌ Core verification failed:', error);` |

##### scripts/fix-html-entities.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 62 | `console.error(`❌ Error processing ${filePath}:`, error.message);` |

##### scripts/seedMarketplace.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 153 | `console.error(error);` |

##### scripts/fix-null-property-codes.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 68 | `console.error('❌ Error fixing property codes:', error);` |

##### scripts/create-file.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 80 | `console.error(result.message);` |

##### scripts/seed-subscriptions.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 123 | `console.error(err);` |

##### scripts/replace.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 54 | `console.error('Error: Missing required arguments');` |

##### packages/fixzit-souq-server/routes/marketplace.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 67 | `console.error('Products fetch error:', error);` |

##### packages/fixzit-souq-server/server.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 114 | `console.error('Server error:', err);` |

##### components/ClientLayout.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 71 | `console.error('Failed to fetch user role:', error);` |

##### components/topbar/GlobalSearch.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 52 | `console.error('Search failed:', error);` |

##### components/SystemVerifier.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `console.error('Verification failed:', error);` |

##### components/AutoFixInitializer.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 23 | `console.error('❌ Failed to run initial health check:', error);` |

##### components/SupportPopup.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 149 | `console.error("Ticket creation error:", e);` |

##### components/marketplace/ProductCard.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `console.error('Failed to add product to cart', error);` |

##### components/marketplace/CatalogView.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 167 | `console.error(err);` |

##### components/marketplace/PDPBuyBox.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 47 | `console.error('Failed to add product to cart', error);` |

##### components/fm/WorkOrdersView.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 384 | `console.error('Failed to create work order', error);` |

##### components/AIChat.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 79 | `console.error('AI Chat error:', error);` |

##### analyze-system-errors.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 43 | `console.error('❌ خطأ في جمع الملفات:', error.message);` |

##### test-system-e2e.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 85 | `runE2ETests().catch(console.error);` |

##### qa/consoleHijack.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `console.error = wrap('error');` |

##### qa/AutoFixAgent.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 86 | `haltAndHeal('console', rec.args?.[0]?.message \|\| String(rec.args?.[0] \|\| 'consol` |

##### lib/errors/secureErrorResponse.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 87 | `console.error('[Secure Error Handler]', {` |

##### lib/db/index.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 131 | `console.error(`  ✗ Failed to create indexes for ${collection}:`, error);` |

##### lib/zatca.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 43 | `console.error('QR Code generation error:', error);` |

##### lib/edge-auth-middleware.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 70 | `console.error('Authentication error:', error);` |

##### lib/marketplace/serverFetch.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 95 | `console.error('[MarketplaceFetch] request failed', errorPayload);` |

##### lib/AutoFixManager.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 254 | `console.error(`❌ Fix failed for ${check.name}:`, fixError);` |

##### lib/aws-secrets.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 41 | `console.error(`Failed to retrieve secret ${secretName}:`, error);` |

##### tests/api/marketplace/search.route.impl.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 100 | `console.error('search error', error);` |

##### tests/unit/components/ErrorBoundary.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 141 | `(console.error as ReturnType<typeof vi.fn>).mockRestore?.();` |

##### tests/setup.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 76 | `console.error('Unhandled Rejection at:', promise, 'reason:', reason);` |

##### tests/paytabs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 324 | `expect(console.error).toHaveBeenCalled();` |

##### public/js/saudi-mobile-optimizations.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 366 | `console.error('Failed to sync offline data:', error);` |

##### fix_merge_conflicts.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 63 | `console.error(`❌ Error fixing ${filePath}:`, error.message);` |

##### server/copilot/audit.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `console.error("Failed to record copilot audit", error);` |

##### server/middleware/withAuthRbac.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 23 | `console.error('Failed to parse x-user header:', e);` |

##### app/api/billing/subscribe/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 153 | `console.error('Subscription creation failed:', error);` |

##### app/api/health/database/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 56 | `console.error('Database health check failed:', error);` |

##### app/api/auth/me/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 96 | `console.error('Get current user error:', error);` |

##### app/api/payments/paytabs/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 112 | `console.error('PayTabs error:', error);` |

##### app/api/feeds/indeed/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 91 | `console.error('Failed to fetch jobs:', error);` |

##### app/api/projects/[id]/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 77 | `console.error('GET /api/projects/[id] error:', error);` |

##### app/api/benchmarks/compare/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 70 | `console.error('Benchmark comparison failed:', error);` |

##### app/api/support/welcome-email/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 151 | `console.error(`[${correlationId}] Welcome email error:`, error);` |

##### app/api/support/incidents/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 106 | `console.error('Rate limiting failed:', error);` |

##### app/api/copilot/chat/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 183 | `console.error("Copilot chat error:", error);` |

##### app/api/qa/health/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 61 | `console.error('Database health check failed:', error);` |

##### app/api/qa/reconnect/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 43 | `console.error('❌ Database reconnection failed:', error);` |

##### app/api/integrations/linkedin/apply/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 90 | `console.error('LinkedIn apply error:', error);` |

##### app/api/marketplace/vendor/products/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 329 | `console.error('Vendor product creation error:', error);` |

##### app/api/marketplace/categories/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `console.error('Failed to fetch marketplace categories', error);` |

##### app/api/marketplace/products/[slug]/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 54 | `console.error('Failed to load product details', error);` |

##### app/api/marketplace/orders/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 65 | `console.error('Marketplace orders fetch failed', error);` |

##### app/api/marketplace/search/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 98 | `console.error('Marketplace search failed', error);` |

##### app/api/work-orders/import/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 92 | `console.error(`[${correlationId}] Work order import error for row ${i + 1}:`, er` |

##### app/api/public/rfqs/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 180 | `console.error('Public RFQ fetch error:', error);` |

##### app/api/owners/groups/assign-primary/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 80 | `console.error('Owner group assignment failed:', error);` |

##### app/api/ats/convert-to-employee/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 84 | `console.error('Convert to employee error:', error);` |

##### app/api/ats/moderation/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `console.error('Moderation error:', error);` |

##### app/api/ats/public-post/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 103 | `console.error("Public post error:", error);` |

##### app/api/ats/jobs/[id]/publish/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `console.error('Job publish error:', error);` |

##### app/api/search/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 232 | `console.error('Search API error:', error);` |

##### app/api/contracts/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 96 | `console.error('Contract creation failed:', error);` |

##### app/api/kb/ingest/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 55 | `console.error('kb/ingest error', err);` |

##### app/api/kb/search/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 132 | `console.error('kb/search error', err);` |

##### app/api/help/articles/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 172 | `console.error('Error fetching help articles:', error);` |

##### app/logout/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `console.error('Logout error:', error);` |

##### app/careers/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 339 | `console.error('Application submission error:', error);` |

##### app/work-orders/[id]/parts/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 42 | `console.error('Failed to search parts:', error);` |

##### app/fm/invoices/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 264 | `console.error('Send error:', error);` |

##### app/fm/assets/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 178 | `console.error('Delete error:', error);` |

---

### Type Cast to Any (307 حالة)

- **عدد الملفات المتأثرة**: 47
- **متوسط الحالات لكل ملف**: 6.5

#### قائمة الملفات المتأثرة:

##### qa/tests/lib-paytabs.create-payment.default.spec.ts (27 حالة)

| السطر | الكود |
|-------|-------|
| 39 | `return Promise.resolve({ json: async () => mockResponse } as any);` |
| 40 | `}) as any;` |
| 89 | `globalThis.fetch = originalFetch as any;` |
| 103 | `return Promise.resolve({ json: async () => ({ redirect_url: 'url', tran_ref: 're` |
| 104 | `}) as any;` |
| 111 | `} as any);` |
| 118 | `} as any);` |
| 125 | `} as any);` |
| 132 | `} as any);` |
| 135 | `globalThis.fetch = originalFetch as any;` |
| 148 | `return Promise.resolve({ json: async () => ({ redirect_url: 'url', tran_ref: 're` |
| 149 | `}) as any;` |
| 156 | `} as any);` |
| 161 | `globalThis.fetch = originalFetch as any;` |
| 174 | `return Promise.resolve({ json: async () => ({ message: 'Invalid payment details'` |
| 175 | `}) as any;` |
| 182 | `} as any);` |
| 187 | `return Promise.resolve({ json: async () => ({}) } as any);` |
| 188 | `}) as any;` |
| 194 | `} as any);` |

*...و 7 حالة أخرى في هذا الملف*

##### tests/unit/models/Asset.test.ts (23 حالة)

| السطر | الكود |
|-------|-------|
| 54 | `const doc = new (Asset as any)(data);` |
| 67 | `const doc = new (Asset as any)(data);` |
| 75 | `const ok = new (Asset as any)(buildValidAsset({ type: 'ELECTRICAL' }));` |
| 78 | `const bad = new (Asset as any)(buildValidAsset({ type: 'INVALID_TYPE' as any }))` |
| 78 | `const bad = new (Asset as any)(buildValidAsset({ type: 'INVALID_TYPE' as any }))` |
| 85 | `const badStatus = new (Asset as any)(buildValidAsset({ status: 'BROKEN' as any }` |
| 85 | `const badStatus = new (Asset as any)(buildValidAsset({ status: 'BROKEN' as any }` |
| 90 | `const badCrit = new (Asset as any)(buildValidAsset({ criticality: 'ULTRA' as any` |
| 90 | `const badCrit = new (Asset as any)(buildValidAsset({ criticality: 'ULTRA' as any` |
| 97 | `let doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset()` |
| 100 | `doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().con` |
| 103 | `doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().con` |
| 106 | `doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().con` |
| 111 | `const ok = new (Asset as any)(buildValidAsset({ maintenanceHistory: [{ type: 'IN` |
| 114 | `const bad = new (Asset as any)(buildValidAsset({ maintenanceHistory: [{ type: 'R` |
| 114 | `const bad = new (Asset as any)(buildValidAsset({ maintenanceHistory: [{ type: 'R` |
| 121 | `const ok = new (Asset as any)(buildValidAsset({ depreciation: { ...buildValidAss` |
| 124 | `const bad = new (Asset as any)(buildValidAsset({ depreciation: { ...buildValidAs` |
| 124 | `const bad = new (Asset as any)(buildValidAsset({ depreciation: { ...buildValidAs` |
| 131 | `const indexes: Array<[Record<string, any>, Record<string, any>]> = (Asset as any` |

*...و 3 حالة أخرى في هذا الملف*

##### tests/paytabs.test.ts (23 حالة)

| السطر | الكود |
|-------|-------|
| 93 | `const { createHppRequest, paytabsBase } = mod as any;` |
| 96 | `(globalThis as any).fetch = vi.fn().mockResolvedValue({` |
| 105 | `const [url, options] = (globalThis.fetch as any).mock.calls[0];` |
| 143 | `const { createPaymentPage } = mod as any;` |
| 146 | `(globalThis as any).fetch = vi.fn().mockResolvedValue({` |
| 159 | `const [url, options] = (globalThis.fetch as any).mock.calls[0];` |
| 199 | `const { createPaymentPage } = mod as any;` |
| 201 | `(globalThis as any).fetch = vi.fn().mockResolvedValue({` |
| 209 | `const [, options] = (globalThis.fetch as any).mock.calls[0];` |
| 222 | `const { createPaymentPage } = mod as any;` |
| 224 | `(globalThis as any).fetch = vi.fn().mockResolvedValue({` |
| 245 | `const { createPaymentPage } = mod as any;` |
| 247 | `(globalThis as any).fetch = vi.fn().mockResolvedValue({` |
| 267 | `const { createPaymentPage } = mod as any;` |
| 269 | `(globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network down'))` |
| 290 | `const { verifyPayment } = mod as any;` |
| 293 | `(globalThis as any).fetch = vi.fn().mockResolvedValue({` |
| 300 | `const [url, options] = (globalThis.fetch as any).mock.calls[0];` |
| 318 | `const { verifyPayment } = mod as any;` |
| 321 | `(globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Server 500'));` |

*...و 3 حالة أخرى في هذا الملف*

##### app/api/marketplace/products/[slug]/route.test.ts (20 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `return await (res as any).json()` |
| 39 | `const req = {} as any // Minimal NextRequest stub` |
| 44 | `await expect(readJson(res as any)).resolves.toEqual({ error: 'Not found' })` |
| 57 | `const req = {} as any` |
| 63 | `const body = await readJson(res as any)` |
| 81 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'no-currency'` |
| 82 | `const body = await readJson(res as any)` |
| 98 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'no-prices' }` |
| 99 | `const body = await readJson(res as any)` |
| 115 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'empty-prices` |
| 116 | `const body = await readJson(res as any)` |
| 132 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'out-of-stock` |
| 133 | `const body = await readJson(res as any)` |
| 148 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'no-inventori` |
| 149 | `const body = await readJson(res as any)` |
| 165 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'no-leaddays'` |
| 166 | `const body = await readJson(res as any)` |
| 175 | `const res = await GET({} as any, { params: Promise.resolve({ slug: 'boom' }) })` |
| 178 | `await expect(readJson(res as any)).resolves.toEqual({ error: 'Server error' })` |
| 185 | `await GET({} as any, { params: Promise.resolve({ slug: 'unique-slug' }) })` |

##### qa/tests/lib-paytabs.base-and-hpp.spec.ts (16 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `expect(paytabsBase('UNKNOWN' as any)).toBe('https://secure-global.paytabs.com');` |
| 18 | `expect(paytabsBase('' as any)).toBe('https://secure-global.paytabs.com');` |
| 19 | `expect(paytabsBase(null as any)).toBe('https://secure-global.paytabs.com');` |
| 22 | `expect(paytabsBase('ksa' as any)).toBe('https://secure-global.paytabs.com');` |
| 35 | `return Promise.resolve({ json: async () => mockResponse } as any);` |
| 36 | `}) as any;` |
| 53 | `globalThis.fetch = originalFetch as any;` |
| 64 | `return Promise.resolve({ json: async () => ({ ok: true }) } as any);` |
| 65 | `}) as any;` |
| 68 | `await createHppRequest(undefined as any, { any: 'thing' });` |
| 72 | `globalThis.fetch = originalFetch as any;` |
| 82 | `}) as any;` |
| 88 | `globalThis.fetch = originalFetch as any;` |
| 99 | `return Promise.resolve({ json: async () => ({}) } as any);` |
| 100 | `}) as any;` |
| 107 | `globalThis.fetch = originalFetch as any;` |

##### tests/unit/api/api-paytabs.spec.ts (16 حالة)

| السطر | الكود |
|-------|-------|
| 36 | `POST = (mod as any).POST` |
| 65 | `fetchSpy = vi.spyOn(globalThis, 'fetch' as any)` |
| 82 | `} as any)` |
| 86 | `const data = await (res as any).json()` |
| 125 | `} as any)` |
| 128 | `delete (body as any).currency` |
| 131 | `await (res as any).json()` |
| 143 | `const data = await (res as any).json()` |
| 154 | `} as any)` |
| 158 | `const data = await (res as any).json()` |
| 172 | `} as any)` |
| 176 | `const data = await (res as any).json()` |
| 188 | `return new Promise(() => {}) as any // never resolves until abort` |
| 203 | `const body = await (res as any).json()` |
| 211 | `const body = await (res as any).json()` |
| 221 | `const body = await (res as any).json()` |

##### src/server/models/__tests__/Candidate.test.ts (15 حالة)

| السطر | الكود |
|-------|-------|
| 44 | `InferSchemaType: {} as any,` |
| 59 | `// and Candidate.findByEmail uses (Candidate as any).find(...)` |
| 69 | `(FakeMockModel as any).default = instanceFactory;` |
| 96 | `// As we mocked MockModel to return an instance where find is a jest.fn, we can ` |
| 97 | `const findFn = (Candidate as any).find;` |
| 102 | `const result = await (Candidate as any).findByEmail(orgId, email);` |
| 116 | `const findFn = (Candidate as any).find;` |
| 119 | `const result = await (Candidate as any).findByEmail(orgId, email);` |
| 140 | `findOneSpy = jest.fn() as any;` |
| 152 | `InferSchemaType: {} as any,` |
| 170 | `(findOneSpy as any).mockResolvedValueOnce(doc);` |
| 172 | `const result = await (Candidate as any).findByEmail(orgId, email);` |
| 211 | `InferSchemaType: {} as any,` |
| 256 | `InferSchemaType: {} as any,` |
| 262 | `const RealCandidateLike = (await import('mongoose')) as any;` |

##### server/models/__tests__/Candidate.test.ts (14 حالة)

| السطر | الكود |
|-------|-------|
| 45 | `InferSchemaType: {} as any,` |
| 60 | `// and Candidate.findByEmail uses (Candidate as any).find(...)` |
| 70 | `(FakeMockModel as any).default = instanceFactory;` |
| 97 | `// As we mocked MockModel to return an instance where find is a vi.fn, we can re` |
| 98 | `const findFn = (Candidate as any).find as ReturnType<typeof vi.fn>;` |
| 103 | `const result = await (Candidate as any).findByEmail(orgId, email);` |
| 117 | `const findFn = (Candidate as any).find as ReturnType<typeof vi.fn>;` |
| 120 | `const result = await (Candidate as any).findByEmail(orgId, email);` |
| 141 | `findOneSpy = vi.fn() as any;` |
| 153 | `InferSchemaType: {} as any,` |
| 173 | `const result = await (Candidate as any).findByEmail(orgId, email);` |
| 212 | `InferSchemaType: {} as any,` |
| 255 | `InferSchemaType: {} as any,` |
| 261 | `const RealCandidateLike = (await import('mongoose')) as any;` |

##### server/work-orders/wo.service.test.ts (11 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `const g = global as any;` |
| 37 | `woCreate: (repo as any).woCreate as ReturnType<typeof vi.fn>,` |
| 39 | `woUpdate: (repo as any).woUpdate as ReturnType<typeof vi.fn>,` |
| 41 | `woGet: (repo as any).woGet as ReturnType<typeof vi.fn>,` |
| 43 | `woList: (repo as any).woList as ReturnType<typeof vi.fn>,` |
| 48 | `WoCreateParse: (WoCreate as any).parse as ReturnType<typeof vi.fn>,` |
| 50 | `WoUpdateParse: (WoUpdate as any).parse as ReturnType<typeof vi.fn>,` |
| 64 | `const input = { foo: "bar" } as any; // Test data - will be validated by mock` |
| 88 | `const input = { bad: true } as any; // Intentionally invalid test data` |
| 158 | `const input = { status: "CANCELLED" } as any; // Test data` |
| 176 | `const input = { status: 123 } as any; // Intentionally invalid test data` |

##### qa/tests/lib-paytabs.create-payment.custom-base.spec.ts (10 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `return Promise.resolve({ json: async () => ({ redirect_url: 'url', tran_ref: 're` |
| 16 | `}) as any;` |
| 23 | `} as any);` |
| 28 | `globalThis.fetch = originalFetch as any;` |
| 41 | `return Promise.resolve({ json: async () => ({ ok: true }) } as any);` |
| 42 | `}) as any;` |
| 55 | `globalThis.fetch = originalFetch as any;` |
| 85 | `return Promise.resolve({ json: async () => ({}) } as any);` |
| 86 | `}) as any;` |
| 92 | `globalThis.fetch = originalFetch as any;` |

##### tests/models/SearchSynonym.test.ts (10 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `if (typeof v === "undefined") delete (process.env as any)[k]` |
| 12 | `else (process.env as any)[k] = v as string` |
| 78 | `(mockSchemaCtor as any).prototype = {}` |
| 79 | `(mockSchemaCtor as any).prototype.index = mockIndex` |
| 101 | `(mockSchemaCtor as any).prototype = {}` |
| 102 | `(mockSchemaCtor as any).prototype.index = mockIndex` |
| 150 | `Schema: FakeSchema as any,` |
| 178 | `Schema: FakeSchema as any,` |
| 210 | `(mockSchemaCtor as any).prototype = {}` |
| 211 | `(mockSchemaCtor as any).prototype.index = mockIndex` |

##### i18n/useI18n.test.ts (10 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `{ value: value as any },` |
| 64 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 81 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 95 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 112 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 127 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 142 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 157 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 170 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |
| 186 | `{ value: { dict, locale: 'en', setLocale: () => {} } as any },` |

##### tests/unit/api/qa/health.route.test.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `delete (process as any).env.npm_package_version;` |
| 36 | `(process as any).env.npm_package_version = version;` |
| 46 | `mod.connectToDatabase.mockResolvedValue(mockMongoose as any);` |
| 56 | `const res = await GET(createMockRequest() as any);` |
| 73 | `const res = await GET(createMockRequest() as any);` |
| 96 | `mod.connectToDatabase.mockResolvedValue(undefined as any);` |
| 98 | `const res = await POST(createMockRequest() as any);` |
| 110 | `const res = await POST(createMockRequest() as any);` |

##### components/marketplace/CatalogView.test.tsx (7 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `const jestLike = (global as any).vi ?? (global as any).jest` |
| 31 | `const jestLike = (global as any).vi ?? (global as any).jest` |
| 95 | `productsState.mutate = state.mutate as any` |
| 176 | `;(global as any).fetch = undefined` |
| 282 | `;(global as any).fetch = fetchSpy` |
| 298 | `;(global as any).fetch = fetchSpy` |
| 322 | `;(global as any).fetch = fetchSpy` |

##### final-typescript-fix.js (7 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `// 2. Replace as unknown with as any` |
| 54 | `content = content.replace(/\bas unknown\b(?!\[)/g, 'as any');` |
| 64 | `content = content.replace(/\.find\((\w+),/g, '.find($1 as any,');` |
| 65 | `content = content.replace(/\.countDocuments\((\w+)\)/g, '.countDocuments($1 as a` |
| 66 | `content = content.replace(/\.findOne\((\w+),/g, '.findOne($1 as any,');` |
| 70 | `content = content.replace(/{\s*\.\.\.(\w+)\s*}/g, '{ ...($1 as any) }');` |
| 73 | `content = content.replace(/\((\w+)\s+as\s+unknown\)\?\.(\w+)/g, '($1 as any)?.$2` |

##### tests/unit/components/ErrorBoundary.test.tsx (7 حالة)

| السطر | الكود |
|-------|-------|
| 32 | `const Cmp = (Comp as any)?.default \|\| (() => <div data-testid="support-popup" />` |
| 102 | `(global as any).navigator.clipboard = {` |
| 107 | `(window as any).performance = {` |
| 135 | `} as any);` |
| 318 | `value: { ...(window.navigator as any), onLine: false, userAgent: 'jest-test-agen` |
| 342 | `(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true } as` |
| 343 | `(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true } as` |

##### tests/pages/product.slug.page.test.ts (7 حالة)

| السطر | الكود |
|-------|-------|
| 109 | `fetchSpy = vi.spyOn(global, 'fetch' as any);` |
| 121 | `} as any);` |
| 143 | `} as any);` |
| 178 | `} as any);` |
| 200 | `} as any);` |
| 216 | `} as any);` |
| 233 | `} as any);` |

##### app/product/[slug]/__tests__/page.spec.tsx (7 حالة)

| السطر | الكود |
|-------|-------|
| 25 | `if (maybePromise && typeof (maybePromise as any).then === 'function') {` |
| 61 | `render(res as any);` |
| 77 | `render(res as any);` |
| 120 | `render(res as any);` |
| 135 | `render(res as any);` |
| 154 | `render(res as any);` |
| 172 | `render(res as any);` |

##### tests/models/candidate.test.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `return mod as any;` |
| 149 | `const actual = await vi.importActual('mongoose') as any;` |
| 177 | `(mongoose as any).models?.Candidate ??` |
| 178 | `(mongoose as any).model('Candidate');` |
| 195 | `(mongoose as any).models?.Candidate ??` |
| 196 | `(mongoose as any).model('Candidate');` |

##### tests/api/lib-paytabs.test.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 41 | `(global as any).fetch = vi.fn(impl);` |
| 48 | `if (typeof obj[k] === 'undefined') delete (process.env as any)[k];` |
| 53 | `if (typeof backup[k] === 'undefined') delete (process.env as any)[k];` |
| 138 | `(global as any).PAYTABS_CONFIG = PAYTABS_CONFIG;` |
| 256 | `(global as any).PAYTABS_CONFIG = PAYTABS_CONFIG;` |
| 317 | `expect(await validateCallbackRaw('body', null as any)).toBe(false);` |

##### app/test/help_ai_chat_page.test.tsx (6 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `const origFetch = global.fetch as any` |
| 60 | `const origClose = (window as any).close` |
| 67 | `}) as any` |
| 69 | `;(window as any).close = vi.fn()` |
| 77 | `;(window as any).close = origClose` |
| 233 | `expect((window as any).close).toHaveBeenCalled()` |

##### scripts/seed-realdb.ts (5 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `const doc = await (Property as any).findOneAndUpdate(` |
| 54 | `await (Asset as any).findOneAndUpdate(` |
| 72 | `const slaMinutes = computeSlaMinutes(w.priority as any);` |
| 75 | `await (WorkOrder as any).create({` |
| 96 | `await (Invoice as any).findOneAndUpdate(` |

##### tests/tools.spec.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 256 | `const times = (res.data as any[]).map(x => x.updatedAt);` |
| 366 | `const payload = { workOrderId: "", fileName: "a.png", mimeType: "image/png", buf` |
| 380 | `const res = await executeTool("uploadWorkOrderPhoto", payload as any, session);` |
| 414 | `await expect(executeTool("uploadWorkOrderPhoto", payload as any, session)).rejec` |

##### tests/unit/models/CmsPage.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 100 | `await connect(uri, { dbName: "test" } as any);` |
| 177 | `const schema: Schema = (CmsPage as any).schema;` |
| 178 | `const slugPath = schema.path("slug") as any;` |
| 183 | `const statusPath = schema.path("status") as any;` |

##### components/fm/__tests__/WorkOrdersView.test.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `(global as any).fetch = jest.fn();` |
| 35 | `(window.localStorage as any).clear();` |
| 36 | `(window as any).alert = jest.fn();` |

##### lib/auth.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 124 | `verifySpy.mockImplementation(original as any);` |
| 240 | `(bcrypt as any).compare.mockResolvedValue(true);` |
| 269 | `(global as any).mockIsMockDB = false;` |

##### app/test/api_help_articles_route.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 71 | `if (!((global as any).__TEST_GET_ROUTE__)) {` |
| 74 | `GET = (global as any).__TEST_GET_ROUTE__` |
| 134 | `return { url } as any as NextRequest` |

##### scripts/seed-users.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 243 | `const existingUser = await (User as any).findOne({ email: userData.email });` |
| 252 | `await (User as any).create(userWithHashedPassword);` |

##### qa/tests/lib-paytabs.verify-and-utils.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `expect(validateCallback(null as any, 'x')).toBe(false);` |
| 14 | `expect(validateCallback({ a: 1 }, undefined as any)).toBe(false);` |

##### qa/AutoFixAgent.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 133 | `const url = typeof input === 'string' ? input : (input as any).url;` |
| 142 | `const url = typeof input === 'string' ? input : (input as any).url;` |

##### lib/marketplace/search.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 129 | `(query['buy.price'] as any).$gte = filters.minPrice;` |
| 133 | `(query['buy.price'] as any).$lte = filters.maxPrice;` |

##### tests/api/marketplace/search.route.impl.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 80 | `const syn = await (SearchSynonym as any).findOne({ locale, term: q.toLowerCase()` |
| 92 | `const docs = await (MarketplaceProduct as any)` |

##### tests/unit/api/qa/alert.route.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 172 | `const insertedDoc = (collection as any).mock.calls.length` |
| 173 | `? (insertOne as any).mock.calls[0][0]` |

##### tests/unit/parseCartAmount.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `expect(parseCartAmount(null as any)).toBe(null);` |
| 31 | `expect(parseCartAmount(undefined as any)).toBe(null);` |

##### tests/utils.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 74 | `expect((generateSlug as any)(undefined)).toBe('');` |
| 75 | `expect((generateSlug as any)(null)).toBe('');` |

##### i18n/I18nProvider.test.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `(global as any).fetch = vi.fn().mockResolvedValue({ ok: true });` |
| 177 | `(global as any).fetch = vi.fn().mockResolvedValue({ ok: true });` |

##### scripts/seed-aqar-properties.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `const { createdAt, ...rest } = d as any;` |

##### lib/db/index.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 114 | `await coll.createIndex(indexSpec.key as any, {` |

##### lib/markdown.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `.use(rehypeSanitize, schema as any)` |

##### tests/scripts/seed-marketplace.mjs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 148 | `(Date.now as any).mockRestore?.()` |

##### tests/policy.spec.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 143 | `const tools = getPermittedTools('UNKNOWN_ROLE' as any)` |

##### tests/api/marketplace/search.route.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `return { url } as any;` |

##### tests/unit/components/SupportPopup.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 37 | `global.fetch = origFetch as any;` |

##### tests/vitest.config.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `const cfg: AnyConfig = (viteConfig as any);` |

##### i18n/dictionaries/__tests__/ar.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 9 | `return (mod as any).default ?? mod;` |

##### providers/Providers.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 44 | `return (ConsoleError as any)(...args);` |

##### app/api/marketplace/categories/route.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 129 | `const parseSpy = vi.spyOn((z as any).ZodObject.prototype, 'parse').mockImplement` |

---

### Any Type Declaration (288 حالة)

- **عدد الملفات المتأثرة**: 63
- **متوسط الحالات لكل ملف**: 4.6

#### قائمة الملفات المتأثرة:

##### components/marketplace/CatalogView.test.tsx (22 حالة)

| السطر | الكود |
|-------|-------|
| 37 | `default: ({ isOpen, title = 'Sign in to continue' }: any) => (` |
| 47 | `data?: any` |
| 48 | `error?: any` |
| 50 | `mutate?: jest.Mock \| ((...args: any[]) => any)` |
| 53 | `data?: any` |
| 54 | `error?: any` |
| 61 | `const useSWRCalls: Array<{ key: any; fetcher: any; opts: any }> = []` |
| 61 | `const useSWRCalls: Array<{ key: any; fetcher: any; opts: any }> = []` |
| 61 | `const useSWRCalls: Array<{ key: any; fetcher: any; opts: any }> = []` |
| 67 | `default: (key: any, fetcher: any, opts: any) => {` |
| 67 | `default: (key: any, fetcher: any, opts: any) => {` |
| 67 | `default: (key: any, fetcher: any, opts: any) => {` |
| 82 | `Object.defineProperty = function (obj: any, prop: any, descriptor: any) {` |
| 82 | `Object.defineProperty = function (obj: any, prop: any, descriptor: any) {` |
| 82 | `Object.defineProperty = function (obj: any, prop: any, descriptor: any) {` |
| 105 | `jestLike.mocked = jestLike.mocked \|\| ((v: any) => v)` |
| 109 | `;(swrModule as any).default = (key: any, fetcher: any, opts: any) => {` |
| 109 | `;(swrModule as any).default = (key: any, fetcher: any, opts: any) => {` |
| 109 | `;(swrModule as any).default = (key: any, fetcher: any, opts: any) => {` |
| 109 | `;(swrModule as any).default = (key: any, fetcher: any, opts: any) => {` |

*...و 2 حالة أخرى في هذا الملف*

##### app/marketplace/rfq/page.test.tsx (21 حالة)

| السطر | الكود |
|-------|-------|
| 19 | `Card: ({ children, className }: any) => <div data-testid="Card" className={class` |
| 20 | `CardContent: ({ children, className }: any) => <div data-testid="CardContent" cl` |
| 21 | `CardHeader: ({ children, className }: any) => <div data-testid="CardHeader" clas` |
| 22 | `CardTitle: ({ children, className }: any) => <div data-testid="CardTitle" classN` |
| 25 | `Badge: ({ children, className, variant }: any) => <span data-testid="Badge" data` |
| 28 | `Button: ({ children, className, onClick, variant }: any) => <button data-testid=` |
| 31 | `Input: ({ value, onChange, placeholder, className }: any) => (` |
| 42 | `Select: ({ value, onValueChange, children }: any) => (` |
| 47 | `SelectContent: ({ children }: any) => <>{children}</>,` |
| 48 | `SelectItem: ({ value, children }: any) => <option value={value}>{children}</opti` |
| 51 | `Dialog: ({ children, open, onOpenChange }: any) => (open ? <div data-testid="Dia` |
| 52 | `DialogContent: ({ children, className }: any) => <div data-testid="DialogContent` |
| 53 | `DialogHeader: ({ children }: any) => <div data-testid="DialogHeader">{children}<` |
| 54 | `DialogTitle: ({ children, className }: any) => <div data-testid="DialogTitle" cl` |
| 58 | `default: ({ isOpen }: any) => (isOpen ? <div data-testid="LoginPrompt">Login Pro` |
| 63 | `get: (_target, prop: string) => (props: any) => <span data-icon={prop} {...props` |
| 220 | `const returns: any[] = []` |
| 221 | `mockedUseSWR.mockImplementation((key: any, _fetcher: any, _opts: any) => {` |
| 221 | `mockedUseSWR.mockImplementation((key: any, _fetcher: any, _opts: any) => {` |
| 221 | `mockedUseSWR.mockImplementation((key: any, _fetcher: any, _opts: any) => {` |

*...و 1 حالة أخرى في هذا الملف*

##### tests/models/SearchSynonym.test.ts (18 حالة)

| السطر | الكود |
|-------|-------|
| 7 | `function withIsolatedModule<T>(env: Record<string, string \| undefined>, mocks: {` |
| 85 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 85 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 85 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 108 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 108 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 108 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 128 | `const schemaOptsRef: any = { timestamps: true }` |
| 129 | `const schemaArgRef: any = {` |
| 137 | `public def: any` |
| 138 | `public opts: any` |
| 139 | `constructor(def: any, opts: any) {` |
| 139 | `constructor(def: any, opts: any) {` |
| 168 | `constructor(def: any, opts: any) {` |
| 168 | `constructor(def: any, opts: any) {` |
| 217 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 217 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |
| 217 | `Schema: function(this: any, ...args: any[]) { return new (mockSchemaCtor as any)` |

##### qa/tests/lib-paytabs.create-payment.custom-base.spec.ts (14 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `const calls: any[] = [];` |
| 13 | `globalThis.fetch = ((...args: any[]) => {` |
| 38 | `const calls: any[] = [];` |
| 39 | `globalThis.fetch = ((...args: any[]) => {` |
| 70 | `globalThis.fetch = ((..._args: any[]) => Promise.reject(new Error('Connection re` |
| 70 | `globalThis.fetch = ((..._args: any[]) => Promise.reject(new Error('Connection re` |
| 74 | `globalThis.fetch = ((..._args: any[]) => Promise.resolve({ json: async () => { t` |
| 74 | `globalThis.fetch = ((..._args: any[]) => Promise.resolve({ json: async () => { t` |
| 74 | `globalThis.fetch = ((..._args: any[]) => Promise.resolve({ json: async () => { t` |
| 78 | `globalThis.fetch = ((...args: any[]) => Promise.resolve({ json: async () => ({})` |
| 78 | `globalThis.fetch = ((...args: any[]) => Promise.resolve({ json: async () => ({})` |
| 78 | `globalThis.fetch = ((...args: any[]) => Promise.resolve({ json: async () => ({})` |
| 82 | `const calls: any[] = [];` |
| 83 | `globalThis.fetch = ((...args: any[]) => {` |

##### qa/tests/lib-paytabs.create-payment.default.spec.ts (11 حالة)

| السطر | الكود |
|-------|-------|
| 36 | `const calls: any[] = [];` |
| 37 | `globalThis.fetch = ((...args: any[]) => {` |
| 100 | `globalThis.fetch = ((...args: any[]) => {` |
| 145 | `let lastBody: any;` |
| 146 | `globalThis.fetch = ((...args: any[]) => {` |
| 173 | `globalThis.fetch = ((..._args: any[]) => {` |
| 186 | `globalThis.fetch = ((..._args: any[]) => {` |
| 207 | `globalThis.fetch = ((..._args: any[]) => Promise.reject('string error')) as any;` |
| 207 | `globalThis.fetch = ((..._args: any[]) => Promise.reject('string error')) as any;` |
| 227 | `let bodyObj: any;` |
| 228 | `globalThis.fetch = ((...args: any[]) => {` |

##### tests/unit/models/CmsPage.test.ts (9 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `static data: any[] = [];` |
| 25 | `static async create(doc: any) {` |
| 30 | `static async findOne(query: any) {` |
| 41 | `function matchesQuery(doc: any, q: any) {` |
| 41 | `function matchesQuery(doc: any, q: any) {` |
| 51 | `const mod: any = await importCmsPageModule();` |
| 58 | `const mod: any = await importCmsPageModule();` |
| 81 | `let CmsPage: any;` |
| 87 | `const mod: any = await importCmsPageModule();` |

##### server/models/__tests__/Candidate.test.ts (9 حالة)

| السطر | الكود |
|-------|-------|
| 35 | `constructor(..._args: any[]) {}` |
| 52 | `static find: any = vi.fn();` |
| 128 | `let findOneSpy: any;` |
| 138 | `constructor(..._args: any[]) {}` |
| 169 | `const doc: any = { id: 'db-1', orgId, email };` |
| 191 | `constructor(..._args: any[]) {}` |
| 197 | `create: vi.fn((doc: any) => {` |
| 237 | `constructor(..._args: any[]) {}` |
| 240 | `const createSpy = vi.fn((doc: any) => ({` |

##### app/test/api_help_articles_route.test.ts (9 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `json: vi.fn((data: any, init?: ResponseInit) => {` |
| 88 | `function buildMockCursor(items: any[] = []) {` |
| 89 | `const chain: any = {` |
| 93 | `sort: vi.fn(function (this: any, arg: any) {` |
| 93 | `sort: vi.fn(function (this: any, arg: any) {` |
| 97 | `skip: vi.fn(function (this: any, n: number) {` |
| 101 | `limit: vi.fn(function (this: any, n: number) {` |
| 114 | `items?: any[]` |
| 222 | `const expectedFilter: any = { status: 'PUBLISHED', $text: { $search: q } }` |

##### tests/scripts/seed-marketplace.mjs.test.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 91 | `const mod: any = await importTargetModule()` |
| 99 | `(x: any) => x.locale === 'en' && x.term === 'ac filter',` |
| 119 | `const mod: any = await importTargetModule()` |
| 124 | `(x: any) => x.locale === 'en' && x.term === 'ac filter',` |
| 137 | `(x: any) => x.locale === 'en' && x.term === 'ac filter',` |
| 156 | `const mod: any = await importTargetModule()` |
| 204 | `const mod: any = await importTargetModule()` |
| 228 | `const mod: any = await importTargetModule()` |

##### tests/models/MarketplaceProduct.test.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `let MarketplaceProduct: any;` |
| 17 | `let loadedModule: any = null;` |
| 26 | `let lastError: any = null;` |
| 56 | `const messages = Object.values((err as any).errors \|\| {}).map((e: any) => e.path` |
| 56 | `const messages = Object.values((err as any).errors \|\| {}).map((e: any) => e.path` |
| 134 | `text: Object.values(spec).some((v: any) => v === 'text'),` |
| 191 | `const priceErrorPaths = Object.values((err?.errors ?? {})).map((e: any) => e.pat` |
| 193 | `const hasListPriceError = priceErrorPaths.some((p: any) => String(p).endsWith('.` |

##### tests/api/marketplace/products/route.test.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `json: (body: any, init?: ResponseInit) => {` |
| 50 | `serializeCategory: (doc: any) => doc` |
| 55 | `let GET: any;` |
| 56 | `let resolveMarketplaceContext: any;` |
| 57 | `let findProductBySlug: any;` |
| 58 | `let Category: any;` |
| 83 | `const res: any = await callGET('unknown-slug');` |
| 97 | `const res: any = await callGET('toy');` |

##### app/api/marketplace/products/[slug]/route.test.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 48 | `const doc: any = {` |
| 74 | `const doc: any = {` |
| 91 | `const doc: any = {` |
| 108 | `const doc: any = {` |
| 125 | `const doc: any = {` |
| 141 | `const doc: any = {` |
| 158 | `const doc: any = {` |
| 182 | `const doc: any = { slug: 'unique-slug', prices: [], inventories: [] };` |

##### qa/tests/lib-paytabs.base-and-hpp.spec.ts (7 حالة)

| السطر | الكود |
|-------|-------|
| 32 | `const calls: any[] = [];` |
| 33 | `globalThis.fetch = ((...args: any[]) => {` |
| 61 | `const calls: any[] = [];` |
| 62 | `globalThis.fetch = ((...args: any[]) => {` |
| 80 | `globalThis.fetch = ((..._args: any[]) => {` |
| 96 | `const calls: any[] = [];` |
| 97 | `globalThis.fetch = ((...args: any[]) => {` |

##### tests/unit/api/support/incidents.route.test.ts (7 حالة)

| السطر | الكود |
|-------|-------|
| 25 | `json: vi.fn((payload: any, init?: { status?: number }) => ({` |
| 45 | `create: vi.fn(async (doc: any) => ({ ...doc, code: doc.code \|\| 'SUP-2024-99999' ` |
| 51 | `let POST: any;` |
| 52 | `let NextResponse: any;` |
| 53 | `let getNativeDb: any;` |
| 54 | `let SupportTicket: any;` |
| 84 | `function mkReq(body: any): NextRequest {` |

##### tests/unit/api/api-paytabs.spec.ts (7 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `json: (data: any, init?: ResponseInit) => {` |
| 42 | `const makeReq = (body: any) => ({ json: async () => body } as unknown as NextReq` |
| 81 | `finally(cb: any) { cb?.(); return this },` |
| 124 | `finally(cb: any) { cb?.(); return this },` |
| 153 | `finally(cb: any) { cb?.(); return this },` |
| 171 | `finally(cb: any) { cb?.(); return this },` |
| 186 | `fetchSpy.mockImplementationOnce((_url: string, opts: any) => {` |

##### src/server/models/__tests__/Candidate.test.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `constructor(..._args: any[]) {}` |
| 137 | `constructor(..._args: any[]) {}` |
| 190 | `constructor(..._args: any[]) {}` |
| 196 | `create: jest.fn((doc: any) => {` |
| 238 | `constructor(..._args: any[]) {}` |
| 241 | `const createSpy = jest.fn((doc: any) => ({` |

##### fix-unknown-types.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 48 | `{ regex: new RegExp(`\\.filter\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacemen` |
| 49 | `{ regex: new RegExp(`\\.map\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement: ` |
| 50 | `{ regex: new RegExp(`\\.forEach\\(\\(${varName}:\\s*unknown\\)`, 'g'), replaceme` |
| 51 | `{ regex: new RegExp(`\\.find\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement:` |
| 52 | `{ regex: new RegExp(`\\.some\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement:` |
| 53 | `{ regex: new RegExp(`\\.every\\(\\(${varName}:\\s*unknown\\)`, 'g'), replacement` |

##### tests/tools.spec.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `let mod: any;` |
| 6 | `let executeTool: any;` |
| 7 | `let detectToolFromMessage: any;` |
| 97 | `let tools: any;` |
| 103 | `const makeSession = (overrides: Partial<any> = {}): any => ({` |
| 103 | `const makeSession = (overrides: Partial<any> = {}): any => ({` |

##### app/api/marketplace/search/route.test.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `json: (body: any, init?: any) => {` |
| 26 | `json: (body: any, init?: any) => {` |
| 38 | `findOne: (...args: any[]) => findOneMock(...args),` |
| 47 | `find: (...args: any[]) => productFindMock(...args),` |
| 52 | `let GET: any` |
| 59 | `function makeReq(url: string): any {` |

##### batch-fix-unknown.js (5 حالة)

| السطر | الكود |
|-------|-------|
| 33 | `// Fix each file by replacing (variable: unknown) with (variable: any)` |
| 42 | `// Replace all (variable: unknown) patterns with (variable: any)` |
| 43 | `content = content.replace(/\((\w+):\s*unknown\)/g, '($1: any)');` |
| 45 | `// Replace results: unknown[] with results: any[]` |
| 46 | `content = content.replace(/:\s*unknown\[\]/g, ': any[]');` |

##### tests/api/marketplace/search.route.impl.ts (5 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `var __mp_find_calls__: any[];` |
| 11 | `var __mp_sort_calls__: any[];` |
| 12 | `var __mp_limit_calls__: any[];` |
| 42 | `find(filter: any) {` |
| 45 | `sort(sortArg: any) {` |

##### tests/pages/product.slug.page.test.ts (5 حالة)

| السطر | الكود |
|-------|-------|
| 19 | `default: ({ href, className, children }: any) => React.createElement('a', { href` |
| 23 | `let ProductPage: any;` |
| 48 | `const attrItems = (p.attributes \|\| []).slice(0, 6).map((a: any, i: number) =>` |
| 97 | `async function renderServerComponent(Comp: any, props: any) {` |
| 97 | `async function renderServerComponent(Comp: any, props: any) {` |

##### i18n/I18nProvider.test.tsx (5 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `function CaptureContext(props: { onValue?: (v: any) => void }) {` |
| 109 | `let ctxRef: any;` |
| 167 | `let ctxRef: any;` |
| 212 | `let ctxRef: any;` |
| 285 | `let ctxRef: any;` |

##### app/fm/marketplace/page.test.tsx (5 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `const dynamicCalls: Array<{ loader: Function; options?: any }> = [];` |
| 21 | `return (loader: Function, options?: any) => {` |
| 28 | `const DynamicWrapper = (props: any) => {` |
| 33 | `.then((mod: any) => {` |
| 46 | `const MockCatalogView = (props: any) => {` |

##### final-typescript-fix.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `// 1. Replace (param: unknown) with (param: any)` |
| 51 | `content = content.replace(/\((\w+):\s*unknown\)/g, '($1: any)');` |
| 56 | `// 3. Replace : unknown[] with : any[]` |
| 57 | `content = content.replace(/:\s*unknown\[\]/g, ': any[]');` |

##### tests/models/candidate.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `const records: any[] = [];` |
| 66 | `async create(doc: any) {` |
| 176 | `const RealCandidate: any =` |
| 194 | `const RealCandidate: any =` |

##### tests/api/paytabs-callback.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `type JsonCall = { body: any; init?: ResponseInit };` |
| 66 | `const mockNextResponseJson = vi.fn((body: any, init?: ResponseInit) => {` |
| 91 | `generateZATCAQR: (...args: any[]) => mockGenerateZATCAQR(...args),` |
| 96 | `validateCallbackRaw: (...args: any[]) => mockValidateCallbackRaw(...args),` |

##### tests/unit/components/ErrorBoundary.test.tsx (4 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `return (factory: any, _opts: any) => {` |
| 21 | `return (factory: any, _opts: any) => {` |
| 47 | `let ErrorBoundary: any;` |
| 354 | `const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(([url` |

##### tests/unit/api/api-paytabs-callback.spec.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 68 | `type JsonCall = { body: any; init?: ResponseInit };` |
| 70 | `const mockNextResponseJson = vi.fn((body: any, init?: ResponseInit) => {` |
| 95 | `generateZATCAQR: (...args: any[]) => mockGenerateZATCAQR(...args),` |
| 100 | `validateCallbackRaw: (...args: any[]) => mockValidateCallbackRaw(...args),` |

##### qa/ErrorBoundary.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `static getDerivedStateFromError(err: any) {` |
| 11 | `componentDidCatch(error: any, info: any) {` |
| 11 | `componentDidCatch(error: any, info: any) {` |

##### qa/AutoFixAgent.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `meta?: any;` |
| 105 | `window.addEventListener('fixzit:errorBoundary', (e:any) => {` |
| 138 | `} catch (err:any) {` |

##### scripts/deploy-db-verify.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `details?: any;` |
| 121 | `const indexInfo: any = {};` |

##### qa/tests/00-landing.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 6 | `const errors: any[] = [];` |
| 9 | `const failed: any[] = [];` |

##### qa/tests/api-projects.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 17 | `async function newAuthedRequest(playwright: any, baseURL: string \| undefined, us` |
| 196 | `(p: any) =>` |

##### qa/tests/06-acceptance-gates.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 6 | `const errors:any[] = []; const failed:any[]=[];` |
| 6 | `const errors:any[] = []; const failed:any[]=[];` |

##### qa/tests/07-marketplace-page.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `function mockApi(route: any, payload: any, status: number = 200, headers: Record` |
| 12 | `function mockApi(route: any, payload: any, status: number = 200, headers: Record` |

##### qa/consoleHijack.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 1 | `export type ConsoleRecord = { level:'error'\|'warn'\|'info', args:any[], time:numb` |
| 4 | `const wrap = (level:'error'\|'warn'\|'info') => (...args:any[]) => {` |

##### lib/auth.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `const signSpy = jest.fn((payload: object, _secret: string, _opts?: any) => {` |
| 229 | `findOne: jest.fn(async (q: any) => {` |

##### tests/unit/models/HelpArticle.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 82 | `schemaInfo: any;` |
| 137 | `const hasText = idx.some((entry: any) => {` |

##### tests/unit/api/qa/alert.route.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `const asNextRequest = (obj: Partial<NextRequestLike>): any => obj as any;` |
| 28 | `const asNextRequest = (obj: Partial<NextRequestLike>): any => obj as any;` |

##### tests/pages/marketplace.page.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `const MockLink = ({ href, className, children }: any) =>` |
| 51 | `function mockFetchOk(data: any) {` |

##### tests/vitest.config.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `function resolveSetupPaths(paths: string[], alias: any): string[] {` |
| 120 | `alias.forEach((entry: any) => {` |

##### tests/e2e/database.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 93 | `const foundProperty = data.items.find((p: any) => p.code === 'E2E-TEST-001');` |
| 163 | `const codes = data.items.map((item: any) => item.code);` |

##### tools/wo-smoke.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `async function call(path: string, init: any = {}) {` |
| 14 | `let body: any;` |

##### server/work-orders/wo.service.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 71 | `mocked.withIdempotency.mockImplementation(async (_key: string, cb: any) => cb())` |
| 142 | `const input: any = { status: "completed" }; // Test: invalid transition from NEW` |

##### app/api/public/rfqs/route.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `const chain: any = {` |
| 59 | `const readJson = async (res: any) => {` |

##### scripts/seed-realdb.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `const createdProps: any[] = [];` |

##### scripts/create-file.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `const result: any = { success: false, filePath: opts.filePath };` |

##### scripts/test-all.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `const results: { name: string; success: boolean; error?: any }[] = [];` |

##### components/fm/__tests__/WorkOrdersView.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `const makeApiResponse = (items: any[], page = 1, limit = 10, total?: number) => ` |

##### smart-merge-conflicts.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 237 | `} catch (error: any) {` |

##### fix-all-unknown-types.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 53 | `content = content.replace(arrayMethodPattern, `(${varName}: any)`);` |

##### qa/tests/01-login-and-sidebar.spec.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `async function login(page: any){` |

##### tests/scripts/seed-marketplace.ts.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 55 | `static instance: any;` |

##### tests/api/lib-paytabs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 300 | `sign: vi.fn(async (_algo: string, _key: any, _data: ArrayBuffer) => {` |

##### tests/ats.scoring.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `let mod: any;` |

##### tests/paytabs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 356 | `const ids = methods.map((m: any) => m.id);` |

##### i18n/useI18n.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 191 | `wrapper: (p: any) => React.createElement(Wrapper, p),` |

##### contexts/TranslationContext.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `I18nProvider: ({ initialLocale, children }: { initialLocale?: any; children: Rea` |

##### providers/Providers.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `constructor(props: any) {` |

##### app/api/marketplace/categories/route.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `const makeCollections = (distinctValues: unknown[] = [], categoryDocs: any[] = [` |

##### app/product/[slug]/__tests__/page.spec.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 14 | `const MockLink = ({ href, className, children }: any) => <a href={href} classNam` |

##### app/test/help_ai_chat_page.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 14 | `let AIChatPage: any` |

---

### process.exit() Calls (192 حالة)

- **عدد الملفات المتأثرة**: 54
- **متوسط الحالات لكل ملف**: 3.6

#### قائمة الملفات المتأثرة:

##### scripts/setup-production-db.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `process.exit(1);` |
| 33 | `process.exit(1);` |
| 43 | `process.exit(1);` |
| 154 | `process.exit(1);` |
| 26 | `process.exit(1);` |
| 33 | `process.exit(1);` |
| 43 | `process.exit(1);` |
| 154 | `process.exit(1);` |

##### lib/database.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 39 | `process.exit(0);` |
| 45 | `process.exit(0);` |
| 51 | `process.exit(1);` |
| 57 | `process.exit(1);` |
| 39 | `process.exit(0);` |
| 45 | `process.exit(0);` |
| 51 | `process.exit(1);` |
| 57 | `process.exit(1);` |

##### scripts/scan-hex.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 107 | `process.exit(1);` |
| 163 | `process.exit(0);` |
| 216 | `process.exit(1);` |
| 107 | `process.exit(1);` |
| 163 | `process.exit(0);` |
| 216 | `process.exit(1);` |

##### scripts/setup-indexes.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `process.exit(0);` |
| 12 | `process.exit(0);` |
| 15 | `process.exit(1);` |
| 8 | `process.exit(0);` |
| 12 | `process.exit(0);` |
| 15 | `process.exit(1);` |

##### scripts/deploy-db-verify.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 274 | `process.exit(1);` |
| 277 | `process.exit(0);` |
| 310 | `process.exit(1);` |
| 274 | `process.exit(1);` |
| 277 | `process.exit(0);` |
| 310 | `process.exit(1);` |

##### scripts/scanner.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 117 | `process.exit(1);` |
| 772 | `process.exit(1);` |
| 775 | `process.exit(0);` |
| 117 | `process.exit(1);` |
| 772 | `process.exit(1);` |
| 775 | `process.exit(0);` |

##### scripts/fix-workorder-index.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 91 | `process.exit(1);` |
| 103 | `process.exit(0);` |
| 106 | `process.exit(1);` |
| 91 | `process.exit(1);` |
| 103 | `process.exit(0);` |
| 106 | `process.exit(1);` |

##### scripts/create-test-data.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 24 | `process.exit(1);` |
| 136 | `process.exit(0);` |
| 139 | `process.exit(1);` |
| 24 | `process.exit(1);` |
| 136 | `process.exit(0);` |
| 139 | `process.exit(1);` |

##### scripts/server.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 98 | `process.exit(1);` |
| 108 | `process.exit(1);` |
| 303 | `process.exit(0);` |
| 98 | `process.exit(1);` |
| 108 | `process.exit(1);` |
| 303 | `process.exit(0);` |

##### scripts/replace.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `process.exit(0);` |
| 56 | `process.exit(1);` |
| 81 | `process.exit(err.status \|\| 1);` |
| 50 | `process.exit(0);` |
| 56 | `process.exit(1);` |
| 81 | `process.exit(err.status \|\| 1);` |

##### test-mongodb-comprehensive.js (6 حالة)

| السطر | الكود |
|-------|-------|
| 206 | `process.exit(1);` |
| 225 | `process.exit(0);` |
| 230 | `process.exit(1);` |
| 206 | `process.exit(1);` |
| 225 | `process.exit(0);` |
| 230 | `process.exit(1);` |

##### scripts/seed-cms.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 198 | `process.exit(0);` |
| 201 | `process.exit(1);` |
| 198 | `process.exit(0);` |
| 201 | `process.exit(1);` |

##### scripts/add-database-indexes.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 163 | `process.exit(1);` |
| 167 | `process.exit(0);` |
| 163 | `process.exit(1);` |
| 167 | `process.exit(0);` |

##### scripts/seedData.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 23 | `process.exit(1);` |
| 297 | `process.exit(0);` |
| 23 | `process.exit(1);` |
| 297 | `process.exit(0);` |

##### scripts/seed-realdb.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 125 | `main().then(() => process.exit(0)).catch((err) => {` |
| 127 | `process.exit(1);` |
| 125 | `main().then(() => process.exit(0)).catch((err) => {` |
| 127 | `process.exit(1);` |

##### scripts/seed-aqar-properties.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 58 | `process.exit(0);` |
| 61 | `process.exit(1);` |
| 58 | `process.exit(0);` |
| 61 | `process.exit(1);` |

##### scripts/test-auth-config.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 47 | `process.exit(0);` |
| 50 | `process.exit(1);` |
| 47 | `process.exit(0);` |
| 50 | `process.exit(1);` |

##### scripts/test-mongodb-atlas.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 14 | `process.exit(1);` |
| 53 | `process.exit(1);` |
| 14 | `process.exit(1);` |
| 53 | `process.exit(1);` |

##### scripts/mongo-check.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `process.exit(0);` |
| 19 | `process.exit(1);` |
| 4 | `process.exit(0);` |
| 19 | `process.exit(1);` |

##### scripts/seed-db.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `process.exit(0);` |
| 22 | `process.exit(1);` |
| 18 | `process.exit(0);` |
| 22 | `process.exit(1);` |

##### scripts/ensure-indexes.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 25 | `process.exit(0);` |
| 28 | `process.exit(1);` |
| 25 | `process.exit(0);` |
| 28 | `process.exit(1);` |

##### scripts/test-data.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 75 | `process.exit(0);` |
| 78 | `process.exit(1);` |
| 75 | `process.exit(0);` |
| 78 | `process.exit(1);` |

##### scripts/seed-users.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 267 | `seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));` |
| 267 | `seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));` |
| 267 | `seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));` |
| 267 | `seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));` |

##### scripts/verify-api.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 27 | `process.exit(0);` |
| 47 | `if (failures) process.exit(1);` |
| 27 | `process.exit(0);` |
| 47 | `if (failures) process.exit(1);` |

##### scripts/seedMarketplace.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 149 | `process.exit(0);` |
| 154 | `process.exit(1);` |
| 149 | `process.exit(0);` |
| 154 | `process.exit(1);` |

##### scripts/fix-null-property-codes.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 69 | `process.exit(1);` |
| 73 | `process.exit(0);` |
| 69 | `process.exit(1);` |
| 73 | `process.exit(0);` |

##### scripts/copilot-index.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 78 | `process.exit(1);` |
| 86 | `process.exit(1);` |
| 78 | `process.exit(1);` |
| 86 | `process.exit(1);` |

##### test-e2e-comprehensive.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 216 | `process.exit(failedTests > 0 ? 1 : 0);` |
| 221 | `process.exit(1);` |
| 216 | `process.exit(failedTests > 0 ? 1 : 0);` |
| 221 | `process.exit(1);` |

##### test-auth.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 227 | `process.exit(failed === 0 ? 0 : 1);` |
| 233 | `process.exit(1);` |
| 227 | `process.exit(failed === 0 ? 0 : 1);` |
| 233 | `process.exit(1);` |

##### test_mongodb.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 43 | `testMongoConnection().then(success => process.exit(success ? 0 : 1));` |
| 43 | `testMongoConnection().then(success => process.exit(success ? 0 : 1));` |

##### scripts/test-server.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 62 | `process.exit(0);` |
| 62 | `process.exit(0);` |

##### scripts/security-audit.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 209 | `process.exit(auditResults.criticalIssues > 0 ? 1 : 0);` |
| 209 | `process.exit(auditResults.criticalIssues > 0 ? 1 : 0);` |

##### scripts/test-mongo-connection.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 104 | `process.exit(results.success ? 0 : 1);` |
| 104 | `process.exit(results.success ? 0 : 1);` |

##### scripts/create-project-text-index.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `process.exit(1);` |
| 59 | `process.exit(1);` |

##### scripts/verify-routes.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 47 | `process.exit(1);` |
| 47 | `process.exit(1);` |

##### scripts/security-migration.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 393 | `process.exit(1);` |
| 393 | `process.exit(1);` |

##### scripts/auto-enhance-routes.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 170 | `process.exit(1);` |
| 170 | `process.exit(1);` |

##### scripts/property-owner-verification.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 372 | `process.exit(percentage >= 80 ? 0 : 1);` |
| 372 | `process.exit(percentage >= 80 ? 0 : 1);` |

##### scripts/kb-change-stream.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 58 | `process.exit(1);` |
| 58 | `process.exit(1);` |

##### scripts/verification-checkpoint.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 215 | `process.exit(result ? 0 : 1);` |
| 215 | `process.exit(result ? 0 : 1);` |

##### scripts/verify.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `process.exit(1);` |
| 28 | `process.exit(1);` |

##### scripts/production-check.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 206 | `process.exit(ready ? 0 : 1);` |
| 206 | `process.exit(ready ? 0 : 1);` |

##### scripts/verify-core.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 57 | `process.exit(success ? 0 : 1);` |
| 57 | `process.exit(success ? 0 : 1);` |

##### scripts/fix-duplicate-keys.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 142 | `process.exit(0);` |
| 142 | `process.exit(0);` |

##### scripts/analyze-project.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 725 | `process.exit(1);` |
| 725 | `process.exit(1);` |

##### scripts/unified-audit-system.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 802 | `process.exit(1);` |
| 802 | `process.exit(1);` |

##### scripts/seed-subscriptions.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 124 | `process.exit(1);` |
| 124 | `process.exit(1);` |

##### scripts/test-all.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 102 | `process.exit(success ? 0 : 1);` |
| 102 | `process.exit(success ? 0 : 1);` |

##### scripts/enhance-api-routes.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 356 | `process.exit(1);` |
| 356 | `process.exit(1);` |

##### analyze-imports.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 194 | `process.exit(totalIssues > 0 ? 1 : 0);` |
| 194 | `process.exit(totalIssues > 0 ? 1 : 0);` |

##### analyze-system-errors.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 44 | `process.exit(1);` |
| 44 | `process.exit(1);` |

##### lib/auth.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 42 | `process.exit(1);` |
| 42 | `process.exit(1);` |

##### analyze-pr-comments.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 27 | `process.exit(1);` |
| 27 | `process.exit(1);` |

##### tools/wo-smoke.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 78 | `process.exit(1);` |
| 78 | `process.exit(1);` |

---

### Hardcoded Localhost (103 حالة)

- **عدد الملفات المتأثرة**: 47
- **متوسط الحالات لكل ملف**: 2.2

#### قائمة الملفات المتأثرة:

##### scripts/phase1-truth-verifier.js (12 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `const res = await axios.post('http://localhost:5000/api/workorders', {` |
| 62 | `const get = await axios.get(`http://localhost:5000/api/workorders/${data.data._i` |
| 79 | `const res = await axios.post('http://localhost:5000/api/workorders/test-auto-ass` |
| 97 | `const res = await axios.post('http://localhost:5000/api/properties', {` |
| 119 | `const res = await axios.post('http://localhost:5000/api/properties/units/test/as` |
| 134 | `const res = await axios.post('http://localhost:5000/api/finance/invoices', {` |
| 162 | `const rfq = await axios.post('http://localhost:5000/api/marketplace/rfq', {` |
| 170 | `const bid = await axios.post(`http://localhost:5000/api/marketplace/rfq/${rfqDat` |
| 176 | `const award = await axios.post(`http://localhost:5000/api/marketplace/rfq/${rfqD` |
| 198 | `const ticket = await axios.post('http://localhost:5000/api/support/tickets', {` |
| 212 | `const res = await axios.get('http://localhost:5000/api/marketplace/test-workflow` |
| 224 | `const wo = await axios.post('http://localhost:5000/api/workorders', {` |

##### scripts/verification-checkpoint.js (8 حالة)

| السطر | الكود |
|-------|-------|
| 29 | `const health = await fetch('http://localhost:5000/');` |
| 36 | `const landing = await fetch('http://localhost:5000');` |
| 40 | `const loginTest = await fetch('http://localhost:5000/api/auth/login', {` |
| 51 | `const dashboard = await fetch('http://localhost:5000/dashboard.html');` |
| 95 | `const response = await fetch(`http://localhost:5000/api/${module}`);` |
| 131 | `const wo = await fetch('http://localhost:5000/api/workorders');` |
| 135 | `const rfq = await fetch('http://localhost:5000/api/marketplace');` |
| 139 | `const approval = await fetch('http://localhost:5000/api/auth/login');` |

##### next.config.js (8 حالة)

| السطر | الكود |
|-------|-------|
| 112 | `destination: 'http://localhost:5000/api/marketplace/:path*',` |
| 116 | `destination: 'http://localhost:5000/api/properties/:path*',` |
| 120 | `destination: 'http://localhost:5000/api/workorders/:path*',` |
| 124 | `destination: 'http://localhost:5000/api/finance/:path*',` |
| 128 | `destination: 'http://localhost:5000/api/hr/:path*',` |
| 132 | `destination: 'http://localhost:5000/api/crm/:path*',` |
| 136 | `destination: 'http://localhost:5000/api/compliance/:path*',` |
| 140 | `destination: 'http://localhost:5000/api/analytics/:path*',` |

##### tests/setup.ts (5 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `process.env.MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/` |
| 63 | `process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL \|\| 'http://localhost:3000';` |
| 58 | `process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';` |
| 59 | `process.env.MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/` |
| 63 | `process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL \|\| 'http://localhost:3000';` |

##### scripts/reality-check.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `const res = await fetch('http://localhost:5000/api/workorders', {` |
| 46 | `const res = await fetch('http://localhost:5000/api/finance/invoices', {` |
| 75 | `const res = await fetch('http://localhost:5000/api/marketplace/rfq', {` |
| 100 | `const res = await fetch('http://localhost:5000/api/properties', {` |

##### lib/marketplace/security.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 43 | `'http://localhost:3000',` |
| 44 | `'http://localhost:3001',` |
| 45 | `'https://localhost:3000',` |
| 46 | `'https://localhost:3001'` |

##### tests/pages/product.slug.page.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 37 | `const res = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL \|\| 'http://local` |
| 37 | `const res = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL \|\| 'http://local` |
| 189 | `'http://localhost:3000/api/marketplace/products/gadget',` |

##### server/security/headers.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 45 | `...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://l` |
| 45 | `...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://l` |
| 54 | `response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');` |

##### scripts/seed-marketplace.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/fixzit` |
| 5 | `const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/fixzit` |

##### scripts/create-project-text-index.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 8 | `const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/fixzit` |
| 8 | `const MONGODB_URI = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/fixzit` |

##### scripts/create-test-data.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 6 | `mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/fixzitsou` |
| 6 | `mongoose.connect(process.env.MONGODB_URI \|\| 'mongodb://localhost:27017/fixzitsou` |

##### scripts/copilot-index.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 54 | `const endpoint = process.env.COPILOT_INDEX_ENDPOINT \|\| 'http://localhost:3000/ap` |
| 54 | `const endpoint = process.env.COPILOT_INDEX_ENDPOINT \|\| 'http://localhost:3000/ap` |

##### packages/fixzit-souq-server/routes/auth.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `const client = new MongoClient(process.env.MONGODB_URI \|\| 'mongodb://localhost:2` |
| 12 | `const client = new MongoClient(process.env.MONGODB_URI \|\| 'mongodb://localhost:2` |

##### packages/fixzit-souq-server/db.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `const uri = process.env.MONGODB_URI \|\| process.env.MONGO_URL \|\| 'mongodb://local` |
| 11 | `const uri = process.env.MONGODB_URI \|\| process.env.MONGO_URL \|\| 'mongodb://local` |

##### qa/config.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL \|\| 'http://localhost:3000',` |
| 2 | `baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL \|\| 'http://localhost:3000',` |

##### qa/playwright.config.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL \|\| 'http://localhost:3000',` |
| 10 | `baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL \|\| 'http://localhost:3000',` |

##### lib/mongo.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 44 | `const uri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017';` |
| 44 | `const uri = process.env.MONGODB_URI \|\| 'mongodb://localhost:27017';` |

##### test-e2e-comprehensive.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `const BASE_URL = process.env.BASE_URL \|\| 'http://localhost:3000';` |
| 11 | `const BASE_URL = process.env.BASE_URL \|\| 'http://localhost:3000';` |

##### app/api/support/incidents/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 87 | `const redis = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379');` |
| 87 | `const redis = new Redis(process.env.REDIS_URL \|\| 'redis://localhost:6379');` |

##### scripts/seed-cms.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `const baseUrl = 'http://localhost:3000';` |
| 139 | `const baseUrl = 'http://localhost:3000';` |

##### scripts/server.js (2 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `'http://localhost:3000',` |
| 32 | `'http://localhost:5000',` |

##### tests/unit/models/HelpArticle.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 92 | `MONGODB_URI: "mongodb://localhost:27017/test",` |
| 107 | `MONGODB_URI: "mongodb://localhost:27017/test",` |

##### tests/config/package-json.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 38 | `'verify:all': `npm run verify:prep && npm run build && concurrently -k -s first ` |
| 82 | `expect(s).toContain('wait-on http://localhost:3000')` |

##### playwright.config.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `baseURL: 'http://localhost:3000',` |
| 78 | `url: 'http://localhost:3000',` |

##### app/product/[slug]/__tests__/page.spec.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 66 | `'http://localhost:3000/api/marketplace/products/missing',` |
| 108 | `'http://localhost:3000/api/marketplace/products/acme-widget',` |

##### scripts/fixzit-security-fixes.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 40 | `const allowedOrigins = process.env.CORS_ORIGIN?.split(',') \|\| ['http://localhost` |

##### scripts/seed-realdb.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `$env:MONGODB_URI="mongodb://localhost:27017/fixzit"; npm run seed:realdb` |

##### scripts/complete-system-audit.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 230 | `url: `http://localhost:5000${endpoint.path}`,` |

##### scripts/verify-routes.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 6 | `const BASE = "http://localhost:3000";` |

##### scripts/universal-verification.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `const BASE_URL = 'http://localhost:5000';` |

##### scripts/property-owner-verification.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 3 | `const BASE_URL = 'http://localhost:5000';` |

##### scripts/serve-frontend.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 15 | `const backendUrl = `http://localhost:5000${req.originalUrl}`;` |

##### scripts/server-fixed.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 36 | `const allowedOrigins = process.env.CORS_ORIGIN?.split(',') \|\| ['http://localhost` |

##### scripts/complete-scope-verification.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `const BASE_URL = 'http://localhost:5000';` |

##### scripts/truth-verification.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `const BASE_URL = 'http://localhost:5000';` |

##### scripts/test-data.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `mongoose.connect('mongodb://localhost:27017/fixzitsouq', {` |

##### scripts/production-check.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 109 | `const response = await fetch('http://localhost:5000/health');` |

##### scripts/verify-api.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 6 | `const BASE = "http://localhost:3000";` |

##### scripts/unified-audit-system.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 13 | `const BASE_URL = 'http://localhost:5000';` |

##### lib/marketplace/serverFetch.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 46 | `return headerUrl ?? 'http://localhost:3000';` |

##### tests/models/SearchSynonym.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 59 | `{ NODE_ENV: "development", MONGODB_URI: "mongodb://localhost:27017/db" },` |

##### tests/unit/api/qa/health.route.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 16 | `url: 'http://localhost:3000/api/qa/health'` |

##### tests/pages/marketplace.page.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 185 | `'http://localhost:3000/api/marketplace/search?q=cement'` |

##### public/ui-bootstrap.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 94 | `const response = await fetch(`${window.API_URL \|\| 'http://localhost:5000'}/api/a` |

##### tools/wo-smoke.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 2 | `const BASE = "http://localhost:3000";` |

##### test-auth.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `const BASE_URL = 'http://localhost:3000';` |

##### app/api/work-orders/[id]/attachments/presign/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 27 | `const putUrl = `http://localhost:3000/api/dev-null-upload?name=${fileName}`; // ` |

---

### ESLint Disable Comments (59 حالة)

- **عدد الملفات المتأثرة**: 32
- **متوسط الحالات لكل ملف**: 1.8

#### قائمة الملفات المتأثرة:

##### server/work-orders/wo.service.test.ts (9 حالة)

| السطر | الكود |
|-------|-------|
| 11 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 34 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 36 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 38 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 40 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 42 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 47 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 49 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 141 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### scripts/generate-marketplace-bible.js (4 حالة)

| السطر | الكود |
|-------|-------|
| 63 | `// eslint-disable-next-line no-console` |
| 75 | `// eslint-disable-next-line no-console` |
| 81 | `// eslint-disable-next-line no-console` |
| 91 | `// eslint-disable-next-line no-console` |

##### tests/ats.scoring.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |
| 23 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |
| 28 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |
| 33 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### scripts/seed-marketplace.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 52 | `// eslint-disable-next-line no-console` |
| 71 | `// eslint-disable-next-line no-console` |
| 93 | `// eslint-disable-next-line no-console` |

##### lib/marketplace/context.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `// eslint-disable-next-line no-console` |
| 46 | `// eslint-disable-next-line no-console` |
| 64 | `// eslint-disable-next-line no-console` |

##### lib/marketplace/search.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 106 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 128 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 132 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### lib/marketplace/serverFetch.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 24 | `// eslint-disable-next-line no-console` |
| 60 | `// eslint-disable-next-line no-console` |
| 94 | `// eslint-disable-next-line no-console` |

##### tests/unit/components/ErrorBoundary.test.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 50 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |
| 54 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |
| 58 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### app/api/marketplace/categories/route.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 128 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |
| 135 | `} as any, // eslint-disable-line @typescript-eslint/no-explicit-any` |
| 135 | `} as any, // eslint-disable-line @typescript-eslint/no-explicit-any` |

##### tests/scripts/generate-marketplace-bible.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |
| 139 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### scripts/seed-marketplace-shared.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 60 | `// eslint-disable-next-line no-console` |

##### scripts/mongo-check.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### components/CopilotWidget.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 101 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### components/marketplace/CatalogView.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 279 | `// eslint-disable-next-line @next/next/no-img-element` |

##### src/server/models/marketplace/Product.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 41 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### lib/db/index.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 113 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### lib/markdown.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### lib/marketplace/correlation.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 61 | `// eslint-disable-next-line no-console` |

##### lib/mongodb-unified.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `// eslint-disable-next-line no-var, no-unused-vars` |

##### tests/scripts/seed-marketplace.mjs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 80 | `// eslint-disable-next-line @typescript-eslint/no-implied-eval` |

##### tests/models/MarketplaceProduct.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 29 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### tests/tools.spec.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 20 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### tests/api/lib-paytabs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 21 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### tests/api/paytabs-callback.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `// eslint-disable-next-line no-await-in-loop` |

##### tests/unit/api/api-paytabs-callback.spec.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `// eslint-disable-next-line no-await-in-loop` |

##### tests/pages/product.slug.page.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 26 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### tests/paytabs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 57 | `// eslint-disable-next-line no-await-in-loop` |

##### deployment/mongo-init.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `// eslint-disable-next-line no-undef` |

##### app/api/marketplace/products/[slug]/route.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 25 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` |

##### app/marketplace/page.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 36 | `// eslint-disable-next-line import/first` |

##### app/test/api_help_articles_route.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 57 | `// eslint-disable-next-line @typescript-eslint/no-var-requires` |

##### app/test/help_ai_chat_page.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 41 | `// eslint-disable-next-line no-console` |

---

### @ts-ignore Comments (54 حالة)

- **عدد الملفات المتأثرة**: 11
- **متوسط الحالات لكل ملف**: 4.9

#### قائمة الملفات المتأثرة:

##### app/test/help_support_ticket_page.test.tsx (18 حالة)

| السطر | الكود |
|-------|-------|
| 23 | `// @ts-ignore` |
| 26 | `// @ts-ignore` |
| 31 | `// @ts-ignore` |
| 34 | `// @ts-ignore` |
| 37 | `// @ts-ignore` |
| 202 | `// @ts-ignore` |
| 226 | `// @ts-ignore` |
| 259 | `// @ts-ignore` |
| 273 | `// @ts-ignore` |
| 23 | `// @ts-ignore` |
| 26 | `// @ts-ignore` |
| 31 | `// @ts-ignore` |
| 34 | `// @ts-ignore` |
| 37 | `// @ts-ignore` |
| 202 | `// @ts-ignore` |
| 226 | `// @ts-ignore` |
| 259 | `// @ts-ignore` |
| 273 | `// @ts-ignore` |

##### tests/api/lib-paytabs.test.ts (8 حالة)

| السطر | الكود |
|-------|-------|
| 221 | `// @ts-ignore` |
| 281 | `// @ts-ignore` |
| 296 | `// @ts-ignore` |
| 350 | `// @ts-ignore` |
| 221 | `// @ts-ignore` |
| 281 | `// @ts-ignore` |
| 296 | `// @ts-ignore` |
| 350 | `// @ts-ignore` |

##### lib/ats/scoring.test.ts (6 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `// @ts-ignore` |
| 11 | `// @ts-ignore testing runtime with non-string-like falsy converted upstream` |
| 13 | `// @ts-ignore null as unexpected input` |
| 4 | `// @ts-ignore` |
| 11 | `// @ts-ignore testing runtime with non-string-like falsy converted upstream` |
| 13 | `// @ts-ignore null as unexpected input` |

##### lib/sla.spec.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 89 | `// @ts-ignore` |
| 98 | `// @ts-ignore` |
| 89 | `// @ts-ignore` |
| 98 | `// @ts-ignore` |

##### tests/sla.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 82 | `// @ts-ignore` |
| 91 | `// @ts-ignore` |
| 82 | `// @ts-ignore` |
| 91 | `// @ts-ignore` |

##### server/work-orders/wo.service.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `// @ts-ignore - wo.repo doesn't exist, fully mocked below` |
| 7 | `// @ts-ignore - audit path updated, fully mocked below` |
| 5 | `// @ts-ignore - wo.repo doesn't exist, fully mocked below` |
| 7 | `// @ts-ignore - audit path updated, fully mocked below` |

##### scripts/dedupe-merge.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 5 | `// @ts-ignore - No type declarations available` |
| 5 | `// @ts-ignore - No type declarations available` |

##### scripts/fixzit-pack.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 4 | `// @ts-ignore - No type declarations available` |
| 4 | `// @ts-ignore - No type declarations available` |

##### qa/qaPatterns.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 32 | `//@ts-ignore` |
| 32 | `//@ts-ignore` |

##### tests/scripts/generate-marketplace-bible.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 23 | `// @ts-ignore` |
| 23 | `// @ts-ignore` |

##### tests/models/candidate.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 92 | `// @ts-ignore` |
| 92 | `// @ts-ignore` |

---

### console.warn (43 حالة)

- **عدد الملفات المتأثرة**: 31
- **متوسط الحالات لكل ملف**: 1.4

#### قائمة الملفات المتأثرة:

##### contexts/TranslationContext.tsx (7 حالة)

| السطر | الكود |
|-------|-------|
| 1814 | `console.warn('Could not access localStorage for language preference:', error);` |
| 1845 | `console.warn('Could not update language settings:', error);` |
| 1873 | `console.warn(`Translation error for key '${key}':`, error);` |
| 1902 | `console.warn('Could not save language preference:', error);` |
| 1909 | `console.warn('Locale preference saved. Please refresh the page for changes to ta` |
| 1912 | `console.warn('Could not save locale preference:', error);` |
| 1926 | `console.warn('useTranslation error:', error);` |

##### contexts/CurrencyContext.tsx (4 حالة)

| السطر | الكود |
|-------|-------|
| 68 | `console.warn('Could not hydrate currency preference:', error);` |
| 108 | `console.warn('Could not persist currency preference:', error);` |
| 143 | `console.warn('useCurrency called outside CurrencyProvider. Using fallback values` |
| 149 | `console.warn('setCurrency called outside CurrencyProvider. No-op.');` |

##### lib/auth.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 45 | `console.warn('Development/test environment detected: using fallback User impleme` |
| 79 | `console.warn('⚠️ JWT_SECRET not set. Using ephemeral secret for development.');` |
| 80 | `console.warn('⚠️ Set JWT_SECRET environment variable for session persistence.');` |

##### components/ErrorTest.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 31 | `console.warn('Unable to verify user role for QA tools:', error);` |
| 51 | `console.warn('Unable to initialize QA error test tools:', error);` |

##### scripts/add-database-indexes.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 145 | `console.warn('Index create warning (tenant_article_chunk_unique):', e?.message \|` |

##### scripts/load/smoke.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 10 | `console.warn('FIXZIT_API_BASE not set; skipping smoke request.');` |

##### scripts/kb-change-stream.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 51 | `console.warn('KB watcher error:', e);` |

##### scripts/generate-marketplace-bible.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `console.warn(` |

##### scripts/_shared/marketplace.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 206 | `console.warn(prefix, message, ...args);` |

##### scripts/seed-marketplace-shared.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 61 | `console.warn(` |

##### scripts/janitor.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `console.warn(`Skip (could not move): ${f}`, e);` |

##### components/ClientLayout.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 32 | `console.warn('Translation context not available in ClientLayout:', error);` |

##### components/AutoFixInitializer.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 18 | `console.warn(`⚠️ ${failedChecks.length} health checks failed on startup`);` |

##### test-mongodb-comprehensive.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 102 | `console.warn(`  ⚠️  Query took ${duration}ms - may need index optimization`);` |

##### qa/consoleHijack.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 9 | `console.warn  = wrap('warn');` |

##### lib/payments/currencyUtils.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 193 | `console.warn(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);` |

##### lib/db/index.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 126 | `console.warn(`  ⚠ ${collection}: ${mongoError.message \|\| 'Unknown error'}`);` |

##### lib/marketplace/context.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 29 | `console.warn('Failed to decode marketplace JWT payload', { correlationId, messag` |

##### lib/marketplace/search.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 48 | `console.warn('Marketplace search synonyms unavailable, using defaults', error);` |

##### lib/AutoFixManager.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 301 | `console.warn(`⚠️ ${failedCount} health checks failed, auto-fixes applied`);` |

##### lib/auth.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `// Helper to replace console.warn so we can assert ephemeral secret warnings` |

##### tests/unit/components/ErrorBoundary.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 143 | `(console.warn as ReturnType<typeof vi.fn>).mockRestore?.();` |

##### tests/e2e/database.spec.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 171 | `console.warn('Warning: Multi-tenant isolation may not be working - both org prop` |

##### public/sw.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 91 | `console.warn('[SW] Arabic fonts caching failed, continuing:', error);` |

##### public/app.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 209 | `console.warn('⚠️ KPI endpoint not available, using fallback data');` |

##### public/js/saudi-mobile-optimizations.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 329 | `console.warn('Failed to cache offline data:', error);` |

##### test-e2e-comprehensive.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 195 | `console.warn('  ⚠️  Missing X-Content-Type-Options header');` |

##### app/api/qa/alert/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 48 | `console.warn(`🚨 QA Alert: ${event}`, data);` |

##### app/api/search/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 222 | `console.warn(`Search failed for entity ${entity}:`, error);` |

##### app/api/kb/search/route.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 120 | `console.warn('Vector search failed, falling back to lexical search:', vectorErro` |

##### app/test/help_ai_chat_page.test.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 42 | `console.warn('Adjust AIChatPage import path in help_ai_chat_page.test.tsx to mat` |

---

### @ts-expect-error Comments (25 حالة)

- **عدد الملفات المتأثرة**: 12
- **متوسط الحالات لكل ملف**: 2.1

#### قائمة الملفات المتأثرة:

##### lib/utils.test.ts (4 حالة)

| السطر | الكود |
|-------|-------|
| 64 | `// @ts-expect-error Testing runtime robustness against undefined` |
| 66 | `// @ts-expect-error Testing runtime robustness against null` |
| 68 | `// @ts-expect-error Testing runtime robustness against number` |
| 70 | `// @ts-expect-error Testing runtime robustness against object` |

##### tests/unit/components/SupportPopup.test.tsx (3 حالة)

| السطر | الكود |
|-------|-------|
| 28 | `// @ts-expect-error: partial clipboard mock` |
| 35 | `// @ts-expect-error: restore` |
| 150 | `// @ts-expect-error override mock` |

##### tests/sla.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 34 | `// @ts-expect-error testing runtime behavior for undefined` |
| 36 | `// @ts-expect-error testing runtime behavior for null` |
| 86 | `// @ts-expect-error deliberately passing undefined` |

##### tests/pages/marketplace.page.test.ts (3 حالة)

| السطر | الكود |
|-------|-------|
| 27 | `// @ts-expect-error - Dynamic import for testing` |
| 52 | `// @ts-expect-error` |
| 60 | `// @ts-expect-error` |

##### lib/ats/scoring.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 72 | `// @ts-expect-error testing runtime behavior on null` |
| 74 | `// @ts-expect-error testing runtime behavior on undefined` |

##### tests/unit/src_lib_utils.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 51 | `// @ts-expect-error: intentionally testing runtime behavior with invalid inputs` |
| 53 | `// @ts-expect-error: intentionally testing runtime behavior with invalid inputs` |

##### tests/ats.scoring.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 87 | `// @ts-expect-error - intentional invalid type to test runtime behavior` |
| 89 | `// @ts-expect-error` |

##### tests/paytabs.test.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 80 | `// @ts-expect-error testing unknown region string` |
| 84 | `// @ts-expect-error omit param to exercise default` |

##### qa/qaPatterns.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 30 | `// @ts-expect-error` |

##### tests/scripts/seed-marketplace.mjs.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 150 | `// @ts-expect-error - Restoring original Date.now implementation` |

##### tests/unit/models/Asset.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 65 | `// @ts-expect-error intentional omission` |

##### tests/pages/product.slug.page.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 235 | `// @ts-expect-error - testing unexpected input path` |

---

### console.info (7 حالة)

- **عدد الملفات المتأثرة**: 1
- **متوسط الحالات لكل ملف**: 7.0

#### قائمة الملفات المتأثرة:

##### qa/consoleHijack.ts (7 حالة)

| السطر | الكود |
|-------|-------|
| 3 | `const orig = { error: console.error, warn: console.warn, info: console.info };` |
| 3 | `const orig = { error: console.error, warn: console.warn, info: console.info };` |
| 10 | `console.info  = wrap('info');` |
| 11 | `return () => { console.error = orig.error; console.warn = orig.warn; console.inf` |
| 11 | `return () => { console.error = orig.error; console.warn = orig.warn; console.inf` |
| 3 | `const orig = { error: console.error, warn: console.warn, info: console.info };` |
| 11 | `return () => { console.error = orig.error; console.warn = orig.warn; console.inf` |

---

### dangerouslySetInnerHTML (5 حالة)

- **عدد الملفات المتأثرة**: 4
- **متوسط الحالات لكل ملف**: 1.3

#### قائمة الملفات المتأثرة:

##### qa/tests/07-help-article-page-code.spec.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 75 | `test("renders content via dangerouslySetInnerHTML with await renderMarkdown(a.co` |
| 76 | `expect(code).toMatch(/dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*await\s+` |

##### analyze-system-errors.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 99 | `{ pattern: /dangerouslySetInnerHTML/g, type: 'Dangerous HTML' },` |

##### app/cms/[slug]/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 45 | `dangerouslySetInnerHTML={{ __html: await renderMarkdown(page.content) }}` |

##### app/help/[slug]/page.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 47 | `dangerouslySetInnerHTML={{ __html: await renderMarkdownSanitized(a.content) }}` |

---

### TODO Comments (5 حالة)

- **عدد الملفات المتأثرة**: 4
- **متوسط الحالات لكل ملف**: 1.3

#### قائمة الملفات المتأثرة:

##### app/api/support/welcome-email/route.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 185 | `// TODO: Implement actual database lookup for email delivery status` |
| 185 | `// TODO: Implement actual database lookup for email delivery status` |

##### scripts/phase1-truth-verifier.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 252 | `content.includes('// TODO') \|\|` |

##### scripts/reality-check.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 134 | `content.includes('// TODO') \|\|` |

##### smart-merge-conflicts.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 138 | `'// TODO: Review this merge - both sides had changes',` |

---

### console.debug (4 حالة)

- **عدد الملفات المتأثرة**: 2
- **متوسط الحالات لكل ملف**: 2.0

#### قائمة الملفات المتأثرة:

##### lib/marketplace/context.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 47 | `console.debug('Marketplace context header fallback failed', { key, correlationId` |
| 65 | `console.debug('Marketplace context cookie fallback failed', { key, correlationId` |

##### lib/marketplace/serverFetch.ts (2 حالة)

| السطر | الكود |
|-------|-------|
| 25 | `console.debug('[MarketplaceFetch] headers() unavailable', { correlationId, messa` |
| 61 | `console.debug('[MarketplaceFetch] cookies() unavailable', { correlationId: error` |

---

### Empty Catch Blocks (4 حالة)

- **عدد الملفات المتأثرة**: 3
- **متوسط الحالات لكل ملف**: 1.3

#### قائمة الملفات المتأثرة:

##### components/ErrorBoundary.tsx (2 حالة)

| السطر | الكود |
|-------|-------|
| 285 | `}).catch(() => {}); // Fire and forget` |
| 339 | `}).catch(() => {}); // Fire and forget` |

##### packages/fixzit-souq-server/server.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 122 | `connectDatabase().catch(() => {});` |

##### components/AutoIncidentReporter.tsx (1 حالة)

| السطر | الكود |
|-------|-------|
| 33 | `fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, bo` |

---

### @ts-nocheck Comments (2 حالة)

- **عدد الملفات المتأثرة**: 2
- **متوسط الحالات لكل ملف**: 1.0

#### قائمة الملفات المتأثرة:

##### tests/api/marketplace/search.route.impl.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 1 | `// @ts-nocheck` |

##### tests/pages/product.slug.page.test.ts (1 حالة)

| السطر | الكود |
|-------|-------|
| 12 | `// @ts-nocheck` |

---

### eval() Usage (1 حالة)

- **عدد الملفات المتأثرة**: 1
- **متوسط الحالات لكل ملف**: 1.0

#### قائمة الملفات المتأثرة:

##### scripts/scanner.js (1 حالة)

| السطر | الكود |
|-------|-------|
| 213 | `{ pattern: /eval\s*\(/g, issue: 'eval() usage detected', severity: Severity.CRIT` |

---


## 📊 الإحصائيات التفصيلية

### توزيع المشاكل حسب المجلدات

| المجلد | عدد المشاكل |
|--------|-------------|
| scripts | 1502 |
| . | 406 |
| qa/tests | 103 |
| lib | 67 |
| tests | 65 |
| public | 56 |
| tests/models | 50 |
| tests/unit/models | 42 |
| app/test | 40 |
| components | 35 |
| components/marketplace | 33 |
| app/api/marketplace/products/[slug] | 30 |
| tools | 29 |
| server/work-orders | 28 |
| tests/unit/api | 28 |
| qa | 27 |
| lib/marketplace | 24 |
| tests/pages | 24 |
| server/models/__tests__ | 23 |
| tests/unit/components | 21 |

---
*تم إنشاء هذا التقرير تلقائياً*
