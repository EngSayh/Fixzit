'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-600">Get help and manage support requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Help Resources</h2>
          <div className="space-y-3">
            <Link href="/help" className="block border border-gray-200 rounded p-4 hover:bg-gray-50 transition-colors">
              <h3 className="font-medium text-gray-900">Knowledge Base</h3>
              <p className="text-sm text-gray-600 mt-1">Browse articles, guides, and tutorials</p>
            </Link>

            <button className="w-full text-left border border-gray-200 rounded p-4 hover:bg-gray-50 transition-colors"
              onClick={() => {
                const footer = document.querySelector('footer');
                const supportBtn = footer?.querySelector('button');
                supportBtn?.click();
              }}
            >
              <h3 className="font-medium text-gray-900">Create Support Ticket</h3>
              <p className="text-sm text-gray-600 mt-1">Get help from our team</p>
            </button>

            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-2">Quick Help (⌘/ or Ctrl/)</p>
              <p className="text-sm text-gray-600">Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘/</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl/</kbd> for instant help</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Tools</h2>
          <div className="space-y-3">
            <Link href="/fm/support/tickets" className="block border border-gray-200 rounded p-4 hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">Manage Tickets</h3>
              <p className="text-sm text-gray-600 mt-1">View and respond to support tickets</p>
            </Link>
            
            <Link href="/admin/settings" className="block border border-gray-200 rounded p-4 hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">Admin Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Edit company info, social links, and footer</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
