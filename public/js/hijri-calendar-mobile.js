/**
 * Hijri Calendar Integration for Mobile - Saudi Market Optimization
 * Fixzit Souq Enterprise Platform
 */

class HijriCalendarMobile {
    constructor() {
        this.currentLanguage = localStorage.getItem('fxz.lang') || 'en';
        this.preferHijri = localStorage.getItem('calendar_preference') === 'hijri';
        this.init();
    }

    init() {
        this.setupDateDisplays();
        this.addCalendarToggle();
        this.updateAllDates();
    }

    /**
     * Convert Gregorian to Hijri date
     * Using Umm al-Qura calendar system used in Saudi Arabia
     */
    gregorianToHijri(date) {
        // Simplified Hijri conversion - for production use Islamic calendar libraries
        const gregorianYear = date.getFullYear();
        const gregorianMonth = date.getMonth() + 1;
        const gregorianDay = date.getDate();
        
        // Approximate conversion (use proper Islamic calendar library in production)
        const hijriYear = Math.floor((gregorianYear - 579) * 1.030684);
        const hijriMonth = Math.floor((gregorianMonth + 8) % 12) + 1;
        const hijriDay = gregorianDay;
        
        return {
            year: hijriYear,
            month: hijriMonth,
            day: hijriDay,
            monthName: this.getHijriMonthName(hijriMonth),
            yearName: this.formatHijriYear(hijriYear)
        };
    }

    /**
     * Get Hijri month names in Arabic and English
     */
    getHijriMonthName(month) {
        const months = {
            ar: [
                'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
                'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
                'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
            ],
            en: [
                'Muharram', 'Safar', 'Rabi\' al-Awwal', 'Rabi\' al-Thani',
                'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
                'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah'
            ]
        };
        
        return {
            ar: months.ar[month - 1] || months.ar[0],
            en: months.en[month - 1] || months.en[0]
        };
    }

    /**
     * Format Hijri year with Arabic numerals if needed
     */
    formatHijriYear(year) {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        
        if (this.currentLanguage === 'ar') {
            return year.toString().split('').map(digit => arabicNumerals[parseInt(digit, 10)]).join('');
        }
        
        return year.toString();
    }

    /**
     * Format complete date string
     */
    formatDate(date, options = {}) {
        const gregorian = {
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            monthName: date.toLocaleDateString(this.currentLanguage === 'ar' ? 'ar-SA' : 'en-US', { month: 'long' })
        };
        
        const hijri = this.gregorianToHijri(date);
        
        if (options.hijriOnly) {
            return this.formatHijriDate(hijri);
        }
        
        if (options.gregorianOnly) {
            return this.formatGregorianDate(gregorian);
        }
        
        // Dual format - show both calendars
        return this.formatDualDate(gregorian, hijri);
    }

    formatHijriDate(hijri) {
        if (this.currentLanguage === 'ar') {
            return `${this.formatHijriYear(hijri.day)} ${hijri.monthName.ar} ${this.formatHijriYear(hijri.year)} هـ`;
        } else {
            return `${hijri.day} ${hijri.monthName.en} ${hijri.year} AH`;
        }
    }

    formatGregorianDate(gregorian) {
        if (this.currentLanguage === 'ar') {
            const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            const arabicDay = gregorian.day.toString().split('').map(d => arabicNumerals[parseInt(d, 10)]).join('');
            const arabicYear = gregorian.year.toString().split('').map(d => arabicNumerals[parseInt(d, 10)]).join('');
            return `${arabicDay} ${gregorian.monthName} ${arabicYear} م`;
        } else {
            return `${gregorian.day} ${gregorian.monthName} ${gregorian.year}`;
        }
    }

    formatDualDate(gregorian, hijri) {
        const gregorianStr = this.formatGregorianDate(gregorian);
        const hijriStr = this.formatHijriDate(hijri);
        
        if (this.currentLanguage === 'ar') {
            return `${hijriStr} (${gregorianStr})`;
        } else {
            return `${gregorianStr} (${hijriStr})`;
        }
    }

    /**
     * Setup date displays throughout the application
     */
    setupDateDisplays() {
        // Find all date elements
        document.querySelectorAll('[data-date]').forEach(element => {
            const dateStr = element.getAttribute('data-date');
            const date = dateStr ? new Date(dateStr) : new Date();
            this.updateDateElement(element, date);
        });

        // Setup current date displays
        document.querySelectorAll('.current-date').forEach(element => {
            this.updateDateElement(element, new Date());
        });
    }

    /**
     * Update a single date element
     */
    updateDateElement(element, date) {
        const options = {
            hijriOnly: element.classList.contains('hijri-only'),
            gregorianOnly: element.classList.contains('gregorian-only')
        };
        
        const formattedDate = this.formatDate(date, options);
        element.textContent = formattedDate;
        
        // Add proper text direction
        if (this.currentLanguage === 'ar') {
            element.setAttribute('dir', 'rtl');
        } else {
            element.setAttribute('dir', 'ltr');
        }
    }

    /**
     * Add calendar preference toggle
     */
    addCalendarToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'calendar-toggle mobile-calendar-btn';
        toggle.innerHTML = `
            <span class="calendar-icon">📅</span>
            <span class="calendar-text" data-en="Calendar: ${this.preferHijri ? 'Hijri' : 'Gregorian'}" 
                  data-ar="التقويم: ${this.preferHijri ? 'هجري' : 'ميلادي'}">${this.preferHijri ? 'Hijri' : 'Gregorian'}</span>
        `;
        
        toggle.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 97, 168, 0.9);
            color: white;
            border: none;
            border-radius: 25px;
            padding: 10px 16px;
            font-size: 12px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
            min-height: 44px;
            touch-action: manipulation;
        `;
        
        // RTL positioning
        if (this.currentLanguage === 'ar') {
            toggle.style.right = 'auto';
            toggle.style.left = '20px';
        }
        
        toggle.addEventListener('click', () => this.toggleCalendarPreference());
        document.body.appendChild(toggle);
        
        this.calendarToggle = toggle;
    }

    /**
     * Toggle between Hijri and Gregorian calendar preference
     */
    toggleCalendarPreference() {
        this.preferHijri = !this.preferHijri;
        localStorage.setItem('calendar_preference', this.preferHijri ? 'hijri' : 'gregorian');
        
        // Update toggle button
        const text = this.preferHijri ? 
            (this.currentLanguage === 'ar' ? 'التقويم: هجري' : 'Calendar: Hijri') :
            (this.currentLanguage === 'ar' ? 'التقويم: ميلادي' : 'Calendar: Gregorian');
        
        this.calendarToggle.querySelector('.calendar-text').textContent = text;
        
        // Update all date displays
        this.updateAllDates();
        
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    /**
     * Update all date displays in the page
     */
    updateAllDates() {
        this.setupDateDisplays();
        
        // Trigger custom event for other components
        document.dispatchEvent(new CustomEvent('calendarPreferenceChanged', {
            detail: {
                preferHijri: this.preferHijri,
                language: this.currentLanguage
            }
        }));
    }

    /**
     * Update language preference
     */
    setLanguage(language) {
        this.currentLanguage = language;
        this.updateAllDates();
        
        // Update toggle button position for RTL
        if (this.calendarToggle) {
            if (language === 'ar') {
                this.calendarToggle.style.right = 'auto';
                this.calendarToggle.style.left = '20px';
            } else {
                this.calendarToggle.style.left = 'auto';
                this.calendarToggle.style.right = '20px';
            }
        }
    }

    /**
     * Get important Islamic dates for the current year
     */
    getIslamicHolidays(year = new Date().getFullYear()) {
        // This would typically come from a proper Islamic calendar API
        // For demo purposes, showing approximate dates
        return {
            ramadan: this.currentLanguage === 'ar' ? 'شهر رمضان المبارك' : 'Ramadan',
            eid_fitr: this.currentLanguage === 'ar' ? 'عيد الفطر المبارك' : 'Eid al-Fitr',
            hajj: this.currentLanguage === 'ar' ? 'موسم الحج' : 'Hajj Season',
            eid_adha: this.currentLanguage === 'ar' ? 'عيد الأضحى المبارك' : 'Eid al-Adha',
            muharram: this.currentLanguage === 'ar' ? 'رأس السنة الهجرية' : 'Islamic New Year'
        };
    }

    /**
     * Add special styling for Islamic holidays
     */
    highlightIslamicDates() {
        const holidays = this.getIslamicHolidays();
        // Implementation would highlight relevant dates in calendar widgets
        console.log('Islamic holidays for current year:', holidays);
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        if (this.calendarToggle) {
            this.calendarToggle.remove();
        }
        
        document.removeEventListener('calendarPreferenceChanged', this.updateAllDates);
    }
}

// Saudi-specific mobile date utilities
class SaudiMobileUtils {
    static formatBusinessHours(openTime, closeTime, language = 'en') {
        const times = {
            ar: {
                am: 'ص',
                pm: 'م',
                closed: 'مغلق',
                open: 'مفتوح',
                hours: 'ساعات العمل'
            },
            en: {
                am: 'AM',
                pm: 'PM', 
                closed: 'Closed',
                open: 'Open',
                hours: 'Business Hours'
            }
        };
        
        const t = times[language] || times.en;
        return `${t.hours}: ${openTime} ${t.am} - ${closeTime} ${t.pm}`;
    }

    static formatSaudiPhone(phone) {
        // Format Saudi phone numbers properly
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('966')) {
            return `+966 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
        }
        return phone;
    }

    static formatSaudiAddress(address, language = 'en') {
        // Add proper Arabic address formatting
        if (language === 'ar') {
            return address.split(',').reverse().join('، ');
        }
        return address;
    }

    static getSaudiPaymentMethods() {
        return [
            { id: 'mada', name: 'مدى', name_en: 'Mada', icon: '💳' },
            { id: 'stcpay', name: 'STC Pay', name_en: 'STC Pay', icon: '📱' },
            { id: 'applepay', name: 'Apple Pay', name_en: 'Apple Pay', icon: '🍎' },
            { id: 'googlepay', name: 'Google Pay', name_en: 'Google Pay', icon: '🤖' },
            { id: 'visa', name: 'فيزا', name_en: 'Visa', icon: '💳' },
            { id: 'mastercard', name: 'ماستركارد', name_en: 'Mastercard', icon: '💳' }
        ];
    }
}

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.hijriCalendar = new HijriCalendarMobile();
    
    // Listen for language changes
    document.addEventListener('languageChanged', (e) => {
        if (window.hijriCalendar) {
            window.hijriCalendar.setLanguage(e.detail.language);
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HijriCalendarMobile, SaudiMobileUtils };
}