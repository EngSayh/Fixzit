import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectDb } from '@/lib/mongo';
import { AqarListing } from '@/models/aqar';
import { PricingInsightsService } from '@/services/aqar/pricing-insights-service';
import type { IListing } from '@/models/aqar/Listing';
import { Types, Model } from 'mongoose';

export const runtime = 'nodejs';

const listingModel = AqarListing as unknown as Model<IListing>;

interface ChatbotRequestBody {
  message?: string;
  listingId?: string;
}

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  try {
    const body = (await request.json()) as ChatbotRequestBody;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    await connectDb();
    let listing: (IListing & { _id: Types.ObjectId }) | null = null;
    if (body.listingId && Types.ObjectId.isValid(body.listingId)) {
      const listingDoc = await listingModel
        .findById(body.listingId)
        .select('title price city neighborhood amenities rnplEligible immersive proptech pricingInsights intent propertyType orgId')
        .lean();
      listing = listingDoc as (IListing & { _id: Types.ObjectId }) | null;
    }

    const reply = await buildReply(message, listing);

    return NextResponse.json({ correlationId, ...reply });
  } catch (error) {
    logger.error('AQAR_CHATBOT_FAILED', {
      error: (error as Error)?.message ?? String(error),
      stack: (error as Error)?.stack,
      correlationId,
    });
    return NextResponse.json({ error: 'Chatbot unavailable', correlationId }, { status: 500 });
  }
}

async function buildReply(message: string, listing: (IListing & { _id: Types.ObjectId }) | null) {
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
    return { reply: generic.reply, intent: generic.intent, actions: generic.actions, context };
  }

  if (wantsPricing) {
    const pricing = listing.pricingInsights?.pricePerSqm
      ? listing.pricingInsights
      : await PricingInsightsService.updateListingInsights(listing._id.toHexString());
    const price = listing.price?.amount ? `${listing.price.amount.toLocaleString()} ﷼` : '—';
    const pricePerSqm = pricing?.pricePerSqm ? `${pricing.pricePerSqm.toLocaleString()} ﷼/م²` : '—';
    const appreciation = pricing?.projectedAppreciationPct
      ? `${pricing.projectedAppreciationPct.toFixed(1)}٪`
      : '—';
    return {
      reply: `السعر المطلوب حاليًا ${price}، وسعر المتر ${pricePerSqm}. التوقع المستقبلي للنمو ${appreciation} بناءً على نشاط الحي. يمكننا مشاركة تقرير PDF إذا رغبت.`,
      intent: 'pricing',
      actions: ['send_pricing_report', 'schedule_consultation'],
      context,
    };
  }

  if (wantsFinancing && listing.rnplEligible) {
    return {
      reply:
        'العقار مؤهل لبرنامج Rent-Now-Pay-Later (RNPL). نستطيع إصدار عرض تقسيط شهري مع حسبة زكاة وزاتكا خلال 4 ساعات. هل ترغب أن يتواصل فريق التمويل؟',
      intent: 'financing',
      actions: ['start_rnpl_precheck'],
      context,
    };
  }

  if (wantsTour && listing.immersive?.vrTour?.url) {
    return {
      reply: '‏يوجد لدينا جولة VR / AR محدثة. أرسلنا رابط التجربة على بريدك ويمكنك تفعيل وضع الواقع المعزز من الموبايل.',
      intent: 'immersive',
      actions: ['open_vr_tour'],
      context: { ...context, vrUrl: listing.immersive.vrTour.url },
    };
  }

  if (wantsVisit) {
    return {
      reply: 'يسعدنا ترتيب موعد معاينة ميدانية. أخبرني بالوقت المناسب لك أو استخدم أداة جدولة الزيارات في صفحة العقار.',
      intent: 'viewing',
      actions: ['open_viewing_scheduler'],
      context,
    };
  }

  if (listing.proptech?.smartHomeLevel && listing.proptech.smartHomeLevel !== 'NONE') {
    return {
      reply: 'العقار مزود ببنية منزل ذكي (تحكم بالإضاءة، أقفال رقمية، ومستشعرات طاقة). يمكننا مشاركة كتيب المتكامل إذا رغبت.',
      intent: 'proptech',
      actions: ['send_proptech_brochure'],
      context,
    };
  }

  const fallback = buildGenericReply(message);
  return { reply: fallback.reply, intent: fallback.intent, actions: fallback.actions, context };
}

function buildGenericReply(message: string) {
  if (/foreign|أجنبي/.test(message.toLowerCase())) {
    return {
      reply: 'لدينا فريق مختص بملكية الأجانب ومناطق REGA الجديدة ابتداءً من يناير 2026. أرسل لنا نسخة الجواز لنقوم بالمطابقة.',
      intent: 'compliance',
      actions: ['start_foreign_ownership_check'],
    };
  }
  return {
    reply: 'تم تسجيل سؤالك وسيقوم وكيل Fixzit بالتواصل معك خلال دقائق. يمكنني الإجابة عن الأسعار، التمويل، أو الحجوزات إن رغبت.',
    intent: 'general',
    actions: ['handoff_to_agent'],
  };
}
