// src/components/topbar/TopMenu.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { MODULES } from '@/src/config/modules';

export default function TopMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="px-3 py-2 rounded hover:bg-slate-100">☰ Menu</button>
      {open && (
        <div className="absolute left-0 mt-2 w-[720px] bg-white border rounded-lg shadow-lg p-4 grid grid-cols-3 gap-3">
          {MODULES.map(m=>(
            <Link key={m.key} href={m.href} className="block p-3 rounded hover:bg-slate-50 border">
              <div className="text-sm font-medium">{m.key.replace('_', ' ').toUpperCase()}</div>
              <div className="text-xs text-slate-500 truncate">Access {m.key}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
