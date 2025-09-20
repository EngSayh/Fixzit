'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from '../../../contexts/I18nContext';

interface FooterProps {
  appVersion?: string;
  companyName?: string;
}

export default function Footer({ 
  appVersion = '2.0.26', 
  companyName = 'FIXZIT Enterprise' 
}: FooterProps) {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ name: string; path: string; icon?: any }> = [
      { name: 'Home', path: '/', icon: Home }
    ];
    
    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({
        name,
        path: currentPath
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="h-12 border-t border-gray-200 bg-white text-gray-700 flex items-center justify-between px-4 shadow-sm">
      {/* Left Section - Copyright and Version */}
      <div className="flex items-center gap-4 text-sm">
        <span>© {currentYear} {companyName}</span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-500">v{appVersion}</span>
      </div>
      
      {/* Center Section - Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        <span className="text-gray-500 mr-2">You are here:</span>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-gray-800">
                {crumb.name}
              </span>
            ) : (
              <Link 
                href={crumb.path}
                className="text-gray-600 hover:text-gray-800 hover:underline transition-colors"
              >
                {crumb.icon && <crumb.icon className="w-3 h-3 inline mr-1" />}
                {crumb.name}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Right Section - Footer Links */}
      <nav className="flex items-center gap-4 text-sm">
        <Link 
          href="/privacy" 
          className="footer-link text-gray-600 hover:text-gray-800 hover:underline transition-colors"
        >
          {locale === 'ar' ? 'الخصوصية' : 'Privacy'}
        </Link>
        <Link 
          href="/terms" 
          className="footer-link text-gray-600 hover:text-gray-800 hover:underline transition-colors"
        >
          {locale === 'ar' ? 'الشروط' : 'Terms'}
        </Link>
        <Link 
          href="/support" 
          className="footer-link text-gray-600 hover:text-gray-800 hover:underline transition-colors"
        >
          {locale === 'ar' ? 'الدعم' : 'Support'}
        </Link>
        <Link 
          href="/contact" 
          className="footer-link text-gray-600 hover:text-gray-800 hover:underline transition-colors"
        >
          {locale === 'ar' ? 'اتصل بنا' : 'Contact'}
        </Link>
      </nav>
    </footer>
  );
}