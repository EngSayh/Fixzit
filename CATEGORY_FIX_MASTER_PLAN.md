# Category-by-Category Fix Master Plan

## Approach

Each error category will be:
1. **Searched** across the entire system (using CSV locations)
2. **Analyzed** for impact on system design, endpoints, DB, theme, i18n/RTL
3. **Fixed** with full context (not narrow fixes)
4. **Tested** against the whole system
5. **Documented** with before/after code
6. **Committed** to a separate PR for that category

## The 17 Categories (Priority Order)

### 🔴 Critical Priority

1. **Security: dangerouslySetInnerHTML** (5 instances)
   - File: `fixes/dangerousHTML-locations.csv`
   - Impact: XSS vulnerabilities
   - Fix Strategy: Use sanitized rendering, verify all 5 instances

2. **Security: eval() usage** (1 instance)
   - File: `fixes/evalUsage-locations.csv`
   - Impact: Code injection risk
   - Fix Strategy: Replace with safer alternatives

3. **Empty Catch Blocks** (4 instances) ✅ DONE
   - File: `fixes/emptyCatch-locations.csv`
   - Status: Already fixed

### 🟡 High Priority

4. **Any Type Usage** (288 instances)
   - File: `fixes/anyType-locations.csv`
   - Impact: Type safety, runtime errors
   - Fix Strategy: Add proper interfaces/types

5. **Type Cast to Any** (307 instances)
   - File: `fixes/asAny-locations.csv`
   - Impact: Type safety bypass
   - Fix Strategy: Use proper type assertions

6. **@ts-ignore Comments** (54 instances)
   - File: `fixes/tsIgnore-locations.csv`
   - Impact: Hidden type errors
   - Fix Strategy: Fix underlying issues, remove ignores

### 🟢 Medium Priority

7. **console.log** (1,576 instances) ✅ PARTIALLY DONE
   - File: `fixes/consoleLog-locations.csv`
   - Status: 1,225 removed, ~350 remaining
   - Fix Strategy: Remove or replace with proper logger

8. **console.error** (327 instances)
   - File: `fixes/consoleError-locations.csv`
   - Impact: Production noise, poor logging
   - Fix Strategy: Replace with structured logger

9. **Hardcoded Localhost** (103 instances)
   - File: `fixes/localhost-locations.csv`
   - Impact: Deployment issues
   - Fix Strategy: Use environment variables

10. **ESLint Disable Comments** (59 instances)
    - File: `fixes/eslintDisable-locations.csv`
    - Impact: Code quality
    - Fix Strategy: Fix issues, remove disables

11. **console.warn** (43 instances) ✅ DONE
    - Included in console.log removal

12. **@ts-expect-error** (25 instances)
    - File: `fixes/tsExpectError-locations.csv`
    - Fix Strategy: Fix or document properly

### 🔵 Low Priority

13. **process.exit()** (192 instances)
    - File: `fixes/processExit-locations.csv`
    - Context: Mostly in scripts (acceptable)
    - Fix Strategy: Review and document

14. **console.info** (7 instances) ✅ DONE
15. **console.debug** (4 instances) ✅ DONE
16. **TODO Comments** (5 instances)
17. **@ts-nocheck** (2 instances)

---

## Fix Implementation Strategy

Each fix script will:
- Read the category's CSV file
- Load each affected file
- Apply fixes following SMART review guidelines:
  - ✅ Check system design impact
  - ✅ Verify module behavior
  - ✅ Detail endpoints affected
  - ✅ Verify DB access configuration
  - ✅ Check theme/layout (header/footer/sidebar/topbar)
  - ✅ Validate i18n/RTL
  - ✅ Ensure e2e compatibility
  - ✅ Prevent regressions
- Generate before/after evidence
- Create PR with full documentation

---

## Scripts Created

Each category gets its own fix script in `fixes-automation/category-fixes/`
