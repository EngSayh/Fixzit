# Fixzit - Comprehensive Service Company

## Overview

Fixzit Enterprise is a comprehensive property and facility management platform with integrated marketplace functionality. The unified system combines traditional property management operations with a complete Fixzit Souq marketplace for vendor management, product catalog, and RFQ bidding systems. Built with Next.js, TypeScript, and PostgreSQL, it handles real estate operations, tenant management, property administration, contract management, maintenance ticketing, payment processing, and marketplace oversight. The system supports multi-language (English/Arabic) functionality with RTL text support, enterprise-grade role-based access control, and complete multi-vendor service booking platform. It also includes an HR service management system, a referral program, and enhanced financial management features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Next.js 14 (App Router) with React 18 and TypeScript.
- **UI Components**: Monday.com-inspired dashboard with responsive design and role-based interfaces.
- **Authentication**: NextAuth.js with Google/Apple OAuth and credential providers.
- **Internationalization**: Dual-language support (English/Arabic) with RTL text rendering.
- **State Management**: React state with server-side session management.
- **Branding**: Fixzit Enterprise theme with specific color schemes (Blue #0078D4, Orange #F6851F, Green #00A859, Yellow #FFB400) and Monday.com styling.

### Backend Architecture

- **API Layer**: Next.js API routes with TypeScript and secure request handling.
- **Authentication System**: NextAuth.js with bcrypt password hashing and OAuth integration.
- **Data Access Layer**: Prisma ORM with PostgreSQL database and connection pooling.
- **Role-Based Access Control**: Enterprise-grade user system (tenant, manager, admin) with page-level access restrictions and permission-based routing.

### Database Design

- **Primary Database**: PostgreSQL with Prisma ORM and structured relational schema.
- **Core Entities**: Users, Properties, Units, Contracts, WorkOrders, Payments, Sessions, Service Providers, HR Services, Referrals.
- **Data Models**: TypeScript interfaces with Prisma-generated types for type-safe database operations.

### Key Features & Modules

- **User Management**: Multi-role authentication, profile management, and user verification.
- **Property & Contract Management**: Inventory tracking, digital contract lifecycle management, and tenant portal.
- **Maintenance Operations**: Ticket management with SLA workflow, assignment capabilities, and photo uploads.
- **Financial Management**: Payment tracking, history, export, and integration with various payment gateways (30% upfront/70% completion system, tax-compliant invoicing).
- **Administrative Controls**: System-wide user/property management, bulk operations, and oversight tools.
- **Multi-Vendor Service Booking**: Provider registration, competitive bidding system, 26+ service categories, provider dashboards, and admin management.
- **Enhanced User Experience**: Family member management, digital wallet system, PIN-based work authorization, QR code invoice system, and advanced notification center.
- **Marketing & Promotions**: Sultan POS-style marketing interface, coupon management, discount features, social media integration, and campaign analytics.
- **HR Service Management**: Comprehensive service database (1,150+ services), automated workflow engine, multi-role interfaces, SLA monitoring, and employee self-service portal.
- **Referral Program**: Double-sided evergreen program with unique codes, multi-channel sharing, monthly caps, automated rewards, and anti-fraud protection.
- **Ejar Integration**: Comprehensive reporting, statistics dashboard, interactive properties map, authorization management, and contract documentation workflow.
- **Multi-Tenant Reporting (Module 21)**: Per-tenant weekly reports with ZIP bundling, automated generation, and artifact management.
- **Notification System (Module 22)**: Email and Slack delivery with per-tenant configuration, SMTP integration, and admin UI management.
- **Fixzit Souq Marketplace (NEW)**: Complete marketplace integration with vendor management, product catalog, RFQ bidding system, ZATCA compliance, and unified Super Admin dashboard control.
- **Role-Based Access Control**: Admin-only page protection using email allowlists and token authentication, with SUPER_ADMIN access to both property management and marketplace systems.

### Design Patterns

- **Modular Architecture**: Separated concerns for auth, database, utilities, and business logic.
- **Translation Layer**: Centralized internationalization system.
- **Database Abstraction**: Utility functions for query execution and transaction management.
- **Error Handling**: Comprehensive exception management.
- **Workflow Management**: Step-by-step processes for contract documentation and service requests.

## External Dependencies

### Core Technologies

- **Next.js 14**: Full-stack React framework with App Router.
- **React 18**: Frontend library with hooks and server components.
- **TypeScript**: Type-safe development.
- **Prisma**: Database ORM and type generation.
- **PostgreSQL**: Primary database.
- **NextAuth.js**: Authentication and session management.

### Third-Party Services

- **Google OAuth**: Authentication provider.
- **Apple OAuth**: Authentication provider.
- **Twilio**: SMS service for OTP and notifications.
- **SendGrid**: Email services for reports and notifications.

### Development Libraries

- **TailwindCSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Date-fns**: Date manipulation.
- **Zod**: Schema validation.

### Integration Points

- **SMS Gateway**: Twilio API.
- **Email Services**: SendGrid and SMTP.
- **Interactive Maps**: Folium.
- **Data Export**: Excel and PDF generation.
- **Ejar Platform**: Integration with authentic Ejar account data.
- **Slack Integration**: Webhook-based messaging for reports and notifications.
- **Multi-Tenant Architecture**: Per-tenant data isolation and configuration management.

## Recent Updates

### Fixzit Souq Marketplace Integration (COMPLETED ✅)

- **Complete Marketplace System**: Successfully integrated Fixzit Souq V4 marketplace into Fixzit Enterprise as unified Super Admin module
- **Backend Integration**: All marketplace API routes operational (vendors, products, RFQs) with SUPER_ADMIN authorization and PostgreSQL/Prisma integration
- **Frontend Components**: MarketplaceDashboard, VendorManagement, ProductManagement, and RFQManagement components fully functional
- **Database Schema**: Converted MongoDB-based Souq schemas to PostgreSQL models with proper relationships and constraints
- **Unified Authentication**: Single authentication system handling both property management and marketplace with role-based access
- **Security Hardening**: All critical JWT secret and CORS vulnerabilities resolved with comprehensive environment validation
- **Operational Status**: Both property management and marketplace systems running perfectly with no errors

### New Standalone Fixzit Souq Materials Received (September 11, 2025)

- **Replit Deployment Guide**: Complete setup instructions for standalone deployment
- **Backend API Structure**: Node.js/Express server with 13+ route modules for MongoDB-based system
- **Complete Module Package**: All 15 React components (9,250+ lines of code) for standalone system
- **Project Summary**: ZIP structure and multiple deployment options (Replit, Docker, AWS)

### Module 21 & 22 Implementation

- **Per-Tenant Weekly Reports**: Comprehensive HTML reports with ZIP bundling for multi-tenant deployments
- **Notifications Admin UI**: Dedicated Streamlit page for managing email recipients, Slack webhooks, and attachment preferences
- **Role-Based Access Control**: Admin-only access protection using environment-driven email allowlists and token authentication
- **SMTP Integration**: Full email delivery system with support for To/CC/BCC recipients and file attachments
- **Slack Webhook Support**: Automated digest posting with channel overrides and rich formatting
- **CLI Tools**: Command-line utilities for report generation, email delivery, and Slack posting with tenant filtering
- **GitHub Actions Integration**: Weekly scheduled reporting with automated email and Slack delivery
