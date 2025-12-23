/* eslint-disable no-console, no-prototype-builtins, no-unused-vars */
/**
 * Saudi Mobile Optimizations for Fixzit Souq
 * Network performance, cultural adaptations, and mobile-specific features
 */

class SaudiMobileOptimizer {
  constructor() {
    this.networkInfo = null;
    this.isSlowConnection = false;
    this.culturalPreferences = this.loadCulturalPreferences();
    this.init();
  }

  init() {
    this.detectNetworkConditions();
    this.setupPerformanceOptimizations();
    this.applyCulturalAdaptations();
    this.setupMobilePaymentSupport();
    this.initializeOfflineSupport();
    this.setupAccessibilityFeatures();
  }

  /**
   * Detect network conditions common in Saudi Arabia
   */
  detectNetworkConditions() {
    if ("connection" in navigator) {
      this.networkInfo = navigator.connection;
      this.isSlowConnection =
        this.networkInfo.effectiveType === "slow-2g" ||
        this.networkInfo.effectiveType === "2g" ||
        this.networkInfo.downlink < 1.5;

      // Listen for network changes
      this.networkInfo.addEventListener("change", () => {
        this.handleNetworkChange();
      });
    }

    // Detect if user is on mobile data vs WiFi
    if (this.networkInfo?.type) {
      const isMobileData = ["cellular", "3g", "4g", "5g"].includes(
        this.networkInfo.type,
      );
      if (isMobileData) {
        this.enableDataSavingMode();
      }
    }
  }

  /**
   * Handle network condition changes
   */
  handleNetworkChange() {
    const wasSlowConnection = this.isSlowConnection;
    this.isSlowConnection =
      this.networkInfo.effectiveType === "slow-2g" ||
      this.networkInfo.effectiveType === "2g" ||
      this.networkInfo.downlink < 1.5;

    if (this.isSlowConnection && !wasSlowConnection) {
      this.enableLowBandwidthMode();
      this.showNetworkNotification("slow");
    } else if (!this.isSlowConnection && wasSlowConnection) {
      this.disableLowBandwidthMode();
      this.showNetworkNotification("fast");
    }
  }

  /**
   * Enable low bandwidth optimizations
   */
  enableLowBandwidthMode() {
    document.body.classList.add("low-bandwidth-mode");

    // Reduce image quality
    document.querySelectorAll("img[data-src]").forEach((img) => {
      const lowQualitySrc = img.dataset.lowQuality || img.dataset.src;
      img.src = lowQualitySrc;
    });

    // Defer non-critical resources
    this.deferNonCriticalResources();

    // Reduce animation complexity
    document.documentElement.style.setProperty("--transition-duration", "0.1s");
  }

  /**
   * Disable low bandwidth mode when connection improves
   */
  disableLowBandwidthMode() {
    document.body.classList.remove("low-bandwidth-mode");
    document.documentElement.style.removeProperty("--transition-duration");
  }

  /**
   * Enable data saving features
   */
  enableDataSavingMode() {
    // Preload only critical resources
    document.querySelectorAll('link[rel="prefetch"]').forEach((link) => {
      link.remove();
    });

    // Compress text content if supported
    if ("CompressionStream" in window) {
      // Implementation for text compression
    }
  }

  /**
   * Defer loading of non-critical resources
   */
  deferNonCriticalResources() {
    // Defer loading of images below the fold
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach((img) => {
      img.loading = "lazy";
    });

    // Defer analytics and tracking scripts
    const scripts = document.querySelectorAll("script[data-defer]");
    scripts.forEach((script) => {
      script.defer = true;
    });
  }

  /**
   * Apply Saudi cultural adaptations
   */
  applyCulturalAdaptations() {
    // Saudi color preferences
    document.documentElement.style.setProperty("--saudi-green", "#006C35");
    document.documentElement.style.setProperty("--gold-accent", "#C98036");
    document.documentElement.style.setProperty("--heritage-brown", "#8B4513");

    // Prayer time considerations
    this.setupPrayerTimeAdaptations();

    // Weekend adjustments (Friday-Saturday in Saudi)
    this.setupSaudiWeekendHandling();

    // Cultural number formatting
    this.setupNumberFormatting();
  }

  /**
   * Setup prayer time-aware features
   */
  setupPrayerTimeAdaptations() {
    // This would integrate with prayer time APIs
    const prayerTimes = this.getPrayerTimes();

    // Adjust notification timing to avoid prayer times
    if (prayerTimes) {
      this.scheduleRespectfulNotifications(prayerTimes);
    }
  }

  /**
   * Get prayer times (mock implementation)
   */
  getPrayerTimes() {
    // In production, this would call a prayer times API
    return {
      fajr: "05:30",
      dhuhr: "12:15",
      asr: "15:45",
      maghrib: "18:20",
      isha: "19:50",
    };
  }

  /**
   * Schedule notifications to be respectful of prayer times
   */
  scheduleRespectfulNotifications(prayerTimes) {
    // Avoid sending notifications during prayer times
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const avoidTimes = Object.values(prayerTimes);
    const shouldAvoidNotification = avoidTimes.some((prayerTime) => {
      const prayerMinutes = this.timeToMinutes(prayerTime);
      const currentMinutes = this.timeToMinutes(currentTime);
      return Math.abs(currentMinutes - prayerMinutes) < 15; // 15 minute buffer
    });

    if (shouldAvoidNotification) {
      // Delay notification by 20 minutes
      setTimeout(
        () => {
          // Reschedule notification
          this.scheduleRespectfulNotifications(prayerTimes);
        },
        20 * 60 * 1000,
      );
    }
  }

  /**
   * Convert time string to minutes
   */
  timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Setup Saudi weekend handling (Friday-Saturday)
   */
  setupSaudiWeekendHandling() {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Friday = 5, Saturday = 6 (weekend in Saudi)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      document.body.classList.add("saudi-weekend");

      // Show weekend greeting
      this.showWeekendGreeting();
    }
  }

  /**
   * Show appropriate weekend greeting
   */
  showWeekendGreeting() {
    const language = localStorage.getItem("fxz.lang") || "en";
    const greeting =
      language === "ar" ? "عطلة نهاية أسبوع مباركة" : "Blessed Weekend";

    // Could show as a subtle notification or header message
    console.log("Weekend greeting:", greeting);
  }

  /**
   * Setup Arabic/English number formatting
   */
  setupNumberFormatting() {
    const language = localStorage.getItem("fxz.lang") || "en";

    // Format numbers according to locale
    document.querySelectorAll("[data-number]").forEach((element) => {
      const number = parseFloat(element.dataset.number);
      if (!isNaN(number)) {
        if (language === "ar") {
          element.textContent = this.formatArabicNumber(number);
        } else {
          element.textContent = number.toLocaleString("en-US");
        }
      }
    });
  }

  /**
   * Format numbers with Arabic numerals
   */
  formatArabicNumber(number) {
    const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return number
      .toString()
      .split("")
      .map((digit) =>
        /\d/.test(digit) ? arabicNumerals[parseInt(digit, 10)] : digit,
      )
      .join("");
  }

  /**
   * Setup mobile payment method support
   */
  setupMobilePaymentSupport() {
    const supportedMethods = [
      "mada",
      "stcpay",
      "applepay",
      "googlepay",
      "samsungpay",
    ];

    // Detect available payment methods
    if ("PaymentRequest" in window) {
      const paymentMethods = [
        {
          supportedMethods: "basic-card",
          data: {
            supportedNetworks: ["mada", "visa", "mastercard"],
            supportedTypes: ["debit", "credit"],
          },
        },
      ];

      // Check for STC Pay
      if ("stcpay" in window || navigator.userAgent.includes("STCPay")) {
        paymentMethods.push({
          supportedMethods: "stcpay",
        });
      }

      // Store supported methods for later use
      this.supportedPaymentMethods = paymentMethods;
    }
  }

  /**
   * Initialize offline support features
   */
  initializeOfflineSupport() {
    // Cache critical data for offline use
    if ("caches" in window) {
      this.cacheOfflineData();
    }

    // Setup offline notifications
    window.addEventListener("online", () => {
      this.showConnectivityStatus("online");
      this.syncOfflineData();
    });

    window.addEventListener("offline", () => {
      this.showConnectivityStatus("offline");
    });
  }

  /**
   * Cache critical data for offline access
   */
  async cacheOfflineData() {
    const cache = await caches.open("saudi-mobile-offline");
    const criticalUrls = [
      "/api/user/profile",
      "/api/properties/my-properties",
      "/api/work-orders/urgent",
    ];

    try {
      await cache.addAll(criticalUrls);
    } catch (error) {
      console.warn("Failed to cache offline data:", error);
    }
  }

  /**
   * Show connectivity status to user
   */
  showConnectivityStatus(status) {
    const language = localStorage.getItem("fxz.lang") || "en";
    const messages = {
      online: {
        en: "Connected - Data synced",
        ar: "متصل - تم مزامنة البيانات",
      },
      offline: {
        en: "Offline mode - Limited functionality",
        ar: "وضع عدم الاتصال - وظائف محدودة",
      },
    };

    const message = messages[status][language];
    this.showToast(message, status === "online" ? "success" : "warning");
  }

  /**
   * Sync data when coming back online
   */
  async syncOfflineData() {
    // Implementation to sync any offline changes
    const offlineData = localStorage.getItem("offlineChanges");
    if (offlineData) {
      try {
        const changes = JSON.parse(offlineData);
        // Send changes to server
        await this.sendOfflineChanges(changes);
        localStorage.removeItem("offlineChanges");
      } catch (error) {
        console.error("Failed to sync offline data:", error);
      }
    }
  }

  /**
   * Setup accessibility features for Arabic and mobile
   */
  setupAccessibilityFeatures() {
    // Voice navigation in Arabic
    if ("speechSynthesis" in window) {
      this.setupArabicVoiceNavigation();
    }

    // High contrast mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    if (prefersDark.matches) {
      document.body.classList.add("high-contrast");
    }

    // Font scaling
    this.setupFontScaling();
  }

  /**
   * Setup Arabic voice navigation
   */
  setupArabicVoiceNavigation() {
    const voices = speechSynthesis.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang.startsWith("ar"));

    if (arabicVoice) {
      window.arabicVoice = arabicVoice;
      console.log("Arabic voice navigation available");
    }
  }

  /**
   * Setup font scaling for accessibility
   */
  setupFontScaling() {
    const preferredFontSize = localStorage.getItem("font-scale") || "1";
    document.documentElement.style.setProperty(
      "--font-scale",
      preferredFontSize,
    );

    // Add font scaling controls
    const fontControls = document.createElement("div");
    fontControls.className = "font-controls";
    fontControls.innerHTML = `
            <button onclick="adjustFontSize(-0.1)" aria-label="Decrease font size">A-</button>
            <button onclick="adjustFontSize(0.1)" aria-label="Increase font size">A+</button>
        `;

    // Position at top of page
    fontControls.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 5px;
        `;

    document.body.appendChild(fontControls);
  }

  /**
   * Show toast notification
   */
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === "success" ? "#6E4D2C" : type === "warning" ? "#C98036" : "#B46B2F"};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideUp 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Show network condition notification
   */
  showNetworkNotification(condition) {
    const language = localStorage.getItem("fxz.lang") || "en";
    const messages = {
      slow: {
        en: "Slow connection detected - Optimizing experience",
        ar: "تم اكتشاف اتصال بطيء - جاري تحسين التجربة",
      },
      fast: {
        en: "Connection improved - Full features available",
        ar: "تحسن الاتصال - جميع الميزات متاحة",
      },
    };

    this.showToast(
      messages[condition][language],
      condition === "slow" ? "warning" : "success",
    );
  }

  /**
   * Load cultural preferences
   */
  loadCulturalPreferences() {
    return {
      calendar: localStorage.getItem("calendar_preference") || "dual",
      language: localStorage.getItem("fxz.lang") || "en",
      theme: localStorage.getItem("theme_preference") || "auto",
      notifications:
        localStorage.getItem("notification_preferences") || "respectful",
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.networkInfo) {
      this.networkInfo.removeEventListener("change", this.handleNetworkChange);
    }

    window.removeEventListener("online", this.showConnectivityStatus);
    window.removeEventListener("offline", this.showConnectivityStatus);
  }
}

// Global font adjustment function
window.adjustFontSize = function (delta) {
  const currentScale =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--font-scale",
      ),
    ) || 1;
  const newScale = Math.min(Math.max(currentScale + delta, 0.8), 1.4); // Limit between 0.8 and 1.4

  document.documentElement.style.setProperty("--font-scale", newScale);
  localStorage.setItem("font-scale", newScale.toString());

  // Haptic feedback
  if ("vibrate" in navigator) {
    navigator.vibrate(30);
  }
};

// Auto-initialize
document.addEventListener("DOMContentLoaded", () => {
  window.saudiMobileOptimizer = new SaudiMobileOptimizer();
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = SaudiMobileOptimizer;
}
