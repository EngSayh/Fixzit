/**
 * Intent Classification Module for Fixzit AI Assistant
 * Classifies user messages into actionable intents with multilingual support (EN/AR)
 * Based on Blueprint Bible and Design System specifications
 */

import type { Intent } from "@/src/types/copilot";

/**
 * Classifies user message into one of 10 intents using pattern matching
 * Supports both English and Arabic queries with RTL awareness
 * 
 * @param text - User's message text
 * @param locale - Current locale ('en' | 'ar')
 * @returns Detected intent for routing to appropriate handler
 */
export function classifyIntent(text: string, _locale: 'en' | 'ar'): Intent {
  const lower = text.toLowerCase();

  // APARTMENT_SEARCH: Real estate queries (high priority for Aqar module integration)
  // EN: apartment, flat, unit, studio, bedroom, 2br, 3br, available, vacant, for rent, search
  // AR: شقة, وحدة, متاح, للإيجار, بحث, استوديو, غرفة
  if (
    (/(apartment|flat|unit|studio|bedroom|2br|3br|4br|شقة|وحدة|غرفة|استوديو)/.test(lower)) &&
    (/(search|find|available|vacant|for rent|looking for|بحث|متاح|للإيجار|أبحث عن|ابحث|اريد)/.test(lower))
  ) {
    return 'APARTMENT_SEARCH';
  }

  // LIST_MY_TICKETS: Work order status queries
  // EN: my tickets, my work orders, status, track, show me
  // AR: طلباتي, تذاكري, حالة, متابعة, أرني
  if (
    /(my (ticket|work order|request)|show me|track|status|list|طلباتي|تذاكري|أرني|اعرض|حالة|متابعة)/i.test(lower)
  ) {
    return 'LIST_MY_TICKETS';
  }

  // CREATE_WORK_ORDER: Maintenance/service requests
  // EN: create, new ticket, report, maintenance, repair, fix, broken
  // AR: إنشاء, تذكرة جديدة, صيانة, إصلاح, عطل, خلل
  if (
    /(create|new|report|maintenance|repair|fix|broken|issue|problem|إنشاء|تذكرة|صيانة|إصلاح|عطل|خلل|مشكلة)/i.test(lower) &&
    /(ticket|work order|request|طلب|تذكرة)/i.test(lower)
  ) {
    return 'CREATE_WORK_ORDER';
  }

  // DISPATCH: Technician assignment (FM Manager, Admin roles)
  // EN: dispatch, assign, send technician, allocate
  // AR: توجيه, تعيين, إرسال فني, تخصيص
  if (/(dispatch|assign|send (technician|tech)|allocate|توجيه|تعيين|إرسال فني|تخصيص فني|فني)/i.test(lower)) {
    return 'DISPATCH';
  }

  // SCHEDULE_VISIT: Appointment scheduling
  // EN: schedule, appointment, visit, book, set time
  // AR: جدولة, موعد, زيارة, حجز, تحديد وقت
  if (/(schedule|appointment|visit|book|set time|meeting|جدولة|موعد|زيارة|حجز|تحديد وقت)/i.test(lower)) {
    return 'SCHEDULE_VISIT';
  }

  // UPLOAD_PHOTO: Photo/document attachment
  // EN: upload, attach, photo, picture, image, document
  // AR: رفع, إرفاق, صورة, مستند, ملف
  if (/(upload|attach|photo|picture|image|document|file|رفع|إرفاق|صورة|مستند|ملف)/i.test(lower)) {
    return 'UPLOAD_PHOTO';
  }

  // APPROVE_QUOTATION: Quotation approval (Finance, Admin roles)
  // EN: approve, accept, quotation, quote, estimate
  // AR: اعتماد, قبول, عرض سعر, تسعير
  if (/(approve|accept|confirm|اعتماد|قبول|موافقة)/i.test(lower) && /(quotation|quote|estimate|عرض سعر|تسعير)/i.test(lower)) {
    return 'APPROVE_QUOTATION';
  }

  // OWNER_STATEMENTS: Financial reports (Finance, Owner, Property Manager roles)
  // EN: owner statement, financial report, income, expenses, revenue
  // AR: كشف حساب مالك, كشف مالك, تقرير مالي, دخل, مصروفات
  if (/(owner.*statement|owner.*report|financial.*statement|كشف حساب مالك|كشف مالك|تقرير مالي)/i.test(lower)) {
    return 'OWNER_STATEMENTS';
  }

  // PERSONAL: User-specific data (requires authentication)
  // EN: my, mine, personal, account, profile
  // AR: الخاص بي, حسابي, ملفي, شخصي
  if (
    /(my|mine|personal|account|profile|invoice|contract|lease|payment|الخاص بي|حسابي|ملفي|شخصي|عقدي|دفعاتي|فاتورتي)/i.test(lower)
  ) {
    return 'PERSONAL';
  }

  // GENERAL: Default fallback for general guidance/knowledge base queries
  return 'GENERAL';
}

/**
 * Detects sentiment in user message for escalation triggers
 * Used to identify frustrated/angry users requiring immediate support
 * 
 * @param text - User's message text
 * @returns Sentiment score: 'negative' | 'neutral' | 'positive'
 */
export function detectSentiment(text: string): 'negative' | 'neutral' | 'positive' {
  const lower = text.toLowerCase();

  // Negative sentiment patterns (frustration, anger, urgency)
  const negativePatterns = [
    /(frustrated|angry|furious|upset|annoyed)/i,
    /(terrible|horrible|awful|worst|bad)/i,
    /(problem|issue|broken|not working|fail)/i,
    /(urgent|emergency|critical|asap)/i,
    /(never|always broken|every time)/i,
    /(unacceptable|ridiculous|pathetic)/i,
  ];

  // Positive sentiment patterns (satisfaction, appreciation)
  const positivePatterns = [
    /(thank|thanks|appreciate|grateful)/i,
    /(great|excellent|perfect|wonderful|amazing)/i,
    /(happy|satisfied|pleased)/i,
    /(love|like it|works well)/i,
  ];

  let score = 0;

  // Check negative patterns (weight: -1 each)
  negativePatterns.forEach(pattern => {
    if (pattern.test(lower)) score -= 1;
  });

  // Check positive patterns (weight: +1 each)
  positivePatterns.forEach(pattern => {
    if (pattern.test(lower)) score += 1;
  });

  // Classify based on net score
  if (score < -1) return 'negative';
  if (score > 0) return 'positive';
  return 'neutral';
}

/**
 * Extracts key parameters from apartment search queries
 * Used to build MongoDB queries for property/unit filtering
 * 
 * @param text - User's search query
 * @param locale - Current locale
 * @returns Extracted parameters (bedrooms, city, priceRange, etc.)
 */
export function extractApartmentSearchParams(text: string, _locale: 'en' | 'ar'): {
  bedrooms?: number;
  city?: string;
  priceRange?: { min?: number; max?: number };
  furnished?: boolean;
} {
  const lower = text.toLowerCase();
  const params: ReturnType<typeof extractApartmentSearchParams> = {};

  // Extract bedroom count (2BR, 3BR, studio, etc.)
  const bedroomMatch = lower.match(/(\d+)\s*(br|bedroom|غرفة)/i);
  if (bedroomMatch) {
    params.bedrooms = parseInt(bedroomMatch[1], 10);
  } else if (/(studio|استوديو)/i.test(lower)) {
    params.bedrooms = 0; // Studio = 0 bedrooms
  }

  // Extract city (Riyadh, Jeddah, Dammam, etc.)
  const cityPatterns = [
    { en: 'riyadh', ar: 'الرياض', key: 'Riyadh' },
    { en: 'jeddah', ar: 'جدة', key: 'Jeddah' },
    { en: 'dammam', ar: 'الدمام', key: 'Dammam' },
    { en: 'makkah', ar: 'مكة', key: 'Makkah' },
    { en: 'medina', ar: 'المدينة', key: 'Medina' },
    { en: 'khobar', ar: 'الخبر', key: 'Khobar' },
  ];

  for (const city of cityPatterns) {
    if (new RegExp(`\\b(${city.en}|${city.ar})\\b`, 'i').test(lower)) {
      params.city = city.key;
      break;
    }
  }

  // Extract price range (under 5000, between 3000-8000, etc.)
  const priceMatch = lower.match(/(\d+)\s*[-to]\s*(\d+)/);
  if (priceMatch) {
    params.priceRange = {
      min: parseInt(priceMatch[1], 10),
      max: parseInt(priceMatch[2], 10),
    };
  } else {
    const singlePriceMatch = lower.match(/(under|below|less than|أقل من|تحت)\s*(\d+)/i);
    if (singlePriceMatch) {
      params.priceRange = { max: parseInt(singlePriceMatch[2], 10) };
    }
  }

  // Extract furnished preference
  if (/(furnished|مفروش)/i.test(lower)) {
    params.furnished = true;
  } else if (/(unfurnished|غير مفروش)/i.test(lower)) {
    params.furnished = false;
  }

  return params;
}
