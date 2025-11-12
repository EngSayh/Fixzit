'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Loader2 } from 'lucide-react';
import { STORAGE_KEYS } from '@/config/constants';

// ============================================================================
// API HELPER
// ============================================================================

const api = async (url: string, opts?: RequestInit) => {
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const res = await fetch(url, { ...opts, headers: { ...headers, ...opts?.headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(`SupportPopup API error for ${url}:`, error);
    throw error;
  }
};

// ============================================================================
// INTERFACES
// ============================================================================

interface ErrorDetails {
  error?: { name?: string; message?: string; stack?: string; componentStack?: string };
  errorId?: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  viewport?: string;
  type?: string;
  system?: {
    platform?: string;
    language?: string;
    onLine?: boolean;
    memory?: {
      used?: number;
      total?: number;
      limit?: number;
    } | null;
  };
  localStorage?: {
    hasAuth?: boolean;
    hasUser?: boolean;
    hasLang?: boolean;
    hasTheme?: boolean;
  };
}

interface ISupportPopupProps {
  open: boolean;
  onClose: () => void;
  errorDetails?: ErrorDetails;
}

// ============================================================================
// MODULE OPTIONS
// ============================================================================

const MODULES = ['FM', 'Souq', 'Aqar', 'Account', 'Billing', 'Other'];
const CATEGORIES = ['Technical', 'Feature Request', 'Billing', 'Account', 'General', 'Bug Report'];
const TYPES = ['Bug', 'Feature', 'Complaint', 'Billing', 'Access', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const SUB_CATEGORIES: Record<string, string[]> = {
  Technical: ['Bug Report', 'Performance Issue', 'UI Error', 'API Error', 'Database Error'],
  'Feature Request': ['New Feature', 'Enhancement', 'Integration', 'Customization', 'Mobile App'],
  Billing: ['Invoice Issue', 'Payment Error', 'Subscription', 'Refund', 'Pricing'],
  Account: ['Login Issue', 'Password Reset', 'Profile Update', 'Permissions', 'Access Denied'],
  General: ['Documentation', 'Training', 'Support', 'Feedback', 'Other'],
  'Bug Report': ['Critical Bug', 'Minor Bug', 'Cosmetic Issue', 'Data Error', 'Security Issue'],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupportPopup({ open, onClose, errorDetails }: ISupportPopupProps) {
  const { t } = useTranslation();

  // ✅ i18n FIX: Use explicit key mappings instead of template literals
  const moduleKeyMap: Record<string, string> = {
    FM: 'support.modules.FM',
    Souq: 'support.modules.Souq',
    Aqar: 'support.modules.Aqar',
    Account: 'support.modules.Account',
    Billing: 'support.modules.Billing',
    Other: 'support.modules.Other'
  };

  const categoryKeyMap: Record<string, string> = {
    Technical: 'support.categories.Technical',
    'Feature Request': 'support.categories.FeatureRequest',
    Billing: 'support.categories.Billing',
    Account: 'support.categories.Account',
    General: 'support.categories.General',
    'Bug Report': 'support.categories.BugReport'
  };

  const typeKeyMap: Record<string, string> = {
    Bug: 'support.types.Bug',
    Feature: 'support.types.Feature',
    Complaint: 'support.types.Complaint',
    Billing: 'support.types.Billing',
    Access: 'support.types.Access',
    Other: 'support.types.Other'
  };

  const priorityKeyMap: Record<string, string> = {
    Low: 'support.priorities.Low',
    Medium: 'support.priorities.Medium',
    High: 'support.priorities.High',
    Urgent: 'support.priorities.Urgent'
  };

  const subCategoryKeyMap: Record<string, string> = {
    'Bug Report': 'support.subCategories.BugReport',
    'Performance Issue': 'support.subCategories.PerformanceIssue',
    'UI Error': 'support.subCategories.UIError',
    'API Error': 'support.subCategories.APIError',
    'Database Error': 'support.subCategories.DatabaseError',
    'New Feature': 'support.subCategories.NewFeature',
    Enhancement: 'support.subCategories.Enhancement',
    Integration: 'support.subCategories.Integration',
    Customization: 'support.subCategories.Customization',
    'Mobile App': 'support.subCategories.MobileApp',
    'Invoice Issue': 'support.subCategories.InvoiceIssue',
    'Payment Error': 'support.subCategories.PaymentError',
    Subscription: 'support.subCategories.Subscription',
    Refund: 'support.subCategories.Refund',
    Pricing: 'support.subCategories.Pricing',
    'Login Issue': 'support.subCategories.LoginIssue',
    'Password Reset': 'support.subCategories.PasswordReset',
    'Profile Update': 'support.subCategories.ProfileUpdate',
    Permissions: 'support.subCategories.Permissions',
    'Access Denied': 'support.subCategories.AccessDenied',
    Documentation: 'support.subCategories.Documentation',
    Training: 'support.subCategories.Training',
    Support: 'support.subCategories.Support',
    Feedback: 'support.subCategories.Feedback',
    Other: 'support.subCategories.Other',
    'Critical Bug': 'support.subCategories.CriticalBug',
    'Minor Bug': 'support.subCategories.MinorBug',
    'Cosmetic Issue': 'support.subCategories.CosmeticIssue',
    'Data Error': 'support.subCategories.DataError',
    'Security Issue': 'support.subCategories.SecurityIssue'
  };

  // Form state
  const [subject, setSubject] = useState(errorDetails ? `${t('support.errorReport', 'Error Report')}: ${errorDetails.type}` : '');
  const [moduleKey, setModule] = useState('Other');
  const [type, setType] = useState('Bug');
  const [priority, setPriority] = useState('Medium');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Technical');
  const [subCategory, setSubCategory] = useState('Bug Report');
  
  // Guest fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // UI state
  const [submitting, setSubmitting] = useState(false);

  // ✅ FIX: Use STORAGE_KEYS.userSession (updated key)
  const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.userSession);

  // Error description generator
  const generateErrorDescription = (errorDetails: ErrorDetails): string => {
    const memoryUsed = errorDetails.system?.memory?.used ? Math.round(errorDetails.system.memory.used / 1024 / 1024) : 0;
    
    return `🚨 **${t('support.autoErrorReport', 'Automated Error Report')}**

**${t('support.errorId', 'Error ID')}:** \`${errorDetails.errorId}\`
**${t('support.timestamp', 'Timestamp')}:** ${errorDetails.timestamp}
**${t('support.url', 'URL')}:** ${errorDetails.url}
**${t('support.userAgent', 'User Agent')}:** ${errorDetails.userAgent}

**${t('support.errorDetails', 'Error Details')}:**
- **${t('support.type', 'Type')}:** ${errorDetails.error?.name || t('common.unknown', 'Unknown')}
- **${t('support.message', 'Message')}:** ${errorDetails.error?.message || t('support.noMessage', 'No message available')}
- **${t('support.viewport', 'Viewport')}:** ${errorDetails.viewport}
- **${t('support.platform', 'Platform')}:** ${errorDetails.system?.platform || t('common.unknown', 'Unknown')}

**${t('support.systemInfo', 'System Information')}:**
- **${t('support.language', 'Language')}:** ${errorDetails.system?.language || t('common.unknown', 'Unknown')}
- **${t('support.onlineStatus', 'Online Status')}:** ${errorDetails.system?.onLine ? t('common.online', 'Online') : t('common.offline', 'Offline')}
${errorDetails.system?.memory ? `- **${t('support.memoryUsage', 'Memory Usage')}:** ${memoryUsed}MB ${t('support.used', 'used')}` : ''}

**${t('support.appState', 'Application State')}:**
- **${t('support.authenticated', 'Authenticated')}:** ${errorDetails.localStorage?.hasAuth ? '✅' : '❌'}
- **${t('support.userData', 'User Data')}:** ${errorDetails.localStorage?.hasUser ? '✅' : '❌'}
- **${t('support.languageSet', 'Language Set')}:** ${errorDetails.localStorage?.hasLang ? '✅' : '❌'}
- **${t('support.themeSet', 'Theme Set')}:** ${errorDetails.localStorage?.hasTheme ? '✅' : '❌'}

**${t('support.stackTrace', 'Stack Trace')}:**
\`\`\`
${errorDetails.error?.stack || t('support.noStackTrace', 'No stack trace available')}
\`\`\`

**${t('support.componentStack', 'Component Stack')}:**
\`\`\`
${errorDetails.error?.componentStack || t('support.noComponentStack', 'No component stack available')}
\`\`\`

---

*${t('support.autoCreated', 'This ticket was automatically created from an error boundary. Please investigate and resolve the issue.')}*`;
  };

  // Auto-populate fields if error details are provided
  useEffect(() => {
    if (errorDetails) {
      const errorName = errorDetails.error?.name || t('common.unknown', 'Unknown');
      const errorMsg = errorDetails.error?.message?.substring(0, 50) || '';
      setSubject(`${t('support.systemError', 'System Error')}: ${errorName} - ${errorMsg}...`);
      setModule('Other');
      setType('Bug');
      setPriority('High');
      setText(generateErrorDescription(errorDetails));
    }

  }, [errorDetails]);

  const submit = async () => {
    const payload: Record<string, unknown> = {
      subject,
      module: moduleKey,
      type,
      priority,
      text,
      category,
      subCategory,
    };

    try {
      // ✅ FIX: Use STORAGE_KEYS.userSession (updated key)
      const userSession = localStorage.getItem(STORAGE_KEYS.userSession);
      if (!userSession) {
        payload.requester = { name, email, phone };
      }

      setSubmitting(true);

      const res = await api('/api/support/tickets', { method: 'POST', body: JSON.stringify(payload) });

      // ✅ FIX: Use react-hot-toast instead of alert()
      const successMessage = `🎯 ${t('support.ticketCreated', 'Support Ticket Created Successfully')}!

${t('support.ticketId', 'Ticket ID')}: ${res.code}
${t('support.subject', 'Subject')}: ${subject}
${t('support.priority', 'Priority')}: ${priority}
${t('support.module', 'Module')}: ${moduleKey}
${t('support.type', 'Type')}: ${type}
${t('support.category', 'Category')}: ${category}
${t('support.subCategory', 'Sub-Category')}: ${subCategory}

${t('support.emailUpdates', 'You will receive updates via email. Our support team will respond within 24 hours.')}

${t('support.thankYou', 'Thank you for contacting Fixzit Support!')}

${!userSession && email ? `\n\n📧 ${t('support.welcomeEmailSent', 'Welcome Email Sent')}!\n${t('support.welcomeEmailDesc', "We've sent a welcome email to")} ${email} ${t('support.welcomeEmailNext', 'with registration instructions and next steps.')}.` : ''}`;

      toast.success(successMessage, { duration: 8000 });
      onClose();
    } catch (e: unknown) {
      console.error('Ticket creation error:', e);
      const errorMessage = e instanceof Error ? e.message : t('support.tryAgain', 'Please try again or contact support directly.');
      
      // ✅ FIX: Use react-hot-toast instead of alert()
      toast.error(`❌ ${t('support.failedToCreate', 'Failed to create ticket')}: ${errorMessage}`, { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(text || subject);
      // ✅ FIX: Use react-hot-toast instead of alert()
      toast.success(t('support.copiedToClipboard', 'Details copied to clipboard'), { duration: 2000 });
    } catch {
      toast.error(t('support.failedToCopy', 'Failed to copy to clipboard'), { duration: 2000 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t('support.createTicket', 'Create Support Ticket')}
          </DialogTitle>
          <DialogDescription>
            {t('support.description', 'Fill out the form below and our support team will get back to you within 24 hours.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Subject and Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t('support.subject', 'Subject')} *</Label>
              <Input
                id="subject"
                placeholder={t('support.subjectPlaceholder', 'Brief description of your issue')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module">{t('support.module', 'Module')}</Label>
              <Select value={moduleKey} onValueChange={setModule}>
                <SelectTrigger id="module">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(moduleKeyMap[m] || `support.modules.${m}`, m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category and Sub-Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('support.category', 'Category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(categoryKeyMap[c] || `support.categories.${c}`, c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subCategory">{t('support.subCategory', 'Sub-Category')}</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger id="subCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(SUB_CATEGORIES[category] || []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(subCategoryKeyMap[s] || `support.subCategories.${s}`, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t('support.type', 'Type')}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t_val) => (
                    <SelectItem key={t_val} value={t_val}>
                      {t(typeKeyMap[t_val] || `support.types.${t_val}`, t_val)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">{t('support.priority', 'Priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(priorityKeyMap[p] || `support.priorities.${p}`, p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('support.description', 'Description')} *</Label>
            <Textarea
              id="description"
              placeholder={t('support.descriptionPlaceholder', 'Please provide detailed information about your issue or request...')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="h-32 resize-none"
            />
          </div>

          {/* Guest-only fields */}
          {!isAuthenticated && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-2xl">
              <div className="space-y-2">
                <Label htmlFor="name">{t('support.yourName', 'Your Name')} *</Label>
                <Input
                  id="name"
                  placeholder={t('support.namePlaceholder', 'Enter your full name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email', 'Email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('support.emailPlaceholder', 'your.email@example.com')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('support.phone', 'Phone')} ({t('common.optional', 'optional')})</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('support.phonePlaceholder', '+966 XX XXX XXXX')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="secondary"
              onClick={copyDetails}
              disabled={!subject.trim() && !text.trim()}
            >
              <Copy className="w-4 h-4 me-2" />
              {t('support.copyDetails', 'Copy details')}
            </Button>
            <Button
              variant="default"
              onClick={submit}
              disabled={!subject.trim() || !text.trim() || submitting}
              data-testid="submit-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {t('support.creating', 'Creating Ticket...')}
                </>
              ) : (
                t('support.submitTicket', 'Submit Ticket')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
