'use client';

import dynamic from 'next/dynamic';

// Dynamically import the new TopBar to avoid SSR issues
const DynamicTopBar = dynamic(() => import('./topbar/TopBar'), {
  ssr: false,
  loading: () => (
    <header className="fixed top-0 z-40 w-full border-b bg-white" data-testid="topbar-root">
      <div className="flex items-center gap-3 px-3 h-14">
        <span className="inline-block h-5 w-5 rounded bg-[#FFB400]" />
        <span className="text-[#0061A8] font-semibold">Fixzit Enterprise</span>
        <div className="ml-auto relative">
          <details>
            <summary className="ml-1 px-2 py-1 rounded border hover:bg-slate-100 cursor-pointer" data-testid="language-selector">🌐</summary>
            <div className="absolute right-0 mt-2 w-40 rounded-md border bg-white shadow z-[70]">
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-50" onClick={()=>{document.cookie='fxz_lang=en; path=/; max-age=31536000'; window.location.reload();}}>🇬🇧 English</button>
              <button className="block w-full text-left px-3 py-2 hover:bg-slate-50" onClick={()=>{document.cookie='fxz_lang=ar; path=/; max-age=31536000'; window.location.reload();}}>العربية</button>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
});

export default function TopBar() {
  return <DynamicTopBar />;
}