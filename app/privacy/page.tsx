'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Shield, Lock, Eye, FileText, Mail, Phone } from 'lucide-react';

/**
 * Default privacy policy content shown when CMS content is not available or not published.
 * Defined at module level to prevent recreation on each render.
 */
const DEFAULT_PRIVACY_CONTENT = `# Privacy Policy

**Last Updated:** October 16, 2025

## Introduction
Welcome to Fixzit Enterprise. We protect your privacy and secure your personal information.

## Information We Collect
- Personal information (name, email, phone)
- Corporate ID and employee information  
- Usage data and analytics
- Work order and property data

## How We Use Your Information
For service delivery, account management, communication, analytics, security, and legal compliance.

## Data Security
Industry-standard security: encryption, access controls, regular audits, 24/7 monitoring.

## Your Rights
Access, correct, delete, export your data, and opt-out of marketing communications.

## Contact
For privacy inquiries: privacy@fixzit.com | Phone: +971 XX XXX XXXX`;

/**
 * Privacy Policy Page (Public View)
 * 
 * Displays privacy policy content managed through CMS admin interface.
 * Fetches from /api/cms/pages/privacy and falls back to default content.
 * Supports RTL languages and responsive design.
 * 
 * @returns Privacy policy page with hero, info cards, content, and contact sections
 */
export default function PrivacyPage() {
  const { t, isRTL } = useTranslation();
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadPrivacyPolicy = useCallback(async () => {
    try {
      const response = await fetch('/api/cms/pages/privacy');
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'PUBLISHED') {
          setTitle(data.title);
          setContent(data.content);
        } else {
          setTitle(t('privacy.title', 'Privacy Policy'));
          setContent(DEFAULT_PRIVACY_CONTENT);
        }
      } else {
        setTitle(t('privacy.title', 'Privacy Policy'));
        setContent(DEFAULT_PRIVACY_CONTENT);
      }
    } catch (err) {
      console.error('Error fetching privacy policy:', err);
      setTitle(t('privacy.title', 'Privacy Policy'));
      setContent(DEFAULT_PRIVACY_CONTENT);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPrivacyPolicy();
  }, [loadPrivacyPolicy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0061A8] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0061A8] via-[#0061A8] to-[#00A859] text-white py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-12 h-12" />
            <h1 className="text-4xl font-bold">{title}</h1>
          </div>
          <p className="text-xl opacity-90">
            {t('privacy.subtitle', 'Your privacy is our priority. Learn how we protect and manage your data.')}
          </p>
        </div>
      </section>

      {/* Quick Info Cards */}
      <section className="py-8 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Lock className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('privacy.encrypted', 'Encrypted')}</div>
                <div className="text-sm text-gray-600">{t('privacy.encryptedDesc', 'End-to-end encryption')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Eye className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('privacy.transparent', 'Transparent')}</div>
                <div className="text-sm text-gray-600">{t('privacy.transparentDesc', 'Clear data usage')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Shield className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('privacy.compliant', 'Compliant')}</div>
                <div className="text-sm text-gray-600">{t('privacy.compliantDesc', 'GDPR & CCPA certified')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
              <FileText className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-gray-900">{t('privacy.yourRights', 'Your Rights')}</div>
                <div className="text-sm text-gray-600">{t('privacy.yourRightsDesc', 'Full data control')}</div>
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
              <Mail className="w-6 h-6 text-blue-600" />
              {t('privacy.contactTitle', 'Privacy Questions?')}
            </h2>
            <p className="text-gray-700 mb-6">
              {t('privacy.contactDesc', 'Contact our Privacy Officer for questions about privacy practices or to exercise your rights.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('privacy.email', 'Email')}</div>
                  <a href="mailto:privacy@fixzit.com" className="text-blue-600 hover:text-blue-800">
                    privacy@fixzit.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('privacy.phone', 'Phone')}</div>
                  <a href="tel:+971XXXXXXXX" className="text-blue-600 hover:text-blue-800">
                    +971 XX XXX XXXX
                  </a>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {t('privacy.lastUpdated', 'Last Updated')}: <span className="font-semibold">October 16, 2025</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
