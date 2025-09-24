'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppSwitcher() {
  const pathname = usePathname() || '/';
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const items = [
    { href: '/', label: 'Home' },
    { href: '/fm', label: 'Facility Management' },
    { href: '/aqar', label: 'Aqar Souq' },
    { href: '/souq', label: 'Fixzit Souq' },
    { href: '/marketplace', label: 'Marketplace' },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1">
      {items.map(i => (
        <Link
          key={i.href}
          href={i.href}
          className={`px-2 py-1 rounded-md text-xs sm:text-sm hover:bg-white/10 ${active(i.href) ? 'bg-white/15' : ''}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

