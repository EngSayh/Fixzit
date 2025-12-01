#!/usr/bin/env node
/**
 * Generate Missing Translations Script
 * 
 * This script reads the translation audit CSV and generates
 * missing EN/AR translations following Fixzit conventions.
 * 
 * Usage: node scripts/generate-missing-translations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Read audit CSV
const auditPath = path.join(ROOT, 'docs/translations/translation-audit.csv');

if (!fs.existsSync(auditPath)) {
  console.error(`Error: Audit file not found at ${auditPath}`);
  console.error('Run "node scripts/audit-translations.mjs" first to generate the audit report.');
  process.exit(1);
}

const auditContent = fs.readFileSync(auditPath, 'utf-8');

// Parse CSV
const lines = auditContent.split('\n').slice(1).filter(Boolean);
const missingKeys = lines
  .filter(line => line.startsWith('USED_MISSING'))
  .map(line => {
    const parts = line.split(',');
    if (parts.length < 2) {
      console.warn(`Skipping malformed CSV line: ${line}`);
      return null;
    }
    return parts[1]; // key column
  })
  .filter(Boolean);

console.log(`Found ${missingKeys.length} missing keys\n`);

// Group by domain
const byDomain = {};
missingKeys.forEach(key => {
  const domain = key.split('.')[0];
  if (!byDomain[domain]) byDomain[domain] = [];
  byDomain[domain].push(key);
});

// English translations map (key -> English text)
// Using intelligent defaults based on key naming patterns
function generateEnglishValue(key) {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // Convert camelCase/kebab-case to Title Case
  const toTitleCase = (str) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  };
  
  // Handle common patterns
  const patterns = {
    // Actions
    'tryAgain': 'Try Again',
    'goToDashboard': 'Go to Dashboard',
    'goToHomepage': 'Go to Homepage',
    'goBack': 'Go Back',
    'saveChanges': 'Save Changes',
    'exportCsv': 'Export CSV',
    'viewCharts': 'View Charts',
    'viewDetails': 'View Details',
    'expandAll': 'Expand All',
    'collapseAll': 'Collapse All',
    'selectProperty': 'Select Property',
    'forgotPassword': 'Forgot Password?',
    'signUp': 'Sign Up',
    
    // Status
    'saving': 'Saving...',
    'loading': 'Loading...',
    'uploading': 'Uploading...',
    'creating': 'Creating...',
    'searching': 'Searching...',
    'processing': 'Processing...',
    
    // Common terms
    'title': parts.slice(0, -1).map(p => toTitleCase(p)).join(' '),
    'subtitle': `Manage your ${parts[1] || 'items'}`,
    'description': 'Enter description',
    'placeholder': `Enter ${toTitleCase(parts[parts.length - 2] || 'value')}`,
    'error': 'An error occurred',
    'success': 'Operation successful',
    'accessDenied': 'Access Denied',
    'notFound': 'Not Found',
    'networkError': 'Network error. Please try again.',
    
    // Fields
    'email': 'Email',
    'password': 'Password',
    'name': 'Name',
    'phone': 'Phone',
    'address': 'Address',
    'amount': 'Amount',
    'status': 'Status',
    'date': 'Date',
    'dueDate': 'Due Date',
    'location': 'Location',
    'property': 'Property',
    'unit': 'Unit',
    'vendor': 'Vendor',
    'tenant': 'Tenant',
    'owner': 'Owner',
    'category': 'Category',
    'priority': 'Priority',
    'notes': 'Notes',
    'currency': 'Currency',
    'invoice': 'Invoice',
    'payment': 'Payment',
  };
  
  // Check for exact match in patterns
  if (patterns[lastPart]) {
    return patterns[lastPart];
  }
  
  // Handle compound keys
  if (lastPart.endsWith('Aria')) {
    return toTitleCase(lastPart.replace('Aria', ''));
  }
  if (lastPart.endsWith('Label')) {
    return toTitleCase(lastPart.replace('Label', ''));
  }
  if (lastPart.endsWith('Placeholder')) {
    return `Enter ${toTitleCase(lastPart.replace('Placeholder', ''))}`;
  }
  if (lastPart.endsWith('Error')) {
    return `${toTitleCase(lastPart.replace('Error', ''))} failed`;
  }
  if (lastPart.endsWith('Success')) {
    return `${toTitleCase(lastPart.replace('Success', ''))} successful`;
  }
  
  // Default: title case the last part
  return toTitleCase(lastPart);
}

// Arabic translations map
// Professional Arabic translations for common UI terms
const arabicMap = {
  // Actions
  'Try Again': 'حاول مرة أخرى',
  'Go to Dashboard': 'الذهاب إلى لوحة التحكم',
  'Go to Homepage': 'الذهاب إلى الصفحة الرئيسية',
  'Go Back': 'العودة',
  'Save Changes': 'حفظ التغييرات',
  'Export CSV': 'تصدير CSV',
  'View Charts': 'عرض الرسوم البيانية',
  'View Details': 'عرض التفاصيل',
  'Expand All': 'توسيع الكل',
  'Collapse All': 'طي الكل',
  'Select Property': 'اختر العقار',
  'Forgot Password?': 'نسيت كلمة المرور؟',
  'Sign Up': 'إنشاء حساب',
  'Submit': 'إرسال',
  'Cancel': 'إلغاء',
  'Confirm': 'تأكيد',
  'Delete': 'حذف',
  'Edit': 'تعديل',
  'Add': 'إضافة',
  'Create': 'إنشاء',
  'Update': 'تحديث',
  'Search': 'بحث',
  'Filter': 'تصفية',
  'Sort': 'ترتيب',
  'Refresh': 'تحديث',
  'Download': 'تحميل',
  'Upload': 'رفع',
  'Share': 'مشاركة',
  'Copy': 'نسخ',
  'Print': 'طباعة',
  'Export': 'تصدير',
  'Import': 'استيراد',
  'Approve': 'موافقة',
  'Reject': 'رفض',
  'Review': 'مراجعة',
  'Close': 'إغلاق',
  'Open': 'فتح',
  'Select': 'اختيار',
  'Clear': 'مسح',
  'Apply': 'تطبيق',
  'Reset': 'إعادة تعيين',
  'Save': 'حفظ',
  'Load': 'تحميل',
  'Retry': 'إعادة المحاولة',
  
  // Status
  'Saving...': 'جاري الحفظ...',
  'Loading...': 'جاري التحميل...',
  'Uploading...': 'جاري الرفع...',
  'Creating...': 'جاري الإنشاء...',
  'Searching...': 'جاري البحث...',
  'Processing...': 'جاري المعالجة...',
  'Success': 'نجاح',
  'Error': 'خطأ',
  'Warning': 'تحذير',
  'Info': 'معلومات',
  'Pending': 'قيد الانتظار',
  'Approved': 'موافق عليه',
  'Rejected': 'مرفوض',
  'Active': 'نشط',
  'Inactive': 'غير نشط',
  'Locked': 'مقفل',
  'Draft': 'مسودة',
  'Published': 'منشور',
  'Completed': 'مكتمل',
  'In Progress': 'قيد التنفيذ',
  'Overdue': 'متأخر',
  'Cancelled': 'ملغي',
  'Failed': 'فشل',
  
  // Common terms
  'Title': 'العنوان',
  'Subtitle': 'العنوان الفرعي',
  'Description': 'الوصف',
  'Name': 'الاسم',
  'Email': 'البريد الإلكتروني',
  'Password': 'كلمة المرور',
  'Phone': 'الهاتف',
  'Address': 'العنوان',
  'Amount': 'المبلغ',
  'Status': 'الحالة',
  'Date': 'التاريخ',
  'Due Date': 'تاريخ الاستحقاق',
  'Location': 'الموقع',
  'Property': 'العقار',
  'Unit': 'الوحدة',
  'Vendor': 'المورد',
  'Tenant': 'المستأجر',
  'Owner': 'المالك',
  'Category': 'الفئة',
  'Priority': 'الأولوية',
  'Notes': 'ملاحظات',
  'Currency': 'العملة',
  'Invoice': 'فاتورة',
  'Payment': 'دفعة',
  'Total': 'الإجمالي',
  'Balance': 'الرصيد',
  'Type': 'النوع',
  'Action': 'الإجراء',
  'User': 'المستخدم',
  'Role': 'الدور',
  'Department': 'القسم',
  'Settings': 'الإعدادات',
  'Configuration': 'التكوين',
  'Dashboard': 'لوحة التحكم',
  'Reports': 'التقارير',
  'Analytics': 'التحليلات',
  'Notifications': 'الإشعارات',
  'Profile': 'الملف الشخصي',
  'Account': 'الحساب',
  'Help': 'المساعدة',
  'Support': 'الدعم',
  'Contact': 'اتصل بنا',
  'About': 'حول',
  'Terms': 'الشروط',
  'Privacy': 'الخصوصية',
  'Logout': 'تسجيل الخروج',
  'Login': 'تسجيل الدخول',
  
  // Error messages
  'Access Denied': 'الوصول مرفوض',
  'Not Found': 'غير موجود',
  'Network error. Please try again.': 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
  'An error occurred': 'حدث خطأ',
  'Operation successful': 'تمت العملية بنجاح',
  'Invalid input': 'إدخال غير صالح',
  'Required field': 'حقل مطلوب',
  'Invalid email': 'بريد إلكتروني غير صالح',
  'Invalid phone': 'رقم هاتف غير صالح',
  
  // Finance specific
  'Bank Name': 'اسم البنك',
  'Account Number': 'رقم الحساب',
  'Account Holder': 'صاحب الحساب',
  'SWIFT Code': 'رمز سويفت',
  'IBAN': 'رقم الآيبان',
  'Cheque Number': 'رقم الشيك',
  'Cheque Date': 'تاريخ الشيك',
  'Drawer Name': 'اسم الساحب',
  'Card Type': 'نوع البطاقة',
  'Transaction ID': 'رقم المعاملة',
  'Authorization Code': 'رمز التفويض',
  'New Payment': 'دفعة جديدة',
  'Payment Details': 'تفاصيل الدفع',
  'Payment Type': 'نوع الدفع',
  'Payment Received': 'دفعة مستلمة',
  'Payment Made': 'دفعة صادرة',
  'Payment Date': 'تاريخ الدفع',
  'Reference Number': 'الرقم المرجعي',
  'Payment Method': 'طريقة الدفع',
  'Cash': 'نقدي',
  'Credit/Debit Card': 'بطاقة ائتمان/خصم',
  'Bank Transfer': 'تحويل بنكي',
  'Cheque': 'شيك',
  'Online Payment': 'دفع إلكتروني',
  'Other': 'أخرى',
  'Deposit To Account': 'إيداع في الحساب',
  'Select Account': 'اختر الحساب',
  'Received From': 'مستلم من',
  'Paid To': 'مدفوع إلى',
  'Party Type': 'نوع الطرف',
  'Party Name': 'اسم الطرف',
  'Supplier': 'المورد',
  'Customer': 'العميل',
  'Invoice Allocation': 'توزيع الفاتورة',
  'Hide Invoices': 'إخفاء الفواتير',
  'Allocate to Invoices': 'توزيع على الفواتير',
  'Allocate Equally': 'توزيع بالتساوي',
  'By Due Date': 'حسب تاريخ الاستحقاق',
  'Clear All': 'مسح الكل',
  'Amount Due': 'المبلغ المستحق',
  'Allocate': 'توزيع',
  'Payment Amount': 'مبلغ الدفع',
  'Allocated': 'موزع',
  'Unallocated': 'غير موزع',
  'Account Activity': 'نشاط الحساب',
  'Opening Balance': 'الرصيد الافتتاحي',
  'Closing Balance': 'الرصيد الختامي',
  'Total Debits': 'إجمالي المدين',
  'Total Credits': 'إجمالي الدائن',
  'Journal #': 'رقم القيد',
  'Source': 'المصدر',
  'Debit': 'مدين',
  'Credit': 'دائن',
  'Start Date': 'تاريخ البداية',
  'End Date': 'تاريخ النهاية',
  'Source Type': 'نوع المصدر',
  'All Types': 'جميع الأنواع',
  'Manual': 'يدوي',
  'Expense': 'مصروف',
  'Rent': 'إيجار',
  'Work Order': 'أمر عمل',
  'Adjustment': 'تعديل',
  'Today': 'اليوم',
  'This Week': 'هذا الأسبوع',
  'This Month': 'هذا الشهر',
  'This Quarter': 'هذا الربع',
  'This Year': 'هذه السنة',
  'Last Month': 'الشهر الماضي',
  'Last Year': 'السنة الماضية',
  'First': 'الأول',
  'Last': 'الأخير',
  'Optional': 'اختياري',
};

function generateArabicValue(englishValue) {
  // Check for exact match
  if (arabicMap[englishValue]) {
    return arabicMap[englishValue];
  }
  
  // Try partial match for compound phrases
  for (const [en, ar] of Object.entries(arabicMap)) {
    if (englishValue.toLowerCase() === en.toLowerCase()) {
      return ar;
    }
  }
  
  // Default: mark for manual translation
  return `[AR] ${englishValue}`;
}

// Generate translations
const enTranslations = {};
const arTranslations = {};

// Sort keys so shorter keys come before longer ones (parent before child)
const sortedKeys = [...missingKeys].sort((a, b) => {
  const aParts = a.split('.').length;
  const bParts = b.split('.').length;
  return aParts - bParts;
});

sortedKeys.forEach(key => {
  const en = generateEnglishValue(key);
  const ar = generateArabicValue(en);
  
  // Build nested object
  const parts = key.split('.');
  let enCurrent = enTranslations;
  let arCurrent = arTranslations;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // If current value is a string, convert to object with _value property
    if (typeof enCurrent[part] === 'string') {
      const oldValue = enCurrent[part];
      enCurrent[part] = { _value: oldValue };
    }
    if (typeof arCurrent[part] === 'string') {
      const oldValue = arCurrent[part];
      arCurrent[part] = { _value: oldValue };
    }
    if (!enCurrent[part]) enCurrent[part] = {};
    if (!arCurrent[part]) arCurrent[part] = {};
    enCurrent = enCurrent[part];
    arCurrent = arCurrent[part];
  }
  
  const lastPart = parts[parts.length - 1];
  // Handle case where we're adding a leaf but parent already has children
  if (typeof enCurrent[lastPart] === 'object' && enCurrent[lastPart] !== null) {
    enCurrent[lastPart]._value = en;
    arCurrent[lastPart]._value = ar;
  } else {
    enCurrent[lastPart] = en;
    arCurrent[lastPart] = ar;
  }
});

// Write output files
const enOutPath = path.join(ROOT, 'i18n/generated/missing-en.json');
const arOutPath = path.join(ROOT, 'i18n/generated/missing-ar.json');

fs.mkdirSync(path.dirname(enOutPath), { recursive: true });
fs.writeFileSync(enOutPath, JSON.stringify(enTranslations, null, 2));
fs.writeFileSync(arOutPath, JSON.stringify(arTranslations, null, 2));

console.log('Generated translations:');
console.log(`  EN: ${enOutPath}`);
console.log(`  AR: ${arOutPath}`);

// Print domain summary
console.log('\nBy domain:');
Object.entries(byDomain)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([domain, keys]) => {
    console.log(`  ${domain}: ${keys.length} keys`);
  });

// Count translations needing manual review (recursively)
function countArMarkers(obj) {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && value.startsWith('[AR]')) {
      count++;
    } else if (value && typeof value === 'object') {
      count += countArMarkers(value);
    }
  }
  return count;
}

const needsReview = countArMarkers(arTranslations);

console.log(`\n⚠️  ${needsReview} Arabic translations need manual review (marked with [AR])`);
