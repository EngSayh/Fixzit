"""
Database Performance Optimization - Critical Indexes and Connection Pooling
Based on CEO review recommendations for production readiness
"""

import streamlit as st
from utils.database import get_db_connection


def create_critical_indexes():
    """
    Create critical database indexes for performance as recommended in CEO review
    """
    conn = get_db_connection()
    if not conn:
        st.error("Database connection failed")
        return False

    try:
        cur = conn.cursor()

        # Critical indexes from CEO review
        indexes = [
            # Tickets performance
            ("idx_tickets_property_status", "tickets", ["property_id", "status"]),
            ("idx_tickets_submitter", "tickets", ["submitter_id"]),
            ("idx_tickets_assigned", "tickets", ["assigned_to"]),
            ("idx_tickets_created", "tickets", ["created_at"]),
            # Payments performance
            ("idx_payments_contract_status", "payments", ["contract_id", "status"]),
            ("idx_payments_status", "payments", ["status"]),
            ("idx_payments_created", "payments", ["created_at"]),
            # Contracts performance
            ("idx_contracts_tenant", "contracts", ["tenant_id"]),
            ("idx_contracts_property", "contracts", ["property_id"]),
            ("idx_contracts_status", "contracts", ["status"]),
            ("idx_contracts_dates", "contracts", ["start_date", "end_date"]),
            # Bids performance (marketplace)
            ("idx_bids_project_status", "bids", ["project_id", "status"]),
            ("idx_bids_provider", "bids", ["service_provider_id"]),
            ("idx_bids_created", "bids", ["created_at"]),
            # Users performance
            ("idx_users_role", "users", ["role"]),
            ("idx_users_email", "users", ["email"]),
            ("idx_users_phone", "users", ["phone"]),
            # Properties performance
            ("idx_properties_manager", "properties", ["manager_id"]),
            ("idx_properties_status", "properties", ["status"]),
            # Units performance
            ("idx_units_property", "units", ["property_id"]),
            ("idx_units_status", "units", ["status"]),
            # Service providers geospatial (for 10km radius as mentioned)
            ("idx_providers_location", "service_providers", ["location"], "USING GIST"),
            # Audit log performance
            ("idx_audit_log_entity", "audit_log", ["entity", "entity_id"]),
            ("idx_audit_log_actor", "audit_log", ["actor_id"]),
            ("idx_audit_log_created", "audit_log", ["created_at"]),
            # Feature flags performance
            ("idx_feature_flags_key", "feature_flags", ["flag_key"]),
            # Store orders performance
            ("idx_store_orders_status", "store_orders", ["order_status"]),
            ("idx_store_orders_created", "store_orders", ["created_at"]),
        ]

        success_count = 0
        error_count = 0

        for index_info in indexes:
            try:
                index_name = index_info[0]
                table_name = index_info[1]
                columns = index_info[2]
                index_type = index_info[3] if len(index_info) > 3 else ""

                # Check if index already exists
                cur.execute(
                    """
                    SELECT 1 FROM pg_indexes 
                    WHERE indexname = %s
                """,
                    (index_name,),
                )

                if cur.fetchone():
                    st.info(f"✅ Index {index_name} already exists")
                    continue

                # Create index
                columns_str = ", ".join(columns)
                query = f"""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} 
                    ON {table_name} {index_type} ({columns_str})
                """

                cur.execute(query)
                success_count += 1
                st.success(f"✅ Created index: {index_name}")

            except Exception as e:
                error_count += 1
                st.warning(f"⚠️ Failed to create index {index_info[0]}: {str(e)}")
                continue

        # Create PostGIS extension if needed for geospatial
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")
            st.info("✅ PostGIS extension enabled")
        except Exception:
            st.warning(
                "⚠️ Could not enable PostGIS (geospatial features may be limited)"
            )

        conn.commit()

        st.success("🎯 **Database Performance Optimization Complete!**")
        st.info(f"✅ {success_count} indexes created successfully")
        if error_count > 0:
            st.warning(f"⚠️ {error_count} indexes failed to create")

        return True

    except Exception as e:
        st.error(f"Critical error during index creation: {e}")
        return False
    finally:
        if cur:
            cur.close()
        conn.close()


def create_database_constraints():
    """
    Add database constraints to prevent data integrity issues
    """
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()

        constraints = [
            # Prevent tickets referencing non-existent properties/units
            ("fk_tickets_property", "tickets", "property_id", "properties", "id"),
            ("fk_tickets_unit", "tickets", "unit_id", "units", "id"),
            ("fk_tickets_submitter", "tickets", "submitter_id", "users", "id"),
            ("fk_tickets_assigned", "tickets", "assigned_to", "users", "id"),
            # Contract integrity
            ("fk_contracts_tenant", "contracts", "tenant_id", "users", "id"),
            ("fk_contracts_property", "contracts", "property_id", "properties", "id"),
            ("fk_contracts_unit", "contracts", "unit_id", "units", "id"),
            # Payment integrity
            ("fk_payments_contract", "payments", "contract_id", "contracts", "id"),
            # Unit-property relationship
            ("fk_units_property", "units", "property_id", "properties", "id"),
        ]

        for constraint_name, table, column, ref_table, ref_column in constraints:
            try:
                cur.execute(
                    f"""
                    ALTER TABLE {table}
                    ADD CONSTRAINT {constraint_name}
                    FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column})
                    ON DELETE CASCADE
                """
                )
                st.info(f"✅ Added constraint: {constraint_name}")
            except Exception as e:
                if "already exists" in str(e):
                    continue
                st.warning(f"⚠️ Could not add constraint {constraint_name}: {str(e)}")

        conn.commit()
        return True

    except Exception as e:
        st.error(f"Error adding constraints: {e}")
        return False
    finally:
        if cur:
            cur.close()
        conn.close()


def optimize_database_settings():
    """
    Apply recommended PostgreSQL settings for performance
    """
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()

        # Get current settings
        settings_info = []

        performance_queries = [
            (
                "Shared Buffers",
                "SELECT setting FROM pg_settings WHERE name = 'shared_buffers'",
            ),
            ("Work Memory", "SELECT setting FROM pg_settings WHERE name = 'work_mem'"),
            (
                "Maintenance Work Memory",
                "SELECT setting FROM pg_settings WHERE name = 'maintenance_work_mem'",
            ),
            (
                "Max Connections",
                "SELECT setting FROM pg_settings WHERE name = 'max_connections'",
            ),
            (
                "Checkpoint Segments",
                "SELECT setting FROM pg_settings WHERE name = 'checkpoint_completion_target'",
            ),
        ]

        for setting_name, query in performance_queries:
            try:
                cur.execute(query)
                result = cur.fetchone()
                if result:
                    settings_info.append(f"**{setting_name}**: {result[0]}")
            except Exception:
                continue

        if settings_info:
            st.info("📊 **Current Database Configuration:**")
            for info in settings_info:
                st.text(info)

        # Analyze tables for better statistics
        critical_tables = [
            "tickets",
            "contracts",
            "payments",
            "users",
            "properties",
            "units",
        ]

        for table in critical_tables:
            try:
                cur.execute(f"ANALYZE {table}")
                st.info(f"✅ Analyzed table: {table}")
            except Exception:
                continue

        conn.commit()
        return True

    except Exception as e:
        st.error(f"Error optimizing database settings: {e}")
        return False
    finally:
        if cur:
            cur.close()
        conn.close()


def check_query_performance():
    """
    Check for slow queries and performance issues
    """
    conn = get_db_connection()
    if not conn:
        return

    try:
        cur = conn.cursor()

        # Get database size info
        cur.execute(
            """
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as raw_size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY raw_size DESC
            LIMIT 10
        """
        )

        table_sizes = cur.fetchall()

        if table_sizes:
            st.info("📊 **Largest Tables:**")
            for schema, table, size, raw_size in table_sizes:
                st.text(f"• {table}: {size}")

        # Check for missing indexes on foreign keys
        cur.execute(
            """
            SELECT DISTINCT
                t.table_name,
                t.column_name,
                'Missing index on FK: ' || t.table_name || '.' || t.column_name as recommendation
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.tables t 
                ON tc.table_name = t.table_name
            LEFT JOIN pg_indexes i 
                ON i.tablename = t.table_name 
                AND i.indexdef LIKE '%' || kcu.column_name || '%'
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND t.table_schema = 'public'
                AND i.indexname IS NULL
            LIMIT 5
        """
        )

        missing_indexes = cur.fetchall()

        if missing_indexes:
            st.warning("⚠️ **Performance Recommendations:**")
            for table, column, recommendation in missing_indexes:
                st.text(f"• {recommendation}")

    except Exception as e:
        st.error(f"Error checking performance: {e}")
    finally:
        if cur:
            cur.close()
        conn.close()


def run_full_optimization():
    """
    Run complete database optimization as recommended in CEO review
    """
    st.markdown("## 🔧 **Database Performance Optimization**")
    st.markdown("*Implementing critical fixes from CEO production readiness review*")

    with st.expander("🎯 **Critical Indexes Creation**", expanded=True):
        if st.button("Create Performance Indexes", type="primary"):
            create_critical_indexes()

    with st.expander("🔒 **Database Constraints**"):
        if st.button("Add Data Integrity Constraints"):
            create_database_constraints()

    with st.expander("📊 **Performance Analysis**"):
        if st.button("Analyze Database Performance"):
            optimize_database_settings()
            check_query_performance()

    # Auto-run critical optimizations
    if (
        st.session_state.get("authenticated")
        and st.session_state.get("user_role") == "admin"
    ):
        st.info("💡 **Auto-running critical optimizations for admin users...**")
        create_critical_indexes()
        create_database_constraints()


if __name__ == "__main__":
    run_full_optimization()
