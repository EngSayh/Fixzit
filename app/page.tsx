'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [isRTL, setIsRTL] = useState(false)

  // Language / RTL toggle function
  const toggleLang = () => {
    const html = document.documentElement;
    const now = html.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
    html.setAttribute('dir', now);
    html.setAttribute('lang', now === 'rtl' ? 'ar' : 'en');
    setIsRTL(now === 'rtl');
  }

  // Check initial language on load
  useEffect(() => {
    const html = document.documentElement;
    setIsRTL(html.getAttribute('dir') === 'rtl');
  }, [])

  // Arabic translations
  const translations = {
    en: {
      brand: "Fixzit Enterprise",
      searchPlaceholder: "Search features, pricing...",
      heroTitle: "Facility Management + Marketplace",
      heroSubtitle: "Operate properties, dispatch work orders, and source vendors in one platform.",
      arabicBtn: "العربية",
      souqBtn: "Fixzit Souq",
      accessBtn: "Access Fixzit",
      loginBtn: "Login",
      features: [
        "Properties & Units",
        "Work Orders & PM", 
        "Finance & ZATCA",
        "HR (Technicians)",
        "CRM & Support",
        "Compliance & Legal",
        "Reports & Analytics",
        "Fixzit Souq (Vendors)"
      ],
      footer: "© 2025 Fixzit Enterprise — Version 1.0"
    },
    ar: {
      brand: "فيكزيت إنتربرايز",
      searchPlaceholder: "البحث في الميزات والأسعار...",
      heroTitle: "إدارة المرافق + السوق",
      heroSubtitle: "تشغيل العقارات، وإرسال أوامر العمل، وتوريد البائعين في منصة واحدة.",
      arabicBtn: "English",
      souqBtn: "سوق فيكزيت",
      accessBtn: "الوصول إلى فيكزيت",
      loginBtn: "تسجيل الدخول",
      features: [
        "العقارات والوحدات",
        "أوامر العمل والصيانة الوقائية",
        "المالية وضريبة القيمة المضافة",
        "الموارد البشرية (الفنيين)",
        "إدارة العملاء والدعم",
        "الامتثال والقانوني",
        "التقارير والتحليلات",
        "سوق فيكزيت (البائعين)"
      ],
      footer: "© 2025 فيكزيت إنتربرايز — الإصدار 1.0"
    }
  }

  const t = translations[isRTL ? 'ar' : 'en']

  return (
    <>
      {/* Top bar (public) */}
      <div className="fxz-topbar">
        <div className="fxz-brand">{t.brand}</div>
        <div className="fxz-top-actions">
          <div className="fxz-search">
            <svg width="16" height="16" fill="white">
              <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="2" fill="none"/>
              <line x1="11" y1="11" x2="15" y2="15" stroke="white" strokeWidth="2"/>
            </svg>
            <input placeholder={t.searchPlaceholder}/>
          </div>
          <button className="fxz-btn secondary" onClick={toggleLang}>EN / عربي</button>
          <a className="fxz-btn primary" href="/dashboard">{t.loginBtn}</a>
        </div>
      </div>

      {/* Hero */}
      <section className="fxz-hero">
        <h1>{t.heroTitle}</h1>
        <p>{t.heroSubtitle}</p>
        <div className="fxz-cta">
          <button className="fxz-btn warn" onClick={toggleLang}>{t.arabicBtn}</button>
          <a className="fxz-btn secondary" href="/marketplace">{t.souqBtn}</a>
          <a className="fxz-btn primary" href="/dashboard">{t.accessBtn}</a>
        </div>
      </section>

      {/* Feature highlights */}
      <div className="fxz-content">
        <div className="fxz-grid cols-4">
          {t.features.map((feature, index) => (
            <div key={index} className="fxz-card">{feature}</div>
          ))}
        </div>
      </div>

      <div className="fxz-footer">{t.footer}</div>
    </>
  )
}
