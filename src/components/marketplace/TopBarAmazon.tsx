'use client&apos;;

import { FormEvent, useEffect, useMemo, useState } from &apos;react&apos;;
import Link from &apos;next/link&apos;;
import { useRouter, useSearchParams } from &apos;next/navigation&apos;;
import { ChevronDown, Globe2, Loader2, Search, ShoppingCart, UserRound } from &apos;lucide-react&apos;;
import clsx from &apos;clsx&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { useCurrency } from &apos;@/src/contexts/CurrencyContext&apos;;
import { LANGUAGE_OPTIONS } from &apos;@/src/data/language-options&apos;;
import { CART_UPDATED_EVENT, computeCartCount } from &apos;@/src/lib/marketplace/cartClient&apos;;

interface DepartmentOption {
  name: string;
  slug: string;
}

interface TopBarAmazonProps {
  departments?: DepartmentOption[];
  loadingDepartments?: boolean;
}

const QUICK_LINKS = [
  { href: &apos;/marketplace/deals&apos;, label: &apos;Deals&apos; },
  { href: &apos;/marketplace/new&apos;, label: &apos;New Arrivals&apos; },
  { href: &apos;/marketplace/ppe&apos;, label: &apos;PPE&apos; },
  { href: &apos;/marketplace/mro&apos;, label: &apos;MRO&apos; },
  { href: &apos;/marketplace/bulk&apos;, label: &apos;Bulk Orders&apos; }
];

const TOPBAR_FLAG = &apos;fixzitMarketplaceTopbarMounted&apos;;

export default function TopBarAmazon({ departments: initialDepartments, loadingDepartments }: TopBarAmazonProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { language, setLanguage, isRTL } = useTranslation();
  const { currency, setCurrency, options: currencyOptions } = useCurrency();
  const [searchTerm, setSearchTerm] = useState(params?.get(&apos;q') ?? &apos;');
  const [selectedDepartment, setSelectedDepartment] = useState(params?.get(&apos;cat&apos;) ?? &apos;');
  const [departments, setDepartments] = useState(initialDepartments ?? []);
  const [openDepartments, setOpenDepartments] = useState(false);
  const [guardPassed, setGuardPassed] = useState(false);
  const [fetchingDepartments, setFetchingDepartments] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (typeof document === &apos;undefined&apos;) return;
    if (document.body.dataset[TOPBAR_FLAG] === &apos;true&apos;) {
      setGuardPassed(false);
      return;
    }
    document.body.dataset[TOPBAR_FLAG] = &apos;true&apos;;
    setGuardPassed(true);

    return () => {
      if (document.body.dataset[TOPBAR_FLAG]) {
        delete document.body.dataset[TOPBAR_FLAG];
      }
    };
  }, []);

  useEffect(() => {
    if (initialDepartments || fetchingDepartments || loadingDepartments) return;
    let cancelled = false;
    async function loadDepartments() {
      try {
        setFetchingDepartments(true);
        const response = await fetch(&apos;/api/marketplace/categories&apos;, { cache: &apos;no-store&apos; });
        if (!response.ok) {
          throw new Error(&apos;Failed to load departments&apos;);
        }
        const payload = await response.json();
        if (!cancelled && payload?.data?.length) {
          setDepartments(payload.data.map((item: any) => ({
            slug: item.slug,
            name: item.name?.en ?? item.name?.ar ?? item.slug
          })));
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setFetchingDepartments(false);
        }
      }
    }

    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [initialDepartments, fetchingDepartments, loadingDepartments]);

  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map(option => ({
        code: option.language,
        label: `${option.flag} ${option.native} (${option.iso})`
      })),
    []
  );

  useEffect(() => {
    if (!guardPassed || typeof window === &apos;undefined&apos;) {
      return undefined;
    }

    let cancelled = false;

    async function loadCartCount() {
      try {
        const response = await fetch(&apos;/api/marketplace/cart&apos;, { cache: &apos;no-store&apos;, credentials: &apos;include&apos; });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (!cancelled) {
          setCartCount(computeCartCount(payload?.data));
        }
      } catch (error) {
        console.error(&apos;Failed to load cart snapshot&apos;, error);
      }
    }

    loadCartCount();

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number }>).detail;
      if (!cancelled && detail && typeof detail.count === &apos;number&apos; && Number.isFinite(detail.count)) {
        setCartCount(detail.count);
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, handler);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, handler);
    };
  }, [guardPassed]);

  if (!guardPassed) {
    return null;
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim().length) {
      params.set(&apos;q', searchTerm.trim());
    }
    if (selectedDepartment) {
      params.set(&apos;cat&apos;, selectedDepartment);
    }
    router.push(`/marketplace/search${params.toString() ? `?${params.toString()}` : &apos;'}`);
  };

  return (
    <header className="w-full bg-[#0F1111] text-white shadow-lg" data-testid="marketplace-topbar">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/marketplace" className="text-lg font-semibold text-[#FFB400] hover:text-white" aria-label="Fixzit Souq home">
          Fixzit Souq
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDepartments(prev => !prev)}
            className="flex items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm font-medium hover:border-[#FFB400]/60 hover:bg-[#232F3E]"
            aria-haspopup="true"
            aria-expanded={openDepartments}
          >
            <span className="whitespace-nowrap">All Departments</span>
            <ChevronDown size={16} aria-hidden />
          </button>
          {openDepartments && (
            <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-700 bg-[#1F2933] p-2 text-sm shadow-xl">
              {fetchingDepartments || loadingDepartments ? (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-200">
                  <Loader2 size={16} className="animate-spin" />
                  Loading departments…
                </div>
              ) : departments.length ? (
                <ul className="space-y-1">
                  {departments.map(department => (
                    <li key={department.slug}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepartment(department.slug);
                          setOpenDepartments(false);
                          router.push(`/marketplace/search?cat=${encodeURIComponent(department.slug)}`);
                        }}
                        className="w-full rounded-md px-3 py-2 text-left text-white hover:bg-[#2D3A45]"
                      >
                        {department.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-gray-300">No departments yet</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex flex-1 overflow-hidden rounded-md" role="search">
          <label className="sr-only" htmlFor="marketplace-search">
            Search catalogue
          </label>
          <div className="relative hidden sm:block">
            <select
              id="marketplace-category-select"
              className="h-full w-40 border-0 bg-white/90 px-3 text-sm font-medium text-gray-900 outline-none"
              value={selectedDepartment}
              onChange={event => setSelectedDepartment(event.target.value)}
            >
              <option value="">All</option>
              {departments.map(department => (
                <option key={department.slug} value={department.slug}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <input
            id="marketplace-search"
            className="w-full min-w-0 flex-1 border-0 px-4 py-2 text-sm text-gray-900 focus:outline-none"
            placeholder="Search materials, SKUs, ASTM, BS EN…"
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            dir="ltr"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#FFB400] px-4 text-sm font-semibold text-black transition hover:bg-[#FFCB4F]"
          >
            <Search size={18} aria-hidden />
            Search
          </button>
        </form>

        <div className="hidden items-center gap-4 md:flex">
          <Link href="/marketplace/orders" className="text-sm font-medium hover:text-[#FFB400]">
            Orders
          </Link>
          <Link href="/marketplace/account" className="flex items-center gap-2 text-sm font-medium hover:text-[#FFB400]">
            <UserRound size={18} aria-hidden />
            Account
          </Link>
          <Link href="/marketplace/cart" className="flex items-center gap-1 text-sm font-semibold hover:text-[#FFB400]">
            <ShoppingCart size={18} aria-hidden />
            <span data-testid="cart-count">{cartCount}</span>
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <div className="relative">
            <select
              aria-label="Select language"
              value={language}
              onChange={event => setLanguage(event.target.value as any)}
              className="rounded-md border border-transparent bg-[#232F3E] px-3 py-2 text-sm font-medium text-white hover:border-[#FFB400]/60 focus:outline-none"
            >
              {languageOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              aria-label="Select currency"
              value={currency}
              onChange={event => setCurrency(event.target.value as any)}
              className="flex items-center gap-1 rounded-md border border-transparent bg-[#232F3E] px-3 py-2 text-sm font-medium text-white hover:border-[#FFB400]/60 focus:outline-none"
            >
              {currencyOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {`${option.flag} ${option.code}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <nav
        className={clsx(
          &apos;border-t border-[#232F3E] bg-[#232F3E]/95 text-sm text-gray-200&apos;,
          isRTL ? &apos;flex-row-reverse&apos; : &apos;'
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <div className="flex flex-wrap items-center gap-4 py-2">
            {QUICK_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#FFB400]"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="/" className="flex items-center gap-1 text-xs uppercase tracking-wide text-[#FFB400] hover:text-white">
            <Globe2 size={14} aria-hidden />
            Back to home
          </Link>
        </div>
      </nav>
    </header>
  );
}
