"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Wrench, Building2, DollarSign, Users, Settings, 
  Handshake, ShoppingCart, MessageSquare, ClipboardList, BarChart3, 
  Monitor, RotateCcw, Menu, User, LogOut, ChevronDown, Moon, Sun, UserCircle,
  Globe, Sparkles, Zap
} from "lucide-react";
import { useTranslation } from '../../../contexts/I18nContext';
import { GlassButton, GlassCard } from '../theme';

interface SidebarProps {
  userRole: string;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
  isDarkMode: boolean;
  handleThemeToggle: () => void;
  handleLogout: () => void;
  appName: string;
}

export default function Sidebar({
  userRole,
  sidebarCollapsed,
  setSidebarCollapsed,
  showUserMenu,
  setShowUserMenu,
  isDarkMode,
  handleThemeToggle,
  handleLogout,
  appName
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, isRTL, locale, switchLanguage } = useTranslation();

  // Role-based menu sections - Corporate Admin gets full access, Tenant gets limited access
  const getMenuSections = () => {
    if (userRole === "tenant") {
      // Tenant: Only "My Unit" and "My Requests" 
      return [
        {
          name: "My Dashboard",
          items: [
            { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, color: "text-brand-600" },
          ]
        },
        {
          name: "My Services",
          items: [
            { href: "/my-unit", labelKey: "nav.myUnit", icon: Building2, color: "text-brand-500" },
            { href: "/my-requests", labelKey: "nav.myRequests", icon: Wrench, color: "text-brand-400" },
          ]
        }
      ];
    }
    
    // Corporate Admin: Full sidebar with all modules
    return [
      {
        name: "Overview",
        items: [
          { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, color: "text-brand-600" },
        ]
      },
      {
        name: "Operations", 
        items: [
          { href: "/work-orders", labelKey: "nav.workOrders", icon: Wrench, color: "text-brand-500" },
          { href: "/properties", labelKey: "nav.properties", icon: Building2, color: "text-brand-400" },
          { href: "/preventive-maintenance", labelKey: "nav.preventiveMaintenance", icon: RotateCcw, color: "text-brand-300" },
        ]
      },
      {
        name: "Business",
        items: [
          { href: "/finance", labelKey: "nav.finance", icon: DollarSign, color: "text-yellow-500" },
          { href: "/crm", labelKey: "nav.crm", icon: Handshake, color: "text-blue-500" },
          { href: "/marketplace", labelKey: "nav.marketplace", icon: ShoppingCart, color: "text-indigo-600" },
          { href: "/hr", labelKey: "nav.hr", icon: Users, color: "text-pink-600" },
        ]
      },
      {
        name: "Administration",
        items: [
          { href: "/support", labelKey: "nav.support", icon: MessageSquare, color: "text-cyan-600" },
          { href: "/compliance", labelKey: "nav.compliance", icon: ClipboardList, color: "text-red-600" },
          { href: "/reports", labelKey: "nav.reports", icon: BarChart3, color: "text-amber-600" },
          { href: "/system", labelKey: "nav.system", icon: Monitor, color: "text-gray-600" },
        ]
      }
    ];
  };
  
  const menuSections = getMenuSections();

  return (
    <aside className={`${
      sidebarCollapsed ? 'w-16' : 'w-64'
    } glass border-white/10 flex flex-col transition-all duration-300 relative z-20 ${
      isRTL ? 'border-l sidebar-rtl' : 'border-r'
    }`}>
      {/* Enhanced Logo & Brand */}
      <div className="p-4 border-b border-white/10">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-gradient-to-r from-brand-500 to-brand-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg animate-float">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                {appName}
              </h2>
              <p className="text-xs text-white/60 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {isRTL ? 'إصدار المؤسسات' : 'Enterprise Edition'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Enhanced Sidebar Toggle */}
      <div className="px-4 py-2 border-b border-white/10">
        <GlassButton
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          variant="ghost"
          size={sidebarCollapsed ? "icon" : "md"}
          className="w-full text-white/80 border-white/20 hover:text-white hover:bg-white/10"
        >
          <Menu className="w-4 h-4" />
          {!sidebarCollapsed && (
            <span className="text-sm ml-2">{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          )}
        </GlassButton>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.name} className={`${sectionIndex > 0 ? 'mt-6' : ''}`}>
            {!sidebarCollapsed && (
              <div className="px-4 mb-2">
                <h3 className={`text-xs font-semibold text-white/40 uppercase tracking-wider ${
                  isRTL ? 'text-right' : 'text-left'
                }`}>
                  {section.name}
                </h3>
              </div>
            )}
            <div className="px-2">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl mb-1 transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? "glass text-white shadow-lg border-brand-500/50"
                        : "text-white/70 hover:text-white hover:glass-weak hover:-translate-y-0.5 hover:shadow-lg"
                    } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                  >
                    <IconComponent 
                      className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-brand-300' : 'text-white/60 group-hover:text-white'} ${
                        isRTL ? 'rtl-mirror' : ''
                      }`} 
                    />
                    {!sidebarCollapsed && (
                      <span className="text-sm font-medium">{t(item.labelKey)}</span>
                    )}
                    
                    {/* Active indicator glow */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-xl -z-10" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Enhanced User Profile */}
      <div className="p-4 border-t border-white/10">
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} ${
          isRTL ? 'flex-row-reverse' : ''
        }`}>
          {!sidebarCollapsed && (
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-2xl flex items-center justify-center border border-white/20">
                <User className="w-5 h-5 text-white/80" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm font-medium text-white">
                  {isRTL ? 'مستخدم الإدارة' : 'Admin User'}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-white/60">{userRole}</p>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          )}
          <div className="relative">
            <GlassButton
              onClick={() => setShowUserMenu(!showUserMenu)}
              size="icon"
              variant="ghost"
              className={`text-white/60 hover:text-white border-white/20 hover:bg-white/10 ${sidebarCollapsed ? 'bg-gradient-to-r from-brand-500/20 to-accent-500/20' : ''}`}
            >
              {sidebarCollapsed ? (
                <User className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </GlassButton>
            
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <GlassCard className={`absolute bottom-full mb-2 w-56 py-2 z-20 shadow-2xl animate-slide-up ${
                  isRTL ? 'right-0' : 'left-0'
                }`} variant="strong">
                  {/* Profile */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/profile');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:glass-weak rounded-lg mx-2 my-1 transition-all duration-200 ${
                      isRTL ? 'flex-row-reverse text-right' : 'text-left'
                    }`}
                  >
                    <UserCircle className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium">{t("nav.profile") || "Profile"}</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/settings');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:glass-weak rounded-lg mx-2 my-1 transition-all duration-200 ${
                      isRTL ? 'flex-row-reverse text-right' : 'text-left'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium">{t("nav.settings") || "Settings"}</span>
                  </button>

                  {/* Theme Toggle */}
                  <button
                    onClick={handleThemeToggle}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-white hover:glass-weak rounded-lg mx-2 my-1 transition-all duration-200 ${
                      isRTL ? 'flex-row-reverse text-right' : 'text-left'
                    }`}
                  >
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-white/60" />
                    )}
                    <span className="text-sm font-medium text-white">
                      {isDarkMode ? (t("theme.lightMode") || "Light Mode") : (t("theme.darkMode") || "Dark Mode")}
                    </span>
                  </button>

                  <div className="my-2 border-t border-white/20"></div>

                  {/* Language Toggle */}
                  <div className={`flex items-center gap-3 px-4 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Globe className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white flex-1">
                      {t("nav.language") || "Language"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          switchLanguage('en');
                          setShowUserMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          locale === 'en' ? 'bg-brand-100 text-brand-700' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => {
                          switchLanguage('ar');
                          setShowUserMenu(false);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          locale === 'ar' ? 'bg-brand-100 text-brand-700' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        ع
                      </button>
                    </div>
                  </div>

                  <div className="my-2 border-t border-white/20"></div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-lg mx-2 my-1 ${
                      isRTL ? 'flex-row-reverse text-right' : 'text-left'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">{t("common.logout")}</span>
                  </button>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}