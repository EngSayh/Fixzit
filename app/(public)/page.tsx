'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import LanguageSwitcher from '../../src/components/shared/LanguageSwitcher';
import { useTranslation } from '../../contexts/I18nContext';
import { GlassButton, GlassCard, GlassPanel, GlassInput, AnimatedKPI } from '../../src/components/theme';
import { 
  Search, Sparkles, Building2, Wrench, DollarSign, ShoppingCart, 
  Users, Star, ArrowRight, CheckCircle, Globe, LogIn,
  BarChart, FileText, UserCheck, TrendingUp
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { t, isRTL, switchLanguage } = useTranslation();

  const enterpriseFeatures = [
    {
      icon: <Building2 className="w-8 h-8 text-white" />,
      title: isRTL ? 'إدارة الممتلكات' : 'Property Management',
      description: isRTL 
        ? 'إدارة شاملة للعقارات مع تتبع الوحدات والمستأجرين'
        : 'Complete property management with units and tenant tracking',
      color: 'from-blue-600 to-blue-500'
    },
    {
      icon: <Wrench className="w-8 h-8 text-white" />,
      title: isRTL ? 'أوامر العمل' : 'Work Orders',
      description: isRTL
        ? 'نظام متكامل لإدارة الصيانة والإصلاحات'
        : 'Integrated maintenance and repair management system',
      color: 'from-green-600 to-green-500'
    },
    {
      icon: <DollarSign className="w-8 h-8 text-white" />,
      title: isRTL ? 'المالية والمحاسبة' : 'Finance & Accounting',
      description: isRTL
        ? 'إدارة مالية كاملة مع الفواتير والمدفوعات'
        : 'Complete financial management with invoicing and payments',
      color: 'from-yellow-600 to-yellow-500'
    },
    {
      icon: <UserCheck className="w-8 h-8 text-white" />,
      title: isRTL ? 'إدارة العملاء' : 'CRM',
      description: isRTL
        ? 'نظام متقدم لإدارة علاقات العملاء'
        : 'Advanced customer relationship management system',
      color: 'from-purple-600 to-purple-500'
    },
    {
      icon: <ShoppingCart className="w-8 h-8 text-white" />,
      title: isRTL ? 'السوق الإلكتروني' : 'Marketplace',
      description: isRTL
        ? 'سوق متكامل للموردين والمقاولين'
        : 'Integrated marketplace for vendors and contractors',
      color: 'from-orange-600 to-orange-500'
    },
    {
      icon: <BarChart className="w-8 h-8 text-white" />,
      title: isRTL ? 'التقارير والتحليلات' : 'Reports & Analytics',
      description: isRTL
        ? 'تقارير شاملة ولوحات معلومات تفاعلية'
        : 'Comprehensive reports and interactive dashboards',
      color: 'from-indigo-600 to-indigo-500'
    }
  ];

  return (
    <div className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed w-full z-50 transition-all duration-300">
        <GlassPanel variant="header" blur="xl" gradient glow className="border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex justify-between items-center h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2`}>
                <Sparkles className="w-8 h-8 text-white animate-float" />
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
                  FIXZIT SOUQ
                </span>
              </div>
              
              <nav className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <LanguageSwitcher />
                <GlassButton
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Link href="/login">{t('common.login')}</Link>
                </GlassButton>
              </nav>
            </div>
          </div>
        </GlassPanel>
      </header>

      {/* Hero Section with Blue Gradient */}
      <section className="min-h-screen flex items-center justify-center px-4 pt-20 relative overflow-hidden">
        {/* Blue Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0061A8] via-[#004080] to-[#002850]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Content */}
        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Main Title */}
          <div className="mb-12 animate-slide-up">
            <div className="mb-8">
              <Sparkles className="w-16 h-16 text-[#00A859] mx-auto mb-6 animate-float" />
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white via-white/95 to-white/90 bg-clip-text text-transparent">
                FIXZIT SOUQ
              </span>
            </h1>
            <p className="text-2xl text-white/90 mb-2 font-semibold">
              {isRTL ? 'منصة إدارة الممتلكات الرائدة' : 'The Leading Property Management Platform'}
            </p>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">
              {isRTL 
                ? 'حل متكامل لإدارة العقارات والمرافق مع سوق إلكتروني للموردين'
                : 'Complete solution for property and facility management with vendor marketplace'
              }
            </p>
          </div>
          
          {/* Main 3 Buttons Row */}
          <div className={`flex flex-wrap justify-center gap-6 mb-16 animate-slide-up ${isRTL ? 'flex-row-reverse' : ''}`} style={{animationDelay: '200ms'}}>
            {/* Arabic Button */}
            <GlassButton
              size="lg"
              variant="secondary"
              onClick={() => switchLanguage(isRTL ? 'en' : 'ar')}
              className="bg-white/20 text-white border-white/40 hover:bg-white/30 px-8 py-4 text-lg font-semibold min-w-[180px]"
            >
              <span className="text-2xl mr-2">🇸🇦</span>
              {isRTL ? 'English' : 'العربية'}
            </GlassButton>
            
            {/* Fixzit Souq Button */}
            <GlassButton
              size="lg"
              variant="primary"
              onClick={() => router.push('/marketplace')}
              className="bg-[#00A859]/30 text-white border-[#00A859]/50 hover:bg-[#00A859]/40 px-8 py-4 text-lg font-semibold min-w-[180px]"
              icon={<ShoppingCart className="w-6 h-6" />}
            >
              Fixzit Souq
            </GlassButton>
            
            {/* Access Fixzit Button */}
            <GlassButton
              size="lg"
              variant="secondary"
              onClick={() => router.push('/login')}
              className="bg-white/20 text-white border-white/40 hover:bg-white/30 px-8 py-4 text-lg font-semibold min-w-[180px]"
              icon={<LogIn className="w-6 h-6" />}
            >
              {isRTL ? 'دخول النظام' : 'Access Fixzit'}
            </GlassButton>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 animate-slide-up" style={{animationDelay: '400ms'}}>
            <div className="glass-weak rounded-xl p-4">
              <div className="text-3xl font-bold text-white mb-1">1,250+</div>
              <div className="text-white/80 text-sm">{isRTL ? 'عقار مُدار' : 'Properties'}</div>
            </div>
            <div className="glass-weak rounded-xl p-4">
              <div className="text-3xl font-bold text-white mb-1">8,450+</div>
              <div className="text-white/80 text-sm">{isRTL ? 'أمر عمل' : 'Work Orders'}</div>
            </div>
            <div className="glass-weak rounded-xl p-4">
              <div className="text-3xl font-bold text-white mb-1">320+</div>
              <div className="text-white/80 text-sm">{isRTL ? 'مورد نشط' : 'Vendors'}</div>
            </div>
            <div className="glass-weak rounded-xl p-4">
              <div className="text-3xl font-bold text-[#00A859] mb-1">98%</div>
              <div className="text-white/80 text-sm">{isRTL ? 'رضا العملاء' : 'Satisfaction'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features Grid */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#0061A8] to-[#004080] bg-clip-text text-transparent">
                {isRTL ? 'ميزات المؤسسات' : 'Enterprise Features'}
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-3xl mx-auto">
              {isRTL 
                ? 'منصة متكاملة تجمع كل ما تحتاجه لإدارة ممتلكاتك بكفاءة'
                : 'Integrated platform that brings together everything you need to manage your properties efficiently'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {enterpriseFeatures.map((feature, index) => (
              <GlassCard 
                key={index}
                className="p-8 hover:shadow-2xl transition-all duration-500 animate-slide-up bg-white/80 dark:bg-gray-800/80" 
                hover 
                glow
                style={{animationDelay: `${(index + 1) * 100}ms`}}
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-[#00A859] text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>{isRTL ? 'متوفر الآن' : 'Available Now'}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#0061A8] to-[#004080] relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            {isRTL ? 'ابدأ رحلتك مع فكزت سوق اليوم' : 'Start Your Journey with Fixzit Souq Today'}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {isRTL 
              ? 'انضم إلى آلاف الشركات التي تثق بنا في إدارة ممتلكاتها'
              : 'Join thousands of companies that trust us with their property management'
            }
          </p>
          <div className={`flex flex-wrap justify-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <GlassButton
              size="lg"
              onClick={() => router.push('/login')}
              className="bg-white/20 text-white border-white/40 hover:bg-white/30 px-10 py-4 text-lg font-bold"
            >
              {isRTL ? 'ابدأ الآن' : 'Get Started'}
            </GlassButton>
            <GlassButton
              size="lg"
              variant="secondary"
              onClick={() => router.push('/marketplace')}
              className="bg-transparent text-white border-white/40 hover:bg-white/10 px-10 py-4 text-lg font-bold"
            >
              {isRTL ? 'استكشف السوق' : 'Explore Marketplace'}
            </GlassButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col items-center">
            {/* Fixzit Logo */}
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-10 h-10 text-[#00A859] animate-float" />
              <span className="text-3xl font-bold">FIXZIT</span>
            </div>
            
            {/* Links */}
            <div className={`flex flex-wrap justify-center gap-8 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Link href="/about" className="text-white/80 hover:text-white transition-colors">
                {isRTL ? 'حول فكزت' : 'About Fixzit'}
              </Link>
              <Link href="/features" className="text-white/80 hover:text-white transition-colors">
                {isRTL ? 'المميزات' : 'Features'}
              </Link>
              <Link href="/pricing" className="text-white/80 hover:text-white transition-colors">
                {isRTL ? 'الأسعار' : 'Pricing'}
              </Link>
              <Link href="/support" className="text-white/80 hover:text-white transition-colors">
                {isRTL ? 'الدعم' : 'Support'}
              </Link>
              <Link href="/contact" className="text-white/80 hover:text-white transition-colors">
                {isRTL ? 'اتصل بنا' : 'Contact Us'}
              </Link>
            </div>
            
            {/* Copyright */}
            <div className="text-center pt-8 border-t border-white/10 w-full">
              <p className="text-white/60">
                © 2025 Fixzit Souq. {isRTL ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}