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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-[#0061A8] mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 transition-colors"
          >
            <Home size={20} />
            Go to Homepage
          </Link>

          <button
            onClick={() => window.history.back()}
            className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="inline mr-2" />
            Go Back
          </button>
        </div>

        {/* Common Pages */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search size={20} className="text-[#0061A8]" />
            Popular Pages
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {commonPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-[#0061A8]/10 transition-colors text-left"
              >
                <span className="text-lg">{page.icon}</span>
                <span className="text-sm font-medium text-gray-900">{page.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-500">
          <p>
            If you believe this is an error, please contact{' '}
            <a href="mailto:support@fixzit.co" className="text-[#0061A8] hover:underline">
              support@fixzit.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
