-- Service Marketplace System Database Schema
-- Comprehensive service request, bidding, and project management system

-- Service Categories and Types
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_types (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    estimated_duration_hours INTEGER,
    base_price_range_min DECIMAL(10,2),
    base_price_range_max DECIMAL(10,2),
    requires_materials BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Provider Enhanced Profiles
CREATE TABLE IF NOT EXISTS service_provider_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    business_name VARCHAR(255),
    business_name_ar VARCHAR(255),
    license_number VARCHAR(100),
    license_expiry DATE,
    address TEXT,
    address_ar TEXT,
    city VARCHAR(100),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    service_radius_km INTEGER DEFAULT 10,
    years_experience INTEGER,
    team_size INTEGER,
    insurance_coverage DECIMAL(15,2),
    insurance_expiry DATE,
    portfolio_images TEXT[], -- Array of image paths
    certifications TEXT[],
    working_hours JSONB, -- {"monday": {"start": "08:00", "end": "18:00"}, ...}
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    total_completed_jobs INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Provider Services (which services they offer)
CREATE TABLE IF NOT EXISTS provider_services (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES service_provider_profiles(id),
    service_type_id INTEGER REFERENCES service_types(id),
    hourly_rate DECIMAL(10,2),
    minimum_charge DECIMAL(10,2),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Service Requests/Projects
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    request_type VARCHAR(50) DEFAULT 'single', -- 'single', 'project'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'in_bidding', 'awarded', 'in_progress', 'completed', 'cancelled'
    
    -- Location Information
    service_address TEXT NOT NULL,
    service_city VARCHAR(100),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    access_instructions TEXT,
    
    -- Scheduling
    preferred_start_date DATE,
    preferred_end_date DATE,
    flexible_scheduling BOOLEAN DEFAULT false,
    preferred_time_slots JSONB, -- Array of preferred time slots
    
    -- Budget and Payment
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    budget_is_flexible BOOLEAN DEFAULT true,
    payment_terms VARCHAR(50) DEFAULT 'standard', -- 'standard', 'advance_50', 'advance_full', 'materials_first'
    
    -- Project Management
    services_order JSONB, -- Array of service IDs in preferred order for projects
    allow_parallel_services BOOLEAN DEFAULT false,
    
    -- Bidding Configuration
    max_bids_per_service INTEGER DEFAULT 3,
    bidding_deadline TIMESTAMP,
    auto_award_lowest BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual Services within a Request/Project
CREATE TABLE IF NOT EXISTS request_services (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
    service_type_id INTEGER REFERENCES service_types(id),
    quantity INTEGER DEFAULT 1,
    service_order INTEGER DEFAULT 0, -- For drag-drop ordering
    description TEXT,
    specific_requirements TEXT,
    estimated_duration_hours INTEGER,
    customer_budget DECIMAL(10,2),
    is_materials_included BOOLEAN DEFAULT false,
    materials_budget DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'bidding', 'awarded', 'in_progress', 'completed'
    awarded_bid_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Provider Bids
CREATE TABLE IF NOT EXISTS service_bids (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES service_provider_profiles(id),
    request_service_id INTEGER REFERENCES request_services(id) ON DELETE CASCADE,
    request_id INTEGER REFERENCES service_requests(id), -- For easier querying
    
    -- Bid Details
    total_price DECIMAL(10,2) NOT NULL,
    labor_cost DECIMAL(10,2),
    materials_cost DECIMAL(10,2),
    additional_costs DECIMAL(10,2),
    
    -- Timeline
    estimated_start_date DATE,
    estimated_completion_date DATE,
    estimated_duration_hours INTEGER,
    
    -- Payment Terms
    payment_structure VARCHAR(50), -- 'advance_50', 'advance_full', 'materials_first', 'completion'
    installment_plan JSONB, -- Custom installment structure
    
    -- Bid Content
    proposal_description TEXT,
    materials_list JSONB, -- Array of materials with quantities and prices
    warranty_period_months INTEGER DEFAULT 0,
    additional_services JSONB, -- Optional add-ons
    
    -- Status and Metadata
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'
    is_counter_offer BOOLEAN DEFAULT false,
    original_bid_id INTEGER REFERENCES service_bids(id),
    
    -- Admin notes
    admin_notes TEXT,
    rejection_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Agreements/Contracts
CREATE TABLE IF NOT EXISTS service_agreements (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(id),
    customer_id INTEGER REFERENCES users(id),
    provider_id INTEGER REFERENCES service_provider_profiles(id),
    
    -- Agreement Details
    agreement_number VARCHAR(100) UNIQUE,
    title VARCHAR(255),
    terms_and_conditions TEXT,
    terms_and_conditions_ar TEXT,
    
    -- Financial Terms
    total_amount DECIMAL(10,2),
    advance_payment_percentage INTEGER DEFAULT 0,
    advance_amount DECIMAL(10,2),
    materials_advance_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Payment Schedule
    payment_schedule JSONB, -- Array of payment milestones
    payment_terms VARCHAR(100),
    
    -- Timeline
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    
    -- Status and Legal
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent_for_signature', 'signed', 'active', 'completed', 'cancelled'
    customer_signature_date TIMESTAMP,
    provider_signature_date TIMESTAMP,
    customer_ip_address INET,
    provider_ip_address INET,
    
    -- Template and Customization
    template_id INTEGER,
    custom_clauses TEXT,
    saudi_law_compliance BOOLEAN DEFAULT true,
    
    -- File Management
    pdf_file_path TEXT,
    signed_pdf_path TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Transactions (Enhanced for Escrow)
CREATE TABLE IF NOT EXISTS service_payments (
    id SERIAL PRIMARY KEY,
    agreement_id INTEGER REFERENCES service_agreements(id),
    request_id INTEGER REFERENCES service_requests(id),
    customer_id INTEGER REFERENCES users(id),
    provider_id INTEGER REFERENCES service_provider_profiles(id),
    
    -- Payment Details
    payment_type VARCHAR(50), -- 'advance', 'materials', 'milestone', 'final', 'partial_refund'
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    
    -- Escrow Management
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'held_in_escrow', 'released', 'refunded', 'disputed'
    escrow_release_date TIMESTAMP,
    escrow_release_approved_by INTEGER REFERENCES users(id),
    
    -- Payment Processing
    payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', 'wallet', 'installment'
    transaction_reference VARCHAR(255),
    gateway_transaction_id VARCHAR(255),
    processing_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Timeline
    due_date DATE,
    paid_date TIMESTAMP,
    released_date TIMESTAMP,
    
    -- Dispute Management
    dispute_reason TEXT,
    dispute_status VARCHAR(50), -- 'none', 'raised', 'under_review', 'resolved'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bidirectional Rating System
CREATE TABLE IF NOT EXISTS service_ratings (
    id SERIAL PRIMARY KEY,
    agreement_id INTEGER REFERENCES service_agreements(id),
    request_id INTEGER REFERENCES service_requests(id),
    
    -- Rating Parties
    rater_id INTEGER REFERENCES users(id), -- Who is giving the rating
    rated_id INTEGER REFERENCES users(id), -- Who is being rated
    rating_type VARCHAR(20), -- 'customer_to_provider', 'provider_to_customer'
    
    -- Rating Details
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    
    -- Feedback
    positive_feedback TEXT,
    areas_for_improvement TEXT,
    would_recommend BOOLEAN,
    
    -- For Provider Rating Customer
    payment_timeliness_rating INTEGER CHECK (payment_timeliness_rating >= 1 AND payment_timeliness_rating <= 5),
    cooperation_rating INTEGER CHECK (cooperation_rating >= 1 AND cooperation_rating <= 5),
    
    -- Metadata
    is_verified BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Terms Templates (Admin Configuration)
CREATE TABLE IF NOT EXISTS payment_terms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    
    -- Payment Structure
    advance_percentage INTEGER DEFAULT 0,
    materials_advance_percentage INTEGER DEFAULT 0,
    milestone_payments JSONB, -- Array of milestone percentages
    
    -- Terms
    payment_due_days INTEGER DEFAULT 0,
    late_fee_percentage DECIMAL(5,2) DEFAULT 0,
    cancellation_fee_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Legal Compliance
    saudi_law_compliant BOOLEAN DEFAULT true,
    template_text TEXT,
    template_text_ar TEXT,
    
    -- Configuration
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    applicable_to_services JSONB, -- Array of service type IDs
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agreement Templates (Admin Configuration)
CREATE TABLE IF NOT EXISTS agreement_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    
    -- Template Content
    template_content TEXT NOT NULL,
    template_content_ar TEXT,
    
    -- Placeholders and Variables
    available_placeholders JSONB, -- Array of available placeholder variables
    custom_fields JSONB, -- Custom fields configuration
    
    -- Legal and Compliance
    saudi_law_compliant BOOLEAN DEFAULT true,
    lawyer_reviewed BOOLEAN DEFAULT false,
    review_date DATE,
    
    -- Configuration
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    service_categories JSONB, -- Which service categories this applies to
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Provider Availability
CREATE TABLE IF NOT EXISTS provider_availability (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER REFERENCES service_provider_profiles(id),
    date DATE NOT NULL,
    time_slot_start TIME,
    time_slot_end TIME,
    is_available BOOLEAN DEFAULT true,
    booking_type VARCHAR(50), -- 'available', 'booked', 'blocked'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Milestones and Progress Tracking
CREATE TABLE IF NOT EXISTS project_milestones (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(id),
    agreement_id INTEGER REFERENCES service_agreements(id),
    
    -- Milestone Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_order INTEGER,
    
    -- Payment and Progress
    payment_percentage DECIMAL(5,2) DEFAULT 0,
    payment_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status and Timeline
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'approved'
    due_date DATE,
    completed_date TIMESTAMP,
    customer_approved BOOLEAN DEFAULT false,
    customer_approval_date TIMESTAMP,
    
    -- Evidence and Documentation
    completion_photos TEXT[], -- Array of photo paths
    completion_notes TEXT,
    customer_feedback TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Configuration for Admin
CREATE TABLE IF NOT EXISTS marketplace_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50), -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_service_requests_location ON service_requests(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_bids_provider ON service_bids(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_bids_request ON service_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_service_ratings_rated ON service_ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_location ON service_provider_profiles(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_city ON service_provider_profiles(city);

-- Initial Service Categories Data
-- Commented out initial data insertions to prevent errors
-- These insertions require matching column names in the service_categories table
-- Will be handled by application initialization instead