import { ReactNode } from 'react';
import TopBarAmazon from '@/src/components/marketplace/TopBarAmazon';
import { cookies } from 'next/headers';

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const lang = (cookieStore.get('lang')?.value || 'en').toLowerCase();
  const isRTL = lang === 'ar';
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <TopBarAmazon departments={[]} loadingDepartments />
      {children}
    </div>
  );
}

