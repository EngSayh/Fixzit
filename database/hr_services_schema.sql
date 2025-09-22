-- HR Service Management System Schema
-- Based on comprehensive service data from Excel analysis

-- HR Departments table
CREATE TABLE IF NOT EXISTS hr_departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(20),
    hod_name VARCHAR(100),
    hod_email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HR Service Categories table
CREATE TABLE IF NOT EXISTS hr_service_categories (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES hr_departments(id),
    category_name VARCHAR(100) NOT NULL,
    category_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HR Teams table  
CREATE TABLE IF NOT EXISTS hr_teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100),
    manager_email VARCHAR(100),
    department_id INTEGER REFERENCES hr_departments(id),
    team_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main HR Services table
CREATE TABLE IF NOT EXISTS hr_services (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES hr_departments(id),
    category_id INTEGER REFERENCES hr_service_categories(id),
    service_name VARCHAR(200) NOT NULL,
    service_description TEXT,
    service_type VARCHAR(50), -- 'employee_portal', 'client_portal', 'internal'
    assigned_team_id INTEGER REFERENCES hr_teams(id),
    is_client_portal BOOLEAN DEFAULT FALSE,
    is_employee_app BOOLEAN DEFAULT FALSE,
    internal_sla_hours INTEGER DEFAULT 24,
    client_sla_hours INTEGER DEFAULT 48,
    importance_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    workflow_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HR Sub Services table
CREATE TABLE IF NOT EXISTS hr_sub_services (
    id SERIAL PRIMARY KEY,
    main_service_id INTEGER REFERENCES hr_services(id),
    sub_service_name VARCHAR(200) NOT NULL,
    sub_service_description TEXT,
    service_requirements TEXT,
    field_data_type VARCHAR(50), -- 'text', 'number', 'date', 'file', 'dropdown'
    field_description TEXT,
    execution_time_hours INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HR Service Requests table
CREATE TABLE IF NOT EXISTS hr_service_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INTEGER REFERENCES users(id),
    service_id INTEGER REFERENCES hr_services(id),
    sub_service_id INTEGER REFERENCES hr_sub_services(id),
    request_title VARCHAR(200) NOT NULL,
    request_description TEXT,
    request_data JSONB, -- Store dynamic form data
    status VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'in_review', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    assigned_to_team INTEGER REFERENCES hr_teams(id),
    assigned_to_user INTEGER REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    hr_comments TEXT,
    employee_feedback TEXT,
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HR Request Status History table
CREATE TABLE IF NOT EXISTS hr_request_status_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES hr_service_requests(id),
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- HR Request Attachments table
CREATE TABLE IF NOT EXISTS hr_request_attachments (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES hr_service_requests(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    file_type VARCHAR(50),
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial departments from Excel data
INSERT INTO hr_departments (department_name, department_code, hod_name, hod_email) VALUES
('Personnel', 'PERS', 'Sultana Al Swillam', 'sultana@fixzit.co'),
('Recruitment', 'REC', NULL, NULL),
('Admin Services', 'ADMIN', NULL, NULL),
('Medical Services', 'MED', NULL, NULL),
('Office Services', 'OFF', NULL, NULL)
ON CONFLICT (department_name) DO NOTHING;

-- Insert initial service categories
INSERT INTO hr_service_categories (department_id, category_name, category_description) VALUES
((SELECT id FROM hr_departments WHERE department_name = 'Personnel'), 'Leave', 'Leave requests and management'),
((SELECT id FROM hr_departments WHERE department_name = 'Personnel'), 'Salary', 'Salary-related services and issues'),
((SELECT id FROM hr_departments WHERE department_name = 'Personnel'), 'Overtime', 'Overtime requests and issues'),
((SELECT id FROM hr_departments WHERE department_name = 'Recruitment'), 'Job Posting', 'External and internal job announcements'),
((SELECT id FROM hr_departments WHERE department_name = 'Recruitment'), 'MRF', 'Manpower Request Form processing'),
((SELECT id FROM hr_departments WHERE department_name = 'Admin Services'), 'Employee Data', 'New employee data services'),
((SELECT id FROM hr_departments WHERE department_name = 'Admin Services'), 'Office Support', 'General office support services');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_services_department ON hr_services(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_services_category ON hr_services(category_id);
CREATE INDEX IF NOT EXISTS idx_hr_service_requests_employee ON hr_service_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_service_requests_status ON hr_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_service_requests_date ON hr_service_requests(submitted_at);
CREATE INDEX IF NOT EXISTS idx_hr_service_requests_service ON hr_service_requests(service_id);