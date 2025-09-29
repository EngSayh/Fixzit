'use client&apos;;

import Link from &apos;next/link&apos;;

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
            <Link href="/help" className="block border border-gray-200 rounded p-4 hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">Help Center</h3>
              <p className="text-sm text-gray-600 mt-1">Browse articles and guides</p>
            </Link>
            
            <button className="w-full text-left border border-gray-200 rounded p-4 hover:bg-gray-50"
              onClick={() => {
                const footer = document.querySelector('footer&apos;);
                const supportBtn = footer?.querySelector(&apos;button&apos;);
                supportBtn?.click();
              }}
            >
              <h3 className="font-medium text-gray-900">Create Support Ticket</h3>
              <p className="text-sm text-gray-600 mt-1">Get help from our team</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Tools</h2>
          <div className="space-y-3">
            <Link href="/fm/support/tickets" className="block border border-gray-200 rounded p-4 hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">Manage Tickets</h3>
              <p className="text-sm text-gray-600 mt-1">View and respond to support tickets</p>
            </Link>
            
            <Link href="/admin/cms" className="block border border-gray-200 rounded p-4 hover:bg-gray-50">
              <h3 className="font-medium text-gray-900">CMS Editor</h3>
              <p className="text-sm text-gray-600 mt-1">Edit privacy, terms, and about pages</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
