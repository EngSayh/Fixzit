// src/components/topbar/TopMenu.tsx
'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown } from 'lucide-react';
import { MODULES, TOP_MENU_ORDER } from '@/src/config/dynamic-modules';
import { useAppScope } from '@/src/contexts/AppScopeContext';
import { 
  Home, Wrench, Building2, Banknote, Users, Settings, 
  Contact, Landmark, Store, LifeBuoy, ShieldCheck, BarChart3, Cog 
} from 'lucide-react';

const iconMap: Record<string, any> = {
  'home': Home,
  'work-orders': Wrench,
  'properties': Building2,
  'finance': Banknote,
  'hr': Users,
  'administration': Settings,
  'crm': Contact,
  'marketplace-real-estate': Landmark,
  'marketplace-materials': Store,
  'support': LifeBuoy,
  'compliance': ShieldCheck,
  'reports': BarChart3,
  'system': Cog,
};

export default function TopMenu() {
  const { language } = useAppScope();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const t = (en: string, ar: string) => language === 'ar' ? ar : en;
  
  const ordered = TOP_MENU_ORDER
    .map(id => MODULES.find(m => m.id === id))
    .filter(Boolean) as typeof MODULES;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button 
        onClick={() => setOpen(o => !o)} 
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
        aria-expanded={open}
        aria-label={t('Menu', 'القائمة')}
      >
        <Menu className="w-5 h-5" />
        <span className="text-sm font-medium">{t('Menu', 'القائمة')}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      {open && (
        <div className="absolute left-0 mt-2 w-[720px] bg-white border rounded-lg shadow-xl p-6 z-50">
          <div className="grid grid-cols-3 gap-4">
            {ordered.map(m => {
              const Icon = iconMap[m.id] || Home;
              return (
                <Link 
                  key={m.id} 
                  href={toPath(m.id)} 
                  className="group block p-4 rounded-lg hover:bg-gray-50 border border-gray-200 hover:border-[#0061A8] transition-all"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-[#0061A8]/10">
                      <Icon className="w-5 h-5 text-gray-600 group-hover:text-[#0061A8]" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 group-hover:text-[#0061A8]">
                        {language === 'ar' ? m.labelAr : m.label}
                      </div>
                      {m.defaultSearchEntities.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {m.defaultSearchEntities.slice(0, 3).join(' • ')}
                          {m.defaultSearchEntities.length > 3 && ' ...'}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Special sections */}
          <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {t('Quick Access', 'الوصول السريع')}
              </h3>
              <div className="space-y-1">
                <Link href="/dashboard" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Dashboard', 'لوحة القيادة')}
                </Link>
                <Link href="/notifications" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Notifications', 'الإشعارات')}
                </Link>
                <Link href="/profile" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('My Profile', 'ملفي الشخصي')}
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {t('Marketplaces', 'الأسواق')}
              </h3>
              <div className="space-y-1">
                <Link href="/aqar" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Aqar Souq - Real Estate', 'سوق العقار')}
                </Link>
                <Link href="/souq" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Fixzit Souq - Materials', 'سوق فيكسيت - المواد')}
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {t('Help & Support', 'المساعدة والدعم')}
              </h3>
              <div className="space-y-1">
                <Link href="/help" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Help Center', 'مركز المساعدة')}
                </Link>
                <Link href="/support/tickets" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Support Tickets', 'تذاكر الدعم')}
                </Link>
                <Link href="/docs" className="block text-sm text-gray-700 hover:text-[#0061A8] py-1">
                  {t('Documentation', 'الوثائق')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toPath(id: string): string {
  switch(id) {
    case 'home': return '/';
    case 'marketplace-real-estate': return '/aqar';
    case 'marketplace-materials': return '/souq';
    case 'work-orders': return '/work-orders';
    case 'properties': return '/properties';
    case 'finance': return '/finance';
    case 'hr': return '/hr';
    case 'administration': return '/admin';
    case 'crm': return '/crm';
    case 'support': return '/support';
    case 'compliance': return '/compliance';
    case 'reports': return '/reports';
    case 'system': return '/system';
    default: return `/${id}`;
  }
}