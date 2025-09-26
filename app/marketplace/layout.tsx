import { ReactNode } from &apos;react&apos;;
import TopBarAmazon from &apos;@/src/components/marketplace/TopBarAmazon&apos;;
import { cookies } from &apos;next/headers&apos;;

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const lang = (cookieStore.get(&apos;lang&apos;)?.value || &apos;en&apos;).toLowerCase();
  const isRTL = lang === &apos;ar&apos;;
  return (
    <div dir={isRTL ? &apos;rtl&apos; : &apos;ltr&apos;}>
      <TopBarAmazon departments={[]} loadingDepartments />
      {children}
    </div>
  );
}

