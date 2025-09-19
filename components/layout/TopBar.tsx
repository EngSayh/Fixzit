import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Bell,
  Plus,
  Globe,
  Menu,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Moon,
  Sun,
  Languages,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import NotificationCenter from '../NotificationCenter';

interface TopBarProps {
  onMenuToggle: () => void;
  isSidebarCollapsed: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  roles: string[];
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle, isSidebarCollapsed }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();

  // Quick Actions based on user role
  const quickActions: QuickAction[] = [
    {
      id: 'create_work_order',
      label: t('quickActions.createWorkOrder'),
      icon: <Zap className="h-4 w-4" />,
      action: () => window.location.href = '/work-orders/create',
      roles: ['admin', 'property_manager', 'corporate_admin']
    },
    {
      id: 'add_property',
      label: t('quickActions.addProperty'),
      icon: <Plus className="h-4 w-4" />,
      action: () => window.location.href = '/properties/create',
      roles: ['admin', 'property_manager', 'corporate_admin', 'owner']
    },
    {
      id: 'create_invoice',
      label: t('quickActions.createInvoice'),
      icon: <Plus className="h-4 w-4" />,
      action: () => window.location.href = '/finance/invoices/create',
      roles: ['admin', 'finance_officer', 'corporate_admin']
    },
    {
      id: 'add_tenant',
      label: t('quickActions.addTenant'),
      icon: <User className="h-4 w-4" />,
      action: () => window.location.href = '/tenants/create',
      roles: ['admin', 'property_manager', 'corporate_admin']
    },
    {
      id: 'submit_request',
      label: t('quickActions.submitRequest'),
      icon: <Plus className="h-4 w-4" />,
      action: () => window.location.href = '/requests/create',
      roles: ['tenant']
    },
    {
      id: 'submit_bid',
      label: t('quickActions.submitBid'),
      icon: <Plus className="h-4 w-4" />,
      action: () => window.location.href = '/marketplace/bids/create',
      roles: ['vendor']
    }
  ];

  // Global Search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&modules=all`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const getAvailableQuickActions = () => {
    return quickActions.filter(action => 
      action.roles.includes(user?.role || '') || action.roles.includes('all')
    );
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    // Update document direction for RTL support
    document.documentElement.dir = newLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLanguage;
  };

  return (
    <header 
      className={`
        fixed top-0 w-full z-50 bg-white border-b border-gray-200 shadow-sm
        ${isRTL ? 'rtl' : 'ltr'}
      `}
      role="banner"
      aria-label={t('navigation.topBar')}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
          {/* Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            aria-label={t('navigation.toggleSidebar')}
            aria-expanded={!isSidebarCollapsed}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FX</span>
            </div>
            <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
              <h1 className="text-lg font-bold text-gray-900">
                {t('brand.name')}
              </h1>
              <p className="text-xs text-gray-500 -mt-1">
                {t('brand.tagline')}
              </p>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative">
            <div className="relative">
              <Search className={`absolute top-2.5 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-80 ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
                aria-label={t('search.ariaLabel')}
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className={`
                absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50
                ${isRTL ? 'right-0' : 'left-0'}
              `}>
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.map((result: any, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => window.location.href = result.url}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {result.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{result.title}</p>
                          <p className="text-xs text-gray-500">{result.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {result.module}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className={`flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}`}>
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={t('language.switch')}>
                <Languages className="h-4 w-4" />
                <span className="ml-1 text-sm font-medium">
                  {language === 'ar' ? 'ع' : 'EN'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              <DropdownMenuLabel>{t('language.select')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                <span className="mr-2">🇺🇸</span>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguageChange('ar')}>
                <span className="mr-2">🇸🇦</span>
                العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label={t('theme.toggle')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Quick Actions */}
          <Popover open={showQuickActions} onOpenChange={setShowQuickActions}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={t('quickActions.title')}>
                <Plus className="h-4 w-4" />
                <span className="ml-1 hidden md:inline">{t('quickActions.create')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align={isRTL ? 'start' : 'end'}>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">{t('quickActions.title')}</h4>
                {getAvailableQuickActions().map((action) => (
                  <Button
                    key={action.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      action.action();
                      setShowQuickActions(false);
                    }}
                  >
                    {action.icon}
                    <span className={`${isRTL ? 'mr-2' : 'ml-2'}`}>{action.label}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Notifications */}
          <div className="relative">
            <NotificationCenter />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name || ''} />
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align={isRTL ? 'start' : 'end'} forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge variant="secondary" className="w-fit text-xs mt-1">
                    {user?.role?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                <User className="mr-2 h-4 w-4" />
                <span>{t('userMenu.profile')}</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => window.location.href = '/settings'}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('userMenu.settings')}</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => window.location.href = '/help'}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>{t('userMenu.help')}</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Organization Switcher for Super Admin */}
              {user?.role === 'super_admin' && (
                <>
                  <DropdownMenuItem onClick={() => window.location.href = '/admin/organizations'}>
                    <Globe className="mr-2 h-4 w-4" />
                    <span>{t('userMenu.switchOrganization')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem onClick={signOut} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('userMenu.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Secondary Navigation Bar (for modules with tabs) */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Breadcrumbs */}
            <nav aria-label={t('navigation.breadcrumbs')} className="flex items-center space-x-2 text-sm">
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
                {t('navigation.dashboard')}
              </a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600 font-medium">
                {t(`modules.${window.location.pathname.split('/')[1]}`)}
              </span>
            </nav>

            {/* Module Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
                <span className="ml-1 hidden md:inline">{t('actions.help')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Skip Links */}
      <div className="sr-only">
        <a href="#main-content" className="skip-link">
          {t('accessibility.skipToMain')}
        </a>
        <a href="#sidebar-navigation" className="skip-link">
          {t('accessibility.skipToNavigation')}
        </a>
      </div>
    </header>
  );
};

export default TopBar;