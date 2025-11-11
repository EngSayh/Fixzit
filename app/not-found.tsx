'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const commonPages = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Properties', href: '/properties', icon: '🏢' },
    { name: 'Work Orders', href: '/work-orders', icon: '🧰' },
    { name: 'Marketplace', href: '/marketplace', icon: '🛍️' },
    { name: 'Finance', href: '/finance', icon: '💳' },
    { name: 'HR', href: '/hr', icon: '👥' },
    { name: 'Login', href: '/login', icon: '🔐' },
  ];

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-colors"
          >
            <Home size={20} />
            Go to Homepage
          </Link>

          <button
            onClick={() => window.history.back()}
            className="block w-full px-6 py-3 border border-border text-foreground rounded-2xl hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} className="inline me-2" />
            Go Back
          </button>
        </div>

        {/* Common Pages */}
        <div className="bg-card rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search size={20} className="text-primary" />
            Popular Pages
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {commonPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="flex items-center gap-2 p-3 bg-muted rounded-2xl hover:bg-primary/10 transition-colors text-left"
              >
                <span className="text-lg">{page.icon}</span>
                <span className="text-sm font-medium text-foreground">{page.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-muted-foreground">
          <p>
            If you believe this is an error, please contact{' '}
            <a href="mailto:support@fixzit.co" className="text-primary hover:text-primary transition-colors">
              support@fixzit.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
