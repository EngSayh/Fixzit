/**
 * Consolidated frontend application
 * This single app handles all pages to prevent duplication
 */

class FixzitApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.apiBaseUrl = window.location.origin;
        this.init();
    }

    init() {
        console.log('🚀 Fixzit App initialized');
        this.showPage('dashboard');
        this.loadDashboardData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', this.debounce(this.searchUsers.bind(this), 300));
        }
    }

    // Page Navigation - Consolidated routing
    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.add('hidden');
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            this.currentPage = pageName;
        }

        // Update navigation state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-blue-600', 'bg-blue-50');
            btn.classList.add('text-gray-600');
        });

        const activeBtn = document.querySelector(`[onclick="showPage('${pageName}')"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600');
            activeBtn.classList.add('text-blue-600', 'bg-blue-50');
        }

        // Load page-specific data
        this.loadPageData(pageName);
    }

    loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // Dashboard functionality
    async loadDashboardData() {
        try {
            // Load health status
            const healthResponse = await fetch(`${this.apiBaseUrl}/health`);
            const healthData = await healthResponse.json();

            this.updateDashboardStats(healthData);
            this.updateHealthStatus(healthData);

            // Load user count
            const usersResponse = await fetch(`${this.apiBaseUrl}/api/users`);
            const usersData = await usersResponse.json();
            
            if (usersData.success && usersData.data) {
                document.getElementById('total-users').textContent = 
                    usersData.data.pagination.totalUsers;
            }

        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    updateDashboardStats(healthData) {
        // Database status
        const dbStatusEl = document.getElementById('db-status');
        if (healthData.database && healthData.database.connected) {
            dbStatusEl.textContent = 'Connected';
            dbStatusEl.className = 'text-lg font-bold text-green-600';
        } else {
            dbStatusEl.textContent = 'Disconnected';
            dbStatusEl.className = 'text-lg font-bold text-red-600';
        }

        // Server uptime
        if (healthData.uptime) {
            const uptime = this.formatUptime(healthData.uptime);
            document.getElementById('server-uptime').textContent = uptime;
        }

        // Memory usage
        if (healthData.memory) {
            const memoryMB = Math.round(healthData.memory.heapUsed / 1024 / 1024);
            document.getElementById('memory-usage').textContent = `${memoryMB} MB`;
        }
    }

    updateHealthStatus(healthData) {
        const healthContainer = document.getElementById('health-status');
        const isHealthy = healthData.status === 'healthy';

        healthContainer.innerHTML = `
            <div class="flex items-center justify-between p-3 ${isHealthy ? 'bg-green-50' : 'bg-red-50'} rounded">
                <div class="flex items-center">
                    <div class="w-3 h-3 ${isHealthy ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-3"></div>
                    <span class="font-medium">Server Status</span>
                </div>
                <span class="${isHealthy ? 'text-green-600' : 'text-red-600'} font-semibold">
                    ${isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
            </div>
            <div class="flex items-center justify-between p-3 ${healthData.database?.connected ? 'bg-green-50' : 'bg-red-50'} rounded">
                <div class="flex items-center">
                    <div class="w-3 h-3 ${healthData.database?.connected ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-3"></div>
                    <span class="font-medium">Database Connection</span>
                </div>
                <span class="${healthData.database?.connected ? 'text-green-600' : 'text-red-600'} font-semibold">
                    ${healthData.database?.connected ? 'Connected' : 'Disconnected'}
                </span>
            </div>
        `;
    }

    // Users functionality
    async loadUsers(page = 1, search = '') {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10'
            });

            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`${this.apiBaseUrl}/api/users?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderUsersTable(data.data.users);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Failed to load users:', error);
            this.showToast('Failed to load users', 'error');
            this.renderUsersTable([]);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        
        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                        <i class="fas fa-users mr-2"></i>No users found
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span class="text-white font-medium">
                                    ${user.username.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.username}</div>
                            <div class="text-sm text-gray-500">
                                ${user.profile?.firstName || ''} ${user.profile?.lastName || ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${this.getRoleColor(user.role)}">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="app.editUser('${user._id}')" class="text-blue-600 hover:text-blue-900">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.deleteUser('${user._id}')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getRoleColor(role) {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'moderator': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    searchUsers() {
        const searchTerm = document.getElementById('user-search').value;
        this.loadUsers(1, searchTerm);
    }

    async createUser() {
        // In a real app, this would open a modal or form
        const username = prompt('Enter username:');
        const email = prompt('Enter email:');
        const password = prompt('Enter password:');

        if (!username || !email || !password) {
            this.showToast('All fields are required', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('User created successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Failed to create user:', error);
            this.showToast('Failed to create user', 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('User deleted successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Failed to delete user:', error);
            this.showToast('Failed to delete user', 'error');
        }
    }

    // Settings functionality
    async loadSettings() {
        await this.testDatabaseConnection();
    }

    async testDatabaseConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();

            const statusEl = document.getElementById('db-connection-status');
            if (data.database && data.database.connected) {
                statusEl.innerHTML = `
                    <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span class="text-sm text-green-600">Connected</span>
                `;
                this.showToast('Database connection successful', 'success');
            } else {
                statusEl.innerHTML = `
                    <div class="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span class="text-sm text-red-600">Disconnected</span>
                `;
                this.showToast('Database connection failed', 'error');
            }
        } catch (error) {
            console.error('❌ Database connection test failed:', error);
            this.showToast('Database connection test failed', 'error');
        }
    }

    // Utility functions
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        }[type];

        const icon = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type];

        toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform transition-transform duration-300 translate-x-full`;
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Global functions for onclick handlers
function showPage(pageName) {
    app.showPage(pageName);
}

function loadUsers() {
    app.loadUsers();
}

function createUser() {
    app.createUser();
}

function testDatabaseConnection() {
    app.testDatabaseConnection();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FixzitApp();
});

// Make app available globally for debugging
window.FixzitApp = FixzitApp;