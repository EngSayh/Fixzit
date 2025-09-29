'use client&apos;

import { useState, useEffect } from &apos;react&apos;

export default function Reports() {
  const [isRTL, setIsRTL] = useState(false)

  const toggleLang = () => {
    const html = document.documentElement;
    const now = html.getAttribute(&apos;dir&apos;) === &apos;rtl&apos; ? &apos;ltr&apos; : &apos;rtl&apos;;
    html.setAttribute(&apos;dir&apos;, now);
    html.setAttribute(&apos;lang&apos;, now === &apos;rtl&apos; ? &apos;ar&apos; : &apos;en&apos;);
    setIsRTL(now === &apos;rtl&apos;);
  }

  useEffect(() => {
    const html = document.documentElement;
    setIsRTL(html.getAttribute(&apos;dir&apos;) === &apos;rtl&apos;);
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

  const t = translations[isRTL ? 'ar&apos; : &apos;en&apos;]

  return (
    <>
      <div className="fxz-topbar">
        <div className="fxz-brand">{t.brand}</div>
        <div className="fxz-top-actions">
          <button className="fxz-btn primary" onClick={() => alert('New Report&apos;)}>{t.newReport}</button>
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
            <a href="/reports" className="active">📊 <span>{t.reports}</span></a>
            <a href="/system">⚙️ <span>{t.system}</span></a>
          </nav>
        </aside>

        <main className="fxz-main">
          <div className="fxz-content">
            <h2 style={{margin: '0 0 6px&apos;}}>{t.reports}</h2>
            <div className="fxz-pills" data-tabs="reports">
              <button className="fxz-pill active" data-tab="dashboard" onClick={() => {
                document.querySelectorAll('[data-tabs="reports"] .fxz-pill').forEach(p => {
                  p.classList.toggle(&apos;active&apos;, p.getAttribute(&apos;data-tab&apos;) === &apos;dashboard&apos;);
                });
                document.querySelectorAll(&apos;[data-panels="reports"] [data-panel]').forEach(p => {
                  p.classList.toggle(&apos;fxz-hidden&apos;, p.getAttribute(&apos;data-panel&apos;) !== &apos;dashboard&apos;);
                });
              }}>{t.dashboard}</button>
              <button className="fxz-pill" data-tab="builder" onClick={() => {
                document.querySelectorAll('[data-tabs="reports"] .fxz-pill').forEach(p => {
                  p.classList.toggle(&apos;active&apos;, p.getAttribute(&apos;data-tab&apos;) === &apos;builder&apos;);
                });
                document.querySelectorAll(&apos;[data-panels="reports"] [data-panel]').forEach(p => {
                  p.classList.toggle(&apos;fxz-hidden&apos;, p.getAttribute(&apos;data-panel&apos;) !== &apos;builder&apos;);
                });
              }}>{t.builder}</button>
              <button className="fxz-pill" data-tab="viewer" onClick={() => {
                document.querySelectorAll('[data-tabs="reports"] .fxz-pill').forEach(p => {
                  p.classList.toggle(&apos;active&apos;, p.getAttribute(&apos;data-tab&apos;) === &apos;viewer&apos;);
                });
                document.querySelectorAll(&apos;[data-panels="reports"] [data-panel]').forEach(p => {
                  p.classList.toggle(&apos;fxz-hidden&apos;, p.getAttribute(&apos;data-panel&apos;) !== &apos;viewer&apos;);
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
                      <td style={{color: '#16A34A&apos;}}>{t.ready}</td>
                      <td>
                        <button className="fxz-btn secondary" style={{padding: '4px 8px&apos;, fontSize: &apos;12px&apos;}}>View</button>
                        <button className="fxz-btn primary" style={{padding: '4px 8px&apos;, fontSize: &apos;12px&apos;, marginLeft: &apos;4px&apos;}}>Download</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Work Orders Performance</td>
                      <td>{t.operational}</td>
                      <td>2024-01-14 15:45</td>
                      <td style={{color: &apos;#FACC15&apos;}}>{t.running}</td>
                      <td>
                        <button className="fxz-btn secondary" style={{padding: '4px 8px&apos;, fontSize: &apos;12px&apos;}} disabled>View</button>
                        <button className="fxz-btn primary" style={{padding: '4px 8px&apos;, fontSize: &apos;12px&apos;, marginLeft: &apos;4px&apos;}} disabled>Download</button>
                      </td>
                    </tr>
                    <tr>
                      <td>Compliance Status Report</td>
                      <td>{t.compliance}</td>
                      <td>2024-01-13 09:15</td>
                      <td style={{color: &apos;#DC2626&apos;}}>{t.error}</td>
                      <td>
                        <button className="fxz-btn secondary" style={{padding: '4px 8px&apos;, fontSize: &apos;12px&apos;}}>Retry</button>
                        <button className="fxz-btn primary" style={{padding: '4px 8px&apos;, fontSize: &apos;12px&apos;, marginLeft: &apos;4px&apos;}}>Edit</button>
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

