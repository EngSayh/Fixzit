"use client";

/**
 * Building 3D Internationalization
 * 
 * @module components/building3d/i18n
 * @description Localized strings for 3D building components.
 * Supports English and Arabic with RTL detection.
 */
import { useMemo } from "react";

const DICT = {
  en: {
    title: "3D Building",
    generate: "Generate Model",
    publish: "Publish Tour",
    openPublicLink: "Open Public Link",
    loading: "Loading…",
    noModel: "No model generated yet.",
    floors: "Floors",
    unitsPerFloor: "Units / Floor",
    template: "Template",
    layout: "Layout",
    corridor: "Corridor",
    grid: "Grid",
    procedural: "Procedural",
    ai: "AI (Paid)",
    aiPrompt: "AI prompt",
    aiNotEnabled: "AI designer is not enabled for this organization.",
    syncUnits: "Sync units to database",
    selectUnitHint: "Select a unit in the 3D view to edit details.",
    editUnit: "Edit Unit",
    unitNumber: "Unit Number",
    electricityMeter: "Electricity Meter",
    waterMeter: "Water Meter",
    save: "Save",
    viewerRooms: "Rooms",
    viewerExplode: "Explode Floors",
    viewerLabels: "Labels",
    modeOrbit: "Orbit",
    modeWalk: "Walk",
    tourTitle: "Fixzit Tour",
    tourHint: "Click a unit to view details.",
    errorNoModel: "No building model found for this property.",
    errorNoModelAvailable: "No building model available.",
    errorNotPublished: "Building model not yet published.",
    errorUnknown: "Unknown error",
    errorDefault: "No building model found.",
  },
  ar: {
    title: "مبنى ثلاثي الأبعاد",
    generate: "إنشاء النموذج",
    publish: "نشر الجولة",
    openPublicLink: "فتح الرابط العام",
    loading: "جارٍ التحميل…",
    noModel: "لم يتم إنشاء نموذج بعد.",
    floors: "عدد الأدوار",
    unitsPerFloor: "الوحدات لكل دور",
    template: "النموذج",
    layout: "المخطط",
    corridor: "ممر",
    grid: "شبكة",
    procedural: "توليدي",
    ai: "ذكاء اصطناعي (مدفوع)",
    aiPrompt: "وصف الذكاء الاصطناعي",
    aiNotEnabled: "ميزة المصمم بالذكاء الاصطناعي غير مفعّلة لهذه الجهة.",
    syncUnits: "مزامنة الوحدات مع قاعدة البيانات",
    selectUnitHint: "اختر وحدة من العرض ثلاثي الأبعاد لتعديل بياناتها.",
    editUnit: "تعديل الوحدة",
    unitNumber: "رقم الوحدة",
    electricityMeter: "عداد الكهرباء",
    waterMeter: "عداد المياه",
    save: "حفظ",
    viewerRooms: "الغرف",
    viewerExplode: "تفكيك الأدوار",
    viewerLabels: "العناوين",
    modeOrbit: "استعراض",
    modeWalk: "تجول",
    tourTitle: "جولة فيكزت",
    tourHint: "انقر على وحدة لعرض التفاصيل.",
    errorNoModel: "لم يتم العثور على نموذج للمبنى.",
    errorNoModelAvailable: "لا يوجد نموذج متاح.",
    errorNotPublished: "نموذج المبنى غير منشور بعد.",
    errorUnknown: "خطأ غير معروف",
    errorDefault: "لم يتم العثور على نموذج للمبنى.",
  },
} as const;

type Key = keyof (typeof DICT)["en"];

/**
 * Hook for building 3D component translations.
 * Detects language from document or navigator.
 * 
 * @returns Translation function and language info
 */
export function useBuilding3dI18n() {
  const lang =
    typeof document !== "undefined"
      ? document.documentElement.lang || navigator.language || "en"
      : "en";
  const langKey = lang.toLowerCase().startsWith("ar") ? "ar" : "en";
  const dir = langKey === "ar" ? "rtl" : "ltr";

  const t = useMemo(() => {
    return (key: Key) =>
      (DICT as Record<string, Record<string, string>>)[langKey]?.[key] ??
      DICT.en[key] ??
      key;
  }, [langKey]);

  return { t, lang: langKey, dir };
}
