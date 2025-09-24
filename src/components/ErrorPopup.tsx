// src/components/ErrorPopup.tsx - Non-blocking error dialog with copy & send functionality
'use client';
import { useState, useEffect } from 'react';
import { X, Copy, Send, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { ProblemDetails, isProblemDetails } from '@/src/errors/problem';
import { useErrorReporter, UserContext } from '@/src/hooks/useErrorReporter';
import { getErrorByCode } from '@/src/errors/registry';
import { useI18n } from '@/src/providers/RootProviders';

type Props = { 
  error: ProblemDetails | Error | string;
  incidentId?: string;
  onClose?: () => void;
  getUser?: () => UserContext | undefined;
  autoSend?: boolean;
};

export default function ErrorPopup({ error, incidentId: providedIncidentId, onClose, getUser, autoSend = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [showGuestForm, setShowGuestForm] = useState(false);
  
  const { language, isRTL } = useI18n();
  const reporter = useErrorReporter(getUser);
  const user = getUser?.();
  const isGuest = !user?.userId;

  // Get error details
  const errorDetails = (() => {
    if (isProblemDetails(error)) {
      const errorInfo = error.code ? getErrorByCode(error.code) : getErrorByCode('UI-UI-UNKNOWN-000');
      return {
        code: error.code || errorInfo.code,
        title: language === 'ar' ? errorInfo.title_ar : errorInfo.title_en,
        description: error.detail || (language === 'ar' ? errorInfo.description_ar : errorInfo.description_en),
        status: error.status,
        errors: error.errors,
        severity: errorInfo.severity,
        module: errorInfo.module,
        userAction: language === 'ar' ? errorInfo.userAction_ar : errorInfo.userAction_en,
        retryable: errorInfo.retryable
      };
    } else if (error instanceof Error) {
      const errorInfo = getErrorByCode('UI-RENDER-FAIL-001');
      return {
        code: errorInfo.code,
        title: error.message || (language === 'ar' ? errorInfo.title_ar : errorInfo.title_en),
        description: language === 'ar' ? errorInfo.description_ar : errorInfo.description_en,
        severity: errorInfo.severity,
        module: errorInfo.module,
        userAction: language === 'ar' ? errorInfo.userAction_ar : errorInfo.userAction_en,
        retryable: errorInfo.retryable
      };
    } else {
      const errorInfo = getErrorByCode('UI-UI-UNKNOWN-000');
      return {
        code: errorInfo.code,
        title: String(error),
        description: language === 'ar' ? errorInfo.description_ar : errorInfo.description_en,
        severity: errorInfo.severity,
        module: errorInfo.module,
        userAction: language === 'ar' ? errorInfo.userAction_ar : errorInfo.userAction_en,
        retryable: errorInfo.retryable
      };
    }
  })();

  // Get incident ID
  const incidentId = providedIncidentId || reporter.generateIncidentId();

  // Auto-send on mount if requested
  useEffect(() => {
    if (autoSend && !isGuest) {
      handleSend();
    }
  }, [autoSend]);

  const handleCopy = async () => {
    const incident = reporter.getIncident(incidentId);
    const success = await reporter.copy(incident || {
      incidentId,
      code: errorDetails.code,
      title: errorDetails.title,
      description: errorDetails.description,
      errors: errorDetails.errors,
      severity: errorDetails.severity,
      module: errorDetails.module
    });
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSend = async () => {
    if (isGuest && !guestInfo.email) {
      setShowGuestForm(true);
      return;
    }

    setSending(true);
    try {
      // Send incident report
      const reportedIncidentId = await reporter.send(error, {
        autoTicket: true,
        additionalContext: isGuest ? { guestInfo } : undefined
      });

      // Create support ticket
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: reportedIncidentId,
          subject: `[${errorDetails.code}] ${errorDetails.title}`,
          module: mapModuleToTicketModule(errorDetails.module),
          type: 'Bug',
          priority: mapSeverityToPriority(errorDetails.severity),
          category: 'Technical',
          subCategory: 'Bug Report',
          text: formatTicketDescription(errorDetails, incidentId, language),
          requester: isGuest ? guestInfo : undefined
        })
      });

      if (response.ok) {
        const { id } = await response.json();
        setTicketId(id);
        setSent(true);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
    } finally {
      setSending(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'P0': return 'text-red-600';
      case 'P1': return 'text-orange-600';
      case 'P2': return 'text-yellow-600';
      case 'P3': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const t = (en: string, ar: string) => language === 'ar' ? ar : en;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-xl mx-4 rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FFB400]" />
            <h3 className="font-semibold text-gray-900">
              {t('Something went wrong', 'حدث خطأ ما')}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Error Title & Code */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-gray-800">{errorDetails.title}</h4>
              <span className={`text-sm font-mono ${getSeverityColor(errorDetails.severity)}`}>
                [{errorDetails.code}]
              </span>
            </div>
            {errorDetails.description && (
              <p className="text-sm text-gray-600 mt-1">{errorDetails.description}</p>
            )}
          </div>

          {/* Multiple Errors */}
          {errorDetails.errors && errorDetails.errors.length > 0 && (
            <div className="bg-gray-50 rounded p-3 space-y-1">
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                {t('Details:', 'التفاصيل:')}
              </h5>
              <ul className="space-y-1">
                {errorDetails.errors.map((err, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>
                      {err.path && <span className="font-mono text-xs text-gray-500">[{err.path}]</span>}
                      {err.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* User Action */}
          {errorDetails.userAction && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">{errorDetails.userAction}</p>
            </div>
          )}

          {/* Incident Info */}
          <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-600">
            <div className="flex items-center justify-between">
              <span>{t('Incident ID', 'معرف الحادثة')}: {incidentId}</span>
              <span>{t('Module', 'الوحدة')}: {errorDetails.module}</span>
            </div>
          </div>

          {/* Guest Form */}
          {showGuestForm && isGuest && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm text-gray-600">
                {t('Please provide your contact information:', 'يرجى تقديم معلومات الاتصال الخاصة بك:')}
              </p>
              <input
                type="text"
                placeholder={t('Your name', 'اسمك')}
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
              />
              <input
                type="email"
                placeholder={t('Email address', 'البريد الإلكتروني')}
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
                required
              />
              <input
                type="tel"
                placeholder={t('Phone number (optional)', 'رقم الهاتف (اختياري)')}
                value={guestInfo.phone}
                onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
              />
            </div>
          )}

          {/* Success Message */}
          {sent && ticketId && (
            <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="text-sm text-green-800">
                <p>{t('Report sent successfully!', 'تم إرسال التقرير بنجاح!')}</p>
                <p className="font-mono text-xs mt-1">
                  {t('Ticket ID', 'رقم التذكرة')}: {ticketId}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
          {/* Left side - Copy button */}
          <button
            onClick={handleCopy}
            disabled={sending || sent}
            className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">{t('Copied!', 'تم النسخ!')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">{t('Copy details', 'نسخ التفاصيل')}</span>
              </>
            )}
          </button>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            {errorDetails.retryable && !sent && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 rounded border hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">{t('Retry', 'إعادة المحاولة')}</span>
              </button>
            )}
            
            {!sent ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 rounded bg-[#00A859] text-white hover:opacity-90 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">{t('Sending...', 'جاري الإرسال...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="text-sm">{t('Send to Support', 'إرسال إلى الدعم')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-[#0061A8] text-white hover:opacity-90"
              >
                {t('Close', 'إغلاق')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function mapModuleToTicketModule(module: string): string {
  const moduleMap: Record<string, string> = {
    'Dashboard': 'FM',
    'Work Orders': 'FM',
    'Properties': 'FM',
    'Finance': 'FM',
    'HR': 'FM',
    'Administration': 'FM',
    'CRM': 'FM',
    'Marketplace': 'Souq',
    'Support': 'Other',
    'Compliance': 'FM',
    'Reports': 'FM',
    'System': 'Other',
    'Authentication': 'Account',
    'UI': 'Other',
    'Network': 'Other'
  };
  return moduleMap[module] || 'Other';
}

function mapSeverityToPriority(severity: string): string {
  switch (severity) {
    case 'P0': return 'Urgent';
    case 'P1': return 'High';
    case 'P2': return 'Medium';
    case 'P3': return 'Low';
    default: return 'Medium';
  }
}

function formatTicketDescription(errorDetails: any, incidentId: string, language: string): string {
  const isArabic = language === 'ar';
  
  const sections = [
    `🚨 **${isArabic ? 'تقرير خطأ تلقائي' : 'Automated Error Report'}**`,
    '',
    `**${isArabic ? 'معرف الحادثة' : 'Incident ID'}:** \`${incidentId}\``,
    `**${isArabic ? 'رمز الخطأ' : 'Error Code'}:** \`${errorDetails.code}\``,
    `**${isArabic ? 'الوحدة' : 'Module'}:** ${errorDetails.module}`,
    `**${isArabic ? 'الخطورة' : 'Severity'}:** ${errorDetails.severity}`,
    '',
    `**${isArabic ? 'الوصف' : 'Description'}:**`,
    errorDetails.title,
    errorDetails.description || '',
  ];

  if (errorDetails.errors && errorDetails.errors.length > 0) {
    sections.push(
      '',
      `**${isArabic ? 'تفاصيل الأخطاء' : 'Error Details'}:**`
    );
    errorDetails.errors.forEach((err: any, i: number) => {
      sections.push(`${i + 1}. ${err.path ? `[${err.path}] ` : ''}${err.message}`);
    });
  }

  if (errorDetails.userAction) {
    sections.push(
      '',
      `**${isArabic ? 'الإجراء المقترح' : 'Suggested Action'}:**`,
      errorDetails.userAction
    );
  }

  sections.push(
    '',
    '---',
    '',
    `*${isArabic ? 'تم إنشاء هذه التذكرة تلقائيًا من نظام معالجة الأخطاء.' : 'This ticket was automatically created from the error handling system.'}*`
  );

  return sections.join('\n');
}
