export const SUPPORTED_LOCALES = (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES || "en,ar")
  .split(",")
  .map(s => s.trim() as "en"|"ar");

export function isRTL(locale: "en"|"ar") { return locale === "ar"; }

export const messages = {
  en: {
    app: { title:"Fixzit", sidebar:"Modules", search:"Search", signOut:"Sign out" },
    modules: {
      dashboard:"Dashboard", work_orders:"Work Orders", finance:"Finance", hr:"HR", admin:"Admin",
      crm:"CRM", properties:"Properties", marketplace:"Fixzit Souq", aqar_souq:"Aqar Souq",
      vendors:"Vendors", support:"Support", compliance:"Compliance"
    }
  },
  ar: {
    app: { title:"فيكزت", sidebar:"الوحدات", search:"بحث", signOut:"تسجيل الخروج" },
    modules: {
      dashboard:"لوحة التحكم", work_orders:"أوامر العمل", finance:"المالية", hr:"الموارد البشرية", admin:"الإدارة",
      crm:"إدارة العملاء", properties:"العقارات", marketplace:"سوق فيكزت", aqar_souq:"سوق العقار",
      vendors:"الموردون", support:"الدعم", compliance:"الامتثال"
    }
  }
} as const;
