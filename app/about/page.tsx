import { getServerI18n } from '@/lib/i18n/server';
import { Building2, Users, Target, Award, MapPin, Phone, Mail } from 'lucide-react';
import { renderMarkdownSanitized } from '@/lib/markdown';

/**
 * Default about content shown when CMS content is not available or not published.
 */
const DEFAULT_ABOUT_CONTENT = `# About Fixzit Enterprise

**Your Trusted Partner in Facilities Management**

## Who We Are
Fixzit Enterprise is a leading facilities management and maintenance solution provider, dedicated to transforming how organizations manage their properties, assets, and maintenance operations.

## Our Mission
To empower organizations with innovative, efficient, and user-friendly tools that streamline facilities management, reduce operational costs, and enhance service delivery.

## What We Do
- **Comprehensive Facilities Management**: End-to-end solutions for property and asset management
- **Smart Maintenance Scheduling**: AI-powered preventive and predictive maintenance
- **Work Order Management**: Streamlined request-to-resolution workflows
- **Vendor & Contractor Management**: Centralized vendor coordination and performance tracking
- **Real-time Analytics**: Data-driven insights for better decision-making
- **Mobile-First Approach**: Access your facilities from anywhere, anytime

## Why Choose Us
- **15+ Years of Industry Experience**
- **Trusted by 500+ Organizations**
- **99.9% Platform Uptime**
- **24/7 Customer Support**
- **ISO 9001:2015 Certified**
- **GDPR & Data Security Compliant**

## Our Values
**Excellence**: Delivering superior quality in every interaction
**Innovation**: Continuously improving through technology
**Integrity**: Building trust through transparency
**Customer Focus**: Your success is our priority`;

/**
 * About Us Page (Public View)
 * 
 * Displays company information and values managed through CMS admin interface.
 * Fetches from /api/cms/pages/about and falls back to default content.
 * Supports RTL languages and responsive design.
 * 
 * @returns About page with hero, stats, content, and contact sections
 */
export default async function AboutPage() {
  // Server-side minimal i18n
  const { t, isRTL } = await getServerI18n();

  // Server fetch of CMS about page. Server components can await fetch directly.
  let title = t('about.title', 'About Us');
  let content = DEFAULT_ABOUT_CONTENT;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/cms/pages/about`, {
      // force no-store so latest content is fetched server-side; adjust if caching required
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.status === 'PUBLISHED') {
        title = data.title || title;
        content = data.content || content;
      }
    }
  } catch (_err) {
    // swallow errors and use default content
    // console.error('Error fetching about content (server):', err);
  }

  const renderedContent = await renderMarkdownSanitized(content);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0061A8] via-[#0061A8] to-[#00A859] text-white py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="flex items-center gap-4 mb-4">
            <Building2 className="w-12 h-12" />
            <h1 className="text-4xl font-bold">{title}</h1>
          </div>
          <p className="text-xl opacity-90">
            {t('about.subtitle', 'Building better facilities management solutions for the modern enterprise.')}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-primary-lightest)] rounded-lg">
              <Users className="w-8 h-8 text-[var(--fixzit-primary)] flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-gray-900">500+</div>
                <div className="text-sm text-gray-600">{t('about.clients', 'Clients Worldwide')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-success-lightest)] rounded-lg">
              <Target className="w-8 h-8 text-[var(--fixzit-success)] flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-gray-900">99.9%</div>
                <div className="text-sm text-gray-600">{t('about.uptime', 'Platform Uptime')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-secondary-lightest)] rounded-lg">
              <Award className="w-8 h-8 text-[var(--fixzit-secondary)] flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-gray-900">15+</div>
                <div className="text-sm text-gray-600">{t('about.experience', 'Years Experience')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--fixzit-accent-lightest)] rounded-lg">
              <Building2 className="w-8 h-8 text-[var(--fixzit-accent)] flex-shrink-0" />
              <div>
                <div className="text-2xl font-bold text-gray-900">10K+</div>
                <div className="text-sm text-gray-600">{t('about.properties', 'Properties Managed')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 md:p-12">
            <article className={`prose prose-lg max-w-none ${isRTL ? 'text-right' : 'text-left'} prose-headings:text-[var(--fixzit-text)] prose-a:text-[var(--fixzit-primary)] prose-strong:text-[var(--fixzit-text)]`}>
              <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
            </article>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-[var(--fixzit-primary)]" />
              {t('about.contactTitle', 'Get in Touch')}
            </h2>
            <p className="text-gray-700 mb-6">
              {t('about.contactDesc', 'Have questions about our services? Our team is here to help you get started.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('about.email', 'Email')}</div>
                  <a href="mailto:info@fixzit.com" className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darker)]">
                    info@fixzit.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{t('about.phone', 'Phone')}</div>
                  <a href="tel:+971XXXXXXXX" className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darker)]">
                    +971 XX XXX XXXX
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
