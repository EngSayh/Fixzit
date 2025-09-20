'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ClipboardList, Building2, DollarSign, Users, Settings,
  UserCheck, ShoppingBag, Headphones, Shield, BarChart3, Cog, Wrench, 
  ChevronLeft, ChevronRight, Home, Sparkles, Activity, TrendingUp
} from 'lucide-react';
import { useTranslation } from '../../../contexts/I18nContext';

interface SidebarProps {
  user?: any;
  userRole?: string;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (value: boolean) => void;
  isDarkMode?: boolean;
  appName?: string;
  realTimeEnabled?: boolean;
  notifications?: any[];
}

// Brand colors defined inline
const brandColors = {
  primary: '#0061A8',  // Fixzit Blue
  secondary: '#00A859', // Fixzit Green
  accent: '#FFB400',    // Fixzit Yellow
  dark: '#023047'       // Dark header bg
};

const modules = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', color: 'text-blue-500' },
  { id: 'work-orders', name: 'Work Orders', icon: ClipboardList, path: '/work-orders', color: 'text-green-500' },
  { id: 'properties', name: 'Properties', icon: Building2, path: '/properties', color: 'text-purple-500' },
  { id: 'finance', name: 'Finance', icon: DollarSign, path: '/finance', color: 'text-yellow-500' },
  { id: 'hr', name: 'Human Resources', icon: Users, path: '/hr', color: 'text-pink-500' },
  { id: 'admin', name: 'Administration', icon: Settings, path: '/admin', color: 'text-indigo-500' },
  { id: 'crm', name: 'CRM', icon: UserCheck, path: '/crm', color: 'text-cyan-500' },
  { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag, path: '/marketplace', color: 'text-orange-500' },
  { id: 'support', name: 'Support', icon: Headphones, path: '/support', color: 'text-red-500' },
  { id: 'compliance', name: 'Compliance', icon: Shield, path: '/compliance', color: 'text-teal-500' },
  { id: 'reports', name: 'Reports', icon: BarChart3, path: '/reports', color: 'text-gray-600' },
  { id: 'settings', name: 'System', icon: Cog, path: '/settings', color: 'text-gray-500' },
  { id: 'preventive', name: 'Preventive', icon: Wrench, path: '/preventive', color: 'text-amber-500' }
];

export default function SidebarEnhanced({
  user,
  userRole = 'admin',
  sidebarCollapsed = false,
  setSidebarCollapsed = () => {},
  isDarkMode = false,
  appName = 'FIXZIT Enterprise',
  realTimeEnabled = false,
  notifications = []
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  
  // Filter modules based on user role
  const getAvailableModules = () => {
    if (userRole === 'tenant') {
      return modules.filter(m => 
        ['dashboard', 'work-orders', 'properties', 'marketplace', 'support'].includes(m.id)
      );
    }
    if (userRole === 'manager') {
      return modules.filter(m => 
        !['settings', 'admin'].includes(m.id)
      );
    }
    return modules; // Admin gets all modules
  };
  
  const availableModules = getAvailableModules();
  
  // Group modules into sections
  const moduleSections = [
    {
      title: 'Main',
      items: availableModules.filter(m => ['dashboard'].includes(m.id))
    },
    {
      title: 'Operations',
      items: availableModules.filter(m => 
        ['work-orders', 'properties', 'preventive'].includes(m.id)
      )
    },
    {
      title: 'Business',
      items: availableModules.filter(m => 
        ['finance', 'crm', 'hr', 'marketplace'].includes(m.id)
      )
    },
    {
      title: 'Administration',
      items: availableModules.filter(m => 
        ['admin', 'support', 'compliance', 'reports', 'settings'].includes(m.id)
      )
    }
  ].filter(section => section.items.length > 0);
  
  return (
    <aside 
      className={`
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        text-white h-[calc(100vh-56px)] 
        transition-all duration-300 flex flex-col
        border-r border-white/10 shadow-lg
      `}
      style={{ backgroundColor: brandColors.dark || '#023047' }}
    >
      {/* Collapse Toggle */}
      <div className="flex justify-end p-2 border-b border-white/10">
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          className="p-2 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Toggle sidebar"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? 
            <ChevronRight className="w-5 h-5" /> : 
            <ChevronLeft className="w-5 h-5" />
          }
        </button>
      </div>
      
      {/* Module Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto custom-scrollbar">
        {moduleSections.map((section, idx) => (
          <div key={idx} className="mb-4">
            {!sidebarCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {section.items.map((module) => {
              const Icon = module.icon;
              const isActive = pathname === module.path || pathname.startsWith(`${module.path}/`);
              const hasNotifications = module.id === 'work-orders' && 
                notifications.filter(n => n.type === 'work-order' && !n.read).length > 0;
              
              return (
                <div
                  key={module.id}
                  className="relative"
                  onMouseEnter={() => setHoveredModule(module.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                >
                  <button
                    onClick={() => router.push(module.path)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-md mb-1
                      transition-all duration-200 relative
                      ${isActive 
                        ? 'bg-brand-primary text-white shadow-md' 
                        : 'hover:bg-white/10 text-white/80 hover:text-white'
                      }
                      ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    aria-label={module.name}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-r" />
                    )}
                    
                    {/* Icon with color accent */}
                    <div className={`relative ${sidebarCollapsed ? '' : 'ml-1'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : module.color}`} />
                      {hasNotifications && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    
                    {/* Module Name */}
                    {!sidebarCollapsed && (
                      <span className="flex-1 text-sm font-medium">
                        {module.name}
                      </span>
                    )}
                    
                    {/* Hover effect */}
                    {!sidebarCollapsed && isActive && (
                      <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                    )}
                  </button>
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && hoveredModule === module.id && (
                    <div className={`
                      absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} 
                      top-1/2 -translate-y-1/2 z-50
                      px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md
                      whitespace-nowrap shadow-lg
                    `}>
                      {module.name}
                      {hasNotifications && (
                        <span className="ml-2 text-xs text-red-400">• New</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      
      {/* Footer Section */}
      {!sidebarCollapsed && (
        <div className="border-t border-white/10 p-3 space-y-3">
          {/* System Status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`h-2 w-2 rounded-full animate-pulse ${
              realTimeEnabled ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            <span className="text-white/70">
              System: {realTimeEnabled ? 'Connected' : 'Syncing'}
            </span>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 rounded px-2 py-1">
              <div className="text-white/50">Active WO</div>
              <div className="font-semibold">24</div>
            </div>
            <div className="bg-white/5 rounded px-2 py-1">
              <div className="text-white/50">Properties</div>
              <div className="font-semibold">156</div>
            </div>
          </div>
          
          {/* Version */}
          <div className="text-center text-xs text-white/40">
            v2.0.26
          </div>
        </div>
      )}
    </aside>
  );
}

<style jsx>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`}</style>