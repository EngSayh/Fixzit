const app = {
    currentView: 'landing',
    currentModule: 'dashboard',
    sidebarCollapsed: false,
    currentLanguage: 'en',
    
    init() {
        this.showLanding();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.showCommandPalette();
            }
        });
    },
    
    showLanding() {
        this.hideAll();
        document.getElementById('landingPage').classList.add('active');
        this.currentView = 'landing';
    },
    
    showLogin() {
        this.hideAll();
        document.getElementById('loginScreen').classList.add('active');
        this.currentView = 'login';
    },
    
    showApp() {
        this.hideAll();
        document.getElementById('mainApp').classList.add('active');
        this.currentView = 'app';
        this.loadDashboard();
    },
    
    hideAll() {
        document.querySelectorAll('.landing-page, .login-screen, .main-app')
            .forEach(el => el.classList.remove('active'));
    },
    
    showArabic() {
        window.location.href = '/?lang=ar';
    },
    
    showMarketplace() {
        window.location.href = '/marketplace';
    },
    
    login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username && password) {
            this.showApp();
        } else {
            alert('Please enter valid credentials');
        }
    },
    
    navigate(module) {
        this.currentModule = module;
        
        // Update menu active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find and activate current menu item
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item) => {
            const itemText = item.textContent.toLowerCase();
            if (itemText.includes(module.toLowerCase()) || 
                (module === 'dashboard' && itemText.includes('dashboard')) ||
                (module === 'workorders' && itemText.includes('work orders')) ||
                (module === 'properties' && itemText.includes('properties')) ||
                (module === 'finance' && itemText.includes('finance')) ||
                (module === 'hr' && itemText.includes('hr')) ||
                (module === 'admin' && itemText.includes('admin')) ||
                (module === 'crm' && itemText.includes('crm')) ||
                (module === 'marketplace' && itemText.includes('marketplace')) ||
                (module === 'aqar' && itemText.includes('aqar')) ||
                (module === 'compliance' && itemText.includes('compliance')) ||
                (module === 'analytics' && itemText.includes('analytics')) ||
                (module === 'support' && itemText.includes('support')) ||
                (module === 'iot' && itemText.includes('iot'))) {
                item.classList.add('active');
            }
        });
        
        this.loadModule(module);
    },
    
    loadModule(module) {
        const content = document.getElementById('content');
        
        if (module === 'dashboard') {
            this.loadDashboard();
        } else {
            content.innerHTML = `
                <div style="padding: 2rem;">
                    <h1>${this.getModuleTitle(module)}</h1>
                    <p style="color: #666; margin-bottom: 2rem;">Loading ${module} module...</p>
                    
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <h3>Module Features</h3>
                        <ul style="margin-top: 1rem; color: #666;">
                            <li>Advanced ${module} management</li>
                            <li>Real-time data synchronization</li>
                            <li>Comprehensive reporting</li>
                            <li>Integration with other modules</li>
                        </ul>
                        
                        <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                            <strong>Status:</strong> <span style="color: var(--success);">✅ Operational</span><br>
                            <strong>Last Updated:</strong> ${new Date().toLocaleDateString()}<br>
                            <strong>Active Users:</strong> ${Math.floor(Math.random() * 50) + 10}
                        </div>
                    </div>
                </div>
            `;
        }
    },
    
    getModuleTitle(module) {
        const titles = {
            workorders: 'Work Orders',
            properties: 'Properties',
            finance: 'Finance',
            hr: 'Human Resources',
            admin: 'Administration',
            crm: 'Customer Relations',
            marketplace: 'Marketplace',
            aqar: 'Aqar Souq',
            compliance: 'Compliance',
            analytics: 'Analytics',
            support: 'Support',
            iot: 'IoT Sensors'
        };
        return titles[module] || module.charAt(0).toUpperCase() + module.slice(1);
    },
    
    loadDashboard() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div>
                <div style="margin-bottom: 2rem;">
                    <h1 style="font-size: 28px; font-weight: 600; color: #333; margin-bottom: 8px;">
                        ${this.currentLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                    </h1>
                    <p style="color: #666;">
                        ${this.currentLanguage === 'ar' ? 'مرحباً بعودتك! إليك نظرة عامة على ممتلكاتك' : 'Welcome back! Here\'s your property overview'}
                    </p>
                </div>
                
                <div class="dashboard-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">${this.currentLanguage === 'ar' ? 'إجمالي العقارات' : 'Total Properties'}</div>
                        <div class="kpi-value">247</div>
                        <div class="kpi-change positive">↑ 12% from last month</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">${this.currentLanguage === 'ar' ? 'معدل الإشغال' : 'Occupancy Rate'}</div>
                        <div class="kpi-value">94.3%</div>
                        <div class="kpi-change positive">↑ 2.1% from last month</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">${this.currentLanguage === 'ar' ? 'أوامر العمل النشطة' : 'Active Work Orders'}</div>
                        <div class="kpi-value">38</div>
                        <div class="kpi-change negative">↓ 5% from last week</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">${this.currentLanguage === 'ar' ? 'الإيرادات الشهرية' : 'Monthly Revenue'}</div>
                        <div class="kpi-value">SAR 2.4M</div>
                        <div class="kpi-change positive">↑ 18% from last month</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; margin-top: 2rem;">
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <h3 style="margin-bottom: 1rem;">Recent Activity</h3>
                        <ul style="color: #666;">
                            <li style="margin-bottom: 0.5rem;">✅ Work Order #WO-2024-001 completed</li>
                            <li style="margin-bottom: 0.5rem;">🏢 New tenant registered: Tower A, Unit 15</li>
                            <li style="margin-bottom: 0.5rem;">💰 Payment received: SAR 45,000</li>
                            <li style="margin-bottom: 0.5rem;">🔧 Maintenance scheduled: HVAC System</li>
                        </ul>
                    </div>
                    
                    <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <h3 style="margin-bottom: 1rem;">Quick Actions</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button onclick="app.navigate('workorders')" style="padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer;">Create Work Order</button>
                            <button onclick="app.navigate('properties')" style="padding: 0.75rem; background: var(--success); color: white; border: none; border-radius: 6px; cursor: pointer;">Add Property</button>
                            <button onclick="app.navigate('finance')" style="padding: 0.75rem; background: var(--accent); color: white; border: none; border-radius: 6px; cursor: pointer;">Generate Invoice</button>
                            <button onclick="app.navigate('support')" style="padding: 0.75rem; background: var(--warning); color: white; border: none; border-radius: 6px; cursor: pointer;">Contact Support</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('collapsed');
        this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    
    toggleLang() {
        this.currentLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
        document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
        
        const langBtn = document.getElementById('langBtn');
        if (langBtn) {
            langBtn.textContent = this.currentLanguage === 'en' ? 'العربية' : 'English';
        }
        
        // Reload current module to update language
        if (this.currentView === 'app') {
            this.loadModule(this.currentModule);
        }
    },
    
    setMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find the clicked button and activate it
        const clickedBtn = event.target;
        clickedBtn.classList.add('active');
        
        // Update UI based on mode
        console.log('Login mode changed to:', mode);
    },
    
    showCommandPalette() {
        alert('Command Palette (Ctrl+K)\nQuick actions:\n• Create Work Order\n• Add Property\n• Generate Report\n• Contact Support');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    console.log('FIXZIT SOUQ Application loaded successfully!');
});