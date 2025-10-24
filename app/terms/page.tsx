'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { FileText, Scale, AlertCircle, Mail, Phone } from 'lucide-react';

/**
 * Default terms of service content shown when CMS content is not available or not published.
 */
const DEFAULT_TERMS_CONTENT = `# Terms of Service

**Last Updated:** October 24, 2025

## Agreement to Terms
By accessing and using Fixzit Enterprise ("Service"), you agree to be bound by these Terms of Service.

## Use of Service
### Acceptable Use
- Use the Service only for lawful purposes
- Maintain the security of your account credentials
- Do not interfere with or disrupt the Service
- Do not attempt to gain unauthorized access

### Prohibited Activities
- Violating laws or regulations
- Infringing intellectual property rights
- Distributing malware or harmful code
- Engaging in fraudulent activities
- Harassing or abusing other users

## User Accounts
### Registration
- Provide accurate and complete information
- Maintain the security of your password
- Notify us immediately of any unauthorized access

### Account Termination
We reserve the right to suspend or terminate accounts that violate these terms.

## Intellectual Property
All content, features, and functionality are owned by Fixzit Enterprise and protected by international copyright, trademark, and other intellectual property laws.

## Service Availability
- We strive for 99.9% uptime but do not guarantee uninterrupted access
- Scheduled maintenance will be announced in advance
- We are not liable for service disruptions beyond our control

## Data and Privacy
Your use of the Service is also governed by our Privacy Policy. We collect and use data as described in that policy.

## Limitation of Liability
Fixzit Enterprise shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.

## Indemnification
You agree to indemnify and hold harmless Fixzit Enterprise from any claims arising from your use of the Service or violation of these terms.

## Modifications to Terms
We reserve the right to modify these terms at any time. Continued use of the Service constitutes acceptance of modified terms.

## Governing Law
These terms are governed by the laws of the United Arab Emirates.

## Dispute Resolution
Any disputes shall be resolved through:
1. Good faith negotiation
2. Mediation
3. Binding arbitration in Dubai, UAE

## Contact
For questions about these terms:
- Email: legal@fixzit.com
- Phone: +971 XX XXX XXXX

## Severability
If any provision of these terms is found to be unenforceable, the remaining provisions will continue in full force and effect.`;

/**
 * Terms of Service Page (Public View)
 * 
 * Displays terms of service managed through CMS admin interface.
 * Fetches from /api/cms/pages/terms and falls back to default content.
 * Supports RTL languages and responsive design.
 * 
 * @returns Terms page with hero, info cards, content, and contact sections
 */
export default function TermsPage() {
  const { t, isRTL } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadTermsContent = useCallback(async () => {
    try {
      const response = await fetch('/api/cms/pages/terms');
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'PUBLISHED') {
          setTitle(data.title);
          setContent(data.content);
        } else {
          setTitle(t('terms.title', 'Terms of Service'));
          setContent(DEFAULT_TERMS_CONTENT);
        }
      } else {
        setTitle(t('terms.title', 'Terms of Service'));
        setContent(DEFAULT_TERMS_CONTENT);
      }
    } catch (err) {
      console.error('Error fetching terms content:', err);
      setTitle(t('terms.title', 'Terms of Service'));
      setContent(DEFAULT_TERMS_CONTENT);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTermsContent();
  }, [loadTermsContent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-500 via-brand-500 to-success text-white py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Scale className="w-12 h-12" />
            <h1 className="text-4xl font-bold">{title}</h1>
          </div>
          <p className="text-xl opacity-90">
            {t('terms.subtitle', 'Please read these terms carefully before using our services.')}
          </p>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="py-8 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-primary-lightest)] rounded-lg">
              <FileText className="w-8 h-8 text-[var(--fixzit-primary)] flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('terms.binding', 'Legally Binding')}</div>
                <div className="text-sm text-gray-600">{t('terms.bindingDesc', 'Enforceable agreement')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-success-lightest)] rounded-lg">
              <Scale className="w-8 h-8 text-[var(--fixzit-success)] flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('terms.fair', 'Fair Terms')}</div>
                <div className="text-sm text-gray-600">{t('terms.fairDesc', 'Balanced rights')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-secondary-lightest)] rounded-lg">
              <AlertCircle className="w-8 h-8 text-[var(--fixzit-secondary)] flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('terms.clear', 'Clear Language')}</div>
                <div className="text-sm text-gray-600">{t('terms.clearDesc', 'Easy to understand')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-accent-lightest)] rounded-lg">
              <FileText className="w-8 h-8 text-[var(--fixzit-accent)] flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('terms.updated', 'Regularly Updated')}</div>
                <div className="text-sm text-gray-600">{t('terms.updatedDesc', 'Kept current')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 md:p-12">
            <article className={`prose prose-lg max-w-none ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {content}
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Mail className="w-6 h-6 text-[var(--fixzit-primary)]" />
              {t('terms.contactTitle', 'Questions About Terms?')}
            </h2>
            <p className="text-gray-700 mb-6">
              {t('terms.contactDesc', 'Contact our legal team for clarification about these terms of service.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('terms.email', 'Email')}</div>
                  <a href="mailto:legal@fixzit.com" className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darker)]">
                    legal@fixzit.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('terms.phone', 'Phone')}</div>
                  <a href="tel:+971XXXXXXXX" className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darker)]">
                    +971 XX XXX XXXX
                  </a>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {t('terms.lastUpdated', 'Last Updated')}: <span className="font-semibold">October 24, 2025</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
