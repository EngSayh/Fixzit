'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  LANGUAGE_OPTIONS,
  findLanguageByCode,
  findLanguageByLocale,
  type LanguageCode,
  type LanguageOption
} from '@/data/language-options';

export type Language = LanguageCode;

interface TranslationContextType {
  language: Language;
  locale: string;
  setLanguage: (lang: Language) => void;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Translation data
const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.work-orders': 'أوامر العمل',
    'nav.properties': 'العقارات',
    'nav.assets': 'الأصول',
    'nav.tenants': 'المستأجرين',
    'nav.vendors': 'الموردين',
    'nav.projects': 'المشاريع',
    'nav.rfqs': 'طلبات العروض',
    'nav.invoices': 'الفواتير',
    'nav.finance': 'المالية',
    'nav.hr': 'الموارد البشرية',
    'nav.crm': 'إدارة العلاقات',
    'nav.support': 'الدعم',
    'nav.compliance': 'الامتثال',
    'nav.reports': 'التقارير',
    'nav.system': 'إدارة النظام',
    'nav.marketplace': 'السوق',
    'nav.maintenance': 'الصيانة',
    'nav.orders': 'الطلبات',
    'nav.notifications': 'الإشعارات',
    'nav.profile': 'الملف الشخصي',
    'nav.settings': 'الإعدادات',
    'nav.preferences': 'التفضيلات',

    // Sidebar
    'sidebar.role': 'الدور',
    'sidebar.planLabel': 'الخطة',
    'sidebar.account': 'الحساب',
    'sidebar.help': 'المساعدة',
    'sidebar.helpCenter': 'مركز المساعدة',

    // Common
    'common.search': 'بحث',
    'common.search.placeholder': 'البحث في أوامر العمل، العقارات، المستأجرين...',
    'i18n.filterLanguages': 'ابحث عن اللغات',
    'i18n.filterCurrencies': 'ابحث عن العملات',
    'i18n.selectLanguageLabel': 'اختر اللغة',
    'i18n.selectCurrencyLabel': 'اختر العملة',
    'a11y.currencySelectorHelp': 'استخدم مفاتيح الأسهم للتنقل، إدخال للتحديد، Esc للإغلاق',
    'common.login': 'تسجيل الدخول',
    'common.logout': 'تسجيل الخروج',
    'common.save': 'حفظ',
    'common.saving': 'جاري الحفظ...',
    'common.unsavedChanges': 'تغييرات غير محفوظة',
    'common.unsavedChangesMessage': 'لديك تغييرات غير محفوظة. هل تريد حفظها قبل المغادرة؟',
    'common.saveAndContinue': 'حفظ والمتابعة',
    'common.discard': 'تجاهل',
    'common.preferences': 'التفضيلات',
    'common.brand': 'فيكزيت إنتربرايز',
    'common.unread': 'غير مقروء',
    'common.noNotifications': 'لا توجد إشعارات جديدة',
    'common.allCaughtUp': 'لقد قرأت كل شيء!',
    'common.viewAll': 'عرض جميع الإشعارات',
    // TopBar search placeholders
    'souq.search.placeholder': 'البحث في الكتالوج، الموردين، طلبات العروض، الطلبات...',
    'aqar.search.placeholder': 'البحث في القوائم، المشاريع، الوكلاء...',
    // App Switcher
    'app.switchApplication': 'تبديل التطبيق',
    'app.fm': 'إدارة المنشآت',
    'app.souq': 'السوق',
    'app.aqar': 'العقار',
    'app.searchableEntities': 'كيانات قابلة للبحث',
    
    // Aqar (Real Estate) Module - Extended
    'aqar.title': 'عقار سوق',
    'aqar.subtitle': 'اكتشف واستثمر في العقارات عبر المنطقة',
    'aqar.exploreMap': 'استكشف الخريطة',
    'aqar.searchProperties': 'البحث عن العقارات',
    'aqar.realEstateFeatures': 'مميزات العقارات',
    'aqar.propertyListings': 'قوائم العقارات',
    'aqar.interactiveMap': 'خريطة تفاعلية للعقارات',
    'aqar.interactiveMap.desc': 'استكشف العقارات على خريطة تفاعلية مع بيانات في الوقت الفعلي',
    'aqar.propertySearch.desc': 'بحث متقدم مع فلاتر للموقع والسعر والمميزات',
    'aqar.myListings': 'قوائمي',
    'aqar.myListings.desc': 'إدارة قوائم العقارات والاستفسارات الخاصة بك',
    'aqar.advancedFilters': 'فلاتر متقدمة',
    'aqar.advancedFilters.desc': 'فلترة العقارات حسب الموقع ونطاق السعر ونوع العقار والمزيد',
    'aqar.favorites': 'المفضلة',
    'aqar.favorites.desc': 'احفظ ونظم عقاراتك المفضلة',
    'aqar.marketTrends': 'اتجاهات السوق',
    'aqar.marketTrends.desc': 'عرض تحليل السوق واتجاهات قيمة العقارات',
    'aqar.premiumListings': 'قوائم مميزة',
    'aqar.premiumListings.desc': 'الوصول إلى قوائم العقارات المميزة الحصرية',
    'aqar.propertyDetails': 'تفاصيل العقار',
    'aqar.price': 'السعر',
    'aqar.area': 'المساحة',
    'aqar.bedrooms': 'غرف النوم',
    'aqar.bathrooms': 'الحمامات',
    'aqar.type.villa': 'فيلا',
    'aqar.type.apartment': 'شقة',
    'aqar.type.townhouse': 'تاون هاوس',
    'aqar.type.land': 'أرض',
    'aqar.type.commercial': 'تجاري',
    'aqar.filter.priceRange': 'نطاق السعر',
    'aqar.filter.apply': 'تطبيق الفلاتر',
    'aqar.filter.clear': 'مسح الفلاتر',
    'aqar.map.loading': 'جاري تحميل الخريطة...',
    'aqar.map.unavailable': 'الخريطة غير متاحة',
    'aqar.map.configError': 'خطأ في تكوين الخريطة',
    
    'common.cancel': 'إلغاء',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.create': 'إنشاء',
    'common.view': 'عرض',
    'common.add': 'إضافة',
    'common.remove': 'إزالة',
    'common.download': 'تحميل',
    'common.upload': 'رفع',
    'common.submit': 'إرسال',
    'common.submitting': 'جارٍ الإرسال...',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.warning': 'تحذير',
    'common.info': 'معلومات',
    'common.password': 'كلمة المرور',
    'common.email': 'البريد الإلكتروني',
    'common.remember': 'تذكرني',
    'common.forgotPassword': 'نسيت كلمة المرور؟',
    'common.signUp': 'إنشاء حساب',
    'common.or': 'أو',
    'common.selected': 'محدد',
    'common.ifApplicable': 'إن وجد',
    'common.quickActions': 'إجراءات سريعة',
    'common.analytics': 'التحليلات',
    'common.days': 'أيام',
    'common.settings': 'الإعدادات',
    'common.reports': 'التقارير',
    'common.filter': 'تصفية',
    'common.location': 'الموقع',
    'common.description': 'الوصف',

    // Login Page
    'login.title': 'تسجيل الدخول إلى فيكزيت',
    'login.subtitle': 'مرحباً بعودتك! الرجاء تسجيل الدخول للمتابعة',
    'login.personalEmail': 'البريد الإلكتروني الشخصي',
    'login.corporateAccount': 'حساب الشركة',
    'login.ssoLogin': 'تسجيل الدخول الموحد',
    'login.employeeNumber': 'رقم الموظف',
    'login.corporateNumber': 'رقم الشركة',
    'login.enterEmail': 'أدخل بريدك الإلكتروني',
    'login.enterEmployeeNumber': 'أدخل رقم الموظف الخاص بك',
    'login.enterPassword': 'أدخل كلمة المرور',
    'login.showPassword': 'إظهار كلمة المرور',
    'login.hidePassword': 'إخفاء كلمة المرور',
    'login.submit': 'تسجيل الدخول',
    'login.loggingIn': 'جاري تسجيل الدخول...',
    'login.noAccount': 'ليس لديك حساب؟',
    'login.createAccount': 'إنشاء حساب جديد',
    'login.corporateHelp': 'استخدم رقم الموظف وكلمة المرور. لا حاجة لرقم شركة منفصل.',
    'login.demoCredentials': 'بيانات تجريبية للدخول',
    'login.quickLogin': 'تسجيل دخول سريع',
    'login.googleLogin': 'تسجيل الدخول باستخدام Google',
    'login.appleLogin': 'تسجيل الدخول باستخدام Apple',
    'login.microsoftLogin': 'تسجيل الدخول باستخدام Microsoft',
    'login.error': 'فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.',
    'login.invalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'login.corporateDescription': 'للموظفين: استخدم رقم الموظف وكلمة المرور',
    'login.personalDescription': 'للحسابات الشخصية: استخدم البريد الإلكتروني وكلمة المرور',
    'login.propertyDesc': 'إدارة محافظ العقارات',
    'login.workOrdersDesc': 'تبسيط طلبات الصيانة',
    'login.marketplaceDesc': 'اتصل بالموردين المعتمدين',
    'login.welcomeBack': 'مرحباً بعودتك',
    'login.signInAccount': 'سجل الدخول إلى حساب فيكزيت الخاص بك',
    'login.personalEmailTab': 'البريد الإلكتروني الشخصي',
    'login.corporateAccountTab': 'حساب الشركة',
    'login.ssoLoginTab': 'تسجيل الدخول الموحد',
    'login.signingIn': 'جاري تسجيل الدخول...',
    'login.signIn': 'تسجيل الدخول',
    'login.continueWith': 'المتابعة مع',
    'login.orUseAccount': 'أو استخدم الحساب',
    'login.usePersonalEmail': 'استخدام البريد الإلكتروني الشخصي',
    'login.useCorporateAccount': 'استخدام حساب الشركة',
    'login.personalEmailAccounts': 'حسابات البريد الإلكتروني الشخصية:',
    'login.corporateAccountEmployee': 'حساب الشركة (رقم الموظف):',
    'login.employeeHash': 'الموظف #:',
    'login.backToHome': 'العودة للرئيسية',

    // Landing page
    'landing.title': 'منصة فيكزيت للمؤسسات',
    'landing.subtitle': 'حل موحد لإدارة المنشآت + السوق التجاري للعمليات العقارية الحديثة',
    'landing.hero.cta1': 'الوصول إلى فيكزيت FM',
    'landing.hero.cta2': 'فيكزيت سوق',
    'landing.hero.cta3': 'عقار فيكزيت',
    'landing.features.title': 'حل كامل لإدارة المنشآت',
    'landing.features.property.title': 'إدارة الممتلكات',
    'landing.features.property.desc': 'إدارة محفظة العقارات الخاصة بك، تتبع الإشغال، والتعامل مع العلاقات مع المستأجرين',
    'landing.features.property.cta': 'استكشف ←',
    'landing.features.workorders.title': 'أوامر العمل',
    'landing.features.workorders.desc': 'إنشاء وتعيين وتتبع طلبات الصيانة مع إدارة اتفاقية مستوى الخدمة',
    'landing.features.workorders.cta': 'استكشف ←',
    'landing.features.vendors.title': 'الموردون وطلبات العروض',
    'landing.features.vendors.desc': 'مصدر المواد، إدارة الموردين، وتبسيط المشتريات',
    'landing.features.vendors.cta': 'استكشف ←',
    'landing.features.finance.title': 'المالية والفوترة',
    'landing.features.finance.desc': 'التعامل مع الفواتير والمدفوعات وإعداد التقارير المالية',
    'landing.features.finance.cta': 'استكشف ←',
    'landing.features.crm.title': 'إدارة علاقات العملاء والمستأجرين',
    'landing.features.crm.desc': 'إدارة علاقات المستأجرين وخدمة العملاء',
    'landing.features.crm.cta': 'استكشف ←',
    'landing.features.analytics.title': 'التحليلات والتقارير',
    'landing.features.analytics.desc': 'احصل على رؤى من خلال تقارير وتحليلات شاملة',
    'landing.features.analytics.cta': 'استكشف ←',
    'landing.cta.title': 'هل أنت مستعد لتحويل إدارة منشآتك؟',
    'landing.cta.subtitle': 'انضم إلى آلاف العقارات التي تستخدم بالفعل فيكزيت لتبسيط العمليات',
    'landing.cta.button': 'ابدأ اليوم',

    // FM Module
    'fm.tabs.catalog': 'الكتالوج',
    'fm.tabs.vendors': 'الموردين',
    'fm.tabs.rfqs': 'طلبات العروض والمناقصات',
    'fm.tabs.orders': 'الطلبات وأوامر الشراء',
    'nav.fm': 'إدارة المنشآت',
    'fm.description': 'إدارة عمليات المنشآت والموردين والمشتريات',
    'common.all': 'جميع الحالات',
    'status.active': 'نشط',
    'status.pending': 'معلق',
    'status.open': 'مفتوح',
    'status.draft': 'مسودة',
    'common.export': 'تصدير',
    'common.vendors': 'مورد متاح',
    'vendor.category': 'الفئة',
    'vendor.services': 'الخدمات',
    'vendor.responseTime': 'وقت الاستجابة',
    'rfq.bids': 'عروض',
    'rfq.category': 'الفئة',
    'rfq.due': 'تاريخ الاستحقاق',
    'rfq.budget': 'الميزانية',
    'rfq.id': 'رقم طلب العرض',
    'order.po': 'أمر شراء',
    'order.vendor': 'المورد',
    'order.date': 'تاريخ الطلب',
    'order.total': 'المجموع',
    'order.items': 'العناصر',
    'order.delivery': 'تاريخ التسليم',

    // Unsaved Changes
    'unsaved.message': 'لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة دون الحفظ؟',
    'unsaved.saved': 'تم حفظ تغييراتك بنجاح.',
    'unsaved.cancelled': 'لم يتم حفظ التغييرات.',
    'unsaved.warningTitle': 'تغييرات غير محفوظة',
    'unsaved.warningMessage': 'لديك تغييرات غير محفوظة. هل تريد حفظها قبل المغادرة؟',
    'unsaved.saveChanges': 'حفظ التغييرات',
    'unsaved.discardChanges': 'تجاهل التغييرات',
    'unsaved.stayHere': 'البقاء هنا',
    'unsaved.saveTitle': 'حفظ التغييرات',
    'unsaved.saveMessage': 'هل أنت متأكد أنك تريد حفظ هذه التغييرات؟',
    'unsaved.save': 'حفظ',
    'unsaved.cancel': 'إلغاء',
    
    // Save Status Messages
    'save.success': 'تم الحفظ بنجاح',
    'save.failed': 'فشل الحفظ',
    'save.networkError': 'فشل: خطأ في الشبكة',

    // Maintenance
    'maintenance.description': 'إدارة جداول الصيانة والمهام للمعدات',
    'maintenance.tasks': 'مهام الصيانة',
    'maintenance.asset': 'الأصل',
    'maintenance.due': 'تاريخ الاستحقاق',
    'maintenance.assigned': 'مُسند إلى',

    // Orders
    'orders.pageDescription': 'إدارة أوامر الشراء وطلبات الخدمة',
    'orders.purchaseOrders': 'أوامر الشراء',
    'orders.serviceOrders': 'طلبات الخدمة',
    'orders.purchaseOrder': 'أمر شراء',
    'orders.serviceOrder': 'طلب خدمة',
    'orders.vendor': 'المورد',
    'orders.orderDate': 'تاريخ الطلب',
    'orders.total': 'المجموع',
    'orders.items': 'العناصر',
    'orders.delivery': 'تاريخ التسليم',
    'orders.service': 'الخدمة',
    'orders.amount': 'المبلغ',
    'orders.description': 'الوصف',
    'orders.location': 'الموقع',
    'orders.priority': 'الأولوية',

    // Signup Page
    'signup.title': 'إنشاء حسابك',
    'signup.subtitle': 'انضم إلى فيكزيت إنتربرايز اليوم',
    'signup.success.title': 'تم إنشاء الحساب بنجاح!',
    'signup.success.message': 'مرحباً بك في فيكزيت إنتربرايز! تم إنشاء حسابك ويمكنك الآن تسجيل الدخول.',
    'signup.success.redirecting': 'جارٍ تحويلك إلى صفحة تسجيل الدخول...',
    'signup.backToLogin': 'العودة لتسجيل الدخول',
    'signup.branding.title': 'انضم إلى فيكزيت إنتربرايز',
    'signup.branding.description': 'أنشئ حسابك وابدأ في إدارة منشآتك وعمليات السوق',
    'signup.feature.facility': 'إدارة المنشآت',
    'signup.feature.facilityDesc': 'تبسيط عملياتك',
    'signup.feature.marketplace': 'السوق',
    'signup.feature.marketplaceDesc': 'تواصل مع موردين موثوقين',
    'signup.feature.support': 'الدعم',
    'signup.feature.supportDesc': 'خدمة عملاء على مدار الساعة',
    'signup.accountType': 'نوع الحساب',
    'signup.accountType.personal': 'حساب شخصي',
    'signup.accountType.personalDesc': 'للمستخدمين الأفراد',
    'signup.accountType.corporate': 'حساب الشركات',
    'signup.accountType.corporateDesc': 'للشركات والمؤسسات',
    'signup.accountType.vendor': 'حساب مورد',
    'signup.accountType.vendorDesc': 'لمقدمي الخدمات والموردين',
    'signup.firstName': 'الاسم الأول *',
    'signup.lastName': 'الاسم الأخير *',
    'signup.email': 'البريد الإلكتروني *',
    'signup.phone': 'رقم الهاتف *',
    'signup.companyName': 'اسم الشركة *',
    'signup.password': 'كلمة المرور *',
    'signup.confirmPassword': 'تأكيد كلمة المرور *',
    'signup.placeholder.firstName': 'أدخل اسمك الأول',
    'signup.placeholder.lastName': 'أدخل اسمك الأخير',
    'signup.placeholder.email': 'أدخل بريدك الإلكتروني',
    'signup.placeholder.phone': '+966 XX XXX XXXX',
    'signup.placeholder.companyName': 'أدخل اسم شركتك',
    'signup.placeholder.password': 'أنشئ كلمة مرور قوية',
    'signup.placeholder.confirmPassword': 'أكد كلمة مرورك',
    'signup.termsAccept': 'أوافق على',
    'signup.termsOfService': 'شروط الخدمة',
    'signup.and': 'و',
    'signup.privacyPolicy': 'سياسة الخصوصية',
    'signup.newsletter': 'أرغب في تلقي التحديثات والرسائل الترويجية حول فيكزيت إنتربرايز',
    'signup.createAccount': 'إنشاء حساب',
    'signup.creatingAccount': 'جارٍ إنشاء الحساب...',
    'signup.alreadyHaveAccount': 'لديك حساب بالفعل؟',
    'signup.signInHere': 'سجل الدخول هنا',

    // Settings
    'settings.subtitle': 'إدارة إعدادات حسابك وتفضيلاتك',
    'settings.tabs.profile': 'الملف الشخصي',
    'settings.tabs.security': 'الأمان',
    'settings.tabs.notifications': 'الإشعارات',
    'settings.tabs.preferences': 'التفضيلات',
    'settings.profile.title': 'معلومات الملف الشخصي',
    'settings.profile.firstName': 'الاسم الأول',
    'settings.profile.lastName': 'الاسم الأخير',
    'settings.profile.email': 'البريد الإلكتروني',
    'settings.profile.phone': 'الهاتف',
    'settings.profile.department': 'القسم',
    'settings.profile.save': 'حفظ التغييرات',

    // Profile Page
    'profile.title': 'ملفي الشخصي',
    'profile.subtitle': 'إدارة إعدادات حسابك وتفضيلاتك',
    'profile.memberSince': 'عضو منذ',
    'profile.accountStatus': 'حالة الحساب',
    'profile.active': 'نشط',
    'profile.tabs.account': 'إعدادات الحساب',
    'profile.tabs.notifications': 'الإشعارات',
    'profile.tabs.security': 'الأمان',
    'profile.account.fullName': 'الاسم الكامل',
    'profile.account.emailAddress': 'عنوان البريد الإلكتروني',
    'profile.account.phoneNumber': 'رقم الهاتف',
    'profile.account.cancel': 'إلغاء',
    'profile.account.saveChanges': 'حفظ التغييرات',
    'profile.notifications.channels': 'قنوات الإشعارات',
    'profile.notifications.email': 'إشعارات البريد الإلكتروني',
    'profile.notifications.push': 'الإشعارات الفورية',
    'profile.notifications.sms': 'الرسائل النصية',
    'profile.notifications.events': 'إشعارات الأحداث',
    'profile.notifications.workOrders': 'تحديثات أوامر العمل',
    'profile.notifications.maintenance': 'تنبيهات الصيانة',
    'profile.notifications.invoices': 'تذكيرات الفواتير',
    'profile.notifications.savePreferences': 'حفظ التفضيلات',
    'profile.security.changePassword': 'تغيير كلمة المرور',
    'profile.security.currentPassword': 'كلمة المرور الحالية',
    'profile.security.newPassword': 'كلمة المرور الجديدة',
    'profile.security.confirmNewPassword': 'تأكيد كلمة المرور الجديدة',
    'profile.security.twoFactor': 'المصادقة الثنائية',
    'profile.security.twoFactorTitle': 'تفعيل المصادقة الثنائية',
    'profile.security.twoFactorDesc': 'أضف طبقة أمان إضافية لحسابك',
    'profile.security.updateSecurity': 'تحديث الأمان',
    'profile.quickActions': 'إجراءات سريعة',
    'profile.quickActions.systemSettings': 'إعدادات النظام',
    'profile.quickActions.systemSettingsDesc': 'تكوين تفضيلات التطبيق',
    'profile.quickActions.notificationSettings': 'إعدادات الإشعارات',
    'profile.quickActions.notificationSettingsDesc': 'إدارة التنبيهات والإشعارات',
    'profile.quickActions.securitySettings': 'إعدادات الأمان',
    'profile.quickActions.securitySettingsDesc': 'إدارة كلمة المرور والوصول',
    'settings.security.title': 'إعدادات الأمان',
    'settings.security.currentPassword': 'كلمة المرور الحالية',
    'settings.security.newPassword': 'كلمة المرور الجديدة',
    'settings.security.confirmPassword': 'تأكيد كلمة المرور',
    'settings.security.twoFactor': 'المصادقة الثنائية',
    'settings.security.twoFactorDesc': 'أضف طبقة أمان إضافية لحسابك',
    'settings.security.updatePassword': 'تحديث كلمة المرور',
    'settings.notifications.title': 'تفضيلات الإشعارات',
    'settings.notifications.email': 'البريد الإلكتروني',
    'settings.notifications.sms': 'الرسائل النصية',
    'settings.notifications.push': 'الإشعارات المنبثقة',
    'settings.notifications.workOrders': 'أوامر العمل',
    'settings.notifications.maintenance': 'الصيانة',
    'settings.notifications.reports': 'التقارير',
    'settings.notifications.save': 'حفظ التفضيلات',
    'settings.preferences.title': 'تفضيلات التطبيق',
    'settings.preferences.language': 'اللغة',
    'settings.preferences.timezone': 'المنطقة الزمنية',
    'settings.preferences.theme': 'المظهر',
    'settings.preferences.english': 'الإنجليزية',
    'settings.preferences.arabic': 'العربية',
    'settings.preferences.riyadh': 'آسيا/الرياض (GMT+3)',
    'settings.preferences.utc': 'UTC',
    'settings.preferences.light': 'فاتح',
    'settings.preferences.dark': 'داكن',
    'settings.preferences.system': 'النظام',
    'settings.preferences.save': 'حفظ التفضيلات',

    // Footer
    'footer.brand': 'فيكزيت',
    'footer.description': 'إدارة المنشآت + الأسواق في منصة واحدة.',
    'footer.company': 'الشركة',
    'footer.about': 'معلومات عنا',
    'footer.careers': 'الوظائف',
    'footer.legal': 'قانوني',
    'footer.privacy': 'الخصوصية',
    'footer.terms': 'الشروط',
    'footer.support': 'الدعم',
    'footer.help': 'مركز المساعدة',
    'footer.ticket': 'فتح تذكرة',
    'footer.backHome': 'العودة إلى الصفحة الرئيسية',
    'footer.copyright': 'فيكزيت. جميع الحقوق محفوظة.',

    // Marketplace
    'marketplace.title': 'السوق',
    'marketplace.featured': 'مميز لمؤسستك',
    'marketplace.viewAll': 'عرض الكل',
    'marketplace.searchPlaceholder': 'البحث في المنتجات والموردين...',
    'marketplace.addToCart': 'أضف إلى السلة',
    'marketplace.adding': 'جارٍ الإضافة...',
    'marketplace.outOfStock': 'نفذ من المخزون',
    'marketplace.inStock': 'متوفر',
    'marketplace.perUnit': 'لكل',
    'marketplace.minQuantity': 'الحد الأدنى',
    'marketplace.leadTime': 'وقت التسليم',
    'marketplace.days': 'يوم(أيام)',
    'marketplace.rating': 'التقييم',
    'marketplace.reviews': 'المراجعات',
    'marketplace.vendor.verified': 'مورد موثق',
    'marketplace.vendor.premium': 'مورد متميز',
    'marketplace.vendor.profile': 'ملف المورد',
    'marketplace.vendor.products': 'منتجات',
    'marketplace.vendor.uploadProduct': 'تحميل منتج',
    'marketplace.vendor.manageProducts': 'إدارة المنتجات',
    'marketplace.vendor.bulkUpload': 'تحميل جماعي',
    'marketplace.admin.margins': 'هوامش الربح',
    'marketplace.admin.vendorStatus': 'حالة المورد',
    'marketplace.admin.enable': 'تفعيل',
    'marketplace.admin.disable': 'تعطيل',
    'marketplace.admin.marginProfile': 'ملف الهامش',
    'marketplace.admin.flatRate': 'سعر ثابت',
    'marketplace.admin.percentage': 'نسبة مئوية',
    'marketplace.admin.tiered': 'متدرج',

    // Dashboard Page
    'dashboard.title': 'لوحة التحكم',
    'dashboard.welcome': 'مرحباً بعودتك',
    'dashboard.totalProperties': 'إجمالي العقارات',
    'dashboard.openWorkOrders': 'أوامر العمل المفتوحة',
    'dashboard.monthlyRevenue': 'الإيرادات الشهرية',
    'dashboard.occupancyRate': 'معدل الإشغال',
    'dashboard.recentWorkOrders': 'أوامر العمل الأخيرة',
    'dashboard.recentTransactions': 'المعاملات الأخيرة',
    'dashboard.acMaintenance': 'صيانة التكييف',
    'dashboard.propertyTowerA': 'عقار برج A',
    'dashboard.unit': 'وحدة',
    'dashboard.monthlyRent': 'إيجار شهري',
    'dashboard.tenant': 'مستأجر',
    'dashboard.statusInProgress': 'قيد التنفيذ',
    'dashboard.statusCompleted': 'مكتمل',
    'dashboard.statusPending': 'معلق',

    // Finance Page
    'finance.title': 'المالية - الفواتير',
    'finance.searchPlaceholder': 'البحث برقم/عميل',
    'finance.newInvoice': 'فاتورة جديدة',
    'finance.createInvoice': 'إنشاء فاتورة',
    'finance.issueDate': 'تاريخ الإصدار',
    'finance.dueDate': 'تاريخ الاستحقاق',
    'finance.issue': 'إصدار',
    'finance.due': 'استحقاق',
    'finance.total': 'الإجمالي',
    'finance.lines': 'السطور',
    'finance.addLine': 'إضافة سطر',
    'finance.description': 'الوصف',
    'finance.qty': 'الكمية',
    'finance.unitPrice': 'سعر الوحدة',
    'finance.vatPercent': 'ضريبة القيمة المضافة %',
    'finance.vat': 'ضريبة القيمة المضافة',
    'finance.post': 'ترحيل',
    'finance.void': 'إلغاء',
    'finance.status.draft': 'مسودة',
    'finance.status.posted': 'مرحل',
    'finance.status.void': 'ملغي',
    'finance.allProperties': 'كل العقارات',
    'finance.budgetSettings': 'إعدادات الميزانية',

    // Finance - Payments
    'finance.payment.title': 'تسجيل دفعة',
    'finance.payment.subtitle': 'تسجيل دفعة جديدة أو معاملة دخل',
    'finance.payment.recordPayment': 'تسجيل الدفعة',
    'finance.payment.details': 'تفاصيل الدفعة',
    'finance.payment.reference': 'مرجع الدفعة',
    'finance.payment.date': 'تاريخ الدفعة',
    'finance.payment.method': 'طريقة الدفع',
    'finance.payment.from': 'الدفعة من',
    'finance.payment.payerCustomer': 'الدافع/العميل',
    'finance.payment.description': 'وصف الدفعة',
    'finance.payment.descriptionPlaceholder': 'دفعة إيجار شهري، رسوم الخدمة، إلخ...',
    'finance.payment.amount': 'مبلغ الدفعة',
    'finance.payment.category': 'الفئة',
    'finance.payment.summary': 'ملخص الدفعة',
    'finance.payment.processingFee': 'رسوم المعالجة',
    'finance.payment.netAmount': 'صافي المبلغ',
    'finance.payment.recent': 'الدفعات الأخيرة',
    'finance.payment.generateReceipt': 'إصدار إيصال',
    'finance.payment.bulkEntry': 'إدخال دفعات جماعي',
    'finance.payment.templates': 'قوالب الدفعات',
    'finance.payment.selectMethod': 'اختر الطريقة',
    'finance.payment.bankTransfer': 'تحويل بنكي',
    'finance.payment.cash': 'نقدًا',
    'finance.payment.cheque': 'شيك',
    'finance.payment.creditCard': 'بطاقة ائتمان',
    'finance.payment.onlinePayment': 'دفع عبر الإنترنت',
    'finance.payment.selectPayer': 'اختر الدافع',
    'finance.payment.rentPayment': 'دفعة إيجار',
    'finance.payment.serviceFee': 'رسوم الخدمة',
    'finance.payment.securityDeposit': 'تأمين',
    'finance.payment.lateFee': 'رسوم التأخير',
    'finance.payment.otherIncome': 'دخل آخر',

    // Finance - Expenses
    'finance.expense.title': 'مصروف جديد',
    'finance.expense.subtitle': 'تسجيل مصروف تجاري جديد أو تكلفة',
    'finance.expense.recordExpense': 'تسجيل المصروف',
    'finance.expense.details': 'تفاصيل المصروف',
    'finance.expense.reference': 'مرجع المصروف',
    'finance.expense.date': 'تاريخ المصروف',
    'finance.expense.category': 'فئة المصروف',
    'finance.expense.information': 'معلومات المصروف',
    'finance.expense.description': 'الوصف',
    'finance.expense.descriptionPlaceholder': 'وصف موجز للمصروف...',
    'finance.expense.vendorSupplier': 'المورد/المزود',
    'finance.expense.amountPayment': 'المبلغ والدفع',
    'finance.expense.summary': 'ملخص المصروف',
    'finance.expense.budgetStatus': 'حالة الميزانية',
    'finance.expense.recent': 'المصروفات الأخيرة',
    'finance.expense.viewBudget': 'عرض الميزانية',
    'finance.expense.bulkEntry': 'إدخال مصروفات جماعي',
    'finance.expense.templates': 'قوالب المصروفات',
    'finance.expense.selectCategory': 'اختر الفئة',
    'finance.expense.maintenance': 'الصيانة والإصلاحات',
    'finance.expense.utilities': 'المرافق',
    'finance.expense.officeSupplies': 'مستلزمات المكتب',
    'finance.expense.equipment': 'المعدات',
    'finance.expense.insurance': 'التأمين',
    'finance.expense.professional': 'الخدمات المهنية',
    'finance.expense.marketing': 'التسويق',
    'finance.expense.travel': 'السفر والنقل',
    'finance.expense.other': 'أخرى',
    'finance.expense.selectVendor': 'اختر المورد',
    'finance.expense.maintenanceBudget': 'ميزانية الصيانة',
    'finance.expense.utilitiesBudget': 'ميزانية المرافق',

    // Finance - Common
    'finance.receiptDocumentation': 'الإيصال والوثائق',
    'finance.uploadReceipt': 'تحميل إيصال أو مستند داعم',
    'finance.uploadInvoice': 'تحميل إيصال أو فاتورة',
    'finance.chooseFile': 'اختر ملف',
    'finance.currency': 'العملة',
    'finance.notes': 'الملاحظات',
    'finance.notesPlaceholder': 'ملاحظات إضافية...',
    'finance.amount': 'المبلغ',
    'finance.paymentMethod': 'طريقة الدفع',
    'finance.recentActivity': 'النشاط الأخير',
    'finance.formAutoSaved': 'تم الحفظ التلقائي للنموذج',
    'finance.selectProperty': 'اختر العقار',
    
    // Admin - CMS
    'admin.cms.title': 'صفحات نظام إدارة المحتوى',
    'admin.cms.slug': 'المعرف (مثل privacy)',
    'admin.cms.titleLabel': 'العنوان',
    'admin.cms.content': 'محتوى Markdown...',
    'admin.cms.draft': 'مسودة',
    'admin.cms.published': 'منشور',
    
    // Properties - Leases
    'properties.leases.title': 'إدارة عقود الإيجار',
    'properties.leases.subtitle': 'إدارة عقود الإيجار واتفاقيات الإيجار',
    'properties.leases.templates': 'قوالب العقود',
    'properties.leases.newLease': 'عقد إيجار جديد',
    'properties.leases.activeLeases': 'العقود النشطة',
    'properties.leases.expiringSoon': 'تنتهي قريبًا',
    'properties.leases.monthlyRevenue': 'الإيرادات الشهرية',
    'properties.leases.avgLeaseTerm': 'متوسط مدة العقد',
    'properties.leases.months': 'شهر',
    'properties.leases.allProperties': 'جميع العقارات',
    'properties.leases.allTypes': 'جميع الأنواع',
    'properties.leases.allStatus': 'جميع الحالات',
    'properties.leases.residential': 'سكني',
    'properties.leases.commercial': 'تجاري',
    'properties.leases.active': 'نشط',
    'properties.leases.expired': 'منتهي',
    'properties.leases.vacant': 'شاغر',
    'properties.leases.overview': 'نظرة عامة على العقود',
    'properties.leases.leaseId': 'رقم العقد',
    'properties.leases.unit': 'الوحدة',
    'properties.leases.tenant': 'المستأجر',
    'properties.leases.type': 'النوع',
    'properties.leases.startDate': 'تاريخ البدء',
    'properties.leases.endDate': 'تاريخ الانتهاء',
    'properties.leases.monthlyRent': 'الإيجار الشهري',
    'properties.leases.leaseStatus': 'حالة العقد',
    'properties.leases.paymentStatus': 'حالة الدفع',
    'properties.leases.actions': 'الإجراءات',
    'properties.leases.paid': 'مدفوع',
    'properties.leases.pending': 'معلق',
    'properties.leases.overdue': 'متأخر',
    'properties.leases.na': 'غير متاح',
    'properties.leases.renew': 'تجديد',
    'properties.leases.contact': 'اتصال',
    'properties.leases.upcomingRenewals': 'التجديدات القادمة',
    'properties.leases.expires': 'ينتهي',
    'properties.leases.renewals': 'التجديدات',
    'properties.leases.rentCollection': 'تحصيل الإيجار',
      'properties.leases.available': 'متاح',

      // FM Module - Properties
      'fm.properties.title': 'إدارة العقارات',
      'fm.properties.subtitle': 'محفظة العقارات وإدارة المستأجرين',
      'fm.properties.newProperty': 'عقار جديد',
      'fm.properties.addProperty': 'إضافة عقار',
      'fm.properties.searchProperties': 'البحث عن العقارات...',
      'fm.properties.propertyType': 'نوع العقار',
      'fm.properties.allTypes': 'جميع الأنواع',
      'fm.properties.residential': 'سكني',
      'fm.properties.commercial': 'تجاري',
      'fm.properties.industrial': 'صناعي',
      'fm.properties.mixedUse': 'متعدد الاستخدامات',
      'fm.properties.land': 'أرض',
      'fm.properties.viewMap': 'عرض الخريطة',
      'fm.properties.noProperties': 'لا توجد عقارات',
      'fm.properties.noPropertiesText': 'ابدأ بإضافة أول عقار إلى المحفظة.',
      'fm.properties.totalArea': 'المساحة الإجمالية',
      'fm.properties.units': 'الوحدات',
      'fm.properties.occupancy': 'نسبة الإشغال',
      'fm.properties.monthlyRent': 'الإيجار الشهري',
      'fm.properties.status': 'الحالة',
      'fm.properties.active': 'نشط',
      'fm.properties.na': 'غ/م',
      'fm.properties.tenants': 'المستأجرون',
      'fm.properties.propertyName': 'اسم العقار',
      'fm.properties.type': 'النوع',
      'fm.properties.description': 'الوصف',
      'fm.properties.streetAddress': 'عنوان الشارع',
      'fm.properties.city': 'المدينة',
      'fm.properties.region': 'المنطقة',
      'fm.properties.postalCode': 'الرمز البريدي',
      'fm.properties.builtArea': 'المساحة المبنية',
      'fm.properties.bedrooms': 'غرف النوم',
      'fm.properties.bathrooms': 'الحمامات',
      'fm.properties.floors': 'الطوابق',
      'fm.properties.createProperty': 'إنشاء عقار',
      'fm.properties.selectType': 'اختر النوع',

      // FM Module - Tenants
      'fm.tenants.title': 'إدارة المستأجرين',
      'fm.tenants.subtitle': 'إدارة العلاقات مع العملاء والعقود',
      'fm.tenants.newTenant': 'مستأجر جديد',
      'fm.tenants.addTenant': 'إضافة مستأجر',
      'fm.tenants.searchTenants': 'البحث عن المستأجرين...',
      'fm.tenants.tenantType': 'نوع المستأجر',
      'fm.tenants.individual': 'فرد',
      'fm.tenants.company': 'شركة',
      'fm.tenants.government': 'حكومي',
      'fm.tenants.noTenants': 'لا يوجد مستأجرون',
      'fm.tenants.noTenantsText': 'ابدأ بإضافة أول مستأجر.',
      'fm.tenants.properties': 'العقارات',
      'fm.tenants.leaseStatus': 'حالة العقد',
      'fm.tenants.noActiveLeases': 'لا توجد عقود نشطة',
      'fm.tenants.outstandingBalance': 'الرصيد المستحق',
      'fm.tenants.tenantName': 'اسم المستأجر',
      'fm.tenants.primaryContactName': 'اسم جهة الاتصال الرئيسية',
      'fm.tenants.email': 'البريد الإلكتروني',
      'fm.tenants.phone': 'الهاتف',
      'fm.tenants.mobile': 'الجوال',
      'fm.tenants.createTenant': 'إنشاء مستأجر',

      // FM Module - Vendors
      'fm.vendors.title': 'إدارة الموردين',
      'fm.vendors.subtitle': 'شبكة الموردين وإدارة الأداء',
      'fm.vendors.newVendor': 'مورد جديد',
      'fm.vendors.addVendor': 'إضافة مورد',
      'fm.vendors.searchVendors': 'البحث عن الموردين...',
      'fm.vendors.vendorType': 'نوع المورد',
      'fm.vendors.supplier': 'مورد',
      'fm.vendors.contractor': 'مقاول',
      'fm.vendors.serviceProvider': 'مقدم خدمة',
      'fm.vendors.consultant': 'استشاري',
      'fm.vendors.pending': 'معلق',
      'fm.vendors.approved': 'موافق عليه',
      'fm.vendors.suspended': 'معلق',
      'fm.vendors.rejected': 'مرفوض',
      'fm.vendors.blacklisted': 'في القائمة السوداء',
      'fm.vendors.noVendors': 'لا يوجد موردون',
      'fm.vendors.noVendorsText': 'ابدأ بإضافة أول مورد إلى الشبكة.',
      'fm.vendors.successRate': 'معدل النجاح',
      'fm.vendors.responseTime': 'وقت الاستجابة',
      'fm.vendors.specializations': 'التخصصات',
      'fm.vendors.projects': 'المشاريع',
      'fm.vendors.companyName': 'اسم الشركة',
      'fm.vendors.contactName': 'اسم جهة الاتصال',
      'fm.vendors.createVendor': 'إنشاء مورد',

      // FM Module - Invoices
      'fm.invoices.title': 'الفواتير',
      'fm.invoices.subtitle': 'الفوترة الإلكترونية المتوافقة مع هيئة الزكاة والضريبة مع رموز QR',
      'fm.invoices.newInvoice': 'فاتورة جديدة',
      'fm.invoices.createInvoice': 'إنشاء فاتورة',
      'fm.invoices.searchInvoices': 'البحث برقم الفاتورة أو العميل...',
      'fm.invoices.totalOutstanding': 'إجمالي المستحق',
      'fm.invoices.overdue': 'متأخر',
      'fm.invoices.pending': 'معلق',
      'fm.invoices.paidThisMonth': 'مدفوع هذا الشهر',
      'fm.invoices.draft': 'مسودة',
      'fm.invoices.sent': 'مرسل',
      'fm.invoices.viewed': 'تم العرض',
      'fm.invoices.paid': 'مدفوع',
      'fm.invoices.cancelled': 'ملغى',
      'fm.invoices.noInvoices': 'لا توجد فواتير',
      'fm.invoices.noInvoicesText': 'ابدأ بإنشاء أول فاتورة.',
      'fm.invoices.issueDate': 'تاريخ الإصدار',
      'fm.invoices.dueDate': 'تاريخ الاستحقاق',
      'fm.invoices.overdueDays': 'يوم تأخير',
      'fm.invoices.items': 'عناصر',
      'fm.invoices.invoiceType': 'نوع الفاتورة',
      'fm.invoices.sales': 'مبيعات',
      'fm.invoices.purchase': 'شراء',
      'fm.invoices.rental': 'إيجار',
      'fm.invoices.service': 'خدمة',
      'fm.invoices.maintenance': 'صيانة',
      'fm.invoices.currency': 'العملة',
      'fm.invoices.customerInfo': 'معلومات العميل',
      'fm.invoices.customerName': 'اسم العميل',
      'fm.invoices.taxId': 'الرقم الضريبي',
      'fm.invoices.lineItems': 'بنود الفاتورة',
      'fm.invoices.description': 'الوصف',
      'fm.invoices.quantity': 'الكمية',
      'fm.invoices.unitPrice': 'سعر الوحدة',
      'fm.invoices.vat': 'ضريبة القيمة المضافة',
      'fm.invoices.addLineItem': 'إضافة بند',    // Product Page
    'product.notFound': 'غير موجود',
    'product.brand': 'العلامة التجارية',
    'product.standards': 'المعايير',
    'product.uom': 'وحدة القياس',
    'product.minQty': 'الحد الأدنى للكمية',
    'product.inStock': 'متوفر في المخزون',
    'product.backorder': 'طلب مسبق',
    'product.lead': 'مدة التوصيل',
    'product.days': 'أيام',
    'product.addToCart': 'إضافة إلى السلة',
    'product.buyNow': 'اشتر الآن (أمر شراء)',
    'product.aboutTitle': 'عن هذا المنتج',
    'product.aboutDesc': 'أوراق البيانات الفنية (MSDS/COA)، ملاحظات التركيب، ومعلومات الامتثال.',

    // Work Orders Common
    'workOrders.filter': 'تصفية',
    'workOrders.export': 'تصدير',
    'workOrders.quickActions': 'إجراءات سريعة',
    'workOrders.reports': 'التقارير',
    'workOrders.settings': 'الإعدادات',
    'workOrders.pending': 'قيد الانتظار',
    'workOrders.inProgress': 'قيد التنفيذ',
    'workOrders.scheduled': 'مجدول',
    'workOrders.completed': 'مكتمل',
    'workOrders.woId': 'رقم أمر العمل',
    'workOrders.title': 'العنوان',
    'workOrders.property': 'العقار',
    'workOrders.status': 'الحالة',
    
    // Work Orders - Approvals
    'workOrders.approvals.title': 'موافقات أوامر العمل',
    'workOrders.approvals.subtitle': 'مراجعة والموافقة على أوامر العمل التي تتطلب تفويضاً',
    'workOrders.approvals.rules': 'قواعد الموافقة',
    'workOrders.approvals.bulkApprove': '📋 موافقة جماعية',
    'workOrders.approvals.pendingApproval': 'في انتظار الموافقة',
    'workOrders.approvals.approvedToday': 'تمت الموافقة اليوم',
    'workOrders.approvals.avgTime': 'متوسط وقت الموافقة',
    'workOrders.approvals.totalApproved': 'إجمالي الموافقات',
    'workOrders.approvals.pending': 'الموافقات المعلقة',
    'workOrders.approvals.recent': 'الموافقات الأخيرة',
    'workOrders.approvals.viewAll': 'عرض الكل',
    'workOrders.approvals.approvedBy': 'تمت الموافقة بواسطة',
    'workOrders.approvals.approvalDate': 'تاريخ الموافقة',
    'workOrders.approvals.estimatedCost': 'التكلفة المقدرة',
    'workOrders.approvals.actualCost': 'التكلفة الفعلية',
    'workOrders.approvals.workflow': 'سير العمل',
    
    // Work Orders - Board
    'workOrders.board.title': 'لوحة أوامر العمل',
    'workOrders.board.subtitle': 'تتبع وتعيين أوامر العمل عبر جميع العقارات',
    'workOrders.board.description': 'تتبع وتعيين أوامر العمل عبر جميع العقارات',
    'workOrders.board.newWO': '+ أمر عمل جديد',
    'workOrders.board.noCompleted': 'لا توجد أوامر عمل مكتملة',
    'workOrders.board.createWO': 'إنشاء أمر عمل',
    'workOrders.board.assignTech': 'تعيين فني',
    'workOrders.board.schedule': 'جدولة',
    
    // Work Orders - History
    'workOrders.history.title': 'سجل أوامر العمل',
    'workOrders.history.subtitle': 'عرض أوامر العمل المكتملة وسجل الخدمة',
    'workOrders.history.exportReport': 'تصدير التقرير',
    'workOrders.history.totalCompleted': 'إجمالي المكتمل',
    'workOrders.history.avgTime': 'متوسط وقت الإنجاز',
    'workOrders.history.costSavings': 'توفير التكاليف',
    'workOrders.history.view': 'عرض',
    'workOrders.history.invoice': 'فاتورة',
    
    // Work Orders - PM
    'workOrders.pm.title': 'الصيانة الوقائية',
    'workOrders.pm.subtitle': 'جدولة وتتبع مهام الصيانة الوقائية',
    'workOrders.pm.importSchedule': 'استيراد الجدول',
    'workOrders.pm.newPM': '+ جدول صيانة وقائية جديد',
    'workOrders.pm.activeSchedules': 'الجداول النشطة',
    'workOrders.pm.thisMonth': 'هذا الشهر',
    'workOrders.pm.upcomingTasks': 'المهام القادمة',
    'workOrders.pm.frequency': 'التكرار',
    'workOrders.pm.nextDue': 'الموعد التالي',
    'workOrders.pm.lastCompleted': 'آخر إنجاز',
    'workOrders.pm.complete': 'إكمال',
    
    // Work Orders - New
    'workOrders.new.title': 'أمر عمل جديد',
    'workOrders.new.subtitle': 'إنشاء أمر عمل جديد للصيانة أو الخدمات',
    'workOrders.new.titlePlaceholder': 'أدخل عنوان أمر العمل...',
    'workOrders.new.locationPlaceholder': 'رقم الوحدة أو الموقع المحدد...',
    'workOrders.new.descriptionPlaceholder': 'اوصف المشكلة أو العمل المطلوب...',
    'workOrders.new.basicInfo': 'المعلومات الأساسية',
    'workOrders.new.propertyLocation': 'العقار والموقع',
    'workOrders.new.assignmentScheduling': 'التعيين والجدولة',
    
    // Work Orders - Priority
    'workOrders.priority': 'الأولوية',
    'workOrders.selectPriority': 'اختر الأولوية',
    'workOrders.priority.p1': 'P1 - حرج',
    'workOrders.priority.p2': 'P2 - عالي',
    'workOrders.priority.p3': 'P3 - متوسط',
    'workOrders.priority.p4': 'P4 - منخفض',
    
    // Work Orders - Common Fields
    'common.property': 'العقار',
    'common.selectProperty': 'اختر العقار',
    'workOrders.assignTo': 'تعيين إلى',
    'workOrders.selectTechnician': 'اختر الفني',
    'common.dueDate': 'تاريخ الاستحقاق',
    
    // Work Orders - Attachments & Actions
    'workOrders.attachments': 'المرفقات',
    'workOrders.dropFiles': 'أسقط الملفات هنا أو انقر للتحميل',
    'common.chooseFiles': 'اختر الملفات',
    'workOrders.createFromTemplate': 'إنشاء من قالب',
    'workOrders.emergencyContact': 'اتصال طوارئ',
    'workOrders.costCalculator': 'حاسبة التكلفة',
    
    // Work Orders - Recent Activity
    'workOrders.recentActivity': 'النشاط الأخير',
    'workOrders.formAutoSaved': 'تم الحفظ التلقائي للنموذج',
    'workOrders.propertySelected': 'تم اختيار العقار',
  },
  en: {
      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.work-orders': 'Work Orders',
      'nav.properties': 'Properties',
      'nav.assets': 'Assets',
      'nav.tenants': 'Tenants',
      'nav.vendors': 'Vendors',
      'nav.projects': 'Projects',
      'nav.rfqs': 'RFQs & Bids',
      'nav.invoices': 'Invoices',
      'nav.finance': 'Finance',
      'nav.hr': 'Human Resources',
      'nav.crm': 'CRM',
      'nav.support': 'Support',
      'nav.compliance': 'Compliance',
      'nav.reports': 'Reports',
      'nav.system': 'System',
      'nav.administration': 'Administration',
      'nav.marketplace': 'Marketplace',
      'nav.maintenance': 'Maintenance',
      'nav.orders': 'Orders',
      'nav.notifications': 'Notifications',
      'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.preferences': 'Preferences',

    // Sidebar
    'sidebar.role': 'Role',
    'sidebar.planLabel': 'Plan',
    'sidebar.account': 'Account',
    'sidebar.help': 'Help',
    'sidebar.helpCenter': 'Help Center',

    // Common
    'common.search': 'Search',
    'common.search.placeholder': 'Search Work Orders, Properties, Tenants...',
    'i18n.filterLanguages': 'Type to filter languages',
    'i18n.filterCurrencies': 'Type to filter currencies',
    'i18n.selectLanguageLabel': 'Select language',
    'i18n.selectCurrencyLabel': 'Select currency',
    'a11y.currencySelectorHelp': 'Use arrow keys to navigate, Enter to select, Esc to close',
    'common.login': 'Login',
    'common.logout': 'Logout',
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.unsavedChanges': 'Unsaved Changes',
    'common.unsavedChangesMessage': 'You have unsaved changes. Do you want to save them before leaving?',
    'common.saveAndContinue': 'Save & Continue',
    'common.discard': 'Discard',
    'common.preferences': 'Preferences',
    'common.brand': 'FIXZIT ENTERPRISE',
    'common.unread': 'unread',
    'common.noNotifications': 'No new notifications',
    'common.allCaughtUp': "You're all caught up!",
    'common.viewAll': 'View all notifications',
    // TopBar search placeholders
    'souq.search.placeholder': 'Search catalog, vendors, RFQs, orders…',
    'aqar.search.placeholder': 'Search listings, projects, agents…',
    // App Switcher
    'app.switchApplication': 'Switch Application',
    'app.fm': 'Facility Management',
    'app.souq': 'Marketplace',
    'app.aqar': 'Real Estate',
    'app.searchableEntities': 'searchable entities',
    
    // Aqar (Real Estate) Module - Extended
    'aqar.title': 'Aqar Souq',
    'aqar.subtitle': 'Discover and invest in real estate properties across the region',
    'aqar.exploreMap': 'Explore Map',
    'aqar.searchProperties': 'Search Properties',
    'aqar.realEstateFeatures': 'Real Estate Features',
    'aqar.propertyListings': 'Property Listings',
    'aqar.interactiveMap': 'Interactive Property Map',
    'aqar.interactiveMap.desc': 'Explore properties on an interactive map with real-time data',
    'aqar.propertySearch.desc': 'Advanced search with filters for location, price, and features',
    'aqar.myListings': 'My Listings',
    'aqar.myListings.desc': 'Manage your property listings and inquiries',
    'aqar.advancedFilters': 'Advanced Filters',
    'aqar.advancedFilters.desc': 'Filter properties by location, price range, property type, and more',
    'aqar.favorites': 'Favorites',
    'aqar.favorites.desc': 'Save and organize your favorite properties',
    'aqar.marketTrends': 'Market Trends',
    'aqar.marketTrends.desc': 'View market analysis and property value trends',
    'aqar.premiumListings': 'Premium Listings',
    'aqar.premiumListings.desc': 'Access exclusive premium property listings',
    'aqar.propertyDetails': 'Property Details',
    'aqar.price': 'Price',
    'aqar.area': 'Area',
    'aqar.bedrooms': 'Bedrooms',
    'aqar.bathrooms': 'Bathrooms',
    'aqar.type.villa': 'Villa',
    'aqar.type.apartment': 'Apartment',
    'aqar.type.townhouse': 'Townhouse',
    'aqar.type.land': 'Land',
    'aqar.type.commercial': 'Commercial',
    'aqar.filter.priceRange': 'Price Range',
    'aqar.filter.apply': 'Apply Filters',
    'aqar.filter.clear': 'Clear Filters',
    'aqar.map.loading': 'Loading map...',
    'aqar.map.unavailable': 'Map Unavailable',
    'aqar.map.configError': 'Map configuration error',
    
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.create': 'Create',
    'common.view': 'View',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.submit': 'Submit',
    'common.submitting': 'Submitting...',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    'common.password': 'Password',
    'common.email': 'Email',
    'common.forgotPassword': 'Forgot password?',
    'common.signUp': 'Sign up',
    'common.or': 'OR',
    'common.selected': 'Selected',
    'common.ifApplicable': 'If applicable',
    'common.quickActions': 'Quick Actions',
    'common.analytics': 'Analytics',
    'common.days': 'days',
    'common.settings': 'Settings',
    'common.reports': 'Reports',
    'common.filter': 'Filter',
    'common.location': 'Location',
    'common.description': 'Description',

    // Login Page
    'login.title': 'Login to Fixzit',
    'login.subtitle': 'Welcome back! Please login to continue',
    'login.personalEmail': 'Personal Email',
    'login.corporateAccount': 'Corporate Account',
    'login.ssoLogin': 'SSO Login',
    'login.employeeNumber': 'Employee Number',
    'login.corporateNumber': 'Corporate Number',
    'login.enterEmail': 'Enter your personal email',
    'login.enterEmployeeNumber': 'Enter your employee number',
    'login.enterPassword': 'Enter your password',
    'login.showPassword': 'Show password',
    'login.hidePassword': 'Hide password',
    'login.submit': 'Login',
    'login.loggingIn': 'Logging in...',
    'login.noAccount': "Don't have an account?",
    'login.createAccount': 'Create new account',
    'login.corporateHelp': 'Use your employee number and password. No separate corporate ID needed.',
    'login.demoCredentials': 'Demo Login Credentials',
    'login.quickLogin': 'Quick Login',
    'login.googleLogin': 'Login with Google',
    'login.appleLogin': 'Login with Apple',
    'login.microsoftLogin': 'Login with Microsoft',
    'login.error': 'Login failed. Please check your credentials.',
    'login.invalidCredentials': 'Invalid email or password',
    'login.corporateDescription': 'For employees: Use your employee number and password',
    'login.personalDescription': 'For personal accounts: Use your email and password',
    'login.propertyDesc': 'Manage real estate portfolios',
    'login.workOrdersDesc': 'Streamline maintenance requests',
    'login.marketplaceDesc': 'Connect with verified vendors',
    'login.welcomeBack': 'Welcome Back',
    'login.signInAccount': 'Sign in to your Fixzit account',
    'login.personalEmailTab': 'Personal Email',
    'login.corporateAccountTab': 'Corporate Account',
    'login.ssoLoginTab': 'SSO Login',
    'login.signingIn': 'Signing in...',
    'login.signIn': 'Sign In',
    'login.continueWith': 'Continue with',
    'login.orUseAccount': 'Or use account',
    'login.usePersonalEmail': 'Use Personal Email',
    'login.useCorporateAccount': 'Use Corporate Account',
    'login.personalEmailAccounts': 'Personal Email Accounts:',
    'login.corporateAccountEmployee': 'Corporate Account (Employee Number):',
    'login.employeeHash': 'Employee #:',
    'login.backToHome': 'Back to Home',

    // Signup Page
    'signup.title': 'Create Your Account',
    'signup.subtitle': 'Join Fixzit Enterprise today',
    'signup.success.title': 'Account Created Successfully!',
    'signup.success.message': 'Welcome to Fixzit Enterprise! Your account has been created and you can now sign in.',
    'signup.success.redirecting': 'Redirecting you to the login page...',
    'signup.backToLogin': 'Back to Login',
    'signup.branding.title': 'Join Fixzit Enterprise',
    'signup.branding.description': 'Create your account and start managing your facilities and marketplace operations',
    'signup.feature.facility': 'Facility Management',
    'signup.feature.facilityDesc': 'Streamline your operations',
    'signup.feature.marketplace': 'Marketplace',
    'signup.feature.marketplaceDesc': 'Connect with trusted vendors',
    'signup.feature.support': 'Support',
    'signup.feature.supportDesc': '24/7 customer service',
    'signup.accountType': 'Account Type',
    'signup.accountType.personal': 'Personal Account',
    'signup.accountType.personalDesc': 'For individual users',
    'signup.accountType.corporate': 'Corporate Account',
    'signup.accountType.corporateDesc': 'For businesses and organizations',
    'signup.accountType.vendor': 'Vendor Account',
    'signup.accountType.vendorDesc': 'For service providers and suppliers',
    'signup.firstName': 'First Name *',
    'signup.lastName': 'Last Name *',
    'signup.email': 'Email Address *',
    'signup.phone': 'Phone Number *',
    'signup.companyName': 'Company Name *',
    'signup.password': 'Password *',
    'signup.confirmPassword': 'Confirm Password *',
    'signup.placeholder.firstName': 'Enter your first name',
    'signup.placeholder.lastName': 'Enter your last name',
    'signup.placeholder.email': 'Enter your email address',
    'signup.placeholder.phone': '+966 XX XXX XXXX',
    'signup.placeholder.companyName': 'Enter your company name',
    'signup.placeholder.password': 'Create a strong password',
    'signup.placeholder.confirmPassword': 'Confirm your password',
    'signup.termsAccept': 'I agree to the',
    'signup.termsOfService': 'Terms of Service',
    'signup.and': 'and',
    'signup.privacyPolicy': 'Privacy Policy',
    'signup.newsletter': 'I\'d like to receive updates and promotional emails about Fixzit Enterprise',
    'signup.createAccount': 'Create Account',
    'signup.creatingAccount': 'Creating Account...',
    'signup.alreadyHaveAccount': 'Already have an account?',
    'signup.signInHere': 'Sign in here',

    // Profile Page
    'profile.title': 'My Profile',
    'profile.subtitle': 'Manage your account settings and preferences',
    'profile.memberSince': 'Member Since',
    'profile.accountStatus': 'Account Status',
    'profile.active': 'Active',
    'profile.tabs.account': 'Account Settings',
    'profile.tabs.notifications': 'Notifications',
    'profile.tabs.security': 'Security',
    'profile.account.fullName': 'Full Name',
    'profile.account.emailAddress': 'Email Address',
    'profile.account.phoneNumber': 'Phone Number',
    'profile.account.cancel': 'Cancel',
    'profile.account.saveChanges': 'Save Changes',
    'profile.notifications.channels': 'Notification Channels',
    'profile.notifications.email': 'Email Notifications',
    'profile.notifications.push': 'Push Notifications',
    'profile.notifications.sms': 'SMS Notifications',
    'profile.notifications.events': 'Event Notifications',
    'profile.notifications.workOrders': 'Work Order Updates',
    'profile.notifications.maintenance': 'Maintenance Alerts',
    'profile.notifications.invoices': 'Invoice Reminders',
    'profile.notifications.savePreferences': 'Save Preferences',
    'profile.security.changePassword': 'Change Password',
    'profile.security.currentPassword': 'Current Password',
    'profile.security.newPassword': 'New Password',
    'profile.security.confirmNewPassword': 'Confirm New Password',
    'profile.security.twoFactor': 'Two-Factor Authentication',
    'profile.security.twoFactorTitle': 'Enable 2FA',
    'profile.security.twoFactorDesc': 'Add an extra layer of security to your account',
    'profile.security.updateSecurity': 'Update Security',
    'profile.quickActions': 'Quick Actions',
    'profile.quickActions.systemSettings': 'System Settings',
    'profile.quickActions.systemSettingsDesc': 'Configure application preferences',
    'profile.quickActions.notificationSettings': 'Notification Settings',
    'profile.quickActions.notificationSettingsDesc': 'Manage alerts and notifications',
    'profile.quickActions.securitySettings': 'Security Settings',
    'profile.quickActions.securitySettingsDesc': 'Password and access management',

    // Landing page
    'landing.title': 'Fixzit Enterprise Platform',
    'landing.subtitle': 'Unified Facility Management + Marketplace Solution for modern property operations',
    'landing.hero.cta1': 'Access Fixzit FM',
    'landing.hero.cta2': 'Fixzit Souq',
    'landing.hero.cta3': 'Aqar Real Estate',
    'landing.features.title': 'Complete Facility Management Solution',
    'landing.features.property.title': 'Property Management',
    'landing.features.property.desc': 'Manage your real estate portfolio, track occupancy, and handle tenant relations',
    'landing.features.property.cta': 'Explore →',
    'landing.features.workorders.title': 'Work Orders',
    'landing.features.workorders.desc': 'Create, assign, and track maintenance requests with SLA management',
    'landing.features.workorders.cta': 'Explore →',
    'landing.features.vendors.title': 'Vendors & RFQs',
    'landing.features.vendors.desc': 'Source materials, manage vendors, and streamline procurement',
    'landing.features.vendors.cta': 'Explore →',
    'landing.features.finance.title': 'Finance & Billing',
    'landing.features.finance.desc': 'Handle invoicing, payments, and financial reporting',
    'landing.features.finance.cta': 'Explore →',
    'landing.features.crm.title': 'CRM & Tenants',
    'landing.features.crm.desc': 'Manage tenant relationships and customer service',
    'landing.features.crm.cta': 'Explore →',
    'landing.features.analytics.title': 'Analytics & Reports',
    'landing.features.analytics.desc': 'Gain insights with comprehensive reporting and analytics',
    'landing.features.analytics.cta': 'Explore →',
    'landing.cta.title': 'Ready to transform your facility management?',
    'landing.cta.subtitle': 'Join thousands of properties already using Fixzit to streamline operations',
    'landing.cta.button': 'Get Started Today',

    // FM Module
    'fm.tabs.catalog': 'Catalog',
    'fm.tabs.vendors': 'Vendors',
    'fm.tabs.rfqs': 'RFQs & Bids',
    'fm.tabs.orders': 'Orders & POs',
    'nav.fm': 'Facility Management',
    'fm.description': 'Manage your facility operations, vendors, and procurement',
    'common.all': 'All Status',
    'status.active': 'Active',
    'status.pending': 'Pending',
    'status.open': 'Open',
    'status.draft': 'Draft',
    'common.export': 'Export',
    'common.vendors': 'vendors available',
    'vendor.category': 'Category',
    'vendor.services': 'Services',
    'vendor.responseTime': 'Response Time',
    'rfq.bids': 'bids',
    'rfq.category': 'Category',
    'rfq.due': 'Due',
    'rfq.budget': 'Budget',
    'rfq.id': 'RFQ ID',
    'order.po': 'PO',
    'order.vendor': 'Vendor',
    'order.date': 'Order Date',
    'order.total': 'Total',
    'order.items': 'Items',
    'order.delivery': 'Delivery',

    // Unsaved Changes
    'unsaved.message': 'You have unsaved changes. Are you sure you want to leave without saving?',
    'unsaved.saved': 'Your changes have been saved successfully.',
    'unsaved.cancelled': 'Changes were not saved.',
    'unsaved.warningTitle': 'Unsaved Changes',
    'unsaved.warningMessage': 'You have unsaved changes. Would you like to save them before leaving?',
    'unsaved.saveChanges': 'Save Changes',
    'unsaved.discardChanges': 'Discard Changes',
    'unsaved.stayHere': 'Stay Here',
    'unsaved.saveTitle': 'Save Changes',
    'unsaved.saveMessage': 'Are you sure you want to save these changes?',
    'unsaved.save': 'Save',
    'unsaved.cancel': 'Cancel',
    
    // Save Status Messages
    'save.success': 'Saved successfully',
    'save.failed': 'Save failed',
    'save.networkError': 'Failed: network error',

    // Maintenance
    'maintenance.description': 'Manage equipment maintenance schedules and tasks',
    'maintenance.tasks': 'Maintenance Tasks',
    'maintenance.asset': 'Asset',
    'maintenance.due': 'Due',
    'maintenance.assigned': 'Assigned to',

    // Orders
    'orders.pageDescription': 'Manage purchase orders and service orders',
    'orders.purchaseOrders': 'Purchase Orders',
    'orders.serviceOrders': 'Service Orders',
    'orders.purchaseOrder': 'PO',
    'orders.serviceOrder': 'SO',
    'orders.vendor': 'Vendor',
    'orders.orderDate': 'Order Date',
    'orders.total': 'Total',
    'orders.items': 'Items',
    'orders.delivery': 'Delivery',
    'orders.service': 'Service',
    'orders.amount': 'Amount',
    'orders.description': 'Description',
    'orders.location': 'Location',
    'orders.priority': 'Priority',

    // Settings
    'settings.subtitle': 'Manage your account settings and preferences',
    'settings.tabs.profile': 'Profile',
    'settings.tabs.security': 'Security',
    'settings.tabs.notifications': 'Notifications',
    'settings.tabs.preferences': 'Preferences',
    'settings.profile.title': 'Profile Information',
    'settings.profile.firstName': 'First Name',
    'settings.profile.lastName': 'Last Name',
    'settings.profile.email': 'Email',
    'settings.profile.phone': 'Phone',
    'settings.profile.department': 'Department',
    'settings.profile.save': 'Save Changes',
    'settings.security.title': 'Security Settings',
    'settings.security.currentPassword': 'Current Password',
    'settings.security.newPassword': 'New Password',
    'settings.security.confirmPassword': 'Confirm Password',
    'settings.security.twoFactor': 'Two-Factor Authentication',
    'settings.security.twoFactorDesc': 'Add an extra layer of security to your account',
    'settings.security.updatePassword': 'Update Password',
    'settings.notifications.title': 'Notification Preferences',
    'settings.notifications.email': 'Email',
    'settings.notifications.sms': 'SMS',
    'settings.notifications.push': 'Push Notifications',
    'settings.notifications.workOrders': 'Work Orders',
    'settings.notifications.maintenance': 'Maintenance',
    'settings.notifications.reports': 'Reports',
    'settings.notifications.save': 'Save Preferences',
    'settings.preferences.title': 'App Preferences',
    'settings.preferences.language': 'Language',
    'settings.preferences.timezone': 'Timezone',
    'settings.preferences.theme': 'Theme',
    'settings.preferences.english': 'English',
    'settings.preferences.arabic': 'Arabic',
    'settings.preferences.riyadh': 'Asia/Riyadh (GMT+3)',
    'settings.preferences.utc': 'UTC',
    'settings.preferences.light': 'Light',
    'settings.preferences.dark': 'Dark',
    'settings.preferences.system': 'System',
    'settings.preferences.save': 'Save Preferences',

    // Footer
    'footer.brand': 'Fixzit',
    'footer.description': 'Facility management + marketplaces in one platform.',
    'footer.company': 'Company',
    'footer.about': 'About',
    'footer.careers': 'Careers',
    'footer.legal': 'Legal',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.support': 'Support',
    'footer.help': 'Help Center',
    'footer.ticket': 'Open a ticket',
    'footer.backHome': 'Back to Home',
    'footer.copyright': 'Fixzit. All rights reserved.',

    // Marketplace
    'marketplace.title': 'Marketplace',
    'marketplace.featured': 'Featured for your organization',
    'marketplace.viewAll': 'View all',
    'marketplace.searchPlaceholder': 'Search products, vendors...',
    'marketplace.addToCart': 'Add to Cart',
    'marketplace.adding': 'Adding...',
    'marketplace.outOfStock': 'Out of Stock',
    'marketplace.inStock': 'In Stock',
    'marketplace.perUnit': 'per',
    'marketplace.minQuantity': 'Min',
    'marketplace.leadTime': 'Lead time',
    'marketplace.days': 'day(s)',
    'marketplace.rating': 'Rating',
    'marketplace.reviews': 'reviews',
    'marketplace.vendor.verified': 'Verified Vendor',
    'marketplace.vendor.premium': 'Premium Vendor',
    'marketplace.vendor.profile': 'Vendor Profile',
    'marketplace.vendor.products': 'Products',
    'marketplace.vendor.uploadProduct': 'Upload Product',
    'marketplace.vendor.manageProducts': 'Manage Products',
    'marketplace.vendor.bulkUpload': 'Bulk Upload',
    'marketplace.admin.margins': 'Profit Margins',
    'marketplace.admin.vendorStatus': 'Vendor Status',
    'marketplace.admin.enable': 'Enable',
    'marketplace.admin.disable': 'Disable',
    'marketplace.admin.marginProfile': 'Margin Profile',
    'marketplace.admin.flatRate': 'Flat Rate',
    'marketplace.admin.percentage': 'Percentage',
    'marketplace.admin.tiered': 'Tiered',

    // Dashboard Page
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.totalProperties': 'Total Properties',
    'dashboard.openWorkOrders': 'Open Work Orders',
    'dashboard.monthlyRevenue': 'Monthly Revenue',
    'dashboard.occupancyRate': 'Occupancy Rate',
    'dashboard.recentWorkOrders': 'Recent Work Orders',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.acMaintenance': 'AC Maintenance',
    'dashboard.propertyTowerA': 'Property Tower A',
    'dashboard.unit': 'Unit',
    'dashboard.monthlyRent': 'Monthly Rent',
    'dashboard.tenant': 'Tenant',
    'dashboard.statusInProgress': 'In Progress',
    'dashboard.statusCompleted': 'Completed',
    'dashboard.statusPending': 'Pending',

    // Finance Page
    'finance.title': 'Finance — Invoices',
    'finance.searchPlaceholder': 'Search by number/customer',
    'finance.newInvoice': 'New Invoice',
    'finance.createInvoice': 'Create Invoice',
    'finance.issueDate': 'Issue Date',
    'finance.dueDate': 'Due Date',
    'finance.issue': 'Issue',
    'finance.due': 'Due',
    'finance.total': 'Total',
    'finance.lines': 'Lines',
    'finance.addLine': 'Add Line',
    'finance.description': 'Description',
    'finance.qty': 'Qty',
    'finance.unitPrice': 'Unit Price',
    'finance.vatPercent': 'VAT %',
    'finance.vat': 'VAT',
    'finance.post': 'POST',
    'finance.void': 'VOID',
    'finance.status.draft': 'DRAFT',
    'finance.status.posted': 'POSTED',
    'finance.status.void': 'VOID',
    'finance.allProperties': 'All Properties',
    'finance.budgetSettings': 'Budget Settings',

    // Finance - Payments
    'finance.payment.title': 'Record Payment',
    'finance.payment.subtitle': 'Record a new payment or income transaction',
    'finance.payment.recordPayment': 'Record Payment',
    'finance.payment.details': 'Payment Details',
    'finance.payment.reference': 'Payment Reference',
    'finance.payment.date': 'Payment Date',
    'finance.payment.method': 'Payment Method',
    'finance.payment.from': 'Payment From',
    'finance.payment.payerCustomer': 'Payer/Customer',
    'finance.payment.description': 'Payment Description',
    'finance.payment.descriptionPlaceholder': 'Monthly rent payment, Service fee, etc...',
    'finance.payment.amount': 'Payment Amount',
    'finance.payment.category': 'Category',
    'finance.payment.summary': 'Payment Summary',
    'finance.payment.processingFee': 'Processing Fee',
    'finance.payment.netAmount': 'Net Amount',
    'finance.payment.recent': 'Recent Payments',
    'finance.payment.generateReceipt': 'Generate Receipt',
    'finance.payment.bulkEntry': 'Bulk Payment Entry',
    'finance.payment.templates': 'Payment Templates',
    'finance.payment.selectMethod': 'Select Method',
    'finance.payment.bankTransfer': 'Bank Transfer',
    'finance.payment.cash': 'Cash',
    'finance.payment.cheque': 'Cheque',
    'finance.payment.creditCard': 'Credit Card',
    'finance.payment.onlinePayment': 'Online Payment',
    'finance.payment.selectPayer': 'Select Payer',
    'finance.payment.rentPayment': 'Rent Payment',
    'finance.payment.serviceFee': 'Service Fee',
    'finance.payment.securityDeposit': 'Security Deposit',
    'finance.payment.lateFee': 'Late Fee',
    'finance.payment.otherIncome': 'Other Income',

    // Finance - Expenses
    'finance.expense.title': 'New Expense',
    'finance.expense.subtitle': 'Record a new business expense or cost',
    'finance.expense.recordExpense': 'Record Expense',
    'finance.expense.details': 'Expense Details',
    'finance.expense.reference': 'Expense Reference',
    'finance.expense.date': 'Expense Date',
    'finance.expense.category': 'Expense Category',
    'finance.expense.information': 'Expense Information',
    'finance.expense.description': 'Description',
    'finance.expense.descriptionPlaceholder': 'Brief description of the expense...',
    'finance.expense.vendorSupplier': 'Vendor/Supplier',
    'finance.expense.amountPayment': 'Amount & Payment',
    'finance.expense.summary': 'Expense Summary',
    'finance.expense.budgetStatus': 'Budget Status',
    'finance.expense.recent': 'Recent Expenses',
    'finance.expense.viewBudget': 'View Budget',
    'finance.expense.bulkEntry': 'Bulk Expense Entry',
    'finance.expense.templates': 'Expense Templates',
    'finance.expense.selectCategory': 'Select Category',
    'finance.expense.maintenance': 'Maintenance & Repairs',
    'finance.expense.utilities': 'Utilities',
    'finance.expense.officeSupplies': 'Office Supplies',
    'finance.expense.equipment': 'Equipment',
    'finance.expense.insurance': 'Insurance',
    'finance.expense.professional': 'Professional Services',
    'finance.expense.marketing': 'Marketing',
    'finance.expense.travel': 'Travel & Transportation',
    'finance.expense.other': 'Other',
    'finance.expense.selectVendor': 'Select Vendor',
    'finance.expense.maintenanceBudget': 'Maintenance Budget',
    'finance.expense.utilitiesBudget': 'Utilities Budget',

    // Finance - Common
    'finance.receiptDocumentation': 'Receipt & Documentation',
    'finance.uploadReceipt': 'Upload receipt or supporting document',
    'finance.uploadInvoice': 'Upload receipt or invoice',
    'finance.chooseFile': 'Choose File',
    'finance.currency': 'Currency',
    'finance.notes': 'Notes',
    'finance.notesPlaceholder': 'Additional notes...',
    'finance.amount': 'Amount',
    'finance.paymentMethod': 'Payment Method',
    'finance.recentActivity': 'Recent Activity',
    'finance.formAutoSaved': 'Form auto-saved',
    'finance.selectProperty': 'Select Property',
    
    // Admin - CMS
    'admin.cms.title': 'CMS Pages',
    'admin.cms.slug': 'Slug (e.g., privacy)',
    'admin.cms.titleLabel': 'Title',
    'admin.cms.content': 'Markdown content...',
    'admin.cms.draft': 'DRAFT',
    'admin.cms.published': 'PUBLISHED',
    
    // Properties - Leases
    'properties.leases.title': 'Lease Management',
    'properties.leases.subtitle': 'Manage property leases and rental agreements',
    'properties.leases.templates': 'Lease Templates',
    'properties.leases.newLease': 'New Lease',
    'properties.leases.activeLeases': 'Active Leases',
    'properties.leases.expiringSoon': 'Expiring Soon',
    'properties.leases.monthlyRevenue': 'Monthly Revenue',
    'properties.leases.avgLeaseTerm': 'Avg. Lease Term',
    'properties.leases.months': 'months',
    'properties.leases.allProperties': 'All Properties',
    'properties.leases.allTypes': 'All Types',
    'properties.leases.allStatus': 'All Status',
    'properties.leases.residential': 'Residential',
    'properties.leases.commercial': 'Commercial',
    'properties.leases.active': 'Active',
    'properties.leases.expired': 'Expired',
    'properties.leases.vacant': 'Vacant',
    'properties.leases.overview': 'Lease Overview',
    'properties.leases.leaseId': 'Lease ID',
    'properties.leases.unit': 'Unit',
    'properties.leases.tenant': 'Tenant',
    'properties.leases.type': 'Type',
    'properties.leases.startDate': 'Start Date',
    'properties.leases.endDate': 'End Date',
    'properties.leases.monthlyRent': 'Monthly Rent',
    'properties.leases.leaseStatus': 'Lease Status',
    'properties.leases.paymentStatus': 'Payment Status',
    'properties.leases.actions': 'Actions',
    'properties.leases.paid': 'Paid',
    'properties.leases.pending': 'Pending',
    'properties.leases.overdue': 'Overdue',
    'properties.leases.na': 'N/A',
    'properties.leases.renew': 'Renew',
    'properties.leases.contact': 'Contact',
    'properties.leases.upcomingRenewals': 'Upcoming Renewals',
    'properties.leases.expires': 'Expires',
    'properties.leases.renewals': 'Renewals',
    'properties.leases.rentCollection': 'Rent Collection',
      'properties.leases.available': 'Available',

      // FM Module - Properties
      'fm.properties.title': 'Property Management',
      'fm.properties.subtitle': 'Real estate portfolio and tenant management',
      'fm.properties.newProperty': 'New Property',
      'fm.properties.addProperty': 'Add Property',
      'fm.properties.searchProperties': 'Search properties...',
      'fm.properties.propertyType': 'Property Type',
      'fm.properties.allTypes': 'All Types',
      'fm.properties.residential': 'Residential',
      'fm.properties.commercial': 'Commercial',
      'fm.properties.industrial': 'Industrial',
      'fm.properties.mixedUse': 'Mixed Use',
      'fm.properties.land': 'Land',
      'fm.properties.viewMap': 'View Map',
      'fm.properties.noProperties': 'No Properties Found',
      'fm.properties.noPropertiesText': 'Get started by adding your first property to the portfolio.',
      'fm.properties.totalArea': 'Total Area',
      'fm.properties.units': 'Units',
      'fm.properties.occupancy': 'Occupancy',
      'fm.properties.monthlyRent': 'Monthly Rent',
      'fm.properties.status': 'Status',
      'fm.properties.active': 'Active',
      'fm.properties.na': 'N/A',
      'fm.properties.tenants': 'Tenants',
      'fm.properties.propertyName': 'Property Name',
      'fm.properties.type': 'Type',
      'fm.properties.description': 'Description',
      'fm.properties.streetAddress': 'Street Address',
      'fm.properties.city': 'City',
      'fm.properties.region': 'Region',
      'fm.properties.postalCode': 'Postal Code',
      'fm.properties.builtArea': 'Built Area',
      'fm.properties.bedrooms': 'Bedrooms',
      'fm.properties.bathrooms': 'Bathrooms',
      'fm.properties.floors': 'Floors',
      'fm.properties.createProperty': 'Create Property',
      'fm.properties.selectType': 'Select type',

      // FM Module - Tenants
      'fm.tenants.title': 'Tenant Management',
      'fm.tenants.subtitle': 'Customer relationship and lease management',
      'fm.tenants.newTenant': 'New Tenant',
      'fm.tenants.addTenant': 'Add Tenant',
      'fm.tenants.searchTenants': 'Search tenants...',
      'fm.tenants.tenantType': 'Tenant Type',
      'fm.tenants.individual': 'Individual',
      'fm.tenants.company': 'Company',
      'fm.tenants.government': 'Government',
      'fm.tenants.noTenants': 'No Tenants Found',
      'fm.tenants.noTenantsText': 'Get started by adding your first tenant.',
      'fm.tenants.properties': 'Properties',
      'fm.tenants.leaseStatus': 'Lease Status',
      'fm.tenants.noActiveLeases': 'No Active Leases',
      'fm.tenants.outstandingBalance': 'Outstanding Balance',
      'fm.tenants.tenantName': 'Tenant Name',
      'fm.tenants.primaryContactName': 'Primary Contact Name',
      'fm.tenants.email': 'Email',
      'fm.tenants.phone': 'Phone',
      'fm.tenants.mobile': 'Mobile',
      'fm.tenants.createTenant': 'Create Tenant',

      // FM Module - Vendors
      'fm.vendors.title': 'Vendor Management',
      'fm.vendors.subtitle': 'Supplier network and performance management',
      'fm.vendors.newVendor': 'New Vendor',
      'fm.vendors.addVendor': 'Add Vendor',
      'fm.vendors.searchVendors': 'Search vendors...',
      'fm.vendors.vendorType': 'Vendor Type',
      'fm.vendors.supplier': 'Supplier',
      'fm.vendors.contractor': 'Contractor',
      'fm.vendors.serviceProvider': 'Service Provider',
      'fm.vendors.consultant': 'Consultant',
      'fm.vendors.pending': 'Pending',
      'fm.vendors.approved': 'Approved',
      'fm.vendors.suspended': 'Suspended',
      'fm.vendors.rejected': 'Rejected',
      'fm.vendors.blacklisted': 'Blacklisted',
      'fm.vendors.noVendors': 'No Vendors Found',
      'fm.vendors.noVendorsText': 'Get started by adding your first vendor to the network.',
      'fm.vendors.successRate': 'Success Rate',
      'fm.vendors.responseTime': 'Response Time',
      'fm.vendors.specializations': 'Specializations',
      'fm.vendors.projects': 'projects',
      'fm.vendors.companyName': 'Company Name',
      'fm.vendors.contactName': 'Contact Name',
      'fm.vendors.createVendor': 'Create Vendor',

      // FM Module - Invoices
      'fm.invoices.title': 'Invoices',
      'fm.invoices.subtitle': 'ZATCA compliant e-invoicing with QR codes',
      'fm.invoices.newInvoice': 'New Invoice',
      'fm.invoices.createInvoice': 'Create Invoice',
      'fm.invoices.searchInvoices': 'Search by invoice number or customer...',
      'fm.invoices.totalOutstanding': 'Total Outstanding',
      'fm.invoices.overdue': 'Overdue',
      'fm.invoices.pending': 'Pending',
      'fm.invoices.paidThisMonth': 'Paid This Month',
      'fm.invoices.draft': 'Draft',
      'fm.invoices.sent': 'Sent',
      'fm.invoices.viewed': 'Viewed',
      'fm.invoices.paid': 'Paid',
      'fm.invoices.cancelled': 'Cancelled',
      'fm.invoices.noInvoices': 'No Invoices Found',
      'fm.invoices.noInvoicesText': 'Get started by creating your first invoice.',
      'fm.invoices.issueDate': 'Issue Date',
      'fm.invoices.dueDate': 'Due Date',
      'fm.invoices.overdueDays': 'd overdue',
      'fm.invoices.items': 'items',
      'fm.invoices.invoiceType': 'Invoice Type',
      'fm.invoices.sales': 'Sales',
      'fm.invoices.purchase': 'Purchase',
      'fm.invoices.rental': 'Rental',
      'fm.invoices.service': 'Service',
      'fm.invoices.maintenance': 'Maintenance',
      'fm.invoices.currency': 'Currency',
      'fm.invoices.customerInfo': 'Customer Information',
      'fm.invoices.customerName': 'Customer Name',
      'fm.invoices.taxId': 'Tax ID',
      'fm.invoices.lineItems': 'Line Items',
      'fm.invoices.description': 'Description',
      'fm.invoices.quantity': 'Qty',
      'fm.invoices.unitPrice': 'Price',
      'fm.invoices.vat': 'VAT %',
      'fm.invoices.addLineItem': 'Add Line Item',    // Careers
    'careers.title': 'Join Our Team',
    'careers.subtitle': 'Build your career with Fixzit Enterprise - where innovation meets opportunity',
    'careers.employees': '50+ Employees',
    'careers.cities': '3 Cities',
    'careers.growing': 'Growing Fast',
    'careers.currentOpenings': 'Current Openings',
    'careers.description': 'Explore exciting career opportunities and join our growing team of professionals',
    'careers.department': 'Department',
    'careers.location': 'Location',
    'careers.type': 'Type',
    'careers.salary': 'Salary',
    'careers.requirements': 'Requirements',
    'careers.posted': 'Posted',
    'careers.viewDetails': 'View Details',
    'careers.applyNow': 'Apply Now',
    'careers.firstName': 'First Name',
    'careers.lastName': 'Last Name',
    'careers.email': 'Email Address',
    'careers.phone': 'Phone Number',
    'careers.coverLetter': 'Cover Letter',
    'careers.resume': 'Resume/CV',
    'careers.uploadFile': 'Upload a file',
    'careers.dragDrop': 'or drag and drop',
    'careers.fileTypes': 'PDF, DOC, DOCX up to 10MB',
    'careers.cancel': 'Cancel',
    'careers.submit': 'Submit Application',
    'careers.submitting': 'Submitting...',
    'careers.applyFor': 'Apply for',
    'careers.open': 'Open',
    'careers.closed': 'Closed',

    // Product Page
    'product.notFound': 'Not found',
    'product.brand': 'Brand',
    'product.standards': 'Standards',
    'product.uom': 'UOM',
    'product.minQty': 'Min Qty',
    'product.inStock': 'In Stock',
    'product.backorder': 'Backorder',
    'product.lead': 'Lead',
    'product.days': 'days',
    'product.addToCart': 'Add to Cart',
    'product.buyNow': 'Buy Now (PO)',
    'product.aboutTitle': 'About this item',
    'product.aboutDesc': 'Technical data sheets (MSDS/COA), installation notes, and compliance info.',

    // Work Orders Common
    'workOrders.filter': 'Filter',
    'workOrders.export': 'Export',
    'workOrders.quickActions': 'Quick Actions',
    'workOrders.reports': 'Reports',
    'workOrders.settings': 'Settings',
    'workOrders.pending': 'Pending',
    'workOrders.inProgress': 'In Progress',
    'workOrders.scheduled': 'Scheduled',
    'workOrders.completed': 'Completed',
    'workOrders.woId': 'WO ID',
    'workOrders.title': 'Title',
    'workOrders.property': 'Property',
    'workOrders.status': 'Status',
    
    // Work Orders - Approvals
    'workOrders.approvals.title': 'Work Order Approvals',
    'workOrders.approvals.subtitle': 'Review and approve work orders that require authorization',
    'workOrders.approvals.rules': 'Approval Rules',
    'workOrders.approvals.bulkApprove': '📋 Bulk Approve',
    'workOrders.approvals.pendingApproval': 'Pending Approval',
    'workOrders.approvals.approvedToday': 'Approved Today',
    'workOrders.approvals.avgTime': 'Avg. Approval Time',
    'workOrders.approvals.totalApproved': 'Total Approved',
    'workOrders.approvals.pending': 'Pending Approvals',
    'workOrders.approvals.recent': 'Recent Approvals',
    'workOrders.approvals.viewAll': 'View All',
    'workOrders.approvals.approvedBy': 'Approved By',
    'workOrders.approvals.approvalDate': 'Approval Date',
    'workOrders.approvals.estimatedCost': 'Estimated Cost',
    'workOrders.approvals.actualCost': 'Actual Cost',
    'workOrders.approvals.workflow': 'Workflow',
    
    // Work Orders - Board
    'workOrders.board.title': 'Work Orders Board',
    'workOrders.board.subtitle': 'Track and assign work orders across all properties',
    'workOrders.board.description': 'Track and assign work orders across all properties',
    'workOrders.board.newWO': '+ New Work Order',
    'workOrders.board.noCompleted': 'No completed work orders',
    'workOrders.board.createWO': 'Create WO',
    'workOrders.board.assignTech': 'Assign Tech',
    'workOrders.board.schedule': 'Schedule',
    
    // Work Orders - History
    'workOrders.history.title': 'Work Order History',
    'workOrders.history.subtitle': 'View completed work orders and service history',
    'workOrders.history.exportReport': 'Export Report',
    'workOrders.history.totalCompleted': 'Total Completed',
    'workOrders.history.avgTime': 'Avg. Completion Time',
    'workOrders.history.costSavings': 'Cost Savings',
    'workOrders.history.view': 'View',
    'workOrders.history.invoice': 'Invoice',
    
    // Work Orders - PM
    'workOrders.pm.title': 'Preventive Maintenance',
    'workOrders.pm.subtitle': 'Schedule and track preventive maintenance tasks',
    'workOrders.pm.importSchedule': 'Import Schedule',
    'workOrders.pm.newPM': '+ New PM Schedule',
    'workOrders.pm.activeSchedules': 'Active Schedules',
    'workOrders.pm.thisMonth': 'This Month',
    'workOrders.pm.upcomingTasks': 'Upcoming Tasks',
    'workOrders.pm.frequency': 'Frequency',
    'workOrders.pm.nextDue': 'Next Due',
    'workOrders.pm.lastCompleted': 'Last Completed',
    'workOrders.pm.complete': 'Complete',
    
    // Work Orders - New
    'workOrders.new.title': 'New Work Order',
    'workOrders.new.subtitle': 'Create a new work order for maintenance or services',
    'workOrders.new.titlePlaceholder': 'Enter work order title...',
    'workOrders.new.locationPlaceholder': 'Unit number or specific location...',
    'workOrders.new.descriptionPlaceholder': 'Describe the issue or work required...',
    'workOrders.new.basicInfo': 'Basic Information',
    'workOrders.new.propertyLocation': 'Property & Location',
    'workOrders.new.assignmentScheduling': 'Assignment & Scheduling',
    
    // Work Orders - Priority
    'workOrders.priority': 'Priority',
    'workOrders.selectPriority': 'Select Priority',
    'workOrders.priority.p1': 'P1 - Critical',
    'workOrders.priority.p2': 'P2 - High',
    'workOrders.priority.p3': 'P3 - Medium',
    'workOrders.priority.p4': 'P4 - Low',
    
    // Work Orders - Common Fields
    'common.property': 'Property',
    'common.selectProperty': 'Select Property',
    'workOrders.assignTo': 'Assign To',
    'workOrders.selectTechnician': 'Select Technician',
    'common.dueDate': 'Due Date',
    
    // Work Orders - Attachments & Actions
    'workOrders.attachments': 'Attachments',
    'workOrders.dropFiles': 'Drop files here or click to upload',
    'common.chooseFiles': 'Choose Files',
    'workOrders.createFromTemplate': 'Create from Template',
    'workOrders.emergencyContact': 'Emergency Contact',
    'workOrders.costCalculator': 'Cost Calculator',
    
    // Work Orders - Recent Activity
    'workOrders.recentActivity': 'Recent Activity',
    'workOrders.formAutoSaved': 'Form auto-saved',
    'workOrders.propertySelected': 'Property selected',
  },
};

const DEFAULT_LANGUAGE_OPTION = LANGUAGE_OPTIONS[0];

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentOption, setCurrentOption] = useState<LanguageOption>(DEFAULT_LANGUAGE_OPTION);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedLocale = window.localStorage.getItem('fxz.locale');
      const storedLanguage = window.localStorage.getItem('fxz.lang') as Language | null;
      const nextOption =
        (storedLocale && findLanguageByLocale(storedLocale)) ||
        (storedLanguage && findLanguageByCode(storedLanguage)) ||
        DEFAULT_LANGUAGE_OPTION;

      setCurrentOption(nextOption);
    } catch (error) {
      console.warn('Could not access localStorage for language preference:', error);
      setCurrentOption(DEFAULT_LANGUAGE_OPTION);
    }
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem('fxz.locale', currentOption.locale);
      window.localStorage.setItem('fxz.lang', currentOption.language);
      document.cookie = `fxz.lang=${currentOption.language}; path=/; SameSite=Lax`;
      document.cookie = `fxz.locale=${currentOption.locale}; path=/; SameSite=Lax`;
      document.documentElement.lang = currentOption.locale.toLowerCase();
      document.documentElement.dir = currentOption.dir;
      document.documentElement.setAttribute('data-locale', currentOption.locale);
      if (document.body) {
        document.body.style.direction = currentOption.dir;
      }
      window.dispatchEvent(
        new CustomEvent('fixzit:language-change', {
          detail: {
            locale: currentOption.locale,
            language: currentOption.language,
            dir: currentOption.dir
          }
        })
      );
    } catch (error) {
      console.warn('Could not update language settings:', error);
    }
  }, [currentOption, isClient]);

  const setLanguage = (lang: Language) => {
    const nextOption = findLanguageByCode(lang);
    if (nextOption) {
      setCurrentOption(nextOption);
    }
  };

  const setLocale = (locale: string) => {
    const nextOption = findLanguageByLocale(locale) ?? findLanguageByCode(currentOption.language);
    if (nextOption) {
      setCurrentOption(nextOption);
    }
  };

  const language = currentOption.language;
  const locale = currentOption.locale;
  const isRTL = currentOption.dir === 'rtl';

  const t = (key: string, fallback: string = key): string => {
    try {
      const langData = translations[language as LanguageCode];
      const result = langData?.[key] || fallback;
      return result;
    } catch (error) {
      console.warn(`Translation error for key '${key}':`, error);
      return fallback;
    }
  };

  return (
    <TranslationContext.Provider value={{ language: language as LanguageCode, locale, setLanguage, setLocale, t, isRTL }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  try {
    const context = useContext(TranslationContext);

    // If context is not available, provide a safe fallback
    if (!context) {
      // Create a fallback context object for SSR
      const fallbackContext: TranslationContextType = {
        language: 'ar',
        locale: 'ar-SA',
        setLanguage: (lang: Language) => {
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('fxz.lang', lang);
              window.location.reload();
            }
          } catch (error) {
            console.warn('Could not save language preference:', error);
          }
        },
        setLocale: (locale: string) => {
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('fxz.locale', locale);
              console.warn('Locale preference saved. Please refresh the page for changes to take effect.');
            }
          } catch (error) {
            console.warn('Could not save locale preference:', error);
          }
        },
        t: (key: string, fallback: string = key): string => {
          return fallback;
        },
        isRTL: true
      };
      return fallbackContext;
    }

    return context;
  } catch (error) {
    // Ultimate fallback in case of any error
    console.warn('useTranslation error:', error);
    return {
      language: 'ar' as Language,
      locale: 'ar-SA',
      setLanguage: (_lang: Language) => {},
      setLocale: () => {},
      t: (key: string, fallback: string = key): string => fallback,
      isRTL: true
    };
  }
}

