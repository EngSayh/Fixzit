// Prayer Times Mobile Component for Saudi Users
// Fixzit Souq - Saudi Cultural Integration

class SaudiPrayerTimes {
    constructor() {
        this.currentLocation = null;
        this.prayerTimes = null;
        this.isEnabled = localStorage.getItem('prayerTimesEnabled') === 'true';
        this.userPreferences = this.loadUserPreferences();
        this.setupLocationServices();
    }

    loadUserPreferences() {
        const defaults = {
            madhab: 'shafi', // Shafi school prevalent in Saudi
            calculationMethod: 'UmmAlQura', // Saudi calculation method
            notifications: true,
            language: 'ar',
            hijriAdjustment: 0
        };
        
        const saved = localStorage.getItem('prayerPreferences');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    saveUserPreferences() {
        localStorage.setItem('prayerPreferences', JSON.stringify(this.userPreferences));
    }

    async setupLocationServices() {
        // Default to Riyadh if location not available
        this.currentLocation = {
            latitude: 24.7136,
            longitude: 46.6753,
            timezone: 'Asia/Riyadh',
            city: 'الرياض'
        };

        if ('geolocation' in navigator) {
            try {
                const position = await this.getCurrentPosition();
                this.currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timezone: 'Asia/Riyadh',
                    city: await this.getCityName(position.coords.latitude, position.coords.longitude)
                };
                this.calculatePrayerTimes();
            } catch (error) {
                console.log('Location access denied, using Riyadh as default');
                this.calculatePrayerTimes();
            }
        } else {
            this.calculatePrayerTimes();
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 600000 // 10 minutes
            });
        });
    }

    async getCityName(lat, lon) {
        // Simplified city detection for Saudi cities
        const saudiCities = [
            { name: 'الرياض', lat: 24.7136, lon: 46.6753 },
            { name: 'جدة', lat: 21.4858, lon: 39.1925 },
            { name: 'مكة المكرمة', lat: 21.3891, lon: 39.8579 },
            { name: 'المدينة المنورة', lat: 24.5247, lon: 39.5692 },
            { name: 'الدمام', lat: 26.4207, lon: 50.0888 },
            { name: 'تبوك', lat: 28.3838, lon: 36.5550 },
            { name: 'بريدة', lat: 26.3260, lon: 43.9750 },
            { name: 'الطائف', lat: 21.2703, lon: 40.4106 }
        ];

        let closestCity = saudiCities[0]; // Default to Riyadh
        let minDistance = Infinity;

        saudiCities.forEach(city => {
            const distance = this.calculateDistance(lat, lon, city.lat, city.lon);
            if (distance < minDistance) {
                minDistance = distance;
                closestCity = city;
            }
        });

        return closestCity.name;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculatePrayerTimes() {
        const now = new Date();
        const { latitude, longitude } = this.currentLocation;
        
        // Simplified prayer time calculation for demo
        // In production, you would use a proper library like adhan.js
        const times = this.getBasicPrayerTimes(latitude, longitude, now);
        
        this.prayerTimes = {
            fajr: times.fajr,
            dhuhr: times.dhuhr,
            asr: times.asr,
            maghrib: times.maghrib,
            isha: times.isha,
            date: now.toDateString(),
            hijriDate: this.getHijriDate(now)
        };

        this.scheduleNotifications();
        this.updateUI();
    }

    getBasicPrayerTimes(lat, lon, date) {
        // Basic calculation for demo purposes
        // Real implementation would use proper Islamic astronomical calculations
        const sunrise = new Date(date);
        sunrise.setHours(6, 0, 0, 0);
        
        const noon = new Date(date);
        noon.setHours(12, 0, 0, 0);
        
        const sunset = new Date(date);
        sunset.setHours(18, 30, 0, 0);

        return {
            fajr: new Date(sunrise.getTime() - 90 * 60000), // 1.5 hours before sunrise
            dhuhr: new Date(noon.getTime() + 15 * 60000), // 15 minutes after noon
            asr: new Date(noon.getTime() + 4 * 3600000), // 4 hours after noon
            maghrib: new Date(sunset.getTime() + 3 * 60000), // 3 minutes after sunset
            isha: new Date(sunset.getTime() + 90 * 60000) // 1.5 hours after sunset
        };
    }

    getHijriDate(gregorianDate) {
        // Simplified Hijri date for demo
        // Real implementation would use proper Hijri calendar conversion
        const hijriMonths = [
            'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية',
            'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
        ];
        
        // Approximate conversion (for demo only)
        const hijriYear = 1446; // Current approximate Hijri year
        const month = hijriMonths[gregorianDate.getMonth() % 12];
        const day = gregorianDate.getDate();
        
        return `${day} ${month} ${hijriYear}`;
    }

    scheduleNotifications() {
        if (!this.userPreferences.notifications || !('Notification' in window)) return;

        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
            Object.entries(this.prayerTimes).forEach(([prayer, time]) => {
                if (time instanceof Date && time > new Date()) {
                    this.scheduleNotification(prayer, time);
                }
            });
        }
    }

    scheduleNotification(prayer, time) {
        const now = new Date();
        const timeDiff = time.getTime() - now.getTime();
        
        if (timeDiff > 0) {
            setTimeout(() => {
                const prayerNames = {
                    fajr: 'الفجر',
                    dhuhr: 'الظهر',
                    asr: 'العصر',
                    maghrib: 'المغرب',
                    isha: 'العشاء'
                };

                const notification = new Notification('وقت الصلاة', {
                    body: `حان وقت صلاة ${prayerNames[prayer]}`,
                    icon: '/img/fixzit-logo.png',
                    tag: `prayer-${prayer}`,
                    dir: 'rtl',
                    lang: 'ar'
                });

                // Auto close after 5 seconds
                setTimeout(() => notification.close(), 5000);

                // Vibrate for mobile users
                if ('vibrate' in navigator) {
                    navigator.vibrate([500, 200, 500]);
                }
            }, timeDiff);
        }
    }

    updateUI() {
        const container = document.getElementById('prayerTimesContainer');
        if (!container) return;

        const prayerNames = {
            fajr: 'الفجر',
            dhuhr: 'الظهر',
            asr: 'العصر',
            maghrib: 'المغرب',
            isha: 'العشاء'
        };

        const html = `
            <div class="prayer-times-widget">
                <div class="prayer-header">
                    <div class="prayer-city">${this.currentLocation.city}</div>
                    <div class="prayer-date">${this.prayerTimes.hijriDate}</div>
                </div>
                <div class="prayer-times-grid">
                    ${Object.entries(this.prayerTimes)
                        .filter(([key]) => prayerNames[key])
                        .map(([key, time]) => `
                            <div class="prayer-time-item ${this.getNextPrayer() === key ? 'next-prayer' : ''}">
                                <div class="prayer-name">${prayerNames[key]}</div>
                                <div class="prayer-time">${this.formatTime(time)}</div>
                            </div>
                        `).join('')}
                </div>
                <div class="prayer-footer">
                    <button class="prayer-settings-btn" onclick="prayerTimes.toggleSettings()">
                        ⚙️ الإعدادات
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    formatTime(date) {
        if (!(date instanceof Date)) return '';
        return date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    getNextPrayer() {
        const now = new Date();
        const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        
        for (const prayer of prayers) {
            if (this.prayerTimes[prayer] > now) {
                return prayer;
            }
        }
        return 'fajr'; // Next day's Fajr
    }

    toggleSettings() {
        const settingsModal = document.getElementById('prayerSettingsModal');
        if (settingsModal) {
            settingsModal.classList.toggle('hidden');
        }
    }

    enable() {
        this.isEnabled = true;
        localStorage.setItem('prayerTimesEnabled', 'true');
        this.calculatePrayerTimes();
    }

    disable() {
        this.isEnabled = false;
        localStorage.setItem('prayerTimesEnabled', 'false');
        const container = document.getElementById('prayerTimesContainer');
        if (container) container.innerHTML = '';
    }

    // Mobile-specific methods
    handleMobileOrientation() {
        // Adjust prayer times display for mobile orientation changes
        setTimeout(() => {
            this.updateUI();
        }, 100);
    }

    getMobileWidgetHTML() {
        if (!this.isEnabled || !this.prayerTimes) return '';
        
        const nextPrayer = this.getNextPrayer();
        const nextTime = this.prayerTimes[nextPrayer];
        const prayerNames = {
            fajr: 'الفجر',
            dhuhr: 'الظهر',
            asr: 'العصر',
            maghrib: 'المغرب',
            isha: 'العشاء'
        };

        return `
            <div class="mobile-prayer-widget">
                <div class="next-prayer">
                    <span class="next-prayer-name">${prayerNames[nextPrayer]}</span>
                    <span class="next-prayer-time">${this.formatTime(nextTime)}</span>
                </div>
            </div>
        `;
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaudiPrayerTimes;
} else {
    window.SaudiPrayerTimes = SaudiPrayerTimes;
}
