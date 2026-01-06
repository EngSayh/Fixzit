/**
 * @fileoverview MongoDB Collection Names
 * @description Central definition of all collection names for multi-tenant Fixzit system
 * 
 * STRICT v4.1: All collections follow multi-tenancy patterns with org_id scoping
 */

// Collection names constant - single source of truth
export const COLLECTIONS = {
  // Core multi-tenant collections
  TENANTS: "tenants",
  USERS: "users",
  PROPERTIES: "properties",
  WORK_ORDERS: "workorders",
  // TODO: DATA-001 - Investigate/migrate work_orders vs workorders inconsistency
  // Some code uses "work_orders" (underscore) - this needs data migration investigation
  WORK_ORDERS_UNDERSCORE: "work_orders", // Legacy naming - used in bi-dashboard, fm services
  CATEGORIES: "categories",
  VENDORS: "vendors",
  PRODUCTS: "products",
  CARTS: "carts",
  ORDERS: "orders", // Legacy - kept for backward compatibility
  CLAIMS_ORDERS: "claims_orders", // Claims module orders (renamed from 'orders')
  INVOICES: "invoices",
  RFQS: "rfqs",
  PROJECT_BIDS: "projectbids",
  REVIEWS: "reviews",
  NOTIFICATIONS: "notifications",
  AUDIT_LOGS: "auditLogs",
  // TODO: DATA-002 - Investigate audit_logs vs auditLogs naming inconsistency
  AUDIT_LOGS_UNDERSCORE: "audit_logs", // Used in enterprise-security.ts for chain integrity
  
  // Admin + org
  ORGANIZATIONS: "organizations",
  ADMIN_NOTIFICATIONS: "admin_notifications",
  COMMUNICATION_LOGS: "communication_logs",
  EMAIL_LOGS: "email_logs",
  PAYMENTS: "payments",
  AQAR_PAYMENTS: "aqar_payments",
  
  // Financial / Accounting collections
  TRANSACTIONS: "transactions",
  FINANCE_PAYMENTS: "finance_payments",
  FM_FINANCIAL_TRANSACTIONS: "fm_financial_transactions",
  PAYROLL_RUNS: "payroll_runs",
  FEEDBACK: "feedback",
  
  // ATS module
  ATS_JOBS: "jobs",
  ATS_APPLICATIONS: "applications",
  ATS_INTERVIEWS: "interviews",
  ATS_CANDIDATES: "candidates",
  ATS_SETTINGS: "ats_settings",
  
  // Knowledge base / CMS
  HELP_ARTICLES: "helparticles",
  HELP_COMMENTS: "helpcomments",
  KB_EMBEDDINGS: "kb_embeddings",
  AI_KB: "ai_kb",
  CMS_PAGES: "cmspages",
  
  // Additional collections
  SUPPORT_TICKETS: "supporttickets",
  EMPLOYEES: "employees",
  ATTENDANCE: "attendances",
  CUSTOMERS: "customers",
  CONTRACTS: "contracts",
  ROLES: "roles",
  PERMISSIONS: "permissions",
  API_KEYS: "api_keys",
  INVOICE_COUNTERS: "invoice_counters",
  
  // Souq marketplace collections - Core
  SOUQ_SELLERS: "souq_sellers",
  SOUQ_PRODUCTS: "souq_products",
  SOUQ_LISTINGS: "souq_listings",
  SOUQ_ORDERS: "souq_orders",
  SOUQ_REVIEWS: "souq_reviews",
  
  // Souq marketplace collections - Settlements & Payouts
  SOUQ_TRANSACTIONS: "souq_transactions",
  SOUQ_SETTLEMENTS: "souq_settlements",
  SOUQ_SETTLEMENT_STATEMENTS: "souq_settlement_statements",
  SOUQ_WITHDRAWAL_REQUESTS: "souq_withdrawal_requests",
  SOUQ_WITHDRAWALS: "souq_withdrawals",
  SOUQ_SELLER_BALANCES: "souq_seller_balances",
  SOUQ_PAYOUTS: "souq_payouts",
  SOUQ_PAYOUT_BATCHES: "souq_payout_batches",
  CLAIMS: "claims",
  
  // Souq marketplace collections - Advertising
  SOUQ_CAMPAIGNS: "souq_campaigns",
  SOUQ_AD_GROUPS: "souq_ad_groups",
  SOUQ_ADS: "souq_ads",
  SOUQ_AD_TARGETS: "souq_ad_targets",
  SOUQ_AD_BIDS: "souq_ad_bids",
  SOUQ_AD_EVENTS: "souq_ad_events",
  SOUQ_AD_STATS: "souq_ad_stats",
  SOUQ_AD_DAILY_SPEND: "souq_ad_daily_spend",
  SOUQ_FEE_SCHEDULES: "souq_fee_schedules",
  SOUQ_RMAS: "souq_rmas",
  SOUQ_REFUNDS: "souq_refunds",
  
  // QA collections
  QA_LOGS: "qa_logs",
  QA_ALERTS: "qa_alerts",
  
  // Aqar offline/user data collections
  AQAR_USER_FAVORITES: "aqar_user_favorites",
  AQAR_SEARCH_HISTORY: "aqar_search_history",
  AQAR_VIEWED_LISTINGS: "aqar_viewed_listings",
  AQAR_INQUIRIES: "aqar_inquiries",
  AQAR_SYNC_LOG: "aqar_sync_log",
  
  // Aqar tenant screening collections
  SCREENING_APPLICATIONS: "screening_applications",
  APPLICANTS: "applicants",
  PAYMENT_HISTORY: "payment_history",
  EVICTION_RECORDS: "eviction_records",
  LEASES: "leases",
  LEASE_SEQUENCES: "lease_sequences",
  
  // Notifications / Queue
  NOTIFICATION_QUEUE: "notification_queue",
  
  // Errors / telemetry
  ERROR_EVENTS: "error_events",
  
  // Approvals / Assets / SLA / Agent audit
  FM_APPROVALS: "fm_approvals",
  FM_SERVICE_PROVIDERS: "fm_service_providers",
  ASSETS: "assets",
  SLAS: "slas",
  AGENT_AUDIT_LOGS: "agent_audit_logs",
  WORKORDER_TIMELINE: "workorder_timeline",
  WORKORDER_ATTACHMENTS: "workorder_attachments",
  UTILITY_BILLS: "utilitybills",
  OWNERS: "owners",
  CREDENTIALS: "credentials",
  ACCOUNTS: "accounts",
  
  // Search-related collections
  UNITS: "units",
  SERVICES: "services",
  PROJECTS: "projects",
  AGENTS: "agents",
  LISTINGS: "listings",
  RFQ_RESPONSES: "rfq_responses",
  
  // Subscription/billing collections
  SUBSCRIPTION_INVOICES: "subscriptioninvoices",
  
  // Superadmin / System collections
  TRIAL_REQUESTS: "trial_requests",
  MFA_APPROVALS: "mfa_approvals",
  KILL_SWITCH_EVENTS: "kill_switch_events",
  TENANT_SNAPSHOTS: "tenant_snapshots",
  GHOST_SESSIONS: "ghost_sessions",
  RESTORE_JOBS: "restore_jobs",
  TIME_TRAVEL_REQUESTS: "time_travel_requests",
  
  // Auth / Security collections
  ACCOUNT_LOCKOUTS: "account_lockouts",
  LOGIN_ATTEMPTS: "login_attempts",
  MFA_PENDING: "mfa_pending",
  SESSIONS: "sessions",
  TRUSTED_DEVICES: "trusted_devices",
  PASSWORD_HISTORY: "password_history",
  ORGANIZATION_SETTINGS: "organization_settings",
  
  // FM (Facility Management) collections
  FM_BIDS: "fm_bids",
  
  // Finance / ZATCA collections
  ZATCA_CREDENTIALS: "zatca_credentials",
  ZATCA_SUBMISSIONS: "zatca_submissions",
  FINANCE_ESCROW_EVENTS: "finance_escrow_events",
  
  // Issue tracker (SSOT)
  ISSUES: "issues",
  ISSUE_EVENTS: "issue_events",
} as const;

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
