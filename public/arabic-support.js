// Arabic/RTL Support for Fixzit Souq
const ArabicSupport = {
  // Arabic translations
  translations: {
    en: {
      dashboard: "Dashboard",
      properties: "Properties",
      workorders: "Work Orders",
      finance: "Finance",
      marketplace: "Marketplace",
      hr: "Human Resources",
      tickets: "Support Tickets",
      compliance: "Compliance",
      reports: "Reports",
      login: "Login",
      logout: "Logout",
      email: "Email",
      password: "Password",
      welcome: "Welcome to Fixzit Souq",
      total_properties: "Total Properties",
      open_orders: "Open Orders",
      this_month: "This Month",
      zatca_compliant: "ZATCA Compliant",
    },
    ar: {
      dashboard: "لوحة التحكم",
      properties: "العقارات",
      workorders: "أوامر العمل",
      finance: "المالية",
      marketplace: "السوق",
      hr: "الموارد البشرية",
      tickets: "تذاكر الدعم",
      compliance: "الامتثال",
      reports: "التقارير",
      login: "تسجيل الدخول",
      logout: "تسجيل الخروج",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      welcome: "أهلاً بك في فكزت سوق",
      total_properties: "إجمالي العقارات",
      open_orders: "الطلبات المفتوحة",
      this_month: "هذا الشهر",
      zatca_compliant: "متوافق مع زاتكا",
    },
  },

  currentLanguage: "en",

  // Initialize Arabic support
  init() {
    // Check for saved language preference
    const savedLang = localStorage.getItem("fxz.lang") || "en";
    this.setLanguage(savedLang);

    // Add language toggle button
    this.addLanguageToggle();
  },

  // Set language and apply RTL if Arabic
  setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem("fxz.lang", lang);

    const html = document.documentElement;
    const body = document.body;

    if (lang === "ar") {
      html.setAttribute("dir", "rtl");
      html.setAttribute("lang", "ar");
      body.classList.add("rtl");
      this.loadArabicFonts();
    } else {
      html.setAttribute("dir", "ltr");
      html.setAttribute("lang", "en");
      body.classList.remove("rtl");
    }

    // Update all text elements
    this.updateTextElements();
  },

  // Get translated text
  t(key) {
    return this.translations[this.currentLanguage][key] || key;
  },

  // Load Arabic fonts
  loadArabicFonts() {
    if (!document.getElementById("arabic-fonts")) {
      const link = document.createElement("link");
      link.id = "arabic-fonts";
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);

      // Apply Arabic font
      const style = document.createElement("style");
      style.innerHTML = `
        .rtl {
          font-family: 'Noto Sans Arabic', Arial, sans-serif !important;
        }
        .rtl .sidebar {
          right: 0;
          left: auto;
        }
        .rtl .main-content {
          margin-right: 250px;
          margin-left: 0;
        }
        .rtl .nav-menu li {
          flex-direction: row-reverse;
        }
        .rtl .stat-card {
          border-right: 4px solid #0078D4;
          border-left: none;
          text-align: right;
        }
        .rtl .login-form {
          text-align: right;
        }
      `;
      document.head.appendChild(style);
    }
  },

  // Add language toggle button
  addLanguageToggle() {
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "lang-toggle";
    toggleBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0078D4;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      z-index: 1000;
      font-weight: bold;
    `;

    toggleBtn.textContent =
      this.currentLanguage === "en" ? "العربية" : "English";
    toggleBtn.onclick = () => {
      const newLang = this.currentLanguage === "en" ? "ar" : "en";
      this.setLanguage(newLang);
      toggleBtn.textContent = newLang === "en" ? "العربية" : "English";
    };

    document.body.appendChild(toggleBtn);
  },

  // Update all text elements with translations
  updateTextElements() {
    // This would integrate with React component updates
    // For now, just dispatch a custom event
    window.dispatchEvent(
      new CustomEvent("languageChanged", {
        detail: { language: this.currentLanguage },
      }),
    );
  },

  // Hijri calendar support
  hijriCalendar: {
    // Convert Gregorian to Hijri (simplified)
    toHijri(gregorianDate) {
      // Basic conversion - in production use a proper library
      const greg = new Date(gregorianDate);
      const hijriYear = Math.floor((greg.getFullYear() - 622) * 1.030684);
      const hijriMonth = greg.getMonth() + 1;
      const hijriDay = greg.getDate();

      return {
        year: hijriYear,
        month: hijriMonth,
        day: hijriDay,
        formatted: `${hijriDay}/${hijriMonth}/${hijriYear} هـ`,
      };
    },

    // Hijri month names
    monthNames: [
      "محرم",
      "صفر",
      "ربيع الأول",
      "ربيع الثاني",
      "جمادى الأولى",
      "جمادى الثانية",
      "رجب",
      "شعبان",
      "رمضان",
      "شوال",
      "ذو القعدة",
      "ذو الحجة",
    ],
  },

  // Format numbers for Arabic locale
  formatNumber(number) {
    if (this.currentLanguage === "ar") {
      return new Intl.NumberFormat("ar-SA").format(number);
    }
    return new Intl.NumberFormat("en-US").format(number);
  },

  // Format currency for Saudi Riyal
  formatCurrency(amount) {
    const options = {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
    };

    if (this.currentLanguage === "ar") {
      return new Intl.NumberFormat("ar-SA", options).format(amount);
    }
    return new Intl.NumberFormat("en-US", options).format(amount);
  },
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  ArabicSupport.init();
});

// Make available globally
window.ArabicSupport = ArabicSupport;
