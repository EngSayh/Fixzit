'use client'

import { useState, useEffect } from 'react'

export default function System() {
  const [isRTL, setIsRTL] = useState(false)

  const toggleLang = () => {
    const html = document.documentElement;
    const now = html.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
    html.setAttribute('dir', now);
    html.setAttribute('lang', now === 'rtl' ? 'ar' : 'en');
    setIsRTL(now === 'rtl');
  }

  useEffect(() => {
    const html = document.documentElement;
    setIsRTL(html.getAttribute('dir') === 'rtl');
  }, [])

  const translations = {
    en: {
      brand: "System Management",
      newUser: "+ Add User",
      langBtn: "EN / عربي",
      core: "Core",
      business: "Business",
      dashboard: "Dashboard",
      workOrders: "Work Orders",
      properties: "Properties",
      finance: "Finance",
      hr: "HR",
      crm: "CRM",
      marketplace: "Fixzit Souq",
      support: "Support",
      compliance: "Compliance",
      reports: "Reports",
      system: "System Mgmt.",
      users: "Users",
      tenants: "Tenants",
      integrations: "Integrations",
      audit: "Audit Log",
      username: "Username",
      email: "Email",
      role: "Role",
      status: "Status",
      lastLogin: "Last Login",
      admin: "Admin",
      manager: "Manager",
      user: "User",
      active: "Active",
      inactive: "Inactive",
      footer: "© 2025 Fixzit Enterprise — Version 1.0"
    },
    ar: {
      brand: "إدارة النظام",
      newUser: "+ إضافة مستخدم",
      langBtn: "EN / عربي",
      core: "الأساسية",
      business: "الأعمال",
      dashboard: "لوحة التحكم",
      workOrders: "أوامر العمل",
      properties: "العقارات",
      finance: "المالية",
      hr: "الموارد البشرية",
      crm: "إدارة العملاء",
      marketplace: "سوق فيكزيت",
      support: "الدعم",
      compliance: "الامتثال",
      reports: "التقارير",
      system: "إدارة النظام",
      users: "المستخدمون",
      tenants: "المستأجرون",
      integrations: "التكاملات",
      audit: "سجل التدقيق",
      username: "اسم المستخدم",
      email: "البريد الإلكتروني",
      role: "الدور",
      status: "الحالة",
      lastLogin: "آخر تسجيل دخول",
      admin: "مدير",
      manager: "مدير",
      user: "مستخدم",
      active: "نشط",
      inactive: "غير نشط",
      footer: "© 2025 فيكزيت إنتربرايز — الإصدار 1.0"
    }
  }

  const t = translations[isRTL ? 'ar' : 'en']

  return (
    <>
      <div className="fxz-topbar">
        <div className="fxz-brand">{t.brand}</div>
        <div className="fxz-top-actions">
          <button className="fxz-btn primary" onClick={() => alert('Add User')}>{t.newUser}</button>
          <button className="fxz-btn secondary" onClick={toggleLang}>{t.langBtn}</button>
        </div>
      </div>

      <div className="fxz-app">
        <aside className="fxz-sidebar">
          <div className="fxz-sidehead">{t.core}</div>
          <nav className="fxz-nav">
            <a href="/dashboard">🏠 <span>{t.dashboard}</span></a>
            <a href="/work-orders">🧰 <span>{t.workOrders}</span></a>
            <a href="/properties">🏢 <span>{t.properties}</span></a>
            <a href="/finance">💳 <span>{t.finance}</span></a>
            <a href="/hr">👥 <span>{t.hr}</span></a>
          </nav>
          <div className="fxz-sidehead">{t.business}</div>
          <nav className="fxz-nav">
            <a href="/crm">📇 <span>{t.crm}</span></a>
            <a href="/marketplace">🛍️ <span>{t.marketplace}</span></a>
            <a href="/support">🎧 <span>{t.support}</span></a>
            <a href="/compliance">🛡️ <span>{t.compliance}</span></a>
            <a href="/reports">📊 <span>{t.reports}</span></a>
            <a href="/system" className="active">⚙️ <span>{t.system}</span></a>
          </nav>
        </aside>

        <main className="fxz-main">
          <div className="fxz-content">
            <h2 style={{margin: '0 0 6px'}}>{t.system}</h2>
            <div className="fxz-pills" data-tabs="system">
              <button className="fxz-pill active" data-tab="users" onClick={() => {
                document.querySelectorAll('[data-tabs="system"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'users');
                });
                document.querySelectorAll('[data-panels="system"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'users');
                });
              }}>{t.users}</button>
              <button className="fxz-pill" data-tab="tenants" onClick={() => {
                document.querySelectorAll('[data-tabs="system"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'tenants');
                });
                document.querySelectorAll('[data-panels="system"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'tenants');
                });
              }}>{t.tenants}</button>
              <button className="fxz-pill" data-tab="integrations" onClick={() => {
                document.querySelectorAll('[data-tabs="system"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'integrations');
                });
                document.querySelectorAll('[data-panels="system"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'integrations');
                });
              }}>{t.integrations}</button>
              <button className="fxz-pill" data-tab="audit" onClick={() => {
                document.querySelectorAll('[data-tabs="system"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'audit');
                });
                document.querySelectorAll('[data-panels="system"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'audit');
                });
              }}>{t.audit}</button>
            </div>

            <div data-panels="system">
              <section data-panel="users">
                <table className="fxz-table">
                  <thead>
                    <tr>
                      <th>{t.username}</th>
                      <th>{t.email}</th>
                      <th>{t.role}</th>
                      <th>{t.status}</th>
                      <th>{t.lastLogin}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>admin</td>
                      <td>admin@fixzit.com</td>
                      <td style={{color: '#DC2626'}}>{t.admin}</td>
                      <td style={{color: '#16A34A'}}>{t.active}</td>
                      <td>2024-01-15 14:30</td>
                    </tr>
                    <tr>
                      <td>manager1</td>
                      <td>manager@fixzit.com</td>
                      <td style={{color: '#FACC15'}}>{t.manager}</td>
                      <td style={{color: '#16A34A'}}>{t.active}</td>
                      <td>2024-01-15 12:15</td>
                    </tr>
                    <tr>
                      <td>user1</td>
                      <td>user@fixzit.com</td>
                      <td style={{color: '#2563EB'}}>{t.user}</td>
                      <td style={{color: '#FACC15'}}>{t.inactive}</td>
                      <td>2024-01-10 09:45</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="fxz-hidden" data-panel="tenants">
                <div className="fxz-card">Multi-tenant management and configuration</div>
              </section>

              <section className="fxz-hidden" data-panel="integrations">
                <div className="fxz-card">Third-party integrations and API management</div>
              </section>

              <section className="fxz-hidden" data-panel="audit">
                <div className="fxz-card">System audit logs and security monitoring</div>
              </section>
            </div>
          </div>
          <div className="fxz-footer">{t.footer}</div>
        </main>
      </div>
    </>
  )
}

