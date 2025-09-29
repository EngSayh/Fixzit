import os
import psycopg2


def get_db_connection():
    """Get database connection using environment variables"""
    try:
        conn = psycopg2.connect(
            host=os.getenv("PGHOST", "localhost"),
            database=os.getenv("PGDATABASE", "realestate"),
            user=os.getenv("PGUSER", "postgres"),
            password=os.getenv("PGPASSWORD", ""),
            port=os.getenv("PGPORT", "5432"),
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def initialize_database():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return

    cur = conn.cursor()

    try:
        # Corporate Organizations table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS corporate_organizations (
                id SERIAL PRIMARY KEY,
                corporate_id VARCHAR(100) UNIQUE NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                commercial_registration VARCHAR(100) UNIQUE NOT NULL,
                tax_number VARCHAR(100) UNIQUE NOT NULL,
                industry VARCHAR(100),
                company_size VARCHAR(50),
                address TEXT,
                city VARCHAR(100),
                country VARCHAR(100) DEFAULT 'Saudi Arabia',
                phone VARCHAR(20),
                email VARCHAR(255),
                website VARCHAR(255),
                contact_person_name VARCHAR(200),
                contact_person_title VARCHAR(100),
                subscription_type VARCHAR(50) DEFAULT 'trial',
                subscription_status VARCHAR(20) DEFAULT 'active',
                trial_start_date DATE,
                trial_end_date DATE,
                subscription_start_date DATE,
                subscription_end_date DATE,
                max_users INTEGER DEFAULT 10,
                max_properties INTEGER DEFAULT 5,
                features_enabled TEXT[], 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Users table (enhanced with corporate support)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20) UNIQUE NOT NULL,
                national_id VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'tenant',
                language VARCHAR(5) DEFAULT 'en',
                is_verified BOOLEAN DEFAULT FALSE,
                location_lat DECIMAL(10, 8),
                location_lng DECIMAL(11, 8),
                corporate_id INTEGER REFERENCES corporate_organizations(id) ON DELETE SET NULL,
                user_type VARCHAR(20) DEFAULT 'individual',
                is_trial_user BOOLEAN DEFAULT FALSE,
                trial_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Properties table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS properties (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                property_type VARCHAR(50) NOT NULL,
                total_units INTEGER DEFAULT 1,
                manager_id INTEGER REFERENCES users(id),
                location_lat DECIMAL(10, 8),
                location_lng DECIMAL(11, 8),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Units table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS units (
                id SERIAL PRIMARY KEY,
                property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
                unit_number VARCHAR(50) NOT NULL,
                unit_type VARCHAR(50) NOT NULL,
                size_sqm DECIMAL(10, 2),
                bedrooms INTEGER,
                bathrooms INTEGER,
                monthly_rent DECIMAL(10, 2),
                status VARCHAR(20) DEFAULT 'available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(property_id, unit_number)
            )
        """
        )

        # Contracts table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS contracts (
                id SERIAL PRIMARY KEY,
                contract_number VARCHAR(100) UNIQUE NOT NULL,
                tenant_id INTEGER REFERENCES users(id),
                property_id INTEGER REFERENCES properties(id),
                unit_id INTEGER REFERENCES units(id),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                monthly_rent DECIMAL(10, 2) NOT NULL,
                security_deposit DECIMAL(10, 2),
                status VARCHAR(20) DEFAULT 'active',
                contract_file_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Tickets table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                category VARCHAR(50) NOT NULL,
                priority VARCHAR(20) DEFAULT 'medium',
                status VARCHAR(20) DEFAULT 'open',
                submitter_id INTEGER REFERENCES users(id),
                assigned_to INTEGER REFERENCES users(id),
                property_id INTEGER REFERENCES properties(id),
                unit_id INTEGER REFERENCES units(id),
                estimated_cost DECIMAL(10, 2),
                actual_cost DECIMAL(10, 2),
                scheduled_date DATE,
                completed_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Ticket comments table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ticket_comments (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id),
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Payments table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                contract_id INTEGER REFERENCES contracts(id),
                amount DECIMAL(10, 2) NOT NULL,
                payment_type VARCHAR(50) NOT NULL,
                due_date DATE NOT NULL,
                paid_date DATE,
                status VARCHAR(20) DEFAULT 'pending',
                payment_method VARCHAR(50),
                transaction_reference VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Contractors table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS contractors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(255),
                specialization VARCHAR(100),
                rating DECIMAL(3, 2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Warranties table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS warranties (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                property_id INTEGER REFERENCES properties(id),
                unit_id INTEGER REFERENCES units(id),
                contractor_id INTEGER REFERENCES contractors(id),
                service_provider_name VARCHAR(255) NOT NULL,
                warranty_item VARCHAR(255) NOT NULL,
                warranty_description TEXT,
                category VARCHAR(100) NOT NULL,
                warranty_start_date DATE NOT NULL,
                warranty_end_date DATE NOT NULL,
                warranty_duration_months INTEGER,
                invoice_number VARCHAR(100),
                invoice_amount DECIMAL(10, 2),
                invoice_file_path TEXT,
                warranty_terms TEXT,
                contact_info TEXT,
                status VARCHAR(20) DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Warranty notifications table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS warranty_notifications (
                id SERIAL PRIMARY KEY,
                warranty_id INTEGER REFERENCES warranties(id) ON DELETE CASCADE,
                notification_type VARCHAR(20) NOT NULL, -- '90_days', '60_days', '30_days', 'expired'
                notification_date DATE NOT NULL,
                sent_date DATE,
                is_sent BOOLEAN DEFAULT FALSE,
                recipient_ids INTEGER[], -- Array of user IDs to notify
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service ratings table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_ratings (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                tenant_id INTEGER REFERENCES users(id),
                assigned_staff_id INTEGER REFERENCES users(id),
                overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
                quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
                timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
                professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
                feedback_text TEXT,
                would_recommend BOOLEAN,
                service_category VARCHAR(100),
                service_completion_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service approvals table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_approvals (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                requesting_staff_id INTEGER REFERENCES users(id),
                tenant_id INTEGER REFERENCES users(id),
                approval_type VARCHAR(50) NOT NULL, -- 'additional_cost', 'service_change', 'extra_work', 'spare_parts'
                description TEXT NOT NULL,
                additional_cost DECIMAL(10, 2),
                estimated_time_hours DECIMAL(4, 1),
                justification TEXT,
                tenant_approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
                tenant_response_date TIMESTAMP,
                tenant_comments TEXT,
                admin_approval_status VARCHAR(20) DEFAULT 'pending',
                admin_response_date TIMESTAMP,
                admin_comments TEXT,
                payment_required BOOLEAN DEFAULT FALSE,
                payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'paid', 'refunded'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service photos table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_photos (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                uploaded_by INTEGER REFERENCES users(id),
                photo_type VARCHAR(20) NOT NULL, -- 'before', 'after', 'progress', 'damage'
                file_path TEXT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                description TEXT,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        """
        )

        # Service comments table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_comments (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id),
                comment_type VARCHAR(30) NOT NULL, -- 'maintenance_note', 'tenant_feedback', 'admin_note', 'approval_request'
                comment_text TEXT NOT NULL,
                is_internal BOOLEAN DEFAULT FALSE, -- Whether comment is visible only to staff
                reply_to_comment_id INTEGER REFERENCES service_comments(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service payments table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_payments (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                approval_id INTEGER REFERENCES service_approvals(id),
                payer_id INTEGER REFERENCES users(id),
                payment_type VARCHAR(30) NOT NULL, -- 'initial_service', 'additional_cost', 'prepayment', 'spare_parts'
                amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(50),
                payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
                payment_date TIMESTAMP,
                transaction_reference VARCHAR(255),
                receipt_file_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Employee information table
        # Spare parts requirements table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS spare_parts_requirements (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                approval_id INTEGER REFERENCES service_approvals(id),
                part_name VARCHAR(255) NOT NULL,
                part_description TEXT,
                part_category VARCHAR(100),
                supplier_name VARCHAR(255),
                supplier_part_number VARCHAR(100),
                quantity_required INTEGER NOT NULL,
                unit_price DECIMAL(10, 2) NOT NULL,
                total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_required * unit_price) STORED,
                availability_status VARCHAR(30) DEFAULT 'pending_check', -- 'in_stock', 'out_of_stock', 'special_order', 'pending_check'
                expected_delivery_date DATE,
                is_critical BOOLEAN DEFAULT FALSE,
                alternative_parts TEXT, -- JSON array of alternative parts
                maintenance_staff_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service appointment scheduling table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_appointments (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                tenant_id INTEGER REFERENCES users(id),
                maintenance_staff_id INTEGER REFERENCES users(id),
                appointment_type VARCHAR(50) NOT NULL, -- 'initial_visit', 'follow_up', 'parts_installation', 'inspection'
                scheduled_date DATE NOT NULL,
                scheduled_time_start TIME,
                scheduled_time_end TIME,
                appointment_status VARCHAR(30) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'
                tenant_availability TEXT, -- Available time slots provided by tenant
                location_details TEXT,
                special_instructions TEXT,
                cancellation_reason TEXT,
                rescheduled_from_appointment_id INTEGER REFERENCES service_appointments(id),
                confirmed_by_tenant BOOLEAN DEFAULT FALSE,
                confirmed_at TIMESTAMP,
                completed_at TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Store order integration with service requests table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_store_integration (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                approval_id INTEGER REFERENCES service_approvals(id),
                store_order_id INTEGER, -- References store orders when available
                integration_type VARCHAR(50) NOT NULL, -- 'declined_approval_purchase', 'spare_parts_order', 'service_enhancement'
                customer_decision VARCHAR(30) NOT NULL, -- 'purchase_from_store', 'wait_for_staff', 'cancel_service'
                ordered_items TEXT, -- JSON array of ordered items from store
                order_total DECIMAL(10, 2),
                delivery_preference VARCHAR(30), -- 'to_service_location', 'to_customer_address', 'pickup'
                delivery_address TEXT,
                delivery_date DATE,
                integration_status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'ordered', 'delivered', 'installed', 'cancelled'
                follow_up_appointment_id INTEGER REFERENCES service_appointments(id),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service workflow states table for tracking complex approval cycles
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_workflow_states (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                current_state VARCHAR(50) NOT NULL, -- 'initial_assessment', 'spare_parts_needed', 'awaiting_approval', 'parts_ordered', 'installation_scheduled'
                previous_state VARCHAR(50),
                state_data JSONB, -- Additional state-specific data
                automated_actions TEXT[], -- Actions to be taken automatically in this state
                next_possible_states VARCHAR(50)[],
                state_timeout TIMESTAMP, -- When this state should automatically progress
                responsible_user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Staff availability schedules table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS staff_availability (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL, -- 0=Monday, 6=Sunday
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN DEFAULT TRUE,
                max_appointments_per_slot INTEGER DEFAULT 2,
                slot_duration_minutes INTEGER DEFAULT 60, -- Duration of each appointment slot
                break_time_start TIME, -- Optional break time
                break_time_end TIME,
                effective_from DATE DEFAULT CURRENT_DATE,
                effective_until DATE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service provider availability table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_provider_availability (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                service_category VARCHAR(100) NOT NULL,
                day_of_week INTEGER NOT NULL, -- 0=Monday, 6=Sunday
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN DEFAULT TRUE,
                hourly_rate DECIMAL(8, 2),
                min_service_hours DECIMAL(4, 2) DEFAULT 1.0,
                max_appointments_per_day INTEGER DEFAULT 5,
                travel_radius_km INTEGER DEFAULT 50,
                emergency_availability BOOLEAN DEFAULT FALSE,
                weekend_surcharge_percent DECIMAL(5, 2) DEFAULT 0,
                holiday_surcharge_percent DECIMAL(5, 2) DEFAULT 0,
                effective_from DATE DEFAULT CURRENT_DATE,
                effective_until DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # System fees configuration table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS system_fees_config (
                id SERIAL PRIMARY KEY,
                fee_type VARCHAR(50) NOT NULL, -- 'percentage', 'flat_rate', 'tiered'
                fee_category VARCHAR(100) NOT NULL, -- 'maintenance', 'booking', 'platform'
                fee_value DECIMAL(8, 4) NOT NULL, -- 5.0 for 5%, or flat amount
                min_fee_amount DECIMAL(10, 2) DEFAULT 0,
                max_fee_amount DECIMAL(10, 2),
                applies_to VARCHAR(100) DEFAULT 'all', -- 'internal', 'external', 'all'
                is_active BOOLEAN DEFAULT TRUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Insert default system fee (5% platform fee)
        cur.execute(
            """
            INSERT INTO system_fees_config (fee_type, fee_category, fee_value, description)
            VALUES ('percentage', 'platform', 5.0, 'Platform service fee - 5% of total service cost')
        """
        )

        # Appointment time slots table for better scheduling management
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS appointment_time_slots (
                id SERIAL PRIMARY KEY,
                staff_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                slot_date DATE NOT NULL,
                slot_start_time TIME NOT NULL,
                slot_end_time TIME NOT NULL,
                slot_status VARCHAR(20) DEFAULT 'available', -- 'available', 'booked', 'blocked', 'break'
                max_bookings INTEGER DEFAULT 1,
                current_bookings INTEGER DEFAULT 0,
                service_category VARCHAR(100),
                estimated_duration_minutes INTEGER DEFAULT 60,
                booking_buffer_minutes INTEGER DEFAULT 15, -- Time between appointments
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_booking_limit CHECK (current_bookings <= max_bookings)
            )
        """
        )

        # Service request fees tracking
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_request_fees (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                appointment_id INTEGER REFERENCES service_appointments(id) ON DELETE CASCADE,
                service_base_cost DECIMAL(10, 2) NOT NULL,
                platform_fee_rate DECIMAL(5, 2) DEFAULT 5.0,
                platform_fee_amount DECIMAL(10, 2) GENERATED ALWAYS AS (service_base_cost * platform_fee_rate / 100) STORED,
                additional_fees DECIMAL(10, 2) DEFAULT 0,
                total_service_cost DECIMAL(10, 2) GENERATED ALWAYS AS (service_base_cost + (service_base_cost * platform_fee_rate / 100) + additional_fees) STORED,
                fee_waived BOOLEAN DEFAULT FALSE,
                waiver_reason TEXT,
                fee_paid BOOLEAN DEFAULT FALSE,
                payment_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Payment verification uploads table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_verification_uploads (
                id SERIAL PRIMARY KEY,
                contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
                contract_number VARCHAR(100) NOT NULL,
                installment_number INTEGER NOT NULL,
                payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
                uploader_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                
                -- File information
                file_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                file_type VARCHAR(50),
                
                -- Payment details from the uploaded document
                payment_amount DECIMAL(10, 2),
                payment_date DATE,
                payment_method VARCHAR(100),
                transaction_reference VARCHAR(255),
                bank_name VARCHAR(100),
                
                -- Verification status
                verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'requires_clarification'
                verified_by INTEGER REFERENCES users(id),
                verified_at TIMESTAMP,
                verification_notes TEXT,
                
                -- Additional metadata
                upload_notes TEXT,
                is_duplicate_check BOOLEAN DEFAULT FALSE,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                UNIQUE(contract_id, installment_number, file_path),
                CHECK (installment_number > 0),
                CHECK (verification_status IN ('pending', 'verified', 'rejected', 'requires_clarification'))
            )
        """
        )

        # Create indexes for better performance
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_payment_verification_contract 
            ON payment_verification_uploads(contract_id, installment_number)
        """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_payment_verification_status 
            ON payment_verification_uploads(verification_status)
        """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_payment_verification_uploader 
            ON payment_verification_uploads(uploader_user_id)
        """
        )

        # Contract installments table for better installment tracking
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS contract_installments (
                id SERIAL PRIMARY KEY,
                contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
                contract_number VARCHAR(100) NOT NULL,
                installment_number INTEGER NOT NULL,
                installment_type VARCHAR(50) DEFAULT 'rent', -- 'rent', 'deposit', 'fees', 'penalty'
                due_date DATE NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'partial'
                paid_amount DECIMAL(10, 2) DEFAULT 0,
                paid_date DATE,
                description TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(contract_id, installment_number),
                CHECK (installment_number > 0),
                CHECK (paid_amount >= 0 AND paid_amount <= amount)
            )
        """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_contract_installments_contract 
            ON contract_installments(contract_id, installment_number)
        """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_contract_installments_due 
            ON contract_installments(due_date, status)
        """
        )

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS employee_information (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                employee_id VARCHAR(20) UNIQUE NOT NULL,
                department VARCHAR(100),
                position VARCHAR(100),
                hire_date DATE,
                employment_status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'terminated'
                base_salary DECIMAL(10, 2),
                currency VARCHAR(10) DEFAULT 'SAR',
                salary_frequency VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'bi-weekly', 'weekly'
                allowances DECIMAL(10, 2) DEFAULT 0,
                deductions DECIMAL(10, 2) DEFAULT 0,
                overtime_rate DECIMAL(5, 2),
                manager_id INTEGER REFERENCES users(id),
                emergency_contact_name VARCHAR(100),
                emergency_contact_phone VARCHAR(20),
                bank_name VARCHAR(100),
                bank_account_number VARCHAR(50),
                iban VARCHAR(50),
                national_id VARCHAR(20),
                passport_number VARCHAR(20),
                visa_expiry DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Employee salaries and payments table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS employee_payments (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employee_information(id) ON DELETE CASCADE,
                payment_month INTEGER NOT NULL, -- 1-12
                payment_year INTEGER NOT NULL,
                base_amount DECIMAL(10, 2) NOT NULL,
                allowances DECIMAL(10, 2) DEFAULT 0,
                overtime_amount DECIMAL(10, 2) DEFAULT 0,
                overtime_hours DECIMAL(5, 2) DEFAULT 0,
                bonus DECIMAL(10, 2) DEFAULT 0,
                deductions DECIMAL(10, 2) DEFAULT 0,
                tax_deduction DECIMAL(10, 2) DEFAULT 0,
                net_amount DECIMAL(10, 2) NOT NULL,
                payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
                payment_date DATE,
                payment_method VARCHAR(50),
                transaction_reference VARCHAR(255),
                notes TEXT,
                processed_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Employee loans table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS employee_loans (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employee_information(id) ON DELETE CASCADE,
                loan_type VARCHAR(50) NOT NULL, -- 'salary_advance', 'emergency_loan', 'housing_loan', 'car_loan', 'other'
                loan_amount DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'SAR',
                interest_rate DECIMAL(5, 4) DEFAULT 0.0000, -- 0% to 99.9999%
                loan_term_months INTEGER,
                monthly_installment DECIMAL(10, 2),
                remaining_balance DECIMAL(10, 2),
                loan_status VARCHAR(20) DEFAULT 'active', -- 'active', 'paid_off', 'defaulted', 'cancelled'
                approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
                start_date DATE,
                end_date DATE,
                purpose TEXT,
                collateral_description TEXT,
                approved_by INTEGER REFERENCES users(id),
                processed_by INTEGER REFERENCES users(id),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Employee loan payments table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS employee_loan_payments (
                id SERIAL PRIMARY KEY,
                loan_id INTEGER REFERENCES employee_loans(id) ON DELETE CASCADE,
                payment_date DATE NOT NULL,
                payment_amount DECIMAL(10, 2) NOT NULL,
                principal_amount DECIMAL(10, 2),
                interest_amount DECIMAL(10, 2),
                remaining_balance DECIMAL(10, 2),
                payment_status VARCHAR(20) DEFAULT 'paid', -- 'paid', 'missed', 'late'
                payment_method VARCHAR(50),
                transaction_reference VARCHAR(255),
                notes TEXT,
                processed_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Property documents table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS property_documents (
                id SERIAL PRIMARY KEY,
                property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                uploaded_by INTEGER REFERENCES users(id),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Maintenance schedules table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS maintenance_schedules (
                id SERIAL PRIMARY KEY,
                property_id INTEGER REFERENCES properties(id),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                frequency VARCHAR(20) NOT NULL,
                next_due_date DATE NOT NULL,
                contractor_id INTEGER REFERENCES contractors(id),
                estimated_cost DECIMAL(10, 2),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # OTP table for phone verification
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS otp_codes (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Audit logs table (updated schema to match audit_logger.py)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                session_id VARCHAR(255),
                action_type VARCHAR(100),
                table_name VARCHAR(100),
                record_id INTEGER,
                field_name VARCHAR(100),
                old_value TEXT,
                new_value TEXT,
                page_name VARCHAR(255),
                form_id VARCHAR(100),
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                additional_data JSONB
            )
        """
        )

        # Audit sessions table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                session_id VARCHAR(255) UNIQUE,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                logout_time TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                pages_visited JSONB,
                actions_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active'
            )
        """
        )

        # Audit form changes table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_form_changes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                session_id VARCHAR(255),
                form_id VARCHAR(100),
                page_name VARCHAR(255),
                changes JSONB,
                save_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                operation_type VARCHAR(50)
            )
        """
        )

        # Password reset tokens table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                token VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service categories table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_categories (
                id SERIAL PRIMARY KEY,
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255) NOT NULL,
                icon VARCHAR(50),
                description_en TEXT,
                description_ar TEXT,
                created_by_provider INTEGER REFERENCES users(id),
                is_custom_category BOOLEAN DEFAULT FALSE,
                approval_status VARCHAR(20) DEFAULT 'approved',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Services table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                category_id INTEGER REFERENCES service_categories(id),
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255) NOT NULL,
                description_en TEXT,
                description_ar TEXT,
                price_range_min DECIMAL(10,2),
                price_range_max DECIMAL(10,2),
                image_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service providers table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_providers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                business_name VARCHAR(255),
                business_type VARCHAR(100), -- 'individual', 'company'
                license_number VARCHAR(100),
                tax_number VARCHAR(100),
                specializations TEXT[],
                service_areas TEXT[],
                experience_years INTEGER,
                portfolio_images TEXT[],
                verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
                rating DECIMAL(3,2) DEFAULT 0.00,
                total_jobs INTEGER DEFAULT 0,
                completion_rate DECIMAL(5,2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service requests table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                service_id INTEGER REFERENCES services(id),
                service_name VARCHAR(255),
                request_date DATE,
                request_time TIME,
                location TEXT,
                spare_parts_required TEXT,
                issue_description TEXT,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'quoted', 'assigned', 'in_progress', 'completed', 'cancelled'
                pin_start VARCHAR(6),
                pin_completion VARCHAR(6),
                assigned_provider INTEGER REFERENCES service_providers(id),
                estimated_cost DECIMAL(10,2),
                final_cost DECIMAL(10,2),
                completion_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service quotations table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_quotations (
                id SERIAL PRIMARY KEY,
                request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
                provider_id INTEGER REFERENCES service_providers(id),
                provider_name VARCHAR(255),
                provider_type VARCHAR(50),
                quoted_amount DECIMAL(10,2),
                materials_cost DECIMAL(10,2),
                labor_cost DECIMAL(10,2),
                completion_days INTEGER,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
                valid_until DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Family members table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS family_members (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                mobile_number VARCHAR(20),
                relation VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Digital wallet table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS digital_wallet (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                transaction_type VARCHAR(50), -- 'deposit', 'withdrawal', 'payment', 'refund'
                amount DECIMAL(10,2),
                description TEXT,
                reference_id VARCHAR(100),
                balance_before DECIMAL(10,2),
                balance_after DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'cancelled'
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service projects table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_projects (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                project_name VARCHAR(255),
                description TEXT,
                total_amount DECIMAL(10,2),
                status VARCHAR(50) DEFAULT 'planning', -- 'planning', 'in_progress', 'completed', 'cancelled'
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Support tickets table (updated for AI support system)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                submitter_id INTEGER REFERENCES users(id),
                ticket_number VARCHAR(20) UNIQUE,
                title VARCHAR(255),
                description TEXT,
                category VARCHAR(100),
                priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
                status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'closed', 'resolved'
                assigned_to INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Ticket attachments table for AI support system
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ticket_attachments (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_size INTEGER,
                file_type VARCHAR(50),
                uploaded_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Vendors table (for backward compatibility)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS vendors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                company VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(20),
                specialization VARCHAR(100),
                rating DECIMAL(3, 2) DEFAULT 0.00,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Job positions table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS job_positions (
                id SERIAL PRIMARY KEY,
                title_en VARCHAR(255) NOT NULL,
                title_ar VARCHAR(255) NOT NULL,
                department VARCHAR(100) NOT NULL,
                location VARCHAR(255),
                employment_type VARCHAR(50) DEFAULT 'full_time', -- 'full_time', 'part_time', 'contract', 'internship'
                experience_level VARCHAR(50), -- 'entry', 'mid', 'senior', 'executive'
                description_en TEXT,
                description_ar TEXT,
                requirements_en TEXT,
                requirements_ar TEXT,
                benefits_en TEXT,
                benefits_ar TEXT,
                salary_range_min DECIMAL(10,2),
                salary_range_max DECIMAL(10,2),
                currency VARCHAR(10) DEFAULT 'SAR',
                is_active BOOLEAN DEFAULT TRUE,
                posted_by INTEGER REFERENCES users(id),
                application_deadline DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Job applications table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS job_applications (
                id SERIAL PRIMARY KEY,
                position_id INTEGER REFERENCES job_positions(id) ON DELETE CASCADE,
                applicant_first_name VARCHAR(100) NOT NULL,
                applicant_last_name VARCHAR(100) NOT NULL,
                applicant_email VARCHAR(255) NOT NULL,
                applicant_phone VARCHAR(20) NOT NULL,
                linkedin_profile VARCHAR(500),
                cv_file_path TEXT,
                cv_file_name VARCHAR(255),
                cover_letter TEXT,
                expected_salary DECIMAL(10,2),
                available_start_date DATE,
                current_location VARCHAR(255),
                willing_to_relocate BOOLEAN DEFAULT FALSE,
                years_of_experience INTEGER,
                current_position VARCHAR(255),
                current_company VARCHAR(255),
                education_level VARCHAR(100),
                languages TEXT[], -- Array of languages
                skills TEXT[], -- Array of skills
                portfolio_url VARCHAR(500),
                reference_contacts TEXT,
                application_status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'shortlisted', 'interviewed', 'offered', 'rejected', 'withdrawn'
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Interview stages table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS interview_stages (
                id SERIAL PRIMARY KEY,
                application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
                stage_name VARCHAR(100) NOT NULL, -- 'phone_screening', 'technical_interview', 'hr_interview', 'final_interview'
                stage_type VARCHAR(50) NOT NULL, -- 'phone', 'video', 'in_person', 'technical_test'
                interviewer_id INTEGER REFERENCES users(id),
                interviewer_name VARCHAR(255),
                scheduled_date TIMESTAMP,
                duration_minutes INTEGER DEFAULT 60,
                location VARCHAR(255), -- For in-person interviews
                meeting_link VARCHAR(500), -- For video interviews
                stage_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
                feedback TEXT,
                rating INTEGER CHECK (rating >= 1 AND rating <= 10),
                technical_score INTEGER CHECK (technical_score >= 1 AND technical_score <= 10),
                communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 10),
                cultural_fit_score INTEGER CHECK (cultural_fit_score >= 1 AND cultural_fit_score <= 10),
                recommendation VARCHAR(50), -- 'strong_hire', 'hire', 'no_hire', 'strong_no_hire'
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Application documents table (for additional documents)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS application_documents (
                id SERIAL PRIMARY KEY,
                application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
                document_type VARCHAR(50) NOT NULL, -- 'cv', 'cover_letter', 'portfolio', 'certificate', 'reference'
                document_name VARCHAR(255) NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR(100),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # HR notes table for internal tracking
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS hr_application_notes (
                id SERIAL PRIMARY KEY,
                application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
                note_text TEXT NOT NULL,
                note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'screening', 'interview', 'decision'
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # User permissions table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_permissions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                module VARCHAR(50) NOT NULL,
                can_view BOOLEAN DEFAULT FALSE,
                can_create BOOLEAN DEFAULT FALSE,
                can_edit BOOLEAN DEFAULT FALSE,
                can_delete BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, module)
            )
        """
        )

        # Invoice clients table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS invoice_clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                tax_number VARCHAR(100),
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Invoices table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                client_id INTEGER REFERENCES invoice_clients(id),
                client_name VARCHAR(255) NOT NULL,
                issue_date DATE NOT NULL,
                due_date DATE NOT NULL,
                subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) DEFAULT 'active',
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Invoice items table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
                unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Invoice communications table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS invoice_communications (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
                communication_type VARCHAR(20) NOT NULL, -- email, sms
                recipient VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                message TEXT,
                status VARCHAR(20) DEFAULT 'sent',
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_by INTEGER REFERENCES users(id)
            )
        """
        )

        # Payment links table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_links (
                id SERIAL PRIMARY KEY,
                link_id VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT,
                expire_date DATE,
                allow_partial BOOLEAN DEFAULT FALSE,
                require_details BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'active',
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Recurring invoices table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS recurring_invoices (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES invoice_clients(id),
                client_name VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                description TEXT,
                start_date DATE NOT NULL,
                frequency VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
                duration INTEGER NOT NULL, -- number of payments
                payments_generated INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Add invoice_type column to invoices table if not exists
        cur.execute(
            """
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(20) DEFAULT 'detailed'
        """
        )

        # Add new columns to invoice_clients table if not exists
        cur.execute(
            """
            ALTER TABLE invoice_clients 
            ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) DEFAULT 'Individual'
        """
        )

        cur.execute(
            """
            ALTER TABLE invoice_clients 
            ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'Arabic'
        """
        )

        cur.execute(
            """
            ALTER TABLE invoice_clients 
            ADD COLUMN IF NOT EXISTS city VARCHAR(100)
        """
        )

        cur.execute(
            """
            ALTER TABLE invoice_clients 
            ADD COLUMN IF NOT EXISTS notes TEXT
        """
        )

        # Products table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                cost_price DECIMAL(10, 2) DEFAULT 0.00,
                category VARCHAR(100) DEFAULT 'General',
                service_type VARCHAR(100) DEFAULT 'General',
                unit_of_measure VARCHAR(50) DEFAULT 'Each',
                product_code VARCHAR(50),
                min_quantity DECIMAL(10, 2) DEFAULT 1.00,
                tax_inclusive BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Add service_type column to existing products table if not exists
        cur.execute(
            """
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS service_type VARCHAR(100) DEFAULT 'General'
        """
        )

        # Store settings table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS store_settings (
                id SERIAL PRIMARY KEY,
                store_name VARCHAR(255) DEFAULT 'شركة خدماتي الشاملة للمقاولات العامة',
                store_description TEXT DEFAULT 'تقديم خدمات الوساطة العقارية وإدارة الأملاك و الصيانة للمباني السكنية و غير السكنية و المستودعات',
                store_url VARCHAR(255) DEFAULT 'fato.me/s/CSE',
                domain VARCHAR(255),
                base_color VARCHAR(7) DEFAULT '#f0b33a',
                store_email VARCHAR(255) DEFAULT 'info@cse-saudi.com',
                store_phone VARCHAR(50) DEFAULT '+966553800252',
                store_address TEXT DEFAULT 'جدة حي النزهة',
                bio_link VARCHAR(255) DEFAULT 'https://fato.bio/@CSE',
                facebook_url VARCHAR(255) DEFAULT 'https://www.facebook.com/profile.php?id=61557968974902',
                instagram_url VARCHAR(255) DEFAULT 'https://www.instagram.com/csesaudi/',
                whatsapp_number VARCHAR(50) DEFAULT '+966553800252',
                store_currency VARCHAR(10) DEFAULT 'SAR',
                store_language VARCHAR(10) DEFAULT 'Arabic',
                is_online BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Store categories table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS store_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                name_arabic VARCHAR(255),
                description TEXT,
                sort_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Store products table (links products to store with additional online-specific fields)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS store_products (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id),
                category_id INTEGER REFERENCES store_categories(id),
                is_featured BOOLEAN DEFAULT FALSE,
                online_price DECIMAL(10, 2),
                display_order INTEGER DEFAULT 0,
                is_online BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Store orders table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS store_orders (
                id SERIAL PRIMARY KEY,
                order_number VARCHAR(50) UNIQUE,
                customer_name VARCHAR(255) NOT NULL,
                customer_email VARCHAR(255),
                customer_phone VARCHAR(50),
                customer_address TEXT,
                birth_date VARCHAR(50),
                national_address_file VARCHAR(255),
                total_amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(100),
                payment_status VARCHAR(50) DEFAULT 'pending',
                payment_id VARCHAR(255),
                card_last_four VARCHAR(4),
                delivery_method VARCHAR(100) DEFAULT 'pickup',
                delivery_address TEXT,
                order_status VARCHAR(50) DEFAULT 'pending',
                service_type VARCHAR(100),
                priority_level VARCHAR(50) DEFAULT 'normal',
                assigned_to INTEGER REFERENCES users(id),
                estimated_completion DATE,
                actual_completion DATE,
                customer_rating INTEGER,
                customer_feedback TEXT,
                internal_notes TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Add new columns to existing store_orders table
        order_columns = [
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255)",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS card_last_four VARCHAR(4)",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS service_type VARCHAR(100)",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS priority_level VARCHAR(50) DEFAULT 'normal'",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id)",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS estimated_completion DATE",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS actual_completion DATE",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS customer_rating INTEGER",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS customer_feedback TEXT",
            "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT",
        ]

        for column_sql in order_columns:
            cur.execute(column_sql)

        # Order status history table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS order_status_history (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES store_orders(id),
                status_from VARCHAR(50),
                status_to VARCHAR(50) NOT NULL,
                changed_by INTEGER REFERENCES users(id),
                change_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Store order items table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS store_order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES store_orders(id),
                product_id INTEGER REFERENCES products(id),
                product_name VARCHAR(255),
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price DECIMAL(10, 2) NOT NULL,
                total_price DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Insert default store settings
        cur.execute(
            """
            INSERT INTO store_settings (id, store_name, store_description) 
            SELECT 1, 'شركة خدماتي الشاملة للمقاولات العامة', 'تقديم خدمات الوساطة العقارية وإدارة الأملاك و الصيانة للمباني السكنية و غير السكنية و المستودعات'
            WHERE NOT EXISTS (SELECT 1 FROM store_settings WHERE id = 1)
        """
        )

        # Insert default store categories
        default_categories = [
            ("صيانة المبنى", "Building Maintenance"),
            ("ترميم", "Renovation"),
            ("مشروع رئيسي - تغيرات رئيسية في عدة وحدات أو وحدة واحدة", "Major Project"),
            ("رسوم عقد", "Contract Fees"),
            ("رسوم سعي", "Broker Fees"),
        ]

        for arabic_name, english_desc in default_categories:
            cur.execute(
                """
                INSERT INTO store_categories (name, name_arabic, description, created_by) 
                SELECT %s, %s, %s, 1
                WHERE NOT EXISTS (SELECT 1 FROM store_categories WHERE name = %s)
            """,
                (arabic_name, arabic_name, english_desc, arabic_name),
            )

        # Admin settings table for logos and customizations
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type VARCHAR(50) DEFAULT 'text',
                description TEXT,
                created_by INTEGER REFERENCES users(id),
                updated_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Company assets table for logos and images
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS company_assets (
                id SERIAL PRIMARY KEY,
                asset_name VARCHAR(255) NOT NULL,
                asset_type VARCHAR(50) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                usage_context TEXT,
                uploaded_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # System icons customization table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS system_icons (
                id SERIAL PRIMARY KEY,
                icon_key VARCHAR(100) UNIQUE NOT NULL,
                icon_value VARCHAR(50) NOT NULL,
                icon_category VARCHAR(50) DEFAULT 'general',
                icon_description TEXT,
                default_icon VARCHAR(50),
                updated_by INTEGER REFERENCES users(id),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Insert default system icons
        default_icons = [
            ("dashboard_icon", "📊", "navigation", "Dashboard page icon", "📊"),
            ("invoices_icon", "📄", "navigation", "Invoices page icon", "📄"),
            ("clients_icon", "👥", "navigation", "Clients page icon", "👥"),
            ("products_icon", "📦", "navigation", "Products page icon", "📦"),
            ("store_icon", "🛍️", "navigation", "Online Store icon", "🛍️"),
            ("orders_icon", "📋", "navigation", "Orders page icon", "📋"),
            ("reports_icon", "📊", "navigation", "Reports page icon", "📊"),
            ("success_icon", "✅", "status", "Success status icon", "✅"),
            ("error_icon", "❌", "status", "Error status icon", "❌"),
            ("warning_icon", "⚠️", "status", "Warning status icon", "⚠️"),
            ("rental_service_icon", "🏠", "services", "Rental services icon", "🏠"),
            ("maintenance_icon", "🔧", "services", "Maintenance services icon", "🔧"),
            ("contract_icon", "📋", "services", "Contract services icon", "📋"),
        ]

        for icon_key, icon_value, category, description, default in default_icons:
            cur.execute(
                """
                INSERT INTO system_icons (icon_key, icon_value, icon_category, icon_description, default_icon)
                SELECT %s, %s, %s, %s, %s
                WHERE NOT EXISTS (SELECT 1 FROM system_icons WHERE icon_key = %s)
            """,
                (icon_key, icon_value, category, description, default, icon_key),
            )

        # Insert default admin settings
        default_settings = [
            (
                "company_name",
                "شركة خدماتي الشاملة للمقاولات العامة",
                "text",
                "Company name for system branding",
            ),
            (
                "company_logo_primary",
                "",
                "file",
                "Primary company logo for invoices and documents",
            ),
            (
                "company_logo_secondary",
                "",
                "file",
                "Secondary logo for headers and navigation",
            ),
            ("company_favicon", "", "file", "Website favicon"),
            ("invoice_template", "default", "select", "Invoice template design"),
            ("system_theme", "default", "select", "System color theme"),
            (
                "enable_logo_in_invoices",
                "true",
                "boolean",
                "Show company logo in generated invoices",
            ),
            (
                "enable_logo_in_emails",
                "true",
                "boolean",
                "Include logo in email communications",
            ),
            (
                "logo_position",
                "header",
                "select",
                "Position of logo in documents (header/footer/both)",
            ),
        ]

        for key, value, type_, desc in default_settings:
            cur.execute(
                """
                INSERT INTO admin_settings (setting_key, setting_value, setting_type, description)
                SELECT %s, %s, %s, %s
                WHERE NOT EXISTS (SELECT 1 FROM admin_settings WHERE setting_key = %s)
            """,
                (key, value, type_, desc, key),
            )

        # Custom pages and policies table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS custom_pages (
                id SERIAL PRIMARY KEY,
                page_key VARCHAR(100) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                title_arabic VARCHAR(255),
                content TEXT NOT NULL,
                content_arabic TEXT,
                page_type VARCHAR(50) DEFAULT 'page',
                is_published BOOLEAN DEFAULT FALSE,
                is_system_policy BOOLEAN DEFAULT FALSE,
                meta_description TEXT,
                meta_keywords TEXT,
                template_used VARCHAR(100),
                display_order INTEGER DEFAULT 0,
                created_by INTEGER REFERENCES users(id),
                updated_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Page versions for revision history
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS page_versions (
                id SERIAL PRIMARY KEY,
                page_id INTEGER REFERENCES custom_pages(id) ON DELETE CASCADE,
                version_number INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                change_description TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Insert default company policies
        default_pages = [
            (
                "privacy_policy",
                "Privacy Policy",
                "سياسة الخصوصية",
                "Our privacy policy content will be added here.",
                "محتوى سياسة الخصوصية سيتم إضافته هنا.",
                "policy",
                True,
            ),
            (
                "terms_conditions",
                "Terms and Conditions",
                "الشروط والأحكام",
                "Terms and conditions content will be added here.",
                "محتوى الشروط والأحكام سيتم إضافته هنا.",
                "policy",
                True,
            ),
            (
                "refund_policy",
                "Refund Policy",
                "سياسة الاسترداد",
                "Refund policy content will be added here.",
                "محتوى سياسة الاسترداد سيتم إضافته هنا.",
                "policy",
                True,
            ),
            (
                "company_about",
                "About Company",
                "عن الشركة",
                "Information about CSE General Contracting will be added here.",
                "معلومات عن مؤسسة خدماتي الشاملة للمقاولات العامة سيتم إضافتها هنا.",
                "page",
                False,
            ),
            (
                "service_agreement",
                "Service Agreement",
                "اتفاقية الخدمة",
                "Service agreement terms will be added here.",
                "شروط اتفاقية الخدمة سيتم إضافتها هنا.",
                "policy",
                True,
            ),
            (
                "quality_policy",
                "Quality Policy",
                "سياسة الجودة",
                "Our commitment to quality and excellence.",
                "التزامنا بالجودة والتميز.",
                "policy",
                False,
            ),
        ]

        for (
            page_key,
            title,
            title_ar,
            content,
            content_ar,
            page_type,
            is_system,
        ) in default_pages:
            cur.execute(
                """
                INSERT INTO custom_pages (page_key, title, title_arabic, content, content_arabic, page_type, is_system_policy, is_published)
                SELECT %s, %s, %s, %s, %s, %s, %s, %s
                WHERE NOT EXISTS (SELECT 1 FROM custom_pages WHERE page_key = %s)
            """,
                (
                    page_key,
                    title,
                    title_ar,
                    content,
                    content_ar,
                    page_type,
                    is_system,
                    False,
                    page_key,
                ),
            )

        # Marketing and Coupons System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                coupon_code VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
                discount_value DECIMAL(10,2) NOT NULL,
                minimum_order_value DECIMAL(10,2) DEFAULT 0,
                maximum_discount DECIMAL(10,2),
                usage_limit INTEGER,
                usage_per_customer INTEGER DEFAULT 1,
                current_usage INTEGER DEFAULT 0,
                start_date DATE NOT NULL,
                end_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'categories')),
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Coupon usage tracking
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS coupon_usage (
                id SERIAL PRIMARY KEY,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                order_id INTEGER REFERENCES store_orders(id),
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                discount_applied DECIMAL(10,2) NOT NULL,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Marketing campaigns and announcements
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id SERIAL PRIMARY KEY,
                campaign_name VARCHAR(255) NOT NULL,
                campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('announcement', 'promotion', 'social_media', 'email', 'website')),
                title VARCHAR(255) NOT NULL,
                title_arabic VARCHAR(255),
                content TEXT NOT NULL,
                content_arabic TEXT,
                target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'customers', 'subscribers', 'social_media')),
                campaign_url TEXT,
                image_url TEXT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                click_count INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Social media integrations
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS social_integrations (
                id SERIAL PRIMARY KEY,
                platform VARCHAR(50) NOT NULL,
                is_connected BOOLEAN DEFAULT FALSE,
                access_token TEXT,
                refresh_token TEXT,
                page_id VARCHAR(100),
                account_info JSONB,
                last_sync TIMESTAMP,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Insert default social media platforms
        social_platforms = [
            "facebook",
            "instagram",
            "whatsapp",
            "twitter",
            "google_shop",
            "snapchat",
            "linkedin",
        ]

        for platform in social_platforms:
            cur.execute(
                """
                INSERT INTO social_integrations (platform, is_connected)
                SELECT %s, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM social_integrations WHERE platform = %s)
            """,
                (platform, platform),
            )

        # Insert sample marketing campaigns
        sample_campaigns = [
            (
                "welcome_announcement",
                "announcement",
                "Welcome to CSE General Contracting",
                "أهلاً بكم في مؤسسة خدماتي الشاملة",
                "Welcome to our comprehensive contracting services! We provide excellent real estate and maintenance solutions.",
                "أهلاً بكم في خدماتنا الشاملة للمقاولات! نقدم حلول عقارية وصيانة ممتازة.",
                "all",
            ),
            (
                "ramadan_promotion",
                "promotion",
                "Ramadan Special Offers",
                "عروض رمضان الخاصة",
                "Special discounts on all our services during the holy month of Ramadan. Contact us for more details!",
                "خصومات خاصة على جميع خدماتنا خلال شهر رمضان المبارك. اتصلوا بنا للمزيد من التفاصيل!",
                "customers",
            ),
            (
                "new_services",
                "website",
                "New Maintenance Services Available",
                "خدمات صيانة جديدة متاحة",
                "We have expanded our services to include comprehensive home maintenance. Book your service today!",
                "قمنا بتوسيع خدماتنا لتشمل صيانة المنازل الشاملة. احجز خدمتك اليوم!",
                "all",
            ),
        ]

        for (
            name,
            type_,
            title,
            title_ar,
            content,
            content_ar,
            audience,
        ) in sample_campaigns:
            cur.execute(
                """
                INSERT INTO marketing_campaigns (
                    campaign_name, campaign_type, title, title_arabic, content, content_arabic, 
                    target_audience, start_date, end_date
                )
                SELECT %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days'
                WHERE NOT EXISTS (SELECT 1 FROM marketing_campaigns WHERE campaign_name = %s)
            """,
                (name, type_, title, title_ar, content, content_ar, audience, name),
            )

        # Payment Links System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_links (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'SAR',
                link_type VARCHAR(50) DEFAULT 'one_time' CHECK (link_type IN ('one_time', 'recurring', 'donation')),
                custom_url VARCHAR(100) UNIQUE,
                full_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                usage_limit INTEGER,
                current_usage INTEGER DEFAULT 0,
                expiry_date DATE,
                success_message TEXT,
                redirect_url TEXT,
                collect_customer_info BOOLEAN DEFAULT TRUE,
                require_phone BOOLEAN DEFAULT TRUE,
                require_address BOOLEAN DEFAULT FALSE,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Payment link transactions
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_link_transactions (
                id SERIAL PRIMARY KEY,
                payment_link_id INTEGER REFERENCES payment_links(id) ON DELETE CASCADE,
                transaction_id VARCHAR(100) UNIQUE,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                customer_phone VARCHAR(20),
                customer_address TEXT,
                amount_paid DECIMAL(10,2) NOT NULL,
                payment_method VARCHAR(50),
                payment_status VARCHAR(20) DEFAULT 'pending',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                ip_address INET,
                user_agent TEXT
            )
        """
        )

        # Insert sample payment links
        sample_links = [
            (
                "Consultation Service",
                "Professional real estate consultation service",
                150.00,
                "consultation_service",
            ),
            (
                "Property Inspection",
                "Comprehensive property inspection service",
                300.00,
                "property_inspection",
            ),
            (
                "Contract Documentation",
                "Complete contract documentation and processing",
                125.00,
                "contract_docs",
            ),
            (
                "Training Course",
                "Real estate professional training course",
                500.00,
                "training_course",
            ),
        ]

        for title, description, amount, url_key in sample_links:
            cur.execute(
                """
                INSERT INTO payment_links (
                    title, description, amount, custom_url, full_url,
                    success_message, created_by
                )
                SELECT %s, %s, %s, %s, %s, %s, 1
                WHERE NOT EXISTS (SELECT 1 FROM payment_links WHERE custom_url = %s)
            """,
                (
                    title,
                    description,
                    amount,
                    url_key,
                    f"https://cse-saudi.com/pay/{url_key}",
                    f"Thank you for your payment! Your {title.lower()} has been confirmed.",
                    url_key,
                ),
            )

        # Referral Program System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                referral_code VARCHAR(20) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
                reward_earned DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                UNIQUE(referrer_id, referred_id)
            )
        """
        )

        # Referral rewards tracking
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS referral_rewards (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                referral_id INTEGER REFERENCES referrals(id) ON DELETE CASCADE,
                maintenance_booking_id INTEGER,
                reward_amount DECIMAL(10,2) NOT NULL,
                original_amount DECIMAL(10,2) NOT NULL,
                discount_applied DECIMAL(10,2) NOT NULL,
                month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
                usage_count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Referral usage limits (3 times per month)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS referral_usage (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
                usage_count INTEGER DEFAULT 0,
                total_saved DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, month_year)
            )
        """
        )

        # Family Management System (Updated: No budget caps, unlimited access)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS family_members (
                id SERIAL PRIMARY KEY,
                main_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                family_member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                relationship VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
                can_order BOOLEAN DEFAULT TRUE,
                can_pay_from_main BOOLEAN DEFAULT TRUE,
                can_update_relationship BOOLEAN DEFAULT TRUE,
                invitation_code VARCHAR(20) UNIQUE,
                invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                accepted_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(main_user_id, family_member_id)
            )
        """
        )

        # Family member transactions (Updated: Simplified for unlimited access)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS family_transactions (
                id SERIAL PRIMARY KEY,
                main_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                family_member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('maintenance', 'store_purchase', 'service_booking', 'payment')),
                transaction_reference VARCHAR(100),
                amount DECIMAL(10,2) NOT NULL,
                description TEXT,
                payment_method VARCHAR(20) DEFAULT 'main_account' CHECK (payment_method IN ('main_account', 'stored_card')),
                status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'approved')),
                month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Payment Methods Storage (Secure credit card storage)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_methods (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('visa', 'mastercard', 'mada', 'amex')),
                last_four_digits VARCHAR(4) NOT NULL,
                card_holder_name VARCHAR(100) NOT NULL,
                expiry_month INTEGER NOT NULL CHECK (expiry_month >= 1 AND expiry_month <= 12),
                expiry_year INTEGER NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                payment_gateway_token VARCHAR(255), -- Encrypted token from payment gateway
                billing_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Automatic Payment Settings
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS auto_payment_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL,
                auto_pay_enabled BOOLEAN DEFAULT FALSE,
                auto_pay_limit DECIMAL(10,2) DEFAULT 500.00,
                require_approval_above DECIMAL(10,2) DEFAULT 1000.00,
                notification_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        """
        )

        # Payment Processing Log
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_processing_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                payment_method_id INTEGER REFERENCES payment_methods(id),
                transaction_id VARCHAR(100),
                service_type VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
                gateway_response TEXT,
                error_message TEXT,
                processed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # User referral codes (each user gets a unique referral code)
        cur.execute(
            """
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
            ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS referral_rewards_balance DECIMAL(10,2) DEFAULT 0
        """
        )

        # Add additional columns to service_payments for referral tracking
        cur.execute(
            """
            ALTER TABLE service_payments 
            ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
            ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2)
        """
        )

        # Project Categories (Construction, Renovation, etc.)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS project_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                icon VARCHAR(10) DEFAULT '🏗️',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Insert default project categories
        cur.execute(
            """
            INSERT INTO project_categories (name, description, icon) VALUES
            ('construction', 'New construction projects and building works', '🏗️'),
            ('renovation', 'Home and building renovation projects', '🔨'),
            ('plumbing', 'Plumbing installation and repair work', '🚰'),
            ('electrical', 'Electrical installation and maintenance', '⚡'),
            ('painting', 'Interior and exterior painting services', '🎨'),
            ('flooring', 'Floor installation and refinishing', '🏠'),
            ('roofing', 'Roof repair and installation services', '🏘️'),
            ('landscaping', 'Garden and outdoor space design', '🌿')
            ON CONFLICT (name) DO NOTHING
        """
        )

        # Contractor Registration System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS contractors (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                company_name VARCHAR(100) NOT NULL,
                license_number VARCHAR(50),
                specializations TEXT[], -- Array of specialties
                years_experience INTEGER DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0.00,
                total_projects INTEGER DEFAULT 0,
                completed_projects INTEGER DEFAULT 0,
                certification_documents TEXT[], -- Array of document URLs
                portfolio_images TEXT[], -- Array of image URLs
                insurance_verified BOOLEAN DEFAULT FALSE,
                background_checked BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
                bio TEXT,
                website_url VARCHAR(255),
                service_areas TEXT[], -- Array of service areas
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Projects System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                category_id INTEGER REFERENCES project_categories(id),
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                project_type VARCHAR(50) NOT NULL CHECK (project_type IN ('construction', 'renovation', 'repair', 'maintenance')),
                budget_min DECIMAL(10,2),
                budget_max DECIMAL(10,2),
                estimated_duration_days INTEGER,
                preferred_start_date DATE,
                project_address TEXT,
                latitude DECIMAL(10,6),
                longitude DECIMAL(10,6),
                required_skills TEXT[], -- Array of required skills
                project_images TEXT[], -- Array of image URLs
                project_documents TEXT[], -- Array of document URLs
                status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'on_hold')),
                bidding_deadline TIMESTAMP,
                selected_contractor_id INTEGER REFERENCES contractors(id),
                final_agreed_price DECIMAL(10,2),
                actual_start_date DATE,
                actual_completion_date DATE,
                project_priority VARCHAR(10) DEFAULT 'medium' CHECK (project_priority IN ('low', 'medium', 'high', 'urgent')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Project Bids System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS project_bids (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
                proposed_price DECIMAL(10,2) NOT NULL,
                estimated_duration_days INTEGER NOT NULL,
                proposed_start_date DATE,
                bid_description TEXT NOT NULL,
                materials_cost DECIMAL(10,2),
                labor_cost DECIMAL(10,2),
                additional_costs DECIMAL(10,2),
                warranty_period_months INTEGER DEFAULT 12,
                payment_terms TEXT,
                milestone_breakdown TEXT, -- JSON string of milestones
                contractor_notes TEXT,
                bid_attachments TEXT[], -- Array of document URLs
                status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                response_message TEXT,
                UNIQUE(project_id, contractor_id)
            )
        """
        )

        # Project Timeline and Milestones
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS project_milestones (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                bid_id INTEGER REFERENCES project_bids(id) ON DELETE CASCADE,
                milestone_name VARCHAR(100) NOT NULL,
                description TEXT,
                estimated_start_date DATE,
                estimated_completion_date DATE,
                actual_start_date DATE,
                actual_completion_date DATE,
                milestone_cost DECIMAL(10,2),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed')),
                completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
                milestone_order INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Project Notifications System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS project_notifications (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('new_project', 'new_bid', 'bid_accepted', 'bid_rejected', 'project_update', 'milestone_completed')),
                title VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            )
        """
        )

        # Project Reviews and Ratings
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS project_reviews (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_title VARCHAR(100),
                review_text TEXT,
                quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
                timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
                communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
                value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
                would_recommend BOOLEAN DEFAULT TRUE,
                review_images TEXT[], -- Array of image URLs
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Project Chat/Communication
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS project_messages (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system')),
                attachments TEXT[], -- Array of file URLs
                is_read BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            )
        """
        )

        # Service Provider Management System
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS service_providers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                company_name VARCHAR(255) NOT NULL,
                business_license VARCHAR(100),
                contact_person VARCHAR(255),
                phone_number VARCHAR(20) NOT NULL,
                email VARCHAR(255) NOT NULL,
                address TEXT,
                service_area TEXT[],
                specializations TEXT[],
                company_description TEXT,
                logo_url VARCHAR(500),
                website_url VARCHAR(500),
                rating DECIMAL(3,2) DEFAULT 0.00,
                total_orders INTEGER DEFAULT 0,
                completed_orders INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
                verification_documents TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Enhanced Services table for provider-created services
        cur.execute(
            """
            ALTER TABLE services 
            ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS is_custom_service BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'standard' CHECK (service_type IN ('standard', 'custom', 'premium')),
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
            ADD COLUMN IF NOT EXISTS created_by_provider BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS service_images TEXT[],
            ADD COLUMN IF NOT EXISTS service_duration_hours INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS requires_materials BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS materials_included BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 3
        """
        )

        # Service Provider Custom Products
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS provider_products (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
                product_name VARCHAR(255) NOT NULL,
                product_name_ar VARCHAR(255),
                description TEXT NOT NULL,
                description_ar TEXT,
                category_id INTEGER REFERENCES service_categories(id),
                price DECIMAL(10,2) NOT NULL,
                discount_price DECIMAL(10,2),
                product_images TEXT[],
                product_specifications TEXT,
                availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'out_of_stock', 'discontinued')),
                stock_quantity INTEGER DEFAULT 0,
                min_order_quantity INTEGER DEFAULT 1,
                max_order_quantity INTEGER DEFAULT 100,
                delivery_time_days INTEGER DEFAULT 1,
                warranty_months INTEGER DEFAULT 6,
                return_policy TEXT,
                product_tags TEXT[],
                is_featured BOOLEAN DEFAULT FALSE,
                approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service Provider Schedule and Availability
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS provider_availability (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
                day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN DEFAULT TRUE,
                break_start_time TIME,
                break_end_time TIME,
                emergency_hours BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service Provider Performance Tracking
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS provider_performance (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
                month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
                total_orders INTEGER DEFAULT 0,
                completed_orders INTEGER DEFAULT 0,
                cancelled_orders INTEGER DEFAULT 0,
                total_revenue DECIMAL(10,2) DEFAULT 0.00,
                average_rating DECIMAL(3,2) DEFAULT 0.00,
                response_time_hours DECIMAL(5,2) DEFAULT 0.00,
                completion_rate DECIMAL(5,2) DEFAULT 0.00,
                customer_satisfaction DECIMAL(3,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider_id, month_year)
            )
        """
        )

        # Service Provider Earnings
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS provider_earnings (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
                service_request_id INTEGER REFERENCES service_requests(id),
                order_type VARCHAR(20) DEFAULT 'service' CHECK (order_type IN ('service', 'product', 'combo')),
                gross_amount DECIMAL(10,2) NOT NULL,
                platform_fee DECIMAL(10,2) NOT NULL,
                net_amount DECIMAL(10,2) NOT NULL,
                fee_percentage DECIMAL(5,2) DEFAULT 10.00,
                payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processed', 'failed', 'refunded')),
                payout_date DATE,
                transaction_reference VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Service Provider Reviews and Ratings
        cur.execute(
            """
            ALTER TABLE service_ratings 
            ADD COLUMN IF NOT EXISTS service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 5),
            ADD COLUMN IF NOT EXISTS timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
            ADD COLUMN IF NOT EXISTS professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
            ADD COLUMN IF NOT EXISTS value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
            ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS review_images TEXT[],
            ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT FALSE
        """
        )

        # Service Provider Notifications
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS provider_notifications (
                id SERIAL PRIMARY KEY,
                provider_id INTEGER REFERENCES service_providers(id) ON DELETE CASCADE,
                notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('new_order', 'order_cancelled', 'payment_received', 'review_received', 'service_approved', 'service_rejected')),
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_order_id INTEGER,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            )
        """
        )

        # Service Categories Enhancement (allow provider-created categories)
        cur.execute(
            """
            ALTER TABLE service_categories
            ADD COLUMN IF NOT EXISTS created_by_provider INTEGER REFERENCES service_providers(id),
            ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
            ADD COLUMN IF NOT EXISTS is_custom_category BOOLEAN DEFAULT FALSE
        """
        )

        # System Settings Table for configurable margins and fees
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value DECIMAL(10,4),
                setting_text VARCHAR(500),
                setting_boolean BOOLEAN,
                description TEXT,
                category VARCHAR(50) DEFAULT 'general',
                is_editable_by_ceo BOOLEAN DEFAULT FALSE,
                is_editable_by_super_admin BOOLEAN DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id),
                updated_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Enhanced User Roles and Permissions
        cur.execute(
            """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS can_manage_software_margin BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS can_view_financial_settings BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS can_modify_commission_rates BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS permission_level INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS department VARCHAR(100),
            ADD COLUMN IF NOT EXISTS last_permission_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS permission_updated_by INTEGER REFERENCES users(id)
        """
        )

        # Insert default system settings if they don't exist
        cur.execute(
            """
            INSERT INTO system_settings (setting_key, setting_value, description, category, is_editable_by_ceo, is_editable_by_super_admin)
            SELECT 'software_margin_percentage', 5.0000, 'Software margin percentage added to all transactions', 'financial', TRUE, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'software_margin_percentage')
        """
        )

        cur.execute(
            """
            INSERT INTO system_settings (setting_key, setting_value, description, category, is_editable_by_ceo, is_editable_by_super_admin)
            SELECT 'platform_commission_percentage', 10.0000, 'Platform commission percentage charged to service providers', 'financial', TRUE, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'platform_commission_percentage')
        """
        )

        cur.execute(
            """
            INSERT INTO system_settings (setting_key, setting_boolean, description, category, is_editable_by_ceo, is_editable_by_super_admin)
            SELECT 'enable_software_margin', TRUE, 'Enable or disable software margin on all transactions', 'financial', TRUE, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'enable_software_margin')
        """
        )

        cur.execute(
            """
            INSERT INTO system_settings (setting_key, setting_text, description, category, is_editable_by_ceo, is_editable_by_super_admin)
            SELECT 'margin_display_name', 'Software Fee', 'Display name for software margin in user interfaces', 'general', TRUE, TRUE
            WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'margin_display_name')
        """
        )

        # Corporate Demo Requests table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS corporate_demo_requests (
                id SERIAL PRIMARY KEY,
                request_id VARCHAR(100) UNIQUE NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                commercial_registration VARCHAR(100) NOT NULL,
                tax_number VARCHAR(100),
                industry VARCHAR(100),
                company_size VARCHAR(50),
                contact_person_name VARCHAR(200) NOT NULL,
                contact_person_title VARCHAR(100),
                contact_email VARCHAR(255) NOT NULL,
                contact_phone VARCHAR(20) NOT NULL,
                business_address TEXT,
                city VARCHAR(100),
                country VARCHAR(100) DEFAULT 'Saudi Arabia',
                website VARCHAR(255),
                current_system VARCHAR(255),
                expected_users INTEGER,
                expected_properties INTEGER,
                specific_requirements TEXT,
                preferred_demo_date DATE,
                preferred_time VARCHAR(50),
                request_status VARCHAR(20) DEFAULT 'pending',
                admin_notes TEXT,
                demo_scheduled_date TIMESTAMP,
                demo_completed_date TIMESTAMP,
                trial_approved BOOLEAN DEFAULT FALSE,
                trial_created_date TIMESTAMP,
                corporate_org_id INTEGER REFERENCES corporate_organizations(id) ON DELETE SET NULL,
                created_by_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
                processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        conn.commit()

        # Initialize Service Marketplace Schema - disabled due to schema mismatch
        # The marketplace schema SQL file contains INSERT statements with column names
        # that don't match the current table structure. Will be handled by app.
        print(
            "Service Marketplace schema initialization skipped - managed by application"
        )

        # Create default admin user if not exists
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        result = cur.fetchone()
        admin_count = result[0] if result else 0

        if admin_count == 0:
            import bcrypt

            password_hash = bcrypt.hashpw(
                "admin123".encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            cur.execute(
                """
                INSERT INTO users (first_name, last_name, email, phone, national_id, password_hash, role, is_verified)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
                (
                    "Admin",
                    "User",
                    "admin@realestate.com",
                    "+1234567890",
                    "ADMIN001",
                    password_hash,
                    "admin",
                    True,
                ),
            )

            conn.commit()
            print(
                "Default admin user created (email: admin@realestate.com, password: admin123)"
            )

    except Exception as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    initialize_database()
