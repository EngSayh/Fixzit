# ATS Code Corrections - Critical Bugs Fixed

**Date:** November 16, 2025  
**Status:** Production-Ready Code Snippets  
**Purpose:** Corrected versions of ATS code with critical bug fixes

---

## 🐛 Bug Fixes Applied

### Bug 1: Invalid `job.orgId.modules` Reference

**Location:** `src/app/api/ats/applications/route.ts` (public apply endpoint)

**❌ BROKEN CODE (would crash):**

```typescript
const job = await Job.findById(jobId);
if (!job || !job.orgId.modules.ats.enabled) {
  return NextResponse.json({ error: "Not available" }, { status: 402 });
}
```

**Problem:** `job.orgId` is an `ObjectId`, not an `Organization` document. Accessing `.modules` will crash with "Cannot read property 'modules' of undefined".

**✅ FIXED CODE (Option A - Simplest):**

```typescript
export async function POST(req: NextRequest) {
  await connectDB();
  const form = await req.formData();
  const jobId = form.get("jobId") as string;

  const job = await Job.findById(jobId);
  if (!job || job.status !== "open" || job.visibility !== "public") {
    return NextResponse.json({ error: "Job not available" }, { status: 404 });
  }

  // Note: Only ATS-enabled orgs can create/publish jobs (enforced at POST /api/ats/jobs)
  // So if a job exists and is open, the org must have ATS enabled

  const resume = form.get("resume") as File;
  const buffer = Buffer.from(await resume.arrayBuffer());
  const parsed = await parseResume(buffer, job.screeningRules.requiredSkills);

  const candidate = await Candidate.create({
    orgId: job.orgId,
    fullName: parsed.fullName,
    email: parsed.email,
    phone: parsed.phone,
    skills: parsed.skills,
  });

  const app = await Application.create({
    orgId: job.orgId,
    jobId,
    candidateId: candidate._id,
    score: parsed.score,
  });

  return NextResponse.json(app);
}
```

**✅ FIXED CODE (Option B - Explicit Org Check):**

```typescript
import { Organization } from "@/models/Organization";

export async function POST(req: NextRequest) {
  await connectDB();
  const form = await req.formData();
  const jobId = form.get("jobId") as string;

  const job = await Job.findById(jobId).lean();
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Explicit org gating check
  const org = await Organization.findById(job.orgId).lean();
  if (!org?.modules?.ats?.enabled) {
    return NextResponse.json(
      {
        error: "Recruitment not active for this company",
      },
      { status: 402 },
    );
  }

  if (job.status !== "open" || job.visibility !== "public") {
    return NextResponse.json({ error: "Job not available" }, { status: 404 });
  }

  // ... rest of code
}
```

**Recommendation:** Use **Option A** for v1 (simpler, relies on job creation gating). Use **Option B** if you need extra paranoia or allow external job boards to link directly.

---

### Bug 2: SWR Error Handling for 402 Status

**Location:** `src/app/hr/recruitment/page.tsx` (ATS dashboard UI)

**❌ BROKEN CODE (wouldn't catch 402):**

```typescript
const fetcher = (url) => fetch(url).then((r) => r.json());

export default function ATSPage() {
  const router = useRouter();
  const { data, error } = useSWR("/api/ats/jobs", fetcher);

  if (error?.status === 402) {
    // This will NEVER be true!
    router.push("/billing/upgrade?feature=ats");
    return null;
  }

  // ... rest
}
```

**Problem:** SWR's `error` is only set when `fetcher` throws. Your fetcher returns `r.json()` even when `r.status === 402`, so it never throws. `error?.status` is undefined.

**✅ FIXED CODE:**

```typescript
'use client';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const fetcher = async (url: string) => {
  const res = await fetch(url);

  // Handle ATS not enabled (402 Payment Required)
  if (res.status === 402) {
    const err: any = new Error('ATS not enabled');
    err.status = 402;
    err.data = await res.json();
    throw err;
  }

  // Handle other errors
  if (!res.ok) {
    const err: any = new Error(`Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
};

export default function ATSPage() {
  const router = useRouter();
  const { data, error } = useSWR('/api/ats/jobs', fetcher);

  useEffect(() => {
    if ((error as any)?.status === 402) {
      router.push('/billing/upgrade?feature=ats');
    }
  }, [error, router]);

  if ((error as any)?.status === 402) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-2">ATS Not Enabled</h2>
        <p className="mb-4">Redirecting to upgrade page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 dark:bg-neutral-800 rtl:text-right">
      <h1 className="text-2xl font-bold text-primary mb-4">
        Recruitment (ATS)
      </h1>

      {/* Tabs: Jobs, Pipeline, Candidates, Interviews, Offers, Analytics */}
      <div className="space-y-4">
        {data.map((job: any) => (
          <div key={job._id} className="border rounded p-4">
            <h3 className="font-semibold">{job.title}</h3>
            <p className="text-sm text-gray-600">{job.department}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Key Fixes:**

1. ✅ `fetcher` now **throws** on 402 with `err.status = 402`
2. ✅ `useEffect` handles redirect (avoids React warnings)
3. ✅ Type cast `(error as any)?.status` for TypeScript
4. ✅ Graceful error UI before redirect
5. ✅ Loading state while fetching

---

## 📋 Summary of Fixed Code

| File                                    | Bug                       | Fix                                | Lines Changed |
| --------------------------------------- | ------------------------- | ---------------------------------- | ------------- |
| `src/app/api/ats/applications/route.ts` | `job.orgId.modules` crash | Check `job.status/visibility` only | ~5            |
| `src/app/hr/recruitment/page.tsx`       | SWR 402 not caught        | Throw error in fetcher with status | ~15           |

---

## ✅ Verification Checklist

### Test 1: Public Apply (applications/route.ts)

```bash
# Test with valid open job
curl -X POST http://localhost:3000/api/ats/applications \
  -F "jobId=673866a1b2c3d4e5f6789abc" \
  -F "resume=@resume.pdf"

# Expected: 200 OK (application created)
```

```bash
# Test with closed job
# Expected: 404 Job not available
```

```bash
# Test with non-existent job
# Expected: 404 Job not available
```

### Test 2: ATS Dashboard (page.tsx)

```bash
# 1. Login as user with ATS enabled
# Navigate to /hr/recruitment
# Expected: Dashboard loads with jobs list

# 2. Login as user with ATS disabled
# Navigate to /hr/recruitment
# Expected: Redirect to /billing/upgrade?feature=ats

# 3. Check browser console
# Expected: No React errors, no "cannot read property" errors
```

---

## 🚀 Deployment Notes

### Before Merging

- [ ] Update `src/app/api/ats/applications/route.ts` with fixed code
- [ ] Update `src/app/hr/recruitment/page.tsx` with fixed fetcher
- [ ] Run TypeScript compilation: `npm run build`
- [ ] Test locally with ATS enabled/disabled users
- [ ] Verify no console errors in browser

### After Merging

- [ ] Deploy to staging
- [ ] Run manual QA (follow `COMMUNICATION_LOGS_QA_PLAN.md`)
- [ ] Verify MongoDB logs show correct gating behavior
- [ ] Monitor Sentry/logs for "Cannot read property" errors (should be 0)

---

## 📖 Related Documents

- **Architectural Review:** `docs/modules/ATS_CAREERS_FINAL_REVIEW.md`
- **Phase 1 Summary:** `docs/modules/ATS_PHASE1_COMPLETE.md`
- **QA Test Plan:** `docs/testing/COMMUNICATION_LOGS_QA_PLAN.md`

---

**Status:** ✅ Critical bugs identified and fixed  
**Ready for:** Implementation in Cursor/production codebase  
**Zero Breaking Changes:** Fixes are backward compatible

---

_Last Updated: November 16, 2025_
