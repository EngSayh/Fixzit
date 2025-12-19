// Service Worker for Mobile Performance Optimization with Arabic RTL Support
// Fixzit Souq Enterprise Platform - Saudi Market Optimized

const CACHE_NAME = "fixzit-souq-v1.1.0";
const STATIC_CACHE = "fixzit-static-v1.1.0";
const DYNAMIC_CACHE = "fixzit-dynamic-v1.1.0";
const IMAGE_CACHE = "fixzit-images-v1.1.0";
const ARABIC_CACHE = "fixzit-arabic-v1.1.0";
const FONT_CACHE = "fixzit-fonts-v1.1.0";

const swTranslations = {
  en: {
    "sw.offline.title": "Offline - Fixzit Souq",
    "sw.offline.heading": "You're Offline",
    "sw.offline.message":
      "Please check your internet connection and try again. Fixzit Souq requires an internet connection to function properly.",
    "sw.offline.button": "Try Again",
    "sw.offline.subtitle": "Enterprise facilities platform",
    "sw.offline.short": "Offline",
  },
  ar: {
    "sw.offline.title": "غير متصل - فكسيت سوق",
    "sw.offline.heading": "أنت غير متصل",
    "sw.offline.message":
      "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى. تتطلب فكسيت سوق اتصالاً بالإنترنت للعمل بشكل صحيح.",
    "sw.offline.button": "حاول مرة أخرى",
    "sw.offline.subtitle": "منصة إدارة المرافق للمؤسسات",
    "sw.offline.short": "غير متصل",
  },
};

const getSwLocale = (lang = "") =>
  lang.toLowerCase().startsWith("ar") ? "ar" : "en";

const swTranslate = (locale, key, fallback) => {
  const dict = swTranslations[locale] || swTranslations.en;
  return dict[key] || fallback;
};

// Assets to cache immediately - Enhanced for Arabic Support
const STATIC_ASSETS = [
  "/",
  "/landing.html",
  "/index.html",
  "/marketplace",
  "/fm/offline",
  "/manifest.json",
  "/img/fixzit-logo.png",
  "/assets/logo.svg",
];

// Arabic-specific assets
const ARABIC_ASSETS = [
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700&display=swap",
];

// Saudi-specific optimizations
const SAUDI_NETWORK_CONFIG = {
  lowBandwidth: true,
  compressImages: true,
  prefetchCritical: true,
  rtlOptimized: true,
};

// Enhanced cache strategies with Arabic and Saudi optimizations
const CACHE_STRATEGIES = {
  // Static assets - Cache first
  static: [
    /\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/,
    /\/static\//,
    /\/assets\//,
  ],

  // Arabic fonts - Cache first with longer TTL
  fonts: [
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /\.(woff2?|ttf|eot|otf)$/,
  ],

  // API calls - Network first with fallback
  api: [/\/api\//, /\/auth\//, /\/ar\//],

  // Pages - Stale while revalidate with Arabic support
  pages: [
    /\/dashboard/,
    /\/fm/,
    /\/properties/,
    /\/work-orders/,
    /\/finance/,
    /\/marketplace/,
    /\/ar\//,
  ],

  // Arabic content - Special handling
  arabic: [/\/ar\//, /arabic/, /rtl/],
};

// Install event - cache static and Arabic assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker with Arabic support");

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache Arabic fonts and assets
      caches.open(FONT_CACHE).then((cache) => {
        console.log("[SW] Caching Arabic fonts");
        return cache.addAll(ARABIC_ASSETS).catch((error) => {
          console.warn("[SW] Arabic fonts caching failed, continuing:", error);
        });
      }),
    ])
      .then(() => {
        console.log("[SW] All assets cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache assets:", error);
      }),
  );
});

// Activate event - clean up old caches with Arabic support
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker with Arabic support");

  const validCaches = [
    STATIC_CACHE,
    DYNAMIC_CACHE,
    IMAGE_CACHE,
    ARABIC_CACHE,
    FONT_CACHE,
  ];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated with Arabic support");
        return self.clients.claim();
      }),
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") {
    return;
  }

  event.respondWith(handleRequest(request));
});

// Enhanced request handler with Arabic and Saudi optimizations
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Arabic fonts - Cache first with longer TTL
    if (isFontAsset(path)) {
      return await fontCacheStrategy(request);
    }

    // Static assets - Cache first strategy
    if (isStaticAsset(path)) {
      return await cacheFirstStrategy(request, STATIC_CACHE);
    }

    // Images - Cache first with optimization
    if (isImage(path)) {
      return await imageStrategy(request);
    }

    // Arabic content - Special handling
    if (isArabicContent(path)) {
      return await arabicContentStrategy(request);
    }

    // API calls - Network first strategy
    if (isApiCall(path)) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE);
    }

    // Pages - Stale while revalidate
    if (isPage(path)) {
      return await staleWhileRevalidateStrategy(request, DYNAMIC_CACHE);
    }

    // Default - Network with cache fallback
    return await networkWithCacheFallback(request);
  } catch (error) {
    console.error("[SW] Request failed:", error);
    return await getOfflineFallback(request);
  }
}

// Cache first strategy for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Network request failed:", error);
    throw error;
  }
}

// Network first strategy for API calls
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Stale while revalidate strategy for pages
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Always fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error("[SW] Background fetch failed:", error);
    });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Optimized image strategy
async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache images aggressively for mobile performance
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Return placeholder image for failed image requests
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dominant-baseline="central">Image not available</text></svg>',
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "max-age=86400",
        },
      },
    );
  }
}

// Network with cache fallback
async function networkWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Enhanced offline fallback with full Arabic support
async function getOfflineFallback(request) {
  const url = new URL(request.url);

  // Check language preference
  const isArabicPath =
    url.pathname.includes("/ar/") || url.pathname.includes("arabic");
  const userLanguage = await getUserLanguagePreference();
  const shouldShowArabic = isArabicPath || userLanguage === "ar";

  // Return cached version if available
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // Return appropriate offline page
  if (request.mode === "navigate") {
    if (url.pathname.startsWith("/fm")) {
      const offlineShell = await caches.match("/fm/offline");
      if (offlineShell) {
        return offlineShell;
      }
    }
    const offlinePage = shouldShowArabic
      ? getArabicOfflinePage()
      : getBilingualOfflinePage();
    return new Response(offlinePage, {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache",
      },
    });
  }

  const shortLabel = swTranslate(
    shouldShowArabic ? "ar" : "en",
    "sw.offline.short",
    "Offline",
  );
  return new Response(shortLabel, { status: 503 });
}

// Get user language preference from cache or default
async function getUserLanguagePreference() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const langResponse = await cache.match("/language-preference");
    if (langResponse) {
      const lang = await langResponse.text();
      return lang === "ar" ? "ar" : "en";
    }
  } catch (error) {
    console.log("[SW] Could not determine language preference");
  }
  return "en";
}

// Arabic-optimized offline page
function getArabicOfflinePage() {
  const locale = "ar";
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${swTranslate(locale, "sw.offline.title", "غير متصل - فكسيت سوق")}</title>
      <style>
        body { 
          font-family: 'Tajawal', 'Noto Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0; padding: 40px 20px; background: #f8fafc;
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh; text-align: center; direction: rtl;
        }
        .offline-container {
          max-width: 400px; background: white; padding: 40px;
          border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .offline-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #1e293b; margin-bottom: 16px; font-family: 'Tajawal', sans-serif; }
        p { color: #64748b; margin-bottom: 24px; line-height: 1.8; }
        button {
          background: #B46B2F; color: white; border: none;
          padding: 12px 24px; border-radius: 8px; font-weight: 500;
          cursor: pointer; transition: background 0.2s;
          min-height: 44px; touch-action: manipulation;
          font-family: 'Tajawal', sans-serif;
        }
        button:hover { background: #004d86; }
        .subtitle { font-size: 14px; color: #64748b; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>${swTranslate(locale, "sw.offline.heading", "أنت غير متصل")}</h1>
        <p>${swTranslate(locale, "sw.offline.message", "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى. تتطلب فكسيت سوق اتصالاً بالإنترنت للعمل بشكل صحيح.")}</p>
        <button onclick="window.location.reload()">${swTranslate(locale, "sw.offline.button", "حاول مرة أخرى")}</button>
        <p class="subtitle">${swTranslate(locale, "sw.offline.subtitle", "منصة إدارة المرافق للمؤسسات")}</p>
      </div>
    </body>
    </html>
  `;
}

// Bilingual offline page
function getBilingualOfflinePage() {
  const enLocale = "en";
  const arLocale = "ar";
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${swTranslate(enLocale, "sw.offline.title", "Offline - Fixzit Souq")}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Tajawal', sans-serif;
          margin: 0; padding: 40px 20px; background: #f8fafc;
          display: flex; align-items: center; justify-content: center;
          min-height: 100vh; text-align: center;
        }
        .offline-container {
          max-width: 500px; background: white; padding: 40px;
          border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .offline-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #1e293b; margin-bottom: 16px; }
        p { color: #64748b; margin-bottom: 24px; line-height: 1.6; }
        button {
          background: #B46B2F; color: white; border: none;
          padding: 12px 24px; border-radius: 8px; font-weight: 500;
          cursor: pointer; transition: background 0.2s;
          min-height: 44px; touch-action: manipulation; margin: 0 8px;
        }
        button:hover { background: #004d86; }
        .arabic { 
          direction: rtl; font-family: 'Tajawal', 'Noto Sans Arabic', sans-serif; 
          margin-top: 32px; padding-top: 32px; border-top: 1px solid #e2e8f0;
        }
        .arabic p { line-height: 1.8; }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>${swTranslate(enLocale, "sw.offline.heading", "You're Offline")}</h1>
        <p>${swTranslate(enLocale, "sw.offline.message", "Please check your internet connection and try again. Fixzit Souq requires an internet connection to function properly.")}</p>
        <button onclick="window.location.reload()">${swTranslate(enLocale, "sw.offline.button", "Try Again")}</button>
        
        <div class="arabic">
          <h1>${swTranslate(arLocale, "sw.offline.heading", "أنت غير متصل")}</h1>
          <p>${swTranslate(arLocale, "sw.offline.message", "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى. تتطلب فكسيت سوق اتصالاً بالإنترنت للعمل بشكل صحيح.")}</p>
          <button onclick="window.location.reload()">${swTranslate(arLocale, "sw.offline.button", "حاول مرة أخرى")}</button>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Enhanced helper functions with Arabic support
function isStaticAsset(path) {
  return CACHE_STRATEGIES.static.some((pattern) => pattern.test(path));
}

function isImage(path) {
  return /\.(png|jpg|jpeg|gif|svg|webp|avif)$/i.test(path);
}

function isApiCall(path) {
  return CACHE_STRATEGIES.api.some((pattern) => pattern.test(path));
}

function isPage(path) {
  return (
    CACHE_STRATEGIES.pages.some((pattern) => pattern.test(path)) ||
    path === "/" ||
    path.endsWith(".html")
  );
}

function isFontAsset(path) {
  return CACHE_STRATEGIES.fonts.some((pattern) => pattern.test(path));
}

function isArabicContent(path) {
  return CACHE_STRATEGIES.arabic.some((pattern) => pattern.test(path));
}

// Font cache strategy for Arabic fonts
async function fontCacheStrategy(request) {
  const cache = await caches.open(FONT_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache fonts for longer periods
      const responseHeaders = new Headers(networkResponse.headers);
      responseHeaders.set("Cache-Control", "max-age=31536000"); // 1 year
      const modifiedResponse = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: responseHeaders,
      });
      cache.put(request, modifiedResponse.clone());
      return modifiedResponse;
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Font request failed:", error);
    throw error;
  }
}

// Arabic content strategy
async function arabicContentStrategy(request) {
  const cache = await caches.open(ARABIC_CACHE);
  const cachedResponse = await cache.match(request);

  // Background update for Arabic content
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log("[SW] Arabic content fetch failed:", error);
    });

  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

// Background sync for mobile performance
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(
      // Perform background sync operations
      performBackgroundSync(),
    );
  }
});

async function performBackgroundSync() {
  try {
    console.log("[SW] Performing background sync");

    // Update critical cache entries
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.log("[SW] Background sync failed for:", request.url);
      }
    }

    console.log("[SW] Background sync completed");
  } catch (error) {
    console.error("[SW] Background sync error:", error);
  }
}

// Enhanced push notifications with Arabic support
self.addEventListener("push", (event) => {
  if (!event.data) return;

  event.waitUntil(handlePushNotification(event.data.json()));
});

async function handlePushNotification(data) {
  const userLanguage = await getUserLanguagePreference();
  const isArabic = userLanguage === "ar";

  // Use Arabic content if available and preferred
  const title = isArabic && data.title_ar ? data.title_ar : data.title;
  const body = isArabic && data.body_ar ? data.body_ar : data.body;

  const options = {
    body: body,
    icon: "/img/fixzit-logo.png",
    badge: "/assets/logo.svg",
    vibrate: [200, 100, 200],
    tag: data.tag || "default",
    data: { ...data.data, language: userLanguage },
    dir: isArabic ? "rtl" : "ltr",
    lang: isArabic ? "ar" : "en",
    actions: isArabic && data.actions_ar ? data.actions_ar : data.actions || [],
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
  };

  return self.registration.showNotification(title, options);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
});

// Saudi-specific network optimizations
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "LANGUAGE_CHANGED") {
    const language = event.data.language;
    // Cache language preference
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.put("/language-preference", new Response(language));
    });
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Saudi mobile network optimizations
self.addEventListener("online", () => {
  console.log("[SW] Network connection restored - Saudi optimized");
  // Preload critical Arabic content when back online
  preloadArabicContent();
});

self.addEventListener("offline", () => {
  console.log("[SW] Network connection lost - activating offline mode");
});

// Preload Arabic content for better performance
async function preloadArabicContent() {
  const cache = await caches.open(ARABIC_CACHE);
  const arabicUrls = ["/ar/dashboard", "/ar/properties", "/ar/marketplace"];

  arabicUrls.forEach((url) => {
    fetch(url)
      .then((response) => {
        if (response.ok) {
          cache.put(url, response);
        }
      })
      .catch((error) => {
        console.log("[SW] Arabic content preload failed for:", url);
      });
  });
}

console.log(
  "[SW] Service worker with Arabic and Saudi optimizations loaded successfully",
);
console.log("[SW] RTL support: ✓");
console.log("[SW] Arabic fonts caching: ✓");
console.log("[SW] Saudi network optimizations: ✓");
console.log("[SW] Bilingual push notifications: ✓");
