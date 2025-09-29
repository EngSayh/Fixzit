-- Drop existing tables to rebuild with new structure
DROP TABLE IF EXISTS module_access CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS system_modules CASCADE;

-- System modules table
CREATE TABLE IF NOT EXISTS system_modules (
    id SERIAL PRIMARY KEY,
    module_code VARCHAR(50) UNIQUE NOT NULL,
    module_name VARCHAR(100) NOT NULL,
    module_description TEXT,
    module_category VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module access matrix
CREATE TABLE IF NOT EXISTS module_access (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL, -- 'corporate', 'individual', 'employee', 'admin'
    module_id INTEGER REFERENCES system_modules(id),
    has_access BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT true,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    custom_permissions JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_type, module_id)
);

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- 'corporate', 'individual', 'employee'
    duration_days INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features JSONB,
    max_users INTEGER,
    max_properties INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id INTEGER REFERENCES subscription_plans(id),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    auto_renew BOOLEAN DEFAULT false,
    payment_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update users table to include login type
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_type VARCHAR(20) DEFAULT 'individual';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false;

-- Insert default system modules
INSERT INTO system_modules (module_code, module_name, module_category, module_description) VALUES
('DASHBOARD', 'Dashboard', 'Core', 'Main dashboard and analytics'),
('PROPERTIES', 'Properties Management', 'Real Estate', 'Property inventory and management'),
('CONTRACTS', 'Contracts Management', 'Real Estate', 'Lease contracts and agreements'),
('TICKETS', 'Maintenance Tickets', 'Operations', 'Service requests and maintenance'),
('PAYMENTS', 'Payments & Finance', 'Finance', 'Payment processing and tracking'),
('USERS', 'User Management', 'Admin', 'User accounts and permissions'),
('REPORTS', 'Reports & Analytics', 'Analytics', 'Business intelligence and reporting'),
('HR_SERVICES', 'HR Services', 'HR', 'Human resources management'),
('VENDORS', 'Vendor Management', 'Operations', 'Service provider management'),
('REFERRALS', 'Referral Program', 'Marketing', 'Referral system management'),
('EJAR', 'Ejar Integration', 'Compliance', 'Saudi Ejar platform integration'),
('SETTINGS', 'System Settings', 'Admin', 'System configuration'),
('NOTIFICATIONS', 'Notifications', 'Core', 'Alert and notification system'),
('DOCUMENTS', 'Document Management', 'Operations', 'File storage and management'),
('INVOICING', 'E-Invoicing', 'Finance', 'ZATCA compliant invoicing');

-- Insert default access matrix for each user type
-- Admin has full access
INSERT INTO module_access (user_type, module_id, has_access, can_create, can_read, can_update, can_delete)
SELECT 'admin', id, true, true, true, true, true FROM system_modules;

-- Corporate users have selective access
INSERT INTO module_access (user_type, module_id, has_access, can_create, can_read, can_update, can_delete)
SELECT 'corporate', id, 
    CASE 
        WHEN module_code IN ('DASHBOARD', 'PROPERTIES', 'CONTRACTS', 'TICKETS', 'PAYMENTS', 'REPORTS', 'VENDORS') THEN true
        ELSE false
    END,
    CASE 
        WHEN module_code IN ('PROPERTIES', 'CONTRACTS', 'TICKETS') THEN true
        ELSE false
    END,
    true,
    CASE 
        WHEN module_code IN ('PROPERTIES', 'CONTRACTS', 'TICKETS') THEN true
        ELSE false
    END,
    false
FROM system_modules;

-- Individual users have limited access
INSERT INTO module_access (user_type, module_id, has_access, can_create, can_read, can_update, can_delete)
SELECT 'individual', id,
    CASE 
        WHEN module_code IN ('DASHBOARD', 'TICKETS', 'PAYMENTS', 'DOCUMENTS', 'NOTIFICATIONS') THEN true
        ELSE false
    END,
    CASE 
        WHEN module_code = 'TICKETS' THEN true
        ELSE false
    END,
    CASE 
        WHEN module_code IN ('DASHBOARD', 'TICKETS', 'PAYMENTS', 'DOCUMENTS', 'NOTIFICATIONS') THEN true
        ELSE false
    END,
    false,
    false
FROM system_modules;

-- Employee users have operational access
INSERT INTO module_access (user_type, module_id, has_access, can_create, can_read, can_update, can_delete)
SELECT 'employee', id,
    CASE 
        WHEN module_code IN ('DASHBOARD', 'TICKETS', 'HR_SERVICES', 'DOCUMENTS', 'NOTIFICATIONS') THEN true
        ELSE false
    END,
    CASE 
        WHEN module_code IN ('TICKETS', 'HR_SERVICES') THEN true
        ELSE false
    END,
    true,
    CASE 
        WHEN module_code IN ('TICKETS', 'HR_SERVICES') THEN true
        ELSE false
    END,
    false
FROM system_modules;

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, plan_type, duration_days, price, max_users, max_properties) VALUES
('Corporate Basic', 'corporate', 30, 499.99, 10, 50),
('Corporate Professional', 'corporate', 90, 1299.99, 50, 200),
('Corporate Enterprise', 'corporate', 365, 4999.99, 999, 999),
('Individual Monthly', 'individual', 30, 29.99, 1, 1),
('Individual Yearly', 'individual', 365, 299.99, 1, 1),
('Employee Monthly', 'employee', 30, 19.99, 1, 0),
('Employee Yearly', 'employee', 365, 199.99, 1, 0),
('Trial Plan', 'corporate', 30, 0.00, 5, 10);