'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

// Import the enhanced navigation configuration
import {
  navigationConfig,
  filterNavigation,
  hasAccessToItem,
  type NavigationItem,
  type NavigationSection,
  type UserRole,
  type SubscriptionPlan,
  type NavigationBadge,
  type BadgeCounts,
} from '@/config/navigation';

// ==========================================
// Types & Interfaces
// ==========================================

interface SidebarProps {
  className?: string;
  onNavigate?: () => void; // For mobile overlay closing
  badgeCounts?: BadgeCounts; // Dynamic badge counts
}

interface BadgeProps {
  badge: NavigationBadge;
  badgeCounts?: BadgeCounts;
}

interface NavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  isRTL: boolean;
  level?: number;
  onNavigate?: () => void;
  badgeCounts?: BadgeCounts;
}

interface CollapsibleSectionProps {
  section: NavigationSection;
  isRTL: boolean;
  onNavigate?: () => void;
  badgeCounts?: BadgeCounts;
}

// ==========================================
// Badge Component
// ==========================================

const Badge: React.FC<BadgeProps> = ({ badge, badgeCounts }) => {
  // Get dynamic text from badgeCounts if key is provided, otherwise use static text
  const badgeText = badge.key && badgeCounts?.[badge.key] 
    ? String(badgeCounts[badge.key]) 
    : badge.text;

  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-black',
    purple: 'bg-purple-500 text-white',
    gray: 'bg-gray-500 text-white',
  };

  const variantClasses = {
    solid: '',
    outline: 'bg-transparent border',
    soft: 'bg-opacity-20',
  };

  const baseClasses = cn(
    'inline-flex items-center justify-center',
    'min-w-[1.25rem] h-5 px-1.5 rounded-full',
    'text-xs font-medium leading-none',
    badge.pulse && 'animate-pulse',
    colorClasses[badge.color || 'gray'],
    variantClasses[badge.variant || 'solid']
  );

  if (!badgeText) {
    return (
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          badge.color === 'red' ? 'bg-red-500' : 'bg-blue-500',
          badge.pulse && 'animate-pulse'
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={baseClasses} aria-label={`${badgeText} notifications`}>
      {badgeText}
    </span>
  );
};

// ==========================================
// Navigation Item Component
// ==========================================

const NavigationItemComponent: React.FC<NavigationItemProps> = ({
  item,
  isActive,
  isRTL,
  level = 0,
  onNavigate,
  badgeCounts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  
  // Get icon dynamically with proper type checking and fallback
  const IconComponent = useMemo(() => {
    if (item.iconName && item.iconName in LucideIcons) {
      const ResolvedIcon = (LucideIcons as Record<string, unknown>)[item.iconName];
      if (typeof ResolvedIcon === 'function') {
        return ResolvedIcon as React.ComponentType<{ className?: string }>;
      }
    }
    return item.icon || LucideIcons.HelpCircle;
  }, [item.iconName, item.icon]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsExpanded(prev => !prev);
    } else if (onNavigate) {
      onNavigate();
    }
  }, [hasChildren, onNavigate]);

  const itemClasses = cn(
    'group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
    'hover:bg-accent hover:text-accent-foreground',
    isActive && 'bg-accent text-accent-foreground shadow-sm',
    level > 0 && 'ml-6 text-xs py-2',
    isRTL && 'flex-row-reverse text-right'
  );

  if (item.separator) {
    return <div className="h-px bg-border my-2 mx-3" />;
  }

  return (
    <div>
      {item.href ? (
        <Link
          href={item.href}
          className={itemClasses}
          onClick={onNavigate}
          target={item.isExternal ? '_blank' : undefined}
          rel={item.isExternal ? 'noopener noreferrer' : undefined}
        >
          {IconComponent && (
            <IconComponent 
              className={cn(
                'h-5 w-5 flex-shrink-0',
                isRTL ? 'ml-3' : 'mr-3'
              )} 
            />
          )}
          
          <span className={cn('flex-1', isRTL && 'text-right')}>
            {isRTL ? item.labelAr || item.label : item.label}
          </span>
          
          {item.isNew && (
            <span className={cn(
              'text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full',
              isRTL ? 'mr-2' : 'ml-2'
            )}>
              New
            </span>
          )}
          
          {item.isComingSoon && (
            <span className={cn(
              'text-xs bg-yellow-500 text-black px-1.5 py-0.5 rounded-full',
              isRTL ? 'mr-2' : 'ml-2'
            )}>
              Soon
            </span>
          )}
          
          {item.badge && (
            <div className={isRTL ? 'mr-2' : 'ml-2'}>
              <Badge badge={item.badge} badgeCounts={badgeCounts} />
            </div>
          )}
          
          {item.isExternal && (
            <LucideIcons.ExternalLink 
              className={cn(
                'h-3 w-3 opacity-50',
                isRTL ? 'mr-1' : 'ml-1'
              )} 
            />
          )}
        </Link>
      ) : (
        <button
          className={cn(itemClasses, 'justify-between')}
          onClick={handleClick}
          aria-expanded={isExpanded}
          aria-controls={`submenu-${item.id}`}
        >
          <div className={cn('flex items-center', isRTL && 'flex-row-reverse')}>
            {IconComponent && (
              <IconComponent 
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isRTL ? 'ml-3' : 'mr-3'
                )} 
              />
            )}
            
            <span className={cn('flex-1', isRTL && 'text-right')}>
              {isRTL ? item.labelAr || item.label : item.label}
            </span>
          </div>
          
          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            {item.badge && <Badge badge={item.badge} badgeCounts={badgeCounts} />}
            
            {hasChildren && (
              <LucideIcons.ChevronDown 
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
        </button>
      )}
      
      {/* Children */}
      {hasChildren && (isExpanded || isActive) && (
        <div
          id={`submenu-${item.id}`}
          className="mt-1 space-y-1"
        >
          {item.children!.map((child) => (
            <NavigationItemComponent
              key={child.id}
              item={child}
              isActive={false} // You might want to implement nested active state
              isRTL={isRTL}
              level={level + 1}
              onNavigate={onNavigate}
              badgeCounts={badgeCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Collapsible Section Component
// ==========================================

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  section,
  isRTL,
  onNavigate,
  badgeCounts,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(section.collapsed || false);
  const pathname = usePathname();
  
  // Check if any item in this section is active
  const hasActiveItem = useMemo(() => {
    const checkActive = (items: NavigationItem[]): boolean => {
      return items.some(item => {
        if (item.href && pathname === item.href) return true;
        if (item.children) return checkActive(item.children);
        return false;
      });
    };
    return checkActive(section.items);
  }, [section.items, pathname]);

  // Auto-expand if section has active item
  useEffect(() => {
    if (hasActiveItem && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [hasActiveItem, isCollapsed]);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-xs font-semibold',
          'text-muted-foreground uppercase tracking-wide hover:text-foreground',
          'transition-colors duration-200',
          isRTL && 'flex-row-reverse text-right'
        )}
        aria-expanded={!isCollapsed}
        aria-controls={`section-${section.id}`}
      >
        <span>{isRTL ? section.labelAr || section.label : section.label}</span>
        
        <LucideIcons.ChevronDown 
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isCollapsed && 'rotate-180'
          )}
        />
      </button>
      
      {!isCollapsed && (
        <div id={`section-${section.id}`} className="mt-2 space-y-1">
          {section.items.map((item) => {
            const isActive = Boolean(
              pathname === item.href || 
              (item.href && pathname.startsWith(item.href + '/'))
            );
            
            return (
              <NavigationItemComponent
                key={item.id}
                item={item}
                isActive={isActive}
                isRTL={isRTL}
                onNavigate={onNavigate}
                badgeCounts={badgeCounts}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Main Sidebar Component
// ==========================================

const Sidebar: React.FC<SidebarProps> = ({ className, onNavigate, badgeCounts }) => {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Get user role and subscription from session (properly typed now)
  const userRole: UserRole = (session?.user?.role || 'GUEST') as UserRole;
  const subscriptionPlan: SubscriptionPlan = (session?.user?.subscriptionPlan === 'FREE' || 
    session?.user?.subscriptionPlan === 'STARTER' || 
    session?.user?.subscriptionPlan === 'PROFESSIONAL' ||
    session?.user?.subscriptionPlan === 'ENTERPRISE' 
      ? session.user.subscriptionPlan 
      : 'FREE') as SubscriptionPlan;
  
  // Detect RTL based on locale or user preference
  const isRTL = session?.user?.locale === 'ar' || false;
  
  // Filter navigation based on user permissions
  const filteredConfig = useMemo(() => 
    filterNavigation(navigationConfig, userRole, subscriptionPlan),
    [userRole, subscriptionPlan]
  );
  
  const handleLogout = useCallback(() => {
    router.push('/logout');
  }, [router]);

  return (
    <aside 
      className={cn(
        'flex flex-col h-full bg-background border-r border-border',
        'overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
        isRTL && 'border-l border-r-0',
        className
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className={cn(
          'flex items-center gap-3',
          isRTL && 'flex-row-reverse'
        )}>
          <LucideIcons.Building2 className="h-8 w-8 text-primary" />
          <div className={cn('flex flex-col', isRTL && 'text-right')}>
            <h1 className="text-lg font-bold text-foreground">
              Fixzit
            </h1>
            <p className="text-xs text-muted-foreground">
              {userRole.replace('_', ' ')} • {subscriptionPlan}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2" role="navigation" aria-label="Main navigation">
        {filteredConfig.sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            isRTL={isRTL}
            onNavigate={onNavigate}
            badgeCounts={badgeCounts}
          />
        ))}
        
        {/* Quick Actions */}
        {hasAccessToItem(
          { id: 'quick-actions', label: 'Quick Actions', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] } as NavigationItem,
          userRole,
          subscriptionPlan
        ) && (
          <div className="mt-8 pt-4 border-t border-border">
            <div className={cn(
              'px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
              isRTL && 'text-right'
            )}>
              Quick Actions
            </div>
            
            <div className="mt-2 space-y-1">
              <button
                onClick={() => router.push('/fm/work-orders/create')}
                className={cn(
                  'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg',
                  'hover:bg-accent hover:text-accent-foreground transition-colors duration-200',
                  isRTL && 'flex-row-reverse text-right'
                )}
              >
                <LucideIcons.Plus className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                Create Work Order
              </button>
              
              <button
                onClick={() => router.push('/souq/rfqs/create')}
                className={cn(
                  'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg',
                  'hover:bg-accent hover:text-accent-foreground transition-colors duration-200',
                  isRTL && 'flex-row-reverse text-right'
                )}
              >
                <LucideIcons.FileSearch className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                Create RFQ
              </button>
            </div>
          </div>
        )}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="space-y-1">
          <Link
            href="/help"
            className={cn(
              'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg',
              'hover:bg-accent hover:text-accent-foreground transition-colors duration-200',
              isRTL && 'flex-row-reverse text-right'
            )}
          >
            <LucideIcons.HelpCircle className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
            Help & Support
          </Link>
          
          <Link
            href="/profile"
            className={cn(
              'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg',
              'hover:bg-accent hover:text-accent-foreground transition-colors duration-200',
              isRTL && 'flex-row-reverse text-right'
            )}
          >
            <LucideIcons.User className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
            Profile Settings
          </Link>
          
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg',
              'hover:bg-destructive hover:text-destructive-foreground transition-colors duration-200',
              'text-destructive',
              isRTL && 'flex-row-reverse text-right'
            )}
          >
            <LucideIcons.LogOut className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
            Logout
          </button>
        </div>
        
        {/* Version Info */}
        <div className={cn(
          'mt-4 pt-3 border-t border-border text-xs text-muted-foreground',
          isRTL && 'text-right'
        )}>
          <div>Version 2.0.26</div>
          <div className="mt-1">
            © 2024 Fixzit Enterprise
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
