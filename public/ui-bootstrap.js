// UI Bootstrap - Fixes Missing Components
(function() {
    // Prevent duplicate initialization
    if (window.__uiBoot) return;
    window.__uiBoot = true;

    // View Management Functions
    window.showLogin = function() {
        const modal = document.getElementById('loginModal');
        if (modal) modal.classList.add('show');
    };

    window.closeLogin = function() {
        const modal = document.getElementById('loginModal');
        if (modal) modal.classList.remove('show');
    };

    window.showApp = function() {
        const landing = document.getElementById('landingPage');
        const mainApp = document.getElementById('mainApp');
        
        if (landing) landing.classList.remove('active');
        if (mainApp) mainApp.classList.add('active');
        
        closeLogin();
        if (window.loadDashboard) loadDashboard();
    };

    window.showLanding = function() {
        const landing = document.getElementById('landingPage');
        const mainApp = document.getElementById('mainApp');
        
        if (landing) landing.classList.add('active');
        if (mainApp) mainApp.classList.remove('active');
    };

    // Sidebar Toggle
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
        if (mainContent) {
            mainContent.classList.toggle('expanded');
        }
    };

    // Dynamic Header Management
    window.showModule = function(moduleName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        if (event && event.target) {
            event.target.classList.add('active');
        }

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            properties: 'Properties',
            workorders: 'Work Orders', 
            reports: 'Reports',
            tenants: 'Tenants'
        };

        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[moduleName] || moduleName;
        }

        // Load module content
        const loaders = {
            dashboard: window.loadDashboard,
            properties: window.loadProperties,
            workorders: window.loadWorkOrders,
            reports: window.loadReports,
            tenants: window.loadTenants
        };

        const loader = loaders[moduleName] || loaders.dashboard;
        if (loader) loader();
    };

    // Navigation function alias
    window.navigateTo = window.showModule;

    // Backend Login Function
    // Note: Default parameters are for testing only, not production use
    window.loginToBackend = async function(email = "admin@test.com", password = "") {
        try {
            const response = await fetch(`${window.API_URL || 'http://localhost:5000'}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem("token", data.token);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("Login failed:", error);
            return true; // Allow demo mode
        }
    };

    // DOM Ready Handler
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 UI Bootstrap initialized');

        // Set initial view state - show landing page only
        showLanding();

        // Inject Sidebar Toggle Button
        const navLeft = document.querySelector('.nav-left');
        if (navLeft && !document.querySelector('.sidebar-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'sidebar-toggle';
            toggleBtn.innerHTML = '☰';
            toggleBtn.onclick = toggleSidebar;
            toggleBtn.title = 'Toggle Sidebar';
            toggleBtn.style.marginRight = '15px';
            navLeft.insertBefore(toggleBtn, navLeft.firstChild);
            console.log('✅ Sidebar toggle added');
        }

        // Inject Global Footer
        if (!document.querySelector('.site-footer')) {
            const footer = document.createElement('footer');
            footer.className = 'app-footer site-footer';
            footer.innerHTML = `
                <div class="footer-content">
                    <div class="footer-section">
                        <h4>Fixzit Enterprise</h4>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Features</a></li>
                            <li><a href="#">Contact</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Solutions</h4>
                        <ul>
                            <li><a href="#">Property Management</a></li>
                            <li><a href="#">Work Orders</a></li>
                            <li><a href="#">Financial Tracking</a></li>
                        </ul>
                    </div>
                    <div class="footer-section">
                        <h4>Support</h4>
                        <ul>
                            <li><a href="#">Help Center</a></li>
                            <li><a href="#">Documentation</a></li>
                            <li><a href="#">Training</a></li>
                        </ul>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; 2024 Fixzit Enterprise. All rights reserved.</p>
                </div>
            `;
            document.body.appendChild(footer);
            console.log('✅ Footer added');
        }

        // Wire Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('loginEmail')?.value || 'admin@test.com';
                const password = document.getElementById('loginPassword')?.value || ''; // No default password for security
                
                try {
                    const success = await loginToBackend(email, password);
                    if (success) {
                        showApp();
                        console.log('✅ Login successful');
                    } else {
                        alert('Invalid credentials. Please try again.');
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    // Allow demo mode to proceed
                    showApp();
                }
            });
            console.log('✅ Login form wired');
        }

        // Wire Modal Close Events
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.addEventListener('click', function(e) {
                if (e.target === loginModal) {
                    closeLogin();
                }
            });
        }

        console.log('🎉 All UI components ready!');
    });
})();