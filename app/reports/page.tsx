'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function Reports() {
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
      brand: "Reports",
      newReport: "+ New Report",
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
      builder: "Report Builder",
      viewer: "Report Viewer",
      reportName: "Report Name",
      type: "Type",
      lastRun: "Last Run",
      status: "Status",
      actions: "Actions",
      financial: "Financial",
      operational: "Operational",
      ready: "Ready",
      running: "Running",
      error: "Error",
      footer: "© 2025 Fixzit Enterprise — Version 1.0"
    },
    ar: {
      brand: "التقارير",
      newReport: "+ تقرير جديد",
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
      builder: "منشئ التقارير",
      viewer: "عارض التقارير",
      reportName: "اسم التقرير",
      type: "النوع",
      lastRun: "آخر تشغيل",
      status: "الحالة",
      actions: "الإجراءات",
      financial: "مالي",
      operational: "تشغيلي",
      ready: "جاهز",
      running: "قيد التشغيل",
      error: "خطأ",
      footer: "© 2025 فيكزيت إنتربرايز — الإصدار 1.0"
    }
  }

  const t = translations[isRTL ? 'ar' : 'en']

  return (
    <>
      <div className="fxz-topbar">
        <div className="fxz-brand">{t.brand}</div>
        <div className="fxz-top-actions">
          <button type="button" className="fxz-btn primary" onClick={() => toast.info('New Report feature coming soon')}>{t.newReport}</button>
          <button type="button" className="fxz-btn secondary" onClick={toggleLang}>{t.langBtn}</button>
        </div>
      </div>

      <div className="fxz-app">
        <aside className="fxz-sidebar">
          <div className="fxz-sidehead">{t.core}</div>
          <nav className="fxz-nav">
            <Link href="/dashboard">🏠 <span>{t.dashboard}</span></Link>
            <Link href="/work-orders">🧰 <span>{t.workOrders}</span></Link>
            <Link href="/properties">🏢 <span>{t.properties}</span></Link>
            <Link href="/finance">💳 <span>{t.finance}</span></Link>
            <Link href="/hr">👥 <span>{t.hr}</span></Link>
          </nav>
          <div className="fxz-sidehead">{t.business}</div>
          <nav className="fxz-nav">
            <Link href="/crm">📇 <span>{t.crm}</span></Link>
            <Link href="/marketplace">🛍️ <span>{t.marketplace}</span></Link>
            <Link href="/support">🎧 <span>{t.support}</span></Link>
            <Link href="/compliance">🛡️ <span>{t.compliance}</span></Link>
            <Link href="/reports" className="active">📊 <span>{t.reports}</span></Link>
            <Link href="/system">⚙️ <span>{t.system}</span></Link>
          </nav>
        </aside>

        <main className="fxz-main">
          <div className="fxz-content">
            <h2 style={{margin: '0 0 6px'}}>{t.reports}</h2>
            <div className="fxz-pills" data-tabs="reports">
              <button type="button" className="fxz-pill active" data-tab="dashboard" onClick={() => {
                document.querySelectorAll('[data-tabs="reports"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'dashboard');
                });
                document.querySelectorAll('[data-panels="reports"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'dashboard');
                });
              }}>{t.dashboard}</button>
              <button type="button" className="fxz-pill" data-tab="builder" onClick={() => {
                document.querySelectorAll('[data-tabs="reports"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'builder');
                });
                document.querySelectorAll('[data-panels="reports"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'builder');
                });
              }}>{t.builder}</button>
              <button type="button" className="fxz-pill" data-tab="viewer" onClick={() => {
                document.querySelectorAll('[data-tabs="reports"] .fxz-pill').forEach(p => {
                  p.classList.toggle('active', p.getAttribute('data-tab') === 'viewer');
                });
                document.querySelectorAll('[data-panels="reports"] [data-panel]').forEach(p => {
                  p.classList.toggle('fxz-hidden', p.getAttribute('data-panel') !== 'viewer');
                });
              }}>{t.viewer}</button>
            </div>

            <div data-panels="reports">
              <section data-panel="dashboard">
                <table className="fxz-table">
                  <thead>
                    <tr>
                      <th>{t.reportName}</th>
                      <th>{t.type}</th>
                      <th>{t.lastRun}</th>
                      <th>{t.status}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Monthly Financial Summary</td>
                      <td>{t.financial}</td>
                      <td>2024-01-15 10:30</td>
                      <td style={{color: 'hsl(var(--success))'}}>{t.ready}</td>
                      <td>
                        <button className="fxz-btn secondary" style={{padding: '4px 8px', fontSize: '12px'}}>View</button>
                        <button className="fxz-btn primary" style={{padding: '4px 8px', fontSize: '12px', marginLeft: '4px'}}>Download</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Work Orders Performance</td>
                      <td>{t.operational}</td>
                      <td>2024-01-14 15:45</td>
                      <td style={{color: 'hsl(var(--warning))'}}>{t.running}</td>
                      <td>
                        <button className="fxz-btn secondary" style={{padding: '4px 8px', fontSize: '12px'}} disabled>View</button>
                        <button className="fxz-btn primary" style={{padding: '4px 8px', fontSize: '12px', marginLeft: '4px'}} disabled>Download</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Compliance Status Report</td>
                      <td>{t.compliance}</td>
                      <td>2024-01-13 09:15</td>
                      <td style={{color: 'hsl(var(--destructive))'}}>{t.error}</td>
                      <td>
                        <button className="fxz-btn secondary" style={{padding: '4px 8px', fontSize: '12px'}}>Retry</button>
                        <button className="fxz-btn primary" style={{padding: '4px 8px', fontSize: '12px', marginLeft: '4px'}}>Edit</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section className="fxz-hidden" data-panel="builder">
                <div className="fxz-card">Drag-and-drop report builder interface</div>
              </section>

              <section className="fxz-hidden" data-panel="viewer">
                <div className="fxz-card">Report viewer with export options</div>
              </section>
            </div>
          </div>
          <div className="fxz-footer">{t.footer}</div>
        </main>
      </div>
    </>
  )
}

