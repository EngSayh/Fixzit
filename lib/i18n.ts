export type Lang = 'en' | 'ar';

export const dict: Record<Lang, Record<string, string>> = {
  en: {
    'buttons.lang': 'عربي',
    'buttons.login': 'Login',
    'buttons.signUp': 'Create Account',
    'footer.rights': 'All rights reserved.',
    'footer.legal': 'ZATCA compliant invoicing, VAT ready.',

    'nav.dashboard': 'Dashboard',
    'nav.workOrders': 'Work Orders',
    'nav.properties': 'Properties',
    'nav.finance': 'Finance',
    'nav.hr': 'HR',
    'nav.crm': 'CRM',
    'nav.fixzitSouq': 'Fixzit Souq',
    'nav.aqarSouq': 'Aqar Souq',
    'nav.reports': 'Reports',
    'nav.support': 'Support',
    'nav.compliance': 'Compliance',

    'hero.title': 'Operate properties flawlessly. Monetize services smartly.',
    'hero.subtitle': 'Fixzit unifies Facility Management, Work Orders, Finance, CRM, and two marketplaces (Aqar Souq & Fixzit Souq) in one modern platform.',
    'cta.getStarted': 'Get Started',
    'cta.viewMarket': 'View Marketplaces',
    'cta.banner': 'Ready to modernize your FM operations with Arabic/English by default?',
    'cta.signIn': 'Sign in',

    'modules.title': 'Everything your FM operation needs — connected',
    'modules.subtitle': 'Modular, role-based, Arabic/English, and mobile-ready from day one.',
    'modules.workOrders.title': 'Work Orders',
    'modules.workOrders.desc': 'Dispatch, SLAs, photos, chat, and technician app.',
    'modules.properties.title': 'Properties',
    'modules.properties.desc': 'Units, assets, leases, owners and statements.',
    'modules.finance.title': 'Finance',
    'modules.finance.desc': 'Invoices, ZATCA QR, receipts, vendor payables.',
    'modules.crm.title': 'CRM',
    'modules.crm.desc': 'Tickets, CSAT, campaigns, WhatsApp and email.',
    'modules.aqarSouq.title': 'Aqar Souq',
    'modules.aqarSouq.desc': 'Real estate catalog; viewable public pins, login to act.',
    'modules.fixzitSouq.title': 'Fixzit Souq',
    'modules.fixzitSouq.desc': 'Materials & services marketplace with 5% margin logic.',

    'fm.tabs.catalog': 'Catalog',
    'fm.tabs.vendors': 'Vendors',
    'fm.tabs.rfqs': 'RFQs & Bids',
    'fm.tabs.orders': 'Orders & POs',

    'footer.tagline': 'Facility Management + Marketplaces, together.',
    'footer.platform': 'Platform',
    'footer.marketplaces': 'Marketplaces',
    'footer.company': 'Company',
  },
  ar: {
    'buttons.lang': 'English',
    'buttons.login': 'دخول',
    'buttons.signUp': 'إنشاء حساب',
    'footer.rights': 'جميع الحقوق محفوظة.',
    'footer.legal': 'فواتير متوافقة مع الزكاة والضريبة، جاهزة لضريبة القيمة المضافة.',

    'nav.dashboard': 'لوحة التحكم',
    'nav.workOrders': 'أوامر العمل',
    'nav.properties': 'العقارات',
    'nav.finance': 'المالية',
    'nav.hr': 'الموارد البشرية',
    'nav.crm': 'العلاقات',
    'nav.fixzitSouq': 'سوق فيكزت',
    'nav.aqarSouq': 'عقار سوق',
    'nav.reports': 'التقارير',
    'nav.support': 'الدعم',
    'nav.compliance': 'التوافق',

    'hero.title': 'تشغيل العقارات بإتقان. وتحقيق عوائد للخدمات بذكاء.',
    'hero.subtitle': 'فيكزت يجمع إدارة المرافق وأوامر العمل والمالية وCRM مع سوقين (عقار سوق & سوق فيكزت) في منصة واحدة.',
    'cta.getStarted': 'ابدأ الآن',
    'cta.viewMarket': 'استعراض الأسواق',
    'cta.banner': 'جاهز لتحديث عملياتك مع دعم عربي/إنجليزي افتراضيًا؟',
    'cta.signIn': 'تسجيل الدخول',

    'modules.title': 'كل ما تحتاجه لإدارة المرافق — مترابط',
    'modules.subtitle': 'وحدات مرنة، أدوار دقيقة، عربي/إنجليزي، وتجربة جوال من اليوم الأول.',
    'modules.workOrders.title': 'أوامر العمل',
    'modules.workOrders.desc': 'توجيه، اتفاقيات خدمة، صور، محادثة، وتطبيق الفني.',
    'modules.properties.title': 'العقارات',
    'modules.properties.desc': 'الوحدات، الأصول، العقود، الملاك والكشوفات.',
    'modules.finance.title': 'المالية',
    'modules.finance.desc': 'فواتير، رمز QR زكاتا، إيصالات، ومطالبات الموردين.',
    'modules.crm.title': 'علاقات العملاء',
    'modules.crm.desc': 'تذاكر، رضا العملاء، حملات، واتساب وبريد.',
    'modules.aqarSouq.title': 'عقار سوق',
    'modules.aqarSouq.desc': 'كتالوج عقاري؛ العرض متاح للجميع والعمل يتطلب تسجيل الدخول.',
    'modules.fixzitSouq.title': 'سوق فيكزت',
    'modules.fixzitSouq.desc': 'مواد وخدمات بهامش 5٪ منطقي.',

    'fm.tabs.catalog': 'الكتالوج',
    'fm.tabs.vendors': 'الموردون',
    'fm.tabs.rfqs': 'طلبات التسعير والعطاءات',
    'fm.tabs.orders': 'الطلبات وأوامر الشراء',

    'footer.tagline': 'إدارة المرافق + الأسواق، معًا.',
    'footer.platform': 'المنصة',
    'footer.marketplaces': 'الأسواق',
    'footer.company': 'الشركة',
  },
};

export function applyHtmlLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
}