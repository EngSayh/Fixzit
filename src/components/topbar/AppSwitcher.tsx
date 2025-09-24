'use client';
import { useTopBar } from '@/src/contexts/TopBarContext';
import { APPS, AppKey } from '@/src/config/module-registry';
import Link from 'next/link';

export function AppSwitcher() {
  const { app, setApp, isRTL } = useTopBar();
  const opts: { key: AppKey; label: string; href: string }[] = [
    { key:'fm',   label: APPS.fm.label,   href:'/dashboard' },
    { key:'souq', label: APPS.souq.label, href:'/marketplace' },
    { key:'aqar', label: APPS.aqar.label, href:'/aqar' },
  ];
  
  return (
    <div className="flex items-center gap-2">
      {opts.map(o => (
        <Link 
          key={o.key} 
          href={o.href}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            app === o.key 
              ? 'bg-white/20 text-white' 
              : 'bg-white/10 text-white/80 hover:bg-white/15'
          }`}
          onClick={() => setApp(o.key)}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}