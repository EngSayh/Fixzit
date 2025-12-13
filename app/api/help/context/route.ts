/**
 * @fileoverview Help Context API
 * @description Provides contextual help information and escalation contacts
 * based on the user's current module and role.
 * 
 * @module api/help/context
 * @requires Authenticated user
 * 
 * @endpoints
 * - GET /api/help/context?module=<module> - Get contextual help and escalation
 * 
 * @queryParams
 * - module: Module context (FM, Souq, Aqar, Account, Billing, Other)
 * 
 * @response
 * - articles: Array of relevant help articles (ROADMAP: KnowledgeBase integration)
 * - escalation: Contact information for support escalation
 * 
 * @security
 * - Authenticated users only
 * - Module-aware escalation routing
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/middleware/withAuthRbac';
import { resolveEscalationContact } from '@/server/services/escalation.service';
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

const MODULES = ['FM', 'Souq', 'Aqar', 'Account', 'Billing', 'Other'] as const;

export async function GET(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 60, windowMs: 60_000, keyPrefix: "help:context" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const moduleParam = new URL(req.url).searchParams.get('module') || '';
    const moduleNormalized = MODULES.includes(moduleParam as (typeof MODULES)[number])
      ? (moduleParam as (typeof MODULES)[number])
      : 'Other';

    const escalation = await resolveEscalationContact(user, moduleNormalized);

    // ROADMAP: Integrate KnowledgeBase collection for contextual articles
    // Currently returns empty articles array with escalation contact only
    return NextResponse.json({ articles: [], escalation }, { status: 200 });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
