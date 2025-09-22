'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FM_MENU, AQAR_MENU, MARKET_MENU, MenuItem } from '@/src/config/menus';
import { allowedModules, ModuleKey, OrgOverrides, Role } from '@/src/lib/rbac';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Theme tokens enforced (STRICT v4 / Governance V5)
const SIDEBAR_BG = '#023047';
const SIDEBAR_HOVER = 'rgba(0,97,168,0.5)';
const SIDEBAR_ACTIVE = '#0061A8';

type Context = 'FM' | 'AQAR' | 'MARKET';

function inferContext(path: string): Context {
  if (path.startsWith('/aqar')) return 'AQAR';
  if (path.startsWith('/souq') || path.startsWith('/marketplace')) return 'MARKET';
  return 'FM';
}

// Public routes: hide sidebar (Landing/About/Privacy/Terms/Login)
const HIDE_ROUTES = ['/', '/about', '/privacy', '/terms', '/login', '/ar'];

export default function RoleSidebar({
  role, orgOverrides, userModules
}: {
  role: Role;
  orgOverrides?: OrgOverrides;
  // If backend returns explicit allowed modules (preferred), pass them; else use DEFAULT_PERMISSIONS
  userModules?: ModuleKey[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const shouldHide = useMemo(
    () => HIDE_ROUTES.includes(pathname === '/' ? '/' : pathname.split('?')[0]),
    [pathname]
  );
  if (shouldHide) return null;

  const context: Context = inferContext(pathname);
  const menu: MenuItem[] = context === 'AQAR' ? AQAR_MENU : context === 'MARKET' ? MARKET_MENU : FM_MENU;

  const allowed = useMemo(
    () => new Set(userModules ?? Array.from(allowedModules(role, orgOverrides))),
    [role, orgOverrides, userModules]
  );

  // Filter menu items by permission
  const filtered = useMemo(() => {
    const filterTree = (items: MenuItem[]): MenuItem[] =>
      items
        .filter(i => allowed.has(i.module))
        .map(i => ({ ...i, children: i.children ? filterTree(i.children) : undefined }));
    return filterTree(menu);
  }, [menu, allowed]);

  return (
    <aside
      style={{ background: SIDEBAR_BG }}
      className={`${collapsed ? 'w-16' : 'w-64'} text-white h-screen transition-all duration-300 flex flex-col`}
      dir={typeof document !== 'undefined' ? document.documentElement.dir : 'ltr'}
    >
      <div className="flex justify-end p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded transition-colors"
          style={{ background: 'transparent' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-2 pb-4">
        {filtered.map((item) => {
          const active = pathname === item.path || (item.children?.some(c => pathname.startsWith(c.path)));
          return (
            <div key={item.id} className="mb-1">
              <button
                onClick={() => router.push(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2 rounded-lg`}
                style={{
                  background: active ? SIDEBAR_ACTIVE : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.85)'
                }}
                onMouseEnter={(e)=>{ if(!active)(e.currentTarget.style.background = SIDEBAR_HOVER)}}
                onMouseLeave={(e)=>{ if(!active)(e.currentTarget.style.background = 'transparent')}}
              >
                {item.icon ? <item.icon size={20} /> : <span className="w-5" />}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
              {!collapsed && item.children && item.children.length > 0 && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.filter(c => allowed.has(c.module)).map(c => {
                    const subActive = pathname.startsWith(c.path);
                    return (
                      <button
                        key={c.id}
                        onClick={() => router.push(c.path)}
                        className="block text-left w-full px-2 py-1 rounded"
                        style={{
                          background: subActive ? 'rgba(0,97,168,0.25)' : 'transparent',
                          color: subActive ? '#fff' : 'rgba(255,255,255,0.7)'
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Optional: context filters on the left for AQAR/MARKET */}
      { (context === 'AQAR' || context === 'MARKET') && !collapsed && (
        <div className="p-3 border-t border-white/10">
          <p className="text-xs text-white/75 mb-2">Quick Filters</p>
          {/* Consumers (pages) can render <FacetPanel /> beneath this wrapper. */}
          <div id="sidebar-facet-slot" />
        </div>
      )}
    </aside>
  );
}
