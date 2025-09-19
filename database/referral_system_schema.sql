-- FIXZIT Referral Program Database Schema
-- Based on comprehensive referral blueprint with anti-fraud controls

-- System Settings table for super admin toggles
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Referral Codes table
CREATE TABLE IF NOT EXISTS user_referral_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    total_referrals INTEGER DEFAULT 0,
    total_earnings_sar DECIMAL(10,2) DEFAULT 0.00,
    lifetime_savings_sar DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral Events table for tracking the referral pipeline
CREATE TABLE IF NOT EXISTS referral_events (
    id SERIAL PRIMARY KEY,
    referrer_user_id INTEGER REFERENCES users(id),
    referee_user_id INTEGER REFERENCES users(id),
    referral_code VARCHAR(20) NOT NULL,
    event_type VARCHAR(30) NOT NULL, -- 'click', 'signup', 'first_booking', 'completed', 'rewarded'
    channel VARCHAR(20), -- 'whatsapp', 'sms', 'email', 'direct'
    booking_id INTEGER, -- Link to actual booking/service
    booking_amount_sar DECIMAL(10,2),
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'qualified', 'rewarded', 'expired', 'fraud'
    ip_address INET,
    device_fingerprint TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utm_source VARCHAR(50),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(50)
);

-- Referral Rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    referral_event_id INTEGER REFERENCES referral_events(id),
    referrer_user_id INTEGER REFERENCES users(id),
    referee_user_id INTEGER REFERENCES users(id),
    reward_type VARCHAR(20) NOT NULL, -- 'referrer_credit', 'referee_discount'
    reward_amount_sar DECIMAL(10,2) NOT NULL,
    original_amount_sar DECIMAL(10,2), -- Before caps applied
    currency VARCHAR(3) DEFAULT 'SAR',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'awarded', 'expired', 'cancelled'
    awarded_at TIMESTAMP,
    expires_at TIMESTAMP,
    booking_id INTEGER,
    booking_amount_sar DECIMAL(10,2),
    rating_received INTEGER, -- Rating out of 5 stars
    refund_window_cleared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly Referral Usage Tracking (for caps)
CREATE TABLE IF NOT EXISTS referral_monthly_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    month_yyyymm INTEGER NOT NULL, -- e.g., 202409 for Sept 2024
    successful_referrals INTEGER DEFAULT 0,
    total_earnings_sar DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month_yyyymm)
);

-- Referral Share Tracking (for analytics)
CREATE TABLE IF NOT EXISTS referral_shares (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    referral_code VARCHAR(20) NOT NULL,
    channel VARCHAR(20) NOT NULL, -- 'whatsapp', 'sms', 'email', 'link_copy'
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clicks_received INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT
);

-- Anti-Fraud Tracking
CREATE TABLE IF NOT EXISTS referral_fraud_checks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    check_type VARCHAR(30) NOT NULL, -- 'device_duplicate', 'payment_method_used', 'suspicious_velocity'
    check_result VARCHAR(20) NOT NULL, -- 'passed', 'failed', 'flagged'
    check_data JSONB,
    flagged_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral Program Configuration (Admin managed)
CREATE TABLE IF NOT EXISTS referral_program_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_description TEXT,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('referral_program_enabled', 'disabled', 'Master toggle for referral program visibility')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default referral program configuration
INSERT INTO referral_program_config (config_key, config_value, config_description) VALUES
('referee_discount_percentage', '10', 'Discount percentage for new customers (referees)'),
('referee_discount_cap_sar', '20', 'Maximum discount amount in SAR for referees'),
('referrer_reward_sar', '15', 'Wallet credit amount in SAR for referrers'),
('minimum_booking_sar', '100', 'Minimum booking amount to qualify for referral rewards'),
('monthly_referral_limit', '5', 'Maximum successful referrals per user per month'),
('reward_expiry_days', '90', 'Days until referrer wallet credit expires'),
('refund_window_hours', '48', 'Hours to wait before awarding rewards (refund protection)'),
('minimum_rating', '4', 'Minimum star rating required to qualify for rewards'),
('attribution_window_days', '30', 'Days to attribute referral after first click'),
('launch_bonus_sar', '10', 'Additional bonus for first 3 referrals (launch period)'),
('launch_bonus_duration_days', '60', 'Duration of launch bonus period')
ON CONFLICT (config_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_user_id ON user_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON user_referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON referral_events(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referee ON referral_events(referee_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_code ON referral_events(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_events_status ON referral_events(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_referral_monthly_usage_user_month ON referral_monthly_usage(user_id, month_yyyymm);

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code(user_id INTEGER) 
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate code: CSE-XXXX format (CSE = Comprehensive Service Enterprise)
        code := 'CSE-' || LPAD((RANDOM() * 9999)::INTEGER::TEXT, 4, '0');
        
        -- Check if code already exists
        SELECT COUNT(*) INTO exists_check FROM user_referral_codes WHERE referral_code = code;
        
        -- If unique, return the code
        IF exists_check = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;