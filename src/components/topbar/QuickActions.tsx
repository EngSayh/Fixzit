// src/components/topbar/QuickActions.tsx
'use client';
import React from 'react';
import Link from 'next/link';

export default function QuickActions({ perms }: { perms: string[] }) {
  const actions = [
    { label: 'New Work Order', href: '/fm/work-orders/new', perm: 'wo.create' },
    { label: 'New Invoice', href: '/fm/finance/invoices/new', perm: 'fin.invoice.create' },
    { label: 'New Listing', href: '/aqar/post', perm: 're.listing.create' },
    { label: 'New RFQ', href: '/souq/rfq/new', perm: 'mat.product.create' },
  ];

  const allowedActions = actions.filter(a => perms.includes(a.perm));

  if (allowedActions.length===0) return null;
  return (
    <div className="flex gap-2">
      {allowedActions.map(a=>(
        <Link key={a.href} href={a.href} className="px-3 py-2 rounded bg-[#00A859] text-white text-sm hover:opacity-90">
          + {a.label}
        </Link>
      ))}
    </div>
  );
}
