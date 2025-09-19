import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Pin,
  PinOff,
  Home,
  Building,
  Wrench,
  DollarSign,
  Users,
  UserCheck,
  ShoppingBag,
  Headphones,
  Shield,
  BarChart3,
  Settings,
  Cog,
  Calendar,
  Star,
  Bell,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useRouter } from 'next/router';
import { FixzitRBACSystem } from '@/lib/rbac-system';

interface SidebarProps {
  isCollapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isPinned: boolean;
  onPin: (pinned: boolean) => void;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  path: string;
  access: 'full' | 'limited' | 'tab_only';
  badge?: { count?: number; status?: string; color?: string };
  tabs?: string[];
  mobileSupported: boolean;
  isNew?: boolean;
  isActive?: boolean;
  children?: SidebarItem[];
}

const iconMap = {
  dashboard: Home,
  building: Building,
  wrench: Wrench,
  'dollar-sign': DollarSign,
  users: Users,
  'user-check': UserCheck,
  'shopping-bag': ShoppingBag,
  headphones: Headphones,
  shield: Shield,
  'bar-chart-3': BarChart3,
  settings: Settings,
  cog: Cog,
  'calendar-check': Calendar,
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  onCollapse, 
  isPinned, 
  onPin 
}) => {
  const [sidebarSections, setSidebarSections] = useState<SidebarSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const rbacSystem = new FixzitRBACSystem();

  useEffect(() => {
    if (user?.role) {
      generateSidebarForRole(user.role);
    }
  }, [user?.role]);

  useEffect(() => {
    // Load user preferences
    loadUserPreferences();
  }, []);

  const generateSidebarForRole = (userRole: string) => {
    try {
      const sidebarConfig = rbacSystem.generateSidebar(userRole, user?.organizationId);
      
      // Convert to component format
      const sections = sidebarConfig.sections.map(section => ({
        title: t(`navigation.sections.${section.title.toLowerCase().replace(' ', '_')}`),
        items: section.items.map(item => ({
          ...item,
          name: t(`modules.${item.id}`),
          icon: getIconComponent(item.icon),
          isActive: router.pathname.startsWith(item.path),
          badge: getModuleBadgeData(item.id)
        }))
      }));

      setSidebarSections(sections);
    } catch (error) {
      console.error('Failed to generate sidebar:', error);
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Home;
    return <IconComponent className="h-5 w-5" />;
  };

  const getModuleBadgeData = (moduleId: string) => {
    // This would typically come from real-time data
    const badges = {
      work_orders: { count: 8, color: 'red' },
      support: { count: 3, color: 'orange' },
      compliance: { status: 'alert', color: 'yellow' },
      finance: { count: 5, color: 'blue' }
    };

    return badges[moduleId] || null;
  };

  const loadUserPreferences = () => {
    const preferences = localStorage.getItem('sidebar_preferences');
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences);
        setCollapsedSections(new Set(parsed.collapsedSections || []));
        setFavoriteItems(new Set(parsed.favoriteItems || []));
      } catch (error) {
        console.error('Failed to load sidebar preferences:', error);
      }
    }
  };

  const saveUserPreferences = () => {
    const preferences = {
      collapsedSections: Array.from(collapsedSections),
      favoriteItems: Array.from(favoriteItems),
      isPinned,
      isCollapsed
    };
    localStorage.setItem('sidebar_preferences', JSON.stringify(preferences));
  };

  const toggleSectionCollapse = (sectionTitle: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionTitle)) {
      newCollapsed.delete(sectionTitle);
    } else {
      newCollapsed.add(sectionTitle);
    }
    setCollapsedSections(newCollapsed);
    saveUserPreferences();
  };

  const toggleFavorite = (itemId: string) => {
    const newFavorites = new Set(favoriteItems);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
    } else {
      newFavorites.add(itemId);
    }
    setFavoriteItems(newFavorites);
    saveUserPreferences();
  };

  const filteredSections = sidebarSections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const renderSidebarItem = (item: SidebarItem, depth = 0) => {
    const isActive = item.isActive;
    const isFavorite = favoriteItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    const ItemContent = () => (
      <div className={`
        flex items-center w-full p-3 rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
          : 'text-gray-700 hover:bg-gray-100'
        }
        ${isCollapsed ? 'justify-center' : 'justify-between'}
        ${depth > 0 ? `ml-${depth * 4}` : ''}
      `}>
        <div className="flex items-center space-x-3">
          {item.icon}
          {!isCollapsed && (
            <>
              <span className="font-medium text-sm">{item.name}</span>
              {item.isNew && (
                <Badge variant="default" className="text-xs bg-green-500">
                  {t('common.new')}
                </Badge>
              )}
            </>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center space-x-1">
            {/* Badge */}
            {item.badge && (
              <Badge 
                variant={item.badge.status ? 'destructive' : 'default'}
                className="text-xs"
              >
                {item.badge.count || item.badge.status}
              </Badge>
            )}

            {/* Favorite Star */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
            >
              <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
            </Button>

            {/* Expand/Collapse for children */}
            {hasChildren && (
              <ChevronRight className={`h-4 w-4 transition-transform ${
                collapsedSections.has(item.id) ? '' : 'rotate-90'
              }`} />
            )}
          </div>
        )}
      </div>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider key={item.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={item.path} className="block">
                <ItemContent />
              </a>
            </TooltipTrigger>
            <TooltipContent side={isRTL ? 'left' : 'right'} className="flex items-center">
              <span>{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {item.badge.count || item.badge.status}
                </Badge>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div key={item.id}>
        {hasChildren ? (
          <Collapsible
            open={!collapsedSections.has(item.id)}
            onOpenChange={() => toggleSectionCollapse(item.id)}
          >
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer">
                <ItemContent />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {item.children?.map(child => renderSidebarItem(child, depth + 1))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <a href={item.path} className="block">
            <ItemContent />
          </a>
        )}
      </div>
    );
  };

  const renderSection = (section: SidebarSection) => {
    const isSectionCollapsed = collapsedSections.has(section.title);

    return (
      <div key={section.title} className="mb-6">
        {!isCollapsed && (
          <Collapsible
            open={!isSectionCollapsed}
            onOpenChange={() => toggleSectionCollapse(section.title)}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between px-3 py-2 cursor-pointer group">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                  isSectionCollapsed ? '-rotate-90' : ''
                }`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {section.items.map(item => renderSidebarItem(item))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {isCollapsed && (
          <div className="space-y-1">
            {section.items.map(item => renderSidebarItem(item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 shadow-sm z-40
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isRTL ? 'right-0 left-auto border-r-0 border-l' : ''}
      `}
      role="navigation"
      aria-label={t('navigation.sidebar')}
      id="sidebar-navigation"
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="space-y-3">
            {/* Organization Selector */}
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {user?.organizationName?.substring(0, 2).toUpperCase() || 'FX'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{user?.organizationName || 'Fixzit Enterprise'}</p>
                <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ').toUpperCase()}</p>
              </div>
            </div>

            {/* Module Search */}
            <div className="relative">
              <Search className={`absolute top-2.5 h-4 w-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                type="search"
                placeholder={t('navigation.searchModules')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
              />
            </div>
          </div>
        )}

        {/* Collapse/Pin Controls */}
        <div className={`flex items-center justify-between mt-3 ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPin(!isPinned)}
              className="h-6 w-6 p-0"
              aria-label={isPinned ? t('navigation.unpin') : t('navigation.pin')}
            >
              {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapse(!isCollapsed)}
            className="h-6 w-6 p-0"
            aria-label={isCollapsed ? t('navigation.expand') : t('navigation.collapse')}
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <ScrollArea className="flex-1 px-3 py-4">
        {/* Favorites Section */}
        {!isCollapsed && favoriteItems.size > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              {t('navigation.favorites')}
            </h3>
            <div className="space-y-1">
              {Array.from(favoriteItems).map(itemId => {
                const item = findItemById(itemId);
                return item ? renderSidebarItem(item) : null;
              })}
            </div>
            <Separator className="my-4" />
          </div>
        )}

        {/* Main Navigation Sections */}
        {filteredSections.map(renderSection)}

        {/* Special Features for Owner Role */}
        {user?.role === 'owner' && !isCollapsed && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              {t('navigation.ownerTools')}
            </h3>
            <div className="space-y-1">
              <a href="/owner/switch-agent" className="block">
                <div className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100">
                  <Zap className="h-5 w-5" />
                  <span className="font-medium text-sm">{t('owner.switchAgent')}</span>
                </div>
              </a>
              <a href="/owner/statements" className="block">
                <div className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100">
                  <BarChart3 className="h-5 w-5" />
                  <span className="font-medium text-sm">{t('owner.statements')}</span>
                </div>
              </a>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200">
        {!isCollapsed && (
          <div className="space-y-2">
            {/* Quick Stats */}
            <div className="text-xs text-gray-500">
              <div className="flex justify-between">
                <span>{t('navigation.lastLogin')}</span>
                <span>{user?.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd') : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('navigation.version')}</span>
                <span>v3.0.0</span>
              </div>
            </div>

            {/* Support Link */}
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Headphones className="h-4 w-4 mr-2" />
              <span className="text-sm">{t('navigation.support')}</span>
            </Button>
          </div>
        )}

        {isCollapsed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <Headphones className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? 'left' : 'right'}>
                {t('navigation.support')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div 
          className={`
            absolute top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-300 transition-colors
            ${isRTL ? 'left-0' : 'right-0'}
          `}
          onMouseDown={(e) => {
            // Implement resize functionality
            console.log('Resize handle clicked');
          }}
        />
      )}
    </aside>
  );

  // Helper function to find item by ID across all sections
  function findItemById(itemId: string): SidebarItem | null {
    for (const section of sidebarSections) {
      const item = section.items.find(item => item.id === itemId);
      if (item) return item;
      
      // Check children
      for (const parentItem of section.items) {
        if (parentItem.children) {
          const childItem = parentItem.children.find(child => child.id === itemId);
          if (childItem) return childItem;
        }
      }
    }
    return null;
  }
};

export default Sidebar;