'use client';
import { useMemo, useState } from 'react';

export type FacetOption = { id: string; label: string; count?: number };
export type FacetGroup =
  | { type: 'check'; id: string; label: string; options: FacetOption[]; search?: boolean }
  | { type: 'radio'; id: string; label: string; options: FacetOption[] }
  | { type: 'range'; id: string; label: string; min: number; max: number; step?: number; unit?: string };

export default function FacetPanel({
  groups, onChange
}: {
  groups: FacetGroup[];
  onChange: (state: Record<string, any>) => void;
}) {
  const [state, setState] = useState<Record<string, any>>({});
  function update(id: string, value: any) {
    const next = { ...state, [id]: value };
    setState(next);
    onChange(next);
  }
  return (
    <aside className="space-y-4">
      {groups.map((g) => {
        if (g.type === 'check') {
          const [q, setQ] = useState('');
          const list = useMemo(
            () => (!g.search || !q ? g.options : g.options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))),
            [q, g]
          );
          const chosen: string[] = state[g.id] ?? [];
          return (
            <section key={g.id} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{g.label}</h4>
                {g.search && (
                  <input className="border rounded px-2 py-1 text-sm" placeholder="Type to filter"
                         value={q} onChange={(e)=>setQ(e.target.value)} />
                )}
              </div>
              <div className="max-h-56 overflow-auto space-y-1">
                {list.map(o => (
                  <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={chosen.includes(o.id)} onChange={(e)=>{
                      const next = e.target.checked ? [...chosen, o.id] : chosen.filter(x=>x!==o.id);
                      update(g.id, next);
                    }}/>
                    <span className="flex-1">{o.label}</span>
                    {o.count != null && <span className="text-gray-400">{o.count}</span>}
                  </label>
                ))}
              </div>
            </section>
          );
        }
        if (g.type === 'radio') {
          return (
            <section key={g.id} className="bg-white rounded-lg p-3 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-2">{g.label}</h4>
              <div className="space-y-1">
                {g.options.map(o => (
                  <label key={o.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="radio" name={g.id} checked={(state[g.id] ?? '') === o.id}
                           onChange={()=>update(g.id, o.id)} />
                    <span className="flex-1">{o.label}</span>
                    {o.count != null && <span className="text-gray-400">{o.count}</span>}
                  </label>
                ))}
              </div>
            </section>
          );
        }
        // range
        return (
          <section key={g.id} className="bg-white rounded-lg p-3 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">{g.label}</h4>
            <div className="flex items-center gap-2">
              <input type="number" className="w-20 border rounded px-2 py-1"
                     value={state[`${g.id}_min`] ?? g.min}
                     onChange={(e)=>update(`${g.id}_min`, Number(e.target.value))}/>
              <span>–</span>
              <input type="number" className="w-20 border rounded px-2 py-1"
                     value={state[`${g.id}_max`] ?? g.max}
                     onChange={(e)=>update(`${g.id}_max`, Number(e.target.value))}/>
              {g.unit && <span className="text-gray-500">{g.unit}</span>}
            </div>
          </section>
        );
      })}
    </aside>
  );
}
