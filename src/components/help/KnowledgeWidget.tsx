'use client';
import { useEffect, useMemo, useState } from 'react';

type Props = { orgId: string; lang: 'ar'|'en'; role: string; route?: string };

export default function KnowledgeWidget({ orgId, lang, role, route }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === '/') setOpen(o => !o); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetch('/api/kb/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, orgId, lang, role, route })
    });
    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <>
      <button aria-label="Help" onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full px-4 py-2 shadow-lg bg-[#0061A8] text-white hover:bg-[#00A859] transition-colors">
        {lang === 'ar' ? 'مساعدة' : 'Help'}
      </button>

      {open && (
        <div dir={dir}
             className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center"
             onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg p-4 max-h-[80vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{lang === 'ar' ? 'مركز المعرفة' : 'Knowledge Center'}</h3>
              <button onClick={() => setOpen(false)} className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">✕</button>
            </div>

            <div className="flex gap-2 mb-3">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={lang==='ar'?'اسأل سؤالك…':'Ask a question…'}
                     className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0061A8]"/>
              <button onClick={ask} className="px-4 py-2 rounded bg-[#00A859] text-white disabled:opacity-50 hover:bg-[#0061A8] transition-colors"
                      disabled={loading}>
                {loading ? (lang==='ar'?'جارٍ…':'Asking…') : (lang==='ar'?'اسأل':'Ask')}
              </button>
            </div>

            {answer && (
              <div className="prose max-w-none dark:prose-invert border rounded-md p-3 bg-white dark:bg-slate-800">
                <div dangerouslySetInnerHTML={{ __html: answer.replace(/\n/g, '<br/>') }} />
              </div>
            )}

            <div className="mt-3 text-xs opacity-70">
              {lang==='ar'?'Shortcut: ⌘/ أو Ctrl/':'Shortcut: ⌘/ or Ctrl/'} · {lang==='ar'?'يحترم الدور والسياق':'Respects role & context'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
