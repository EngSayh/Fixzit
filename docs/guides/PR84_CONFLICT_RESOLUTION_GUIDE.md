# 🔧 PR #84 Conflict Resolution Guide

**Date**: October 9, 2025  
**Branch**: `fix/consolidation-guardrails`  
**Conflicts**: 24 files need resolution

---

## 📋 Quick Summary

**What happened?**

- PR #84 added enterprise-grade enhancements to 20+ API routes
- Meanwhile, `main` branch evolved with some changes
- Now we need to merge both together

**Strategy**:
✅ **Keep ALL PR #84 enhancements** (rate limiting, security headers, OpenAPI docs, error handling)  
✅ **Merge in any new business logic from main**  
✅ **Combine both properly**

---

## 🎯 Step-by-Step Resolution

### **Option 1: Automated Resolution (Recommended)**

Run the smart resolution script:

```bash
cd /workspaces/Fixzit

# Make script executable
chmod +x resolve-pr84-conflicts.sh
chmod +x smart-merge-conflicts.ts

# Run automated resolution
./resolve-pr84-conflicts.sh

# Or use the TypeScript smart merger
npx tsx smart-merge-conflicts.ts
```

This will auto-resolve most conflicts and flag files needing manual review.

---

### **Option 2: Manual Resolution via VS Code**

For each conflicting file, follow this pattern:

#### 1. **Open file in VS Code**

- Click on file in Source Control panel
- VS Code shows 3-way merge editor

#### 2. **Identify sections**

   ```typescript
   <<<<<<< HEAD (PR #84 - OURS)
   // Your PR #84 code with enhancements
   =======
   // Main branch code
   >>>>>>> main (THEIRS)
   ```

#### 3. **Apply merge strategy**

   **For imports section:**

   ```typescript
   // ✅ KEEP from PR #84 (OURS):
   import { rateLimit } from '@/server/security/rateLimit';
   import { createSecureResponse } from '@/server/security/headers';
   import { zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
   import { z } from 'zod';
   
   // ✅ ALSO KEEP any new imports from main (THEIRS)
   // ... add them here if they exist
   ```

   **For OpenAPI docs:**

   ```typescript
   // ✅ KEEP from PR #84 (OURS):
   /**
    * @openapi
    * /api/some/route:
    *   post:
    *     summary: Description
    *     ...
    */
   ```

   **For route handlers:**

   ```typescript
   export async function POST(req: NextRequest) {
     // ✅ KEEP: Rate limiting from PR #84
     const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
     const rl = rateLimit(`route-key:${clientIp}`, 20, 60_000);
     if (!rl.allowed) return rateLimitError();
     
     // ✅ MERGE: Any new business logic from main goes here
     // ... (copy from THEIRS section if present)
     
     // ✅ KEEP: Secure response from PR #84
     return createSecureResponse({ data: result }, 200, req);
   }
   ```

#### 4. **Remove conflict markers**

- Delete `<<<<<<< HEAD`
- Delete `=======`
- Delete `>>>>>>> main`

#### 5. **Save and stage**

   ```bash
   git add path/to/resolved/file.ts
   ```

---

## 📝 File-by-File Resolution Guide

### **Configuration Files (2 files)**

#### `.env.local`

```bash
# This file was deleted in main (good - secrets shouldn't be in repo)
git rm .env.local
```

#### `_deprecated/models-old/MarketplaceProduct.ts`

```bash
# Accept main's version (it's in deprecated folder anyway)
git checkout --theirs _deprecated/models-old/MarketplaceProduct.ts
git add _deprecated/models-old/MarketplaceProduct.ts
```

---

### **API Routes (20 files) - Universal Pattern**

For ALL these files, use the same pattern:

```
app/api/aqar/map/route.ts
app/api/aqar/properties/route.ts
app/api/assistant/query/route.ts
app/api/ats/convert-to-employee/route.ts
app/api/auth/signup/route.ts
app/api/billing/charge-recurring/route.ts
app/api/contracts/route.ts
app/api/feeds/indeed/route.ts
app/api/feeds/linkedin/route.ts
app/api/files/resumes/[file]/route.ts
app/api/files/resumes/presign/route.ts
app/api/finance/invoices/[id]/route.ts
app/api/finance/invoices/route.ts
app/api/kb/ingest/route.ts
app/api/marketplace/products/route.ts
app/api/payments/paytabs/callback/route.ts
app/api/projects/route.ts
app/api/qa/alert/route.ts
app/api/qa/log/route.ts
app/api/work-orders/export/route.ts
app/api/work-orders/import/route.ts
```

#### Resolution Template

1. **Open file**
2. **Keep these from PR #84** (look for in `<<<<<<< HEAD` section):
   - All security imports
   - OpenAPI documentation
   - Rate limiting code
   - `createSecureResponse()` calls
   - Error handler imports

3. **Merge these from main** (look for in `>>>>>>> main` section):
   - Any NEW imports not in PR #84
   - Any NEW business logic
   - Any NEW validation rules
   - Any NEW database queries

4. **Combine them** in this order:

   ```typescript
   // 1. Imports (PR #84 + main's new ones)
   // 2. Types/Schemas (merge both)
   // 3. OpenAPI docs (from PR #84)
   // 4. Handler function:
   export async function POST(req: NextRequest) {
     // 5. Rate limiting (from PR #84)
     // 6. Auth checks (merge both)
     // 7. Validation (merge both)
     // 8. Business logic (merge both)
     // 9. Return with createSecureResponse (from PR #84)
   }
   ```

5. **Example - app/api/auth/signup/route.ts**:

   ```typescript
   // ✅ Correct merge result:
   import { NextRequest } from "next/server";
   import { connectToDatabase } from "@/lib/mongodb-unified";
   import User from "@/modules/users/schema";
   import { z } from "zod";
   import bcrypt from "bcryptjs";
   import { rateLimit } from '@/server/security/rateLimit';
   import { zodValidationError, rateLimitError, duplicateKeyError, handleApiError } from '@/server/utils/errorResponses';
   import { createSecureResponse } from '@/server/security/headers';
   
   const signupSchema = z.object({
     firstName: z.string().min(1),
     lastName: z.string().min(1),
     email: z.string().email(),
     password: z.string().min(8),
     userType: z.enum(["personal", "corporate", "vendor"]),
     // ... rest of schema
   });
   
   /**
    * @openapi
    * /api/auth/signup:
    *   post:
    *     summary: User registration
    *     description: Creates new user account
    *     tags: [Authentication]
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             required: [firstName, lastName, email, password, userType]
    *     responses:
    *       201: {description: User created successfully}
    *       400: {description: Validation error}
    *       429: {description: Rate limit exceeded}
    */
   export async function POST(req: NextRequest) {
     try {
       // Rate limiting
       const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
       const rl = rateLimit(`auth-signup:${clientIp}`, 5, 900);
       if (!rl.allowed) {
         return rateLimitError();
       }
   
       await connectToDatabase();
       const body = signupSchema.parse(await req.json());
   
       // Business logic (merge from both branches if needed)
       let role = "TENANT";
       switch (body.userType) {
         case "corporate": role = "CORPORATE_ADMIN"; break;
         case "vendor": role = "VENDOR"; break;
         default: role = "TENANT";
       }
   
       const hashedPassword = await bcrypt.hash(body.password, 12);
       const existingUser = await User.findOne({ email: body.email });
       
       if (existingUser) {
         return duplicateKeyError();
       }
   
       const newUser = await User.create({
         firstName: body.firstName,
         lastName: body.lastName,
         email: body.email,
         role,
         password: hashedPassword,
         // ... rest of fields
       });
   
       return createSecureResponse({
         ok: true,
         message: "User created successfully",
         user: {
           id: newUser._id,
           email: newUser.email,
           role: newUser.role,
         },
       }, 201, req);
     } catch (error: any) {
       if (error.name === 'ZodError') {
         return zodValidationError(error);
       }
       return handleApiError(error);
     }
   }
   ```

---

### **Component Files (1 file)**

#### `components/topbar/AppSwitcher.tsx`

1. Open file
2. Find conflict sections
3. Merge UI changes from both branches
4. Keep any new props/features from main
5. Keep any styling/structure improvements from PR #84
6. Test that component renders correctly

---

### **Infrastructure Files (1 file)**

#### `server/copilot/retrieval.ts`

1. Open file
2. Merge import changes
3. Merge function updates
4. Keep any new AI/copilot features from main
5. Keep any security enhancements from PR #84

---

## ✅ Verification Checklist

After resolving all conflicts:

```bash
# 1. Check no conflict markers remain
grep -r "<<<<<<< HEAD" app/api/ components/ server/

# 2. Check TypeScript compiles
npx tsc --noEmit

# 3. Check for errors
npm run lint

# 4. Review all changes
git diff --cached

# 5. Commit
git commit -m "chore: resolve merge conflicts between PR #84 and main

- Kept all PR #84 enhancements (rate limiting, security, OpenAPI, errors)
- Merged newer business logic from main
- Removed .env.local per main branch
- Updated deprecated model references
- Resolved 24 conflicting files"

# 6. Push
git push origin fix/consolidation-guardrails
```

---

## 🚨 Common Pitfalls

### ❌ **DON'T:**

- Accept "theirs" (main) for API routes - you'll lose PR #84 enhancements
- Delete OpenAPI documentation comments
- Remove rate limiting code
- Remove `createSecureResponse()` wrappers
- Remove error handler imports

### ✅ **DO:**

- Keep all PR #84 security enhancements
- Merge new business logic from main
- Test after resolving
- Review each file carefully
- Ask for help if unsure

---

## 💡 Quick Decision Tree

```
For each conflict:

Is this an API route file?
├─ YES → Use API route pattern (keep PR #84 structure + merge main logic)
└─ NO → Is it a component?
    ├─ YES → Merge UI changes from both
    └─ NO → Is it infrastructure?
        ├─ YES → Merge carefully, test functionality
        └─ NO → Accept main's version if unsure
```

---

## 🆘 Need Help?

If stuck on a specific file, use this template to ask:

```
File: [filename]
Conflict in: [section - imports/handler/etc]
PR #84 has: [describe]
Main has: [describe]
Question: [what to do?]
```

---

## 📊 Progress Tracker

Mark files as you resolve them:

### Configuration (2)

- [ ] `.env.local` - DELETE
- [ ] `_deprecated/models-old/MarketplaceProduct.ts` - USE MAIN

### API Routes (20)

- [ ] `app/api/aqar/map/route.ts`
- [ ] `app/api/aqar/properties/route.ts`
- [ ] `app/api/assistant/query/route.ts`
- [ ] `app/api/ats/convert-to-employee/route.ts`
- [ ] `app/api/auth/signup/route.ts`
- [ ] `app/api/billing/charge-recurring/route.ts`
- [ ] `app/api/contracts/route.ts`
- [ ] `app/api/feeds/indeed/route.ts`
- [ ] `app/api/feeds/linkedin/route.ts`
- [ ] `app/api/files/resumes/[file]/route.ts`
- [ ] `app/api/files/resumes/presign/route.ts`
- [ ] `app/api/finance/invoices/[id]/route.ts`
- [ ] `app/api/finance/invoices/route.ts`
- [ ] `app/api/kb/ingest/route.ts`
- [ ] `app/api/marketplace/products/route.ts`
- [ ] `app/api/payments/paytabs/callback/route.ts`
- [ ] `app/api/projects/route.ts`
- [ ] `app/api/qa/alert/route.ts`
- [ ] `app/api/qa/log/route.ts`
- [ ] `app/api/work-orders/export/route.ts`
- [ ] `app/api/work-orders/import/route.ts`

### Components (1)

- [ ] `components/topbar/AppSwitcher.tsx`

### Infrastructure (1)

- [ ] `server/copilot/retrieval.ts`

---

**Estimated Time**: 1-2 hours for manual resolution, 15-30 minutes with automated script

**Difficulty**: Medium (following pattern makes it manageable)

---

Good luck! 🚀
