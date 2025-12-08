#!/usr/bin/env tsx
/**
 * Seeds Copilot knowledge with Fixzit system FAQs and overviews.
 *
 * Usage:
 *   pnpm tsx scripts/seed-copilot-knowledge.ts
 *
 * Requires MongoDB connectivity and (optionally) OPENAI_API_KEY for embeddings.
 * Falls back to deterministic embeddings when the key is not set.
 */

import crypto from "crypto";
import { upsertKnowledgeDocument } from "@/server/copilot/retrieval";

const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error(
    "Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production.",
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("Set ALLOW_SEED=1 to run seed-copilot-knowledge.ts in non-production.");
  process.exit(1);
}

const GLOBAL_ORG_ID = "000000000000000000000000";

const docs = [
  {
    slug: "system-overview",
    title: "Fixzit System Overview",
    tags: ["architecture", "platform", "faq"],
    content: `
Fixzit is a multi-tenant Next.js 15 app-router platform on Node 18+ with pnpm. Core services: MongoDB via Mongoose, NextAuth for authentication, rate limiting, and Sentry instrumentation. Modules include Souq (claims, ads), FM/Work Orders, background jobs, AI Copilot, and notification pipelines. Data access is tenant-scoped (orgId) with plugins enforcing isolation. Background jobs live in lib/jobs/queue.ts with handlers in app/api/jobs/process/route.ts. Files and assets use optional AWS S3. ".env.local" powers local dev; production is Vercel with env vars in the dashboard. Source root for the app is Fixzit/Fixzit.`,
  },
  {
    slug: "ai-copilot-faq",
    title: "AI Copilot FAQ",
    tags: ["ai", "copilot", "faq"],
    content: `
Entry points: /api/copilot/stream (streaming) and generateCopilotResponse (non-streaming) in server/copilot/llm.ts. Models come from COPILOT_MODEL (defaults to gpt-4o-mini) and OPENAI_API_KEY; embeddings use COPILOT_EMBEDDING_MODEL or deterministic fallback. Governors in server/copilot/governors.ts enforce RBAC and safety. Knowledge retrieval uses server/copilot/retrieval.ts with CopilotKnowledge documents. Ingest knowledge via POST /api/copilot/knowledge with x-webhook-secret=COPILOT_WEBHOOK_SECRET. Roles can scope documents; global docs use the seeded default orgId. Rate limiting: 30 req/min on streaming endpoint (see route middleware).`,
  },
  {
    slug: "deployment-and-env-faq",
    title: "Deployment and Environment FAQ",
    tags: ["deployment", "vercel", "env", "faq"],
    content: `
Platform: Vercel. Root directory: Fixzit (set in Vercel settings). Critical env: MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL, OPENAI_API_KEY, COPILOT_MODEL, COPILOT_EMBEDDING_MODEL. Important: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, AWS_ACCESS_KEY_ID/SECRET/S3_BUCKET (optional uploads). Jobs: optional CRON_SECRET for /api/jobs/process when called by cron. Build command: pnpm build. Tests: pnpm vitest -c vitest.config.api.ts run tests/server/copilot. E2E (Playwright) lives under tests/specs; run pnpm test:e2e when specs are active.`,
  },
  {
    slug: "background-jobs-faq",
    title: "Background Jobs and Queue FAQ",
    tags: ["jobs", "queue", "faq"],
    content: `
Queue implementation: lib/jobs/queue.ts (enqueue, claimJob, completeJob, failJob, retryStuckJobs, cleanup). Mongo collection: background_jobs. Processor endpoint: app/api/jobs/process/route.ts (POST processes up to 10 jobs; GET shows stats). Job types: email-invitation, email-notification, s3-cleanup, report-generation. Work order API enqueues s3-cleanup retries on failed deletions; user invite API enqueues email invitations. Stuck jobs reset after 10 minutes, max attempts 3 by default. Use CRON_SECRET + x-cron-secret header if securing the processor. Stats via GET /api/jobs/process.`,
  },
  {
    slug: "souq-claims-faq",
    title: "Souq Claims FAQ",
    tags: ["souq", "claims", "faq"],
    content: `
Endpoints: POST /api/souq/claims (create), GET /api/souq/claims (list by role), GET /api/souq/claims/admin/review (admin review with fraud scoring), POST /api/souq/claims/admin/bulk (bulk approve/reject). Admin review enriches claims with fraudScore, riskLevel, recommendedAction, evidenceCount, and stats; bulk actions limit 50 claims, require reason >=20 chars, eligible statuses include submitted/under_review/pending_seller_response/pending_investigation/escalated. UI: components/souq/claims/ClaimList.tsx handles filtering, bilingual messaging, and pagination. Model definitions reside in services/souq/claims/claim-service.ts and server/models/souq/Claim.ts.`,
  },
  {
    slug: "testing-and-ops-faq",
    title: "Testing and Ops FAQ",
    tags: ["testing", "ops", "faq"],
    content: `
Core commands: pnpm lint; pnpm typecheck; pnpm build; pnpm vitest -c vitest.config.api.ts run tests/server/copilot (Copilot unit tests); pnpm vitest -c vitest.config.models.ts run (models); pnpm test:e2e (Playwright, when specs enabled); pnpm dev for local UI. Common warnings: @opentelemetry/@sentry dynamic import warnings during build; Next.js runtime notice on /api/aqar/chat/route. Ensure OPENAI_API_KEY is present to avoid deterministic embedding fallback.`,
  },
];

async function main() {
  let seeded = 0;
  for (const doc of docs) {
    const checksum = crypto
      .createHash("sha256")
      .update(doc.content)
      .digest("hex");
    await upsertKnowledgeDocument({
      ...doc,
      orgId: GLOBAL_ORG_ID,
      locale: "en",
      checksum,
    });
    seeded += 1;
    console.log(`Seeded: ${doc.slug}`);
  }
  console.log(`Done. Seeded ${seeded} Copilot knowledge documents.`);
}

main().catch((error) => {
  console.error("Failed to seed Copilot knowledge:", error);
  process.exit(1);
});
