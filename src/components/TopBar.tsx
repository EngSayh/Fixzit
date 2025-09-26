'use client&apos;;

import { useState, useEffect, useRef } from &apos;react&apos;;
import { Bell, Search, User, ChevronDown } from &apos;lucide-react&apos;;
import { usePathname } from &apos;next/navigation&apos;;
import LanguageSelector from &apos;./i18n/LanguageSelector&apos;;
import Link from &apos;next/link&apos;;
import { useRouter } from &apos;next/navigation&apos;;
import { useTranslation } from &apos;@/src/contexts/TranslationContext&apos;;
import { useResponsive } from &apos;@/src/contexts/ResponsiveContext&apos;;

const SEARCH_DEBOUNCE_MS = 180;
const BLUR_CLOSE_DELAY_MS = 120;
// Fallback translations for when context is not available
const fallbackTranslations: Record<string, string> = {
  &apos;common.brand&apos;: &apos;FIXZIT ENTERPRISE&apos;,
  &apos;common.search.placeholder&apos;: &apos;Search Work Orders, Properties, Tenants...&apos;,
  &apos;nav.notifications&apos;: &apos;Notifications&apos;,
  &apos;common.unread&apos;: &apos;unread&apos;,
  &apos;common.noNotifications&apos;: &apos;No new notifications&apos;,
  &apos;common.loading&apos;: &apos;Loading...&apos;,
  &apos;common.allCaughtUp&apos;: "You&apos;re all caught up!",
  &apos;common.viewAll&apos;: &apos;View all notifications&apos;,
  &apos;nav.profile&apos;: &apos;Profile&apos;,
  &apos;nav.settings&apos;: &apos;Settings&apos;,
  &apos;common.logout&apos;: &apos;Sign out&apos;
};

interface TopBarProps {
  role?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: &apos;low&apos; | &apos;medium&apos; | &apos;high&apos;;
  category: string;
  type: string;
}

export default function TopBar({ role = &apos;guest&apos; }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(&apos;');
  const [openResults, setOpenResults] = useState(false);
  const [results, setResults] = useState<Array<{id:string; type:string; title:string; href:string; subtitle?:string}>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const closeResultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get responsive context
  const { responsiveClasses, screenInfo, isRTL } = useResponsive();

  // Safe translation function with fallback
  let t: (key: string, fallback?: string) => string;
  try {
    const translationContext = useTranslation();
    t = translationContext.t;
  } catch {
    // Fallback when translation context is not available
    t = (key: string, fallback?: string) => fallbackTranslations[key] || fallback || key;
  }

  const router = useRouter();
  const pathname = usePathname();

  // Derive module scope from path
  const scope: &apos;fm&apos;|'souq&apos;|'aqar&apos; = (pathname?.startsWith(&apos;/souq&apos;) || pathname?.startsWith(&apos;/marketplace&apos;))
    ? 'souq&apos;
    : pathname?.startsWith(&apos;/aqar&apos;)
      ? &apos;aqar&apos;
      : &apos;fm&apos;;

  const placeholder = scope === &apos;fm&apos;
    ? t(&apos;common.search.placeholder&apos;, &apos;Search Work Orders, Properties, Tenants...&apos;)
    : scope === 'souq&apos;
      ? t('souq.search.placeholder&apos;, &apos;Search catalog, vendors, RFQs, orders…&apos;)
      : t(&apos;aqar.search.placeholder&apos;, &apos;Search listings, projects, agents…&apos;);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearchError(null);
      setOpenResults(false);
      return;
    }
    const ac = new AbortController();
    const run = async () => {
      try {
        const r = await fetch(`/api/search?scope=${scope}&q=${encodeURIComponent(query)}`,
          { signal: ac.signal, headers: { accept: &apos;application/json&apos; } }
        );
        if (!r.ok) {
          if (r.status === 401) setSearchError(&apos;Authentication required&apos;);
          else if (r.status === 403) setSearchError(&apos;Access denied for this search scope&apos;);
          else setSearchError(`Search failed (${r.status})`);
          setResults([]);
          return;
        }
        const json = await r.json();
        if (json.error) {
          setSearchError(json.error);
          setResults([]);
          return;
        }
        setSearchError(null);
        setResults(Array.isArray(json.results) ? json.results : []);
      } catch (err: any) {
        if (err?.name === &apos;AbortError&apos;) return;
        console.error(&apos;Search request failed:&apos;, err);
        setSearchError(&apos;Network error - please check your connection&apos;);
        setResults([]);
      }
    };
    const id = setTimeout(run, SEARCH_DEBOUNCE_MS);
    return () => { ac.abort(); clearTimeout(id); };
  }, [query, scope]);

  useEffect(() => {
    setOpenResults(false);
    setResults([]);
  }, [pathname]);

  useEffect(() => () => {
    if (closeResultsTimeoutRef.current) {
      clearTimeout(closeResultsTimeoutRef.current);
    }
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notifOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [notifOpen]);

  // Close notification popup when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Check if the click is inside the notification container
      const isInsideNotification = target.closest(&apos;.notification-container&apos;);

      // If popup is open and click is outside notification container, close it
      if (notifOpen && !isInsideNotification) {
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (notifOpen && event.key === &apos;Escape&apos;) {
        setNotifOpen(false);
      }
    };

    if (notifOpen) {
      document.addEventListener(&apos;mousedown&apos;, handleClickOutside);
      document.addEventListener(&apos;keydown&apos;, handleKeyDown);
      return () => {
        document.removeEventListener(&apos;mousedown&apos;, handleClickOutside);
        document.removeEventListener(&apos;keydown&apos;, handleKeyDown);
      };
    }
  }, [notifOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(&apos;/api/notifications?limit=5&read=false&apos;, {
        headers: {
          &apos;x-user&apos;: JSON.stringify({
            id: &apos;guest&apos;,
            role: &apos;GUEST&apos;,
            tenantId: &apos;demo-tenant&apos;
          })
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.items || []);
      } else {
        // Use mock notifications if API fails
        setNotifications([
          {
            id: &apos;1',
            title: &apos;Invoice Payment Received&apos;,
            message: &apos;Payment for invoice INV-1234 has been processed successfully&apos;,
            timestamp: new Date().toISOString(),
            read: false,
            priority: &apos;medium&apos;,
            category: &apos;finance&apos;,
            type: &apos;payment&apos;
          },
          {
            id: &apos;2',
            title: &apos;Property Inspection Due&apos;,
            message: &apos;Monthly inspection for Tower A is scheduled for tomorrow&apos;,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false,
            priority: &apos;high&apos;,
            category: &apos;maintenance&apos;,
            type: &apos;inspection&apos;
          }
        ]);
      }
    } catch (error) {
      console.error(&apos;Failed to fetch notifications:&apos;, error);
      // Use mock notifications as fallback
      setNotifications([
        {
          id: &apos;1',
          title: &apos;Invoice Payment Received&apos;,
          message: &apos;Payment for invoice INV-1234 has been processed successfully&apos;,
          timestamp: new Date().toISOString(),
          read: false,
          priority: &apos;medium&apos;,
          category: &apos;finance&apos;,
          type: &apos;payment&apos;
        },
        {
          id: &apos;2',
          title: &apos;Property Inspection Due&apos;,
          message: &apos;Monthly inspection for Tower A is scheduled for tomorrow&apos;,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
          priority: &apos;high&apos;,
          category: &apos;maintenance&apos;,
          type: &apos;inspection&apos;
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return &apos;Just now&apos;;
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case &apos;high&apos;: return &apos;text-red-600&apos;;
      case &apos;medium&apos;: return &apos;text-yellow-600&apos;;
      case &apos;low&apos;: return &apos;text-green-600&apos;;
      default: return &apos;text-gray-600&apos;;
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch(&apos;/api/auth/logout&apos;, {
        method: &apos;POST&apos;,
        credentials: &apos;include&apos;
      });

      // Clear client-side storage
      localStorage.removeItem(&apos;fixzit-role&apos;);
      localStorage.removeItem(&apos;fxz.lang&apos;);
      localStorage.removeItem(&apos;fixzit-currency&apos;);
      localStorage.removeItem(&apos;fixzit-theme&apos;);

      // Clear any other localStorage items related to the app
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(&apos;fixzit-&apos;) || key.startsWith(&apos;fxz-&apos;)) {
          localStorage.removeItem(key);
        }
      });

      // Redirect to login page
      router.push(&apos;/login&apos;);
    } catch (error) {
      console.error(&apos;Logout error:&apos;, error);
      // Still redirect even if API call fails
      router.push(&apos;/login&apos;);
    }
  };

  return (
    <header className={`sticky top-0 z-40 h-14 bg-gradient-to-r from-[#023047] via-[#0061A8] to-[#00A859] text-white flex items-center justify-between ${responsiveClasses.container} shadow-sm border-b border-white/10 ${isRTL ? &apos;flex-row-reverse&apos; : &apos;'}`}>
      <div className={`flex items-center gap-2 sm:gap-4 ${isRTL ? &apos;flex-row-reverse&apos; : &apos;'}`}>
        <div className={`font-bold ${screenInfo.isMobile ? &apos;text-base&apos; : &apos;text-lg&apos;} ${isRTL ? &apos;text-right&apos; : &apos;'}`}>
          {t(&apos;common.brand&apos;, &apos;FIXZIT ENTERPRISE&apos;)}
        </div>
        <div className={`${screenInfo.isMobile ? &apos;hidden&apos; : &apos;flex&apos;} items-center bg-white/10 rounded px-3 py-1 relative`}>
          <Search className={`w-4 h-4 ${isRTL ? &apos;ml-2&apos; : &apos;mr-2&apos;} opacity-70`} />
          <input
            value={query}
            onChange={(e)=>{ setQuery(e.target.value); setOpenResults(true); }}
            onFocus={() => {
              if (closeResultsTimeoutRef.current) {
                clearTimeout(closeResultsTimeoutRef.current);
                closeResultsTimeoutRef.current = null;
              }
              setOpenResults(true);
            }}
            onBlur={()=>{
              closeResultsTimeoutRef.current = setTimeout(()=>{
                setOpenResults(false);
                closeResultsTimeoutRef.current = null;
              }, BLUR_CLOSE_DELAY_MS);
            }}
            className={`bg-transparent outline-none py-1 text-sm placeholder-white/70 ${screenInfo.isTablet ? &apos;w-48&apos; : &apos;w-64&apos;} ${isRTL ? &apos;text-right&apos; : &apos;'}`}
            placeholder={placeholder}
            aria-label={t(&apos;common.search.aria&apos;, &apos;Global Search&apos;)}
            aria-expanded={openResults && results.length > 0}
            aria-controls="global-search-results"
          />
          {openResults && (results.length > 0 || searchError) && (
            <div className={`absolute top-full mt-2 w-[28rem] max-w-[70vw] bg-white text-gray-900 rounded-lg shadow-xl border z-50 ${isRTL ? &apos;left-0&apos; : &apos;right-0&apos;}`}>
              {searchError ? (
                <div className="p-4 text-center">
                  <div className="text-red-600 text-sm font-medium mb-2">Search Error</div>
                  <div className="text-xs text-gray-600 mb-3">{searchError}</div>
                  <button
                    onMouseDown={() => {
                      setSearchError(null);
                      const current = query;
                      setQuery(&apos;');
                      setTimeout(() => setQuery(current), 10);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Retry Search
                  </button>
                </div>
              ) : (
                <ul id="global-search-results" role="listbox" className="max-h-80 overflow-auto py-1">
                  {results.map(r => (
                    <li key={`${r.type}:${r.id}`} role="option">
                      <Link href={r.href} className="block px-3 py-2 hover:bg-gray-50" onMouseDown={()=> setOpenResults(false)}>
                        <div className="text-sm font-medium">{r.title}</div>
                        {r.subtitle && <div className="text-[11px] text-gray-500">{r.type} • {r.subtitle}</div>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {/* Mobile search button */}
        {screenInfo.isMobile && (
          <button className="p-2 hover:bg-white/10 rounded-md">
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Center space retained; existing inline search handles desktop */}
      
      {/* Mobile search button */}
      {screenInfo.isMobile && (
        <button className="p-2 hover:bg-white/10 rounded-md" onClick={() => {/* Mobile search modal */}}>
          <Search className="w-4 h-4" />
        </button>
      )}
      
      <div className={`flex items-center gap-1 sm:gap-2 ${isRTL ? &apos;flex-row-reverse&apos; : &apos;'}`}>
        <LanguageSelector />
        <div className="notification-container relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 hover:bg-white/10 rounded-md relative transition-all duration-200 hover:scale-105"
            aria-label="Toggle notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          {notifOpen && (
            <div className={`notification-container absolute top-full mt-2 w-80 max-w-[calc(100vw-1rem)] md:w-80 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 z-[100] max-h-96 overflow-y-auto animate-in slide-in-from-top-2 duration-200 ${isRTL ? &apos;left-0 right-auto&apos; : &apos;right-0&apos;}`}>
              {/* Arrow pointer - hidden on mobile */}
              <div className={`hidden md:block absolute -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white ${isRTL ? &apos;left-8&apos; : &apos;right-8&apos;}`}></div>
              <div className={`hidden md:block absolute -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-200 ${isRTL ? &apos;left-8&apos; : &apos;right-8&apos;}`}></div>

              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t(&apos;nav.notifications&apos;, &apos;Notifications&apos;)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {notifications.filter(n => !n.read).length > 0
                      ? `${notifications.filter(n => !n.read).length} ${t(&apos;common.unread&apos;, &apos;unread&apos;)}`
                      : t(&apos;common.noNotifications&apos;, &apos;No new notifications&apos;)
                    }
                  </div>
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                  aria-label="Close notifications"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-3 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mx-auto"></div>
                    <div className="text-xs mt-1">{t(&apos;common.loading&apos;, &apos;Loading...&apos;)}</div>
                  </div>
                ) : notifications.length > 0 ? (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                        onClick={() => {
                          // Navigate to notification details or mark as read
                          setNotifOpen(false);
                          router.push(&apos;/notifications&apos;);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">
                              {notification.title}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {notification.message}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notification.priority)} bg-gray-100`}>
                                {notification.priority.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="text-sm">{t(&apos;common.noNotifications&apos;, &apos;No new notifications&apos;)}</div>
                    <div className="text-xs text-gray-400 mt-1">{t(&apos;common.allCaughtUp&apos;, "You&apos;re all caught up!")}</div>
                  </div>
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <Link
                    href="/notifications"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
                    onClick={() => setNotifOpen(false)}
                  >
                    {t(&apos;common.viewAll&apos;, &apos;View all notifications&apos;)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setUserOpen(!userOpen)} className="flex items-center gap-1 p-2 hover:bg-white/10 rounded-md">
            <User className="w-5 h-5" /><ChevronDown className="w-4 h-4" />
          </button>
          {userOpen && (
            <div className={`absolute top-10 w-44 bg-white text-gray-800 rounded-lg shadow-lg p-1 z-50 ${isRTL ? &apos;left-0 right-auto&apos; : &apos;right-0&apos;}`}>
              <a className="block px-3 py-2 hover:bg-gray-50 rounded" href="/profile">{t(&apos;nav.profile&apos;, &apos;Profile&apos;)}</a>
              <a className="block px-3 py-2 hover:bg-gray-50 rounded" href="/settings">{t(&apos;nav.settings&apos;, &apos;Settings&apos;)}</a>
              <div className="border-t my-1" />
              <button
                className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600 rounded"
                onClick={handleLogout}
              >
                {t(&apos;common.logout&apos;, &apos;Sign out&apos;)}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}