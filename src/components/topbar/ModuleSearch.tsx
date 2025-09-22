// DEPRECATED: This file is a duplicate of TopBar search functionality
// Keeping for reference but should be removed in production
// All search functionality is handled by src/components/TopBar.tsx

// src/components/topbar/ModuleSearch.tsx
'use client';
import React, { useState } from 'react';
import { search } from '@/src/services/search/SearchService';
import { useAppScope } from '@/src/contexts/AppScopeContext';

export default function ModuleSearch() {
  const { moduleId, scopeMode, setScopeMode, language } = useAppScope();
  const [q, setQ] = useState(''); const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false); const t = (en:string, ar:string)=> language==='ar'?ar:en;

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const r = await search(q, moduleId, scopeMode);
    setResults(r); setOpen(true);
  }

  const getPlaceholder = () => {
    switch(moduleId) {
      case 'work_orders': return t('Search Work Orders, Properties, Tenants…', 'البحث في أوامر العمل، العقارات، المستأجرين…');
      case 'properties': return t('Search Properties, Units, Tenants…', 'البحث في العقارات، الوحدات، المستأجرين…');
      case 'finance': return t('Search Invoices, Payments…', 'البحث في الفواتير، المدفوعات…');
      case 'aqar_souq': return t('Search Listings, Projects, Leads…', 'البحث في القوائم، المشاريع، العملاء المحتملين…');
      case 'marketplace': return t('Search Catalog, RFQs, Vendors…', 'البحث في الكتالوج، طلبات العروض، الموردين…');
      default: return t('Search…', 'ابحث…');
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      <form onSubmit={run} className="flex rounded-lg overflow-hidden border border-slate-300 bg-white">
        <button type="button"
          onClick={()=> setScopeMode(scopeMode==='module'?'all':'module')}
          className="px-3 text-xs bg-slate-100 border-r border-slate-300"
          title={t('Toggle scope','تغيير النطاق')}>
          {scopeMode==='module' ? t('This Module','هذا القسم') : t('All Modules','كل الأقسام')}
        </button>
        <input
          aria-label={t('Global search input','حقل البحث العام')}
          value={q} onChange={e=>setQ(e.target.value)}
          className="flex-1 px-3 py-2 outline-none"
          placeholder={getPlaceholder()}
        />
        <button className="px-3 bg-[#0061A8] text-white">{t('Search','بحث')}</button>
      </form>

      {open && results.length>0 && (
        <div className="absolute z-50 mt-2 w-full max-h-80 overflow-auto bg-white shadow-lg rounded-lg border">
          {results.map((r)=>(
            <a key={r.href} href={r.href} className="block p-3 hover:bg-slate-50">
              <div className="text-sm font-medium">{r.title}</div>
              {r.subtitle && <div className="text-xs text-slate-500">{r.subtitle}</div>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
