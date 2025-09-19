'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const pathname = usePathname();
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', href: '/', icon: Home }];
    
    paths.forEach((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ label, href, icon: undefined });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    {crumb.icon && <crumb.icon className="h-4 w-4 inline mr-1" />}
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {crumb.icon && <crumb.icon className="h-4 w-4 inline mr-1" />}
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Footer info */}
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Terms
            </Link>
            <Link href="/support" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Support
            </Link>
            <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Contact
            </Link>
            <span className="text-gray-400 dark:text-gray-500">|</span>
            <span>© 2025 Fixizit • v2.0.26</span>
          </div>
        </div>
      </div>
    </footer>
  );
}