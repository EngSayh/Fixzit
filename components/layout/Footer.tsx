import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronRight,
  Home,
  Shield,
  FileText,
  Phone,
  Mail,
  Globe,
  Heart,
  ExternalLink,
  Clock,
  MapPin,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useRouter } from 'next/router';

interface FooterProps {
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  // Generate breadcrumbs from current route
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = router.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: t('navigation.dashboard'), href: '/dashboard' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      breadcrumbs.push({
        label: t(`modules.${segment}`) || segment.replace('-', ' '),
        href: isLast ? undefined : currentPath,
        isActive: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // System status indicators
  const [systemStatus, setSystemStatus] = React.useState({
    api: 'online',
    database: 'online',
    cache: 'online',
    notifications: 'online'
  });

  React.useEffect(() => {
    // Check system status periodically
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          const health = await response.json();
          setSystemStatus({
            api: 'online',
            database: health.database?.connected ? 'online' : 'offline',
            cache: health.cache?.connected ? 'online' : 'offline',
            notifications: health.notifications?.connected ? 'online' : 'offline'
          });
        }
      } catch (error) {
        setSystemStatus(prev => ({ ...prev, api: 'offline' }));
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    return status === 'online' ? 
      <Wifi className="h-3 w-3 text-green-500" /> : 
      <WifiOff className="h-3 w-3 text-red-500" />;
  };

  const currentYear = new Date().getFullYear();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '3.0.0';

  return (
    <footer 
      className={`
        bg-white border-t border-gray-200 mt-auto
        ${isRTL ? 'rtl' : 'ltr'}
        ${className}
      `}
      role="contentinfo"
      aria-label={t('navigation.footer')}
    >
      {/* Main Footer Content */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Breadcrumbs */}
          <nav 
            aria-label={t('navigation.breadcrumbs')} 
            className="flex items-center space-x-2 text-sm"
          >
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className={`h-3 w-3 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                )}
                {crumb.href ? (
                  <a 
                    href={crumb.href} 
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-600 font-medium">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Center Section - Copyright */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>© {currentYear} Fixzit Enterprise</span>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline" className="text-xs">
              v{appVersion}
            </Badge>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center space-x-1">
              <span className="text-xs">{t('footer.madeWith')}</span>
              <Heart className="h-3 w-3 text-red-500 fill-current" />
              <span className="text-xs">{t('footer.inSaudi')}</span>
            </div>
          </div>

          {/* Right Section - Links & Status */}
          <div className="flex items-center space-x-4">
            {/* Footer Links */}
            <div className="flex items-center space-x-3 text-sm">
              <a 
                href="/privacy" 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t('footer.privacy')}
              </a>
              <a 
                href="/terms" 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t('footer.terms')}
              </a>
              <a 
                href="/support" 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t('footer.support')}
              </a>
              <a 
                href="/contact" 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {t('footer.contact')}
              </a>
            </div>

            <Separator orientation="vertical" className="h-4" />

            {/* System Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  {getStatusIcon(systemStatus.api)}
                  <span className="ml-1 text-xs">{t('footer.status')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
                <div className="p-2">
                  <h4 className="font-semibold text-sm mb-2">{t('footer.systemStatus')}</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span>{t('footer.api')}</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemStatus.api)}
                        <span className={systemStatus.api === 'online' ? 'text-green-600' : 'text-red-600'}>
                          {t(`status.${systemStatus.api}`)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('footer.database')}</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemStatus.database)}
                        <span className={systemStatus.database === 'online' ? 'text-green-600' : 'text-red-600'}>
                          {t(`status.${systemStatus.database}`)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('footer.cache')}</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemStatus.cache)}
                        <span className={systemStatus.cache === 'online' ? 'text-green-600' : 'text-red-600'}>
                          {t(`status.${systemStatus.cache}`)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('footer.notifications')}</span>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(systemStatus.notifications)}
                        <span className={systemStatus.notifications === 'online' ? 'text-green-600' : 'text-red-600'}>
                          {t(`status.${systemStatus.notifications}`)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>{t('footer.lastUpdate')}</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Extended Footer for larger screens */}
      <div className="hidden lg:block border-t border-gray-100 bg-gray-50">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            {/* Company Information */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>{t('footer.location')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>+966-11-123-4567</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="h-3 w-3" />
                <span>support@fixzit.com</span>
              </div>
            </div>

            {/* Compliance Badges */}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="h-2 w-2 mr-1" />
                ISO 27001
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Shield className="h-2 w-2 mr-1" />
                ZATCA
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Globe className="h-2 w-2 mr-1" />
                GDPR
              </Badge>
            </div>

            {/* External Links */}
            <div className="flex items-center space-x-3">
              <a 
                href="https://status.fixzit.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                <span>{t('footer.statusPage')}</span>
              </a>
              <a 
                href="https://docs.fixzit.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
              >
                <FileText className="h-3 w-3" />
                <span>{t('footer.documentation')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="sr-only">
        <p>{t('accessibility.footerDescription')}</p>
        <p>{t('accessibility.keyboardNavigation')}</p>
      </div>
    </footer>
  );

  // Helper function to find item by ID (for favorites)
  function findItemById(itemId: string) {
    // This would search through all sidebar sections to find the item
    // Implementation depends on how you store the sidebar structure
    return null;
  }
};

export default Footer;