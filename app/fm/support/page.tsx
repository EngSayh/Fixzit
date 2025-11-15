'use client';

import Link from 'next/link';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';

export default function SupportPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">Get help and manage support requests</p>
        </div>
      </div>
      <ModuleViewTabs moduleId="support" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Help Resources</h2>
          <div className="space-y-3">
            <Link href="/help" className="block border border-border rounded p-4 hover:bg-muted">
              <h3 className="font-medium text-foreground">Help Center</h3>
              <p className="text-sm text-muted-foreground mt-1">Browse articles and guides</p>
            </Link>
            
            <button className="w-full text-start border border-border rounded p-4 hover:bg-muted"
              onClick={() => {
                const footer = document.querySelector('footer');
                const supportBtn = footer?.querySelector('button');
                supportBtn?.click();
              }}
            >
              <h3 className="font-medium text-foreground">Create Support Ticket</h3>
              <p className="text-sm text-muted-foreground mt-1">Get help from our team</p>
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Admin Tools</h2>
          <div className="space-y-3">
            <Link href="/fm/support/tickets" className="block border border-border rounded p-4 hover:bg-muted">
              <h3 className="font-medium text-foreground">Manage Tickets</h3>
              <p className="text-sm text-muted-foreground mt-1">View and respond to support tickets</p>
            </Link>
            
            <Link href="/admin/cms" className="block border border-border rounded p-4 hover:bg-muted">
              <h3 className="font-medium text-foreground">CMS Editor</h3>
              <p className="text-sm text-muted-foreground mt-1">Edit privacy, terms, and about pages</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
