"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Locale = 'en' | 'ar';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Mock translations - in a real app, these would come from translation files
const translations = {
  en: {
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Welcome to your dashboard',
    'dashboard.dateRange': 'Date Range',
    'dashboard.quickFilters': 'Quick Filters',
    'dashboard.lastWeek': 'Last Week',
    'dashboard.lastMonth': 'Last Month',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.systemOverview': 'System Overview',
    'dashboard.systemUptime': 'System Uptime',
    'dashboard.activeUsers': 'Active Users',
    'dashboard.storageUsed': 'Storage Used',
    'propertiesManagement': 'Properties Management',
    'propertiesCount': 'properties',
    'managePropertyPortfolio': 'Manage your property portfolio',
    'lastUpdated': 'Last updated',
    'totalProperties': 'Total Properties',
    'totalUnits': 'Total Units',
    'avgOccupancy': 'Avg Occupancy',
    'totalRevenue': 'Total Revenue',
    'netIncome': 'Net Income',
    'pendingMaintenance': 'Pending Maintenance',
    'searchProperties': 'Search properties...',
    'filters': 'Filters',
    'newestFirst': 'Newest First',
    'oldestFirst': 'Oldest First',
    'nameAZ': 'Name A-Z',
    'nameZA': 'Name Z-A',
    'highestOccupancy': 'Highest Occupancy',
    'lowestOccupancy': 'Lowest Occupancy',
    'highestRevenue': 'Highest Revenue',
    'lowestRevenue': 'Lowest Revenue',
    'addProperty': 'Add Property',
    'noPropertiesYet': 'No properties yet',
    'startByAddingFirstProperty': 'Start by adding your first property to begin portfolio management',
    'addYourFirstProperty': 'Add Your First Property',
    'noMatchingProperties': 'No matching properties',
    'tryAdjustingFilters': 'Try adjusting your filters or search terms',
    'clearFilters': 'Clear Filters',
    'property': 'Property',
    'type': 'Type',
    'status': 'Status',
    'occupancy': 'Occupancy',
    'revenue': 'Revenue',
    'actions': 'Actions',
    'units': 'units',
    'margin': 'margin',
    'viewDetails': 'View Details',
    'manager': 'Manager',
    'newWorkOrder': 'New Work Order',
    'export': 'Export',
    'archive': 'Archive',
    'scheduleInspection': 'Schedule Inspection',
    'propertiesSelected': 'properties selected',
    'deselectAll': 'Deselect All',
    'selectAll': 'Select All',
    'advancedFilters': 'Advanced Filters',
    'allCities': 'All Cities',
    'city': 'City',
    'monthlyRevenue': 'Monthly Revenue',
    'profitMargin': 'Profit Margin',
    'addNewProperty': 'Add New Property',
    'propertyName': 'Property Name',
    'propertyNamePlaceholder': 'e.g. Central Business Tower',
    'propertyType': 'Property Type',
    'residential': 'Residential',
    'commercial': 'Commercial',
    'mixedUse': 'Mixed Use',
    'industrial': 'Industrial',
    'address': 'Address',
    'fullPropertyAddress': 'Full property address',
    'cityPlaceholder': 'e.g. Riyadh',
    'stateRegion': 'State/Region',
    'stateRegionPlaceholder': 'e.g. Riyadh Region',
    'country': 'Country',
    'saudiArabia': 'Saudi Arabia',
    'unitedArabEmirates': 'UAE',
    'qatar': 'Qatar',
    'kuwait': 'Kuwait',
    'bahrain': 'Bahrain',
    'totalUnits': 'Total Units',
    'averageRent': 'Average Rent (SAR)',
    'cancel': 'Cancel',
    'creating': 'Creating...',
    'createProperty': 'Create Property',
    'propertyNameAndAddressRequired': 'Property name and address are required',
    'createFailed': 'Create failed',
    'failedToLoadProperties': 'Failed to load properties',
    'bulkActionFailed': 'Bulk action failed',
    'exportFailed': 'Export failed'
  },
  ar: {
    'dashboard.title': 'لوحة التحكم',
    'dashboard.subtitle': 'مرحباً بك في لوحة التحكم',
    'dashboard.dateRange': 'نطاق التاريخ',
    'dashboard.quickFilters': 'مرشحات سريعة',
    'dashboard.lastWeek': 'الأسبوع الماضي',
    'dashboard.lastMonth': 'الشهر الماضي',
    'dashboard.recentActivity': 'النشاط الأخير',
    'dashboard.systemOverview': 'نظرة عامة على النظام',
    'dashboard.systemUptime': 'وقت تشغيل النظام',
    'dashboard.activeUsers': 'المستخدمون النشطون',
    'dashboard.storageUsed': 'التخزين المستخدم',
    'propertiesManagement': 'إدارة العقارات',
    'propertiesCount': 'عقار',
    'managePropertyPortfolio': 'إدارة محفظة العقارات الخاصة بك',
    'lastUpdated': 'آخر تحديث',
    'totalProperties': 'إجمالي العقارات',
    'totalUnits': 'إجمالي الوحدات',
    'avgOccupancy': 'متوسط الإشغال',
    'totalRevenue': 'إجمالي الإيرادات',
    'netIncome': 'صافي الدخل',
    'pendingMaintenance': 'الصيانة المعلقة',
    'searchProperties': 'البحث في العقارات...',
    'filters': 'المرشحات',
    'newestFirst': 'الأحدث أولاً',
    'oldestFirst': 'الأقدم أولاً',
    'nameAZ': 'الاسم أ-ي',
    'nameZA': 'الاسم ي-أ',
    'highestOccupancy': 'أعلى إشغال',
    'lowestOccupancy': 'أقل إشغال',
    'highestRevenue': 'أعلى إيرادات',
    'lowestRevenue': 'أقل إيرادات',
    'addProperty': 'إضافة عقار',
    'noPropertiesYet': 'لا توجد عقارات بعد',
    'startByAddingFirstProperty': 'ابدأ بإضافة أول عقار لك لإدارة محفظة العقارات',
    'addYourFirstProperty': 'أضف أول عقار لك',
    'noMatchingProperties': 'لا توجد عقارات مطابقة',
    'tryAdjustingFilters': 'حاول تعديل المرشحات أو مصطلحات البحث',
    'clearFilters': 'مسح المرشحات',
    'property': 'العقار',
    'type': 'النوع',
    'status': 'الحالة',
    'occupancy': 'الإشغال',
    'revenue': 'الإيرادات',
    'actions': 'الإجراءات',
    'units': 'وحدات',
    'margin': 'هامش',
    'viewDetails': 'عرض التفاصيل',
    'manager': 'المدير',
    'newWorkOrder': 'أمر عمل جديد',
    'export': 'تصدير',
    'archive': 'أرشفة',
    'scheduleInspection': 'جدولة تفتيش',
    'propertiesSelected': 'عقار محدد',
    'deselectAll': 'إلغاء تحديد الكل',
    'selectAll': 'تحديد الكل',
    'advancedFilters': 'مرشحات متقدمة',
    'allCities': 'جميع المدن',
    'city': 'المدينة',
    'monthlyRevenue': 'الإيرادات الشهرية',
    'profitMargin': 'هامش الربح',
    'addNewProperty': 'إضافة عقار جديد',
    'propertyName': 'اسم العقار',
    'propertyNamePlaceholder': 'مثل: برج الأعمال المركزي',
    'propertyType': 'نوع العقار',
    'residential': 'سكني',
    'commercial': 'تجاري',
    'mixedUse': 'مختلط',
    'industrial': 'صناعي',
    'address': 'العنوان',
    'fullPropertyAddress': 'عنوان العقار الكامل',
    'cityPlaceholder': 'مثل: الرياض',
    'stateRegion': 'المنطقة/المحافظة',
    'stateRegionPlaceholder': 'مثل: منطقة الرياض',
    'country': 'البلد',
    'saudiArabia': 'المملكة العربية السعودية',
    'unitedArabEmirates': 'الإمارات العربية المتحدة',
    'qatar': 'قطر',
    'kuwait': 'الكويت',
    'bahrain': 'البحرين',
    'totalUnits': 'إجمالي الوحدات',
    'averageRent': 'متوسط الإيجار (ريال)',
    'cancel': 'إلغاء',
    'creating': 'جاري الإنشاء...',
    'createProperty': 'إنشاء عقار',
    'propertyNameAndAddressRequired': 'اسم العقار والعنوان مطلوبان',
    'createFailed': 'فشل الإنشاء',
    'failedToLoadProperties': 'فشل في تحميل العقارات',
    'bulkActionFailed': 'فشل الإجراء المجمع',
    'exportFailed': 'فشل التصدير'
  }
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // Load saved locale from localStorage
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'ar')) {
      setLocale(savedLocale);
    }
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string): string => {
    return translations[locale][key as keyof typeof translations[typeof locale]] || key;
  };

  const isRTL = locale === 'ar';

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}