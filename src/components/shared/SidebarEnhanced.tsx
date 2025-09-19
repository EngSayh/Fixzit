'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Building2, Wrench, DollarSign, Users, Briefcase, ShoppingCart, HeadphonesIcon, Shield, FileText, Settings, Activity, Calendar, Wifi, ChevronRight, ChevronDown, BarChart3, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SidebarEnhancedProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  badge?: number;
  subitems?: MenuItem[];
  roles?: string[];
}

export default function SidebarEnhanced({ isOpen, onClose }: SidebarEnhancedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userRole, setUserRole] = useState('');
  const [stats, setStats] = useState({
    openWorkOrders: 0,
    overdueCompliance: 0,
    activeAlerts: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    // Get user role
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || '');
    }

    // Fetch stats
    fetchSidebarStats();
  }, []);

  const fetchSidebarStats = async () => {
    try {
      const token = localStorage.getItem('token');
      // In a real app, this would fetch actual stats
      setStats({
        openWorkOrders: 12,
        overdueCompliance: 3,
        activeAlerts: 5,
        pendingApprovals: 7
      });
    } catch (error) {
      console.error('Error fetching sidebar stats:', error);
    }
  };

  const menuSections = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
        { id: 'properties', label: 'Properties', icon: Building2, href: '/properties' },
        { id: 'work-orders', label: 'Work Orders', icon: Wrench, href: '/work-orders', badge: stats.openWorkOrders }
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'preventive', label: 'Preventive Maintenance', icon: Calendar, href: '/preventive' },
        { id: 'compliance', label: 'Compliance', icon: Shield, href: '/compliance', badge: stats.overdueCompliance },
        { id: 'iot', label: 'IoT Management', icon: Wifi, href: '/iot', badge: stats.activeAlerts }
      ]
    },
    {
      title: 'Business',
      items: [
        { id: 'finance', label: 'Finance', icon: DollarSign, href: '/finance' },
        { id: 'hr', label: 'Human Resources', icon: Users, href: '/hr' },
        { id: 'crm', label: 'CRM', icon: Briefcase, href: '/crm' },
        { id: 'marketplace', label: 'Marketplace', icon: ShoppingCart, href: '/marketplace' },
        { id: 'support', label: 'Support', icon: HeadphonesIcon, href: '/support' }
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'admin', label: 'Admin Tools', icon: Settings, href: '/admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
        { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' }
      ]
    }
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    if (onClose) onClose();
  };

  const isItemVisible = (item: MenuItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(userRole);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 z-30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* System Status */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">System Status</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400">Online</span>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">Active Tasks</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.openWorkOrders}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">Alerts</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">{stats.activeAlerts}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.filter(isItemVisible).map((item) => {
                    const Icon = item.icon;
                    const isItemActive = isActive(item.href);
                    const hasSubitems = item.subitems && item.subitems.length > 0;
                    const isExpanded = expandedItems.includes(item.id);

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => hasSubitems ? toggleExpanded(item.id) : handleNavigation(item.href)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                            isItemActive
                              ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {item.badge && item.badge > 0 && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                item.badge > 5 
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                            {hasSubitems && (
                              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {/* Subitems */}
                        {hasSubitems && isExpanded && (
                          <ul className="mt-1 ml-8 space-y-1">
                            {item.subitems!.filter(isItemVisible).map((subitem) => {
                              const SubIcon = subitem.icon;
                              const isSubitemActive = isActive(subitem.href);

                              return (
                                <li key={subitem.id}>
                                  <button
                                    onClick={() => handleNavigation(subitem.href)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                                      isSubitemActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <SubIcon className="h-4 w-4" />
                                      <span>{subitem.label}</span>
                                    </div>
                                    {subitem.badge && subitem.badge > 0 && (
                                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-full">
                                        {subitem.badge}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>v2.0.26</span>
              <span>© 2025 Fixizit</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}