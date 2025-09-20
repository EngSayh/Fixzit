'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '../../../contexts/I18nContext';
import { 
  Bell, Globe, Search, User, ChevronDown, Settings, LogOut,
  Home, Building2, DollarSign, Users, Wrench, ShoppingBag,
  Headphones, Shield, BarChart3, Cog, UserCheck, 
  ClipboardList, X, Check, AlertCircle, Info
} from 'lucide-react';

interface HeaderProps {
  user?: any;
  notifications?: any[];
  dashboardData?: any;
  onRefreshData?: () => void;
  pageInfo?: any;
}

const LANGS = [
  { code: 'en', native: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

export default function HeaderEnhanced({ 
  user, 
  notifications = [], 
  dashboardData,
  onRefreshData,
  pageInfo 
}: HeaderProps) {
  const router = useRouter();
  const { t, locale, switchLanguage, isRTL } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Quick navigation links based on user role
  const quickNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/work-orders', label: 'Work Orders', icon: ClipboardList },
    { href: '/properties', label: 'Properties', icon: Building2 },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
  ];
  
  // All searchable modules
  const allModules = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'work-orders', name: 'Work Orders', icon: ClipboardList, path: '/work-orders' },
    { id: 'properties', name: 'Properties', icon: Building2, path: '/properties' },
    { id: 'finance', name: 'Finance', icon: DollarSign, path: '/finance' },
    { id: 'hr', name: 'Human Resources', icon: Users, path: '/hr' },
    { id: 'administration', name: 'Administration', icon: Settings, path: '/admin' },
    { id: 'crm', name: 'CRM', icon: UserCheck, path: '/crm' },
    { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
    { id: 'support', name: 'Support', icon: Headphones, path: '/support' },
    { id: 'compliance', name: 'Compliance', icon: Shield, path: '/compliance' },
    { id: 'reports', name: 'Reports', icon: BarChart3, path: '/reports' },
    { id: 'system', name: 'System', icon: Cog, path: '/settings' },
    { id: 'preventive', name: 'Preventive', icon: Wrench, path: '/preventive' }
  ];

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = allModules.filter(module => 
        module.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };
  
  // Handle language change
  const handleLanguageChange = (langCode: string) => {
    switchLanguage(langCode as 'en' | 'ar');
    setLangDropdownOpen(false);
    
    // Set document direction
    const lang = LANGS.find(l => l.code === langCode);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error('Logout error:', error);
      router.push("/login");
    }
  };
  
  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Format notification time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const mins = Math.floor(diff / (1000 * 60));
      return `${mins}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-14 bg-brand-primary text-white flex items-center justify-between px-4 shadow-md relative z-40">
      {/* Left Section - Logo and Quick Nav */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="font-semibold text-white flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="inline-flex w-7 h-7 items-center justify-center rounded bg-white/20 text-sm font-bold">FX</span>
          <span className="hidden sm:inline">FIXZIT Enterprise</span>
        </Link>
        
        {/* Quick Navigation Pills (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {quickNavItems.slice(0, 3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="header-pill flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <item.icon className="w-3.5 h-3.5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Center Section - Global Search */}
      <div ref={searchRef} className="flex-1 max-w-xl mx-4 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="w-full pl-10 pr-4 py-1.5 rounded-md bg-white/10 backdrop-blur 
                     placeholder-white/60 text-white outline-none transition-all
                     focus:bg-white/20 focus:ring-2 focus:ring-white/30"
            placeholder={locale === 'ar' ? 'بحث...' : 'Search modules...'}
            aria-label="Global search"
          />
          
          {/* Search Results Dropdown */}
          {searchFocused && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg overflow-hidden">
              {searchResults.map((result) => {
                const Icon = result.icon;
                return (
                  <Link
                    key={result.id}
                    href={result.path}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-800 transition-colors"
                    onClick={() => {
                      setSearchFocused(false);
                      setSearchQuery('');
                    }}
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="flex-1">{result.name}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400 -rotate-90" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-md hover:bg-white/10 transition-colors relative"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 
                           text-white text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-50">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notif, idx) => (
                    <div
                      key={idx}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer
                                ${!notif.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notif.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 font-medium">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatTime(notif.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                  <button className="text-xs text-blue-600 hover:underline">View all notifications</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Language Dropdown */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Language selector"
            aria-expanded={langDropdownOpen}
          >
            <span className="text-lg">{LANGS.find(l => l.code === locale)?.flag}</span>
            <span className="uppercase text-sm font-medium hidden sm:inline">{locale}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Language Dropdown Menu */}
          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden min-w-[160px] z-50">
              {LANGS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors
                            ${locale === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-sm">{lang.native}</span>
                  <span className="text-xs uppercase text-gray-500">{lang.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="User menu"
            aria-expanded={userMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'user@fixzit.com'}</p>
                <p className="text-xs text-gray-400 mt-1">Role: {user?.roles?.[0]?.name || 'User'}</p>
              </div>
              <div className="py-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}