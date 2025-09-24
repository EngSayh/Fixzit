'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Action = { label: string; href: string; perm?: string };

const ACTIONS_BY_SCOPE: Record<string, Action[]> = {
  '/fm': [
    { label: 'New Work Order', href: '/work-orders/new', perm: 'wo.create' },
    { label: 'New Invoice', href: '/finance/invoices/new', perm: 'finance.invoice.create' },
  ],
  '/aqar': [
    { label: 'Post Property', href: '/aqar/listings/new', perm: 'aqar.listing.create' },
  ],
  '/souq': [
    { label: 'New RFQ', href: '/marketplace/rfqs/new', perm: 'souq.rfq.create' },
    { label: 'Add Product/Service', href: '/marketplace/items/new', perm: 'souq.item.create' },
  ],
};

function getScope(pathname: string): string {
  if (pathname.startsWith('/fm')) return '/fm';
  if (pathname.startsWith('/aqar')) return '/aqar';
  if (pathname.startsWith('/souq') || pathname.startsWith('/marketplace')) return '/souq';
  return '/fm';
}

function can(perm?: string): boolean {
  // TODO: wire real RBAC; for now show all by default
  return true;
}

export default function QuickActions() {
  const pathname = usePathname() || '/';
  const scope = getScope(pathname);
  const actions = ACTIONS_BY_SCOPE[scope] || [];
  if (!actions.length) return null;
  return (
    <div className="hidden sm:flex items-center gap-2">
      {actions.filter(a => can(a.perm)).map(a => (
        <Link key={a.href} href={a.href} className="rounded-md bg-[var(--fixzit-yellow)] text-black px-2 py-1 text-xs sm:text-sm hover:opacity-90">
          + {a.label}
        </Link>
      ))}
    </div>
  );
}

