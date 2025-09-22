// src/components/topbar/NotificationsMenu.tsx
'use client';
import React, { useState } from 'react';

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all'|'wo'|'fin'|'sup'>('all');

  return (
    <div className="relative">
      <button className="px-3 py-2 rounded hover:bg-slate-100 relative" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
        🔔
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg">
          <div className="flex gap-1 p-2">
            {(['all','wo','fin','sup'] as const).map(k=>
              <button key={k} onClick={()=>setFilter(k)} className={`px-2 py-1 rounded text-xs ${filter===k?'bg-slate-900 text-white':'bg-slate-100'}`}>
                {k==='all'?'All':k==='wo'?'Work Orders':k==='fin'?'Finance':'Support'}
              </button>
            )}
          </div>
          <div className="divide-y">
            <a className="block p-3 hover:bg-slate-50" href="/fm/work-orders/1042">WO assigned • #1042</a>
            <a className="block p-3 hover:bg-slate-50" href="/fm/finance/invoices/889">Payment received • INV‑889</a>
          </div>
        </div>
      )}
    </div>
  );
}
