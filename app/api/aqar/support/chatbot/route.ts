/**
 * @fileoverview Aqar Support Chatbot API
 * @description AI-powered real estate assistant for property inquiries, pricing questions,
 * and general Aqar platform support. Uses context-aware responses based on listing data.
 * @module api/aqar/support/chatbot
 *
 * @security Rate limited: 30 requests/minute per IP
 * @security Input validated with Zod (max 2000 chars)
 *
 * @example
 * // POST /api/aqar/support/chatbot
 * // Body: { message: "What's the average price for apartments in Jeddah?", listingId?: "xxx" }
 * // Returns: { reply: "...", context: {...} }
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongo";
import { AqarListing } from "@/server/models/aqar";
import { PricingInsightsService } from "@/services/aqar/pricing-insights-service";
import type { IListing } from "@/server/models/aqar/Listing";
import { Types, Model } from "mongoose";
import { z } from "zod";
import { smartRateLimit } from "@/server/security/rateLimit";
import { getClientIP } from "@/server/security/headers";

export const runtime = "nodejs";

const listingModel = AqarListing as unknown as Model<IListing>;

// AUDIT-2025-12-08: Added Zod schema for input validation
const chatbotRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  listingId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    // AUDIT-2025-12-08: Added rate limiting - 30 requests per minute per IP
    const ip = getClientIP(request);
    const rl = await smartRateLimit(`aqar:chatbot:${ip}`, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", correlationId },
        { status: 429 },
      );
    }

    // AUDIT-2025-12-08: Zod validation with max length
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload", correlationId },
        { status: 400 },
      );
    }
    
    const parseResult = chatbotRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || "Invalid request", correlationId },
        { status: 400 },
      );
    }
    const body = parseResult.data;
    const message = body.message.trim();

    await connectDb();
    let listing: (IListing & { _id: Types.ObjectId }) | null = null;
    if (body.listingId && Types.ObjectId.isValid(body.listingId)) {
      const listingDoc = await listingModel
        .findById(body.listingId)
        .select(
          "title price city neighborhood amenities rnplEligible immersive proptech pricingInsights intent propertyType orgId",
        )
        .lean();
      listing = listingDoc as (IListing & { _id: Types.ObjectId }) | null;
    }

    const reply = await buildReply(message, listing);

    return NextResponse.json({ correlationId, ...reply });
  } catch (error) {
    logger.error("AQAR_CHATBOT_FAILED", {
      error: (error as Error)?.message ?? String(error),
      stack: (error as Error)?.stack,
      correlationId,
    });
    return NextResponse.json(
      { error: "Chatbot unavailable", correlationId },
      { status: 500 },
    );
  }
}

async function buildReply(
  message: string,
  listing: (IListing & { _id: Types.ObjectId }) | null,
) {
  const lower = message.toLowerCase();
  const wantsPricing = /price|سعر|cost/.test(lower);
  const wantsFinancing = /finance|rnpl|تمويل/.test(lower);
  const wantsTour = /vr|ar|tour|جولة/.test(lower);
  const wantsVisit = /visit|موعد|schedule/.test(lower);

  const context: Record<string, unknown> = {
    listingId: listing?._id.toHexString(),
    title: listing?.title,
  };

  if (!listing) {
    const generic = buildGenericReply(message);
    return {
      reply: generic.reply,
      intent: generic.intent,
      actions: generic.actions,
      context,
    };
  }

  if (wantsPricing) {
    const pricing = listing.pricingInsights?.pricePerSqm
      ? listing.pricingInsights
      : await PricingInsightsService.updateListingInsights(
          listing._id.toHexString(),
        );
    const price = listing.price?.amount
      ? `${listing.price.amount.toLocaleString()} ﷼`
      : "—";
    const pricePerSqm = pricing?.pricePerSqm
      ? `${pricing.pricePerSqm.toLocaleString()} ﷼/م²`
      : "—";
    const appreciation = pricing?.projectedAppreciationPct
      ? `${pricing.projectedAppreciationPct.toFixed(1)}٪`
      : "—";
    return {
      reply: `السعر المطلوب حاليًا ${price}، وسعر المتر ${pricePerSqm}. التوقع المستقبلي للنمو ${appreciation} بناءً على نشاط الحي. يمكننا مشاركة تقرير PDF إذا رغبت.`,
      intent: "pricing",
      actions: ["send_pricing_report", "schedule_consultation"],
      context,
    };
  }

  if (wantsFinancing && listing.rnplEligible) {
    return {
      reply:
        "العقار مؤهل لبرنامج Rent-Now-Pay-Later (RNPL). نستطيع إصدار عرض تقسيط شهري مع حسبة زكاة وزاتكا خلال 4 ساعات. هل ترغب أن يتواصل فريق التمويل؟",
      intent: "financing",
      actions: ["start_rnpl_precheck"],
      context,
    };
  }

  if (wantsTour && listing.immersive?.vrTour?.url) {
    return {
      reply:
        "‏يوجد لدينا جولة VR / AR محدثة. أرسلنا رابط التجربة على بريدك ويمكنك تفعيل وضع الواقع المعزز من الموبايل.",
      intent: "immersive",
      actions: ["open_vr_tour"],
      context: { ...context, vrUrl: listing.immersive.vrTour.url },
    };
  }

  if (wantsVisit) {
    return {
      reply:
        "يسعدنا ترتيب موعد معاينة ميدانية. أخبرني بالوقت المناسب لك أو استخدم أداة جدولة الزيارات في صفحة العقار.",
      intent: "viewing",
      actions: ["open_viewing_scheduler"],
      context,
    };
  }

  if (
    listing.proptech?.smartHomeLevel &&
    listing.proptech.smartHomeLevel !== "NONE"
  ) {
    return {
      reply:
        "العقار مزود ببنية منزل ذكي (تحكم بالإضاءة، أقفال رقمية، ومستشعرات طاقة). يمكننا مشاركة كتيب المتكامل إذا رغبت.",
      intent: "proptech",
      actions: ["send_proptech_brochure"],
      context,
    };
  }

  const fallback = buildGenericReply(message);
  return {
    reply: fallback.reply,
    intent: fallback.intent,
    actions: fallback.actions,
    context,
  };
}

function buildGenericReply(message: string) {
  if (/foreign|أجنبي/.test(message.toLowerCase())) {
    return {
      reply:
        "لدينا فريق مختص بملكية الأجانب ومناطق REGA الجديدة ابتداءً من يناير 2026. أرسل لنا نسخة الجواز لنقوم بالمطابقة.",
      intent: "compliance",
      actions: ["start_foreign_ownership_check"],
    };
  }
  return {
    reply:
      "تم تسجيل سؤالك وسيقوم وكيل Fixzit بالتواصل معك خلال دقائق. يمكنني الإجابة عن الأسعار، التمويل، أو الحجوزات إن رغبت.",
    intent: "general",
    actions: ["handoff_to_agent"],
  };
}
