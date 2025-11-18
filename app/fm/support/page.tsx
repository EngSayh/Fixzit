'use client';

import Link from 'next/link';
import ModuleViewTabs from '@/components/fm/ModuleViewTabs';
import { useAutoTranslator } from '@/i18n/useAutoTranslator';

export default function SupportPage() {
  const auto = useAutoTranslator('fm.support');
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {auto('Support', 'header.title')}
          </h1>
          <p className="text-muted-foreground">
            {auto('Get help and manage support requests', 'header.subtitle')}
          </p>
        </div>
      </div>
      <ModuleViewTabs moduleId="support" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {auto('Help Resources', 'help.title')}
          </h2>
          <div className="space-y-3">
            <Link href="/help" className="block border border-border rounded p-4 hover:bg-muted">
              <h3 className="font-medium text-foreground">{auto('Help Center', 'help.centerTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {auto('Browse articles and guides', 'help.centerDescription')}
              </p>
            </Link>
            
            <button className="w-full text-start border border-border rounded p-4 hover:bg-muted"
              onClick={() => {
                const footer = document.querySelector('footer');
                const supportBtn = footer?.querySelector('button');
                supportBtn?.click();
              }}
            >
              <h3 className="font-medium text-foreground">
                {auto('Create Support Ticket', 'help.ticketTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {auto('Get help from our team', 'help.ticketDescription')}
              </p>
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-md border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {auto('Admin Tools', 'admin.title')}
          </h2>
          <div className="space-y-3">
            <Link href="/fm/support/tickets" className="block border border-border rounded p-4 hover:bg-muted">
              <h3 className="font-medium text-foreground">
                {auto('Manage Tickets', 'admin.manageTicketsTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {auto('View and respond to support tickets', 'admin.manageTicketsDescription')}
              </p>
            </Link>
            
            <Link href="/admin/cms" className="block border border-border rounded p-4 hover:bg-muted">
              <h3 className="font-medium text-foreground">
                {auto('CMS Editor', 'admin.cmsTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {auto('Edit privacy, terms, and about pages', 'admin.cmsDescription')}
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
