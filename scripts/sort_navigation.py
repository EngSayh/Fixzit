#!/usr/bin/env python3
"""
Sort Navigation Alphabetically
===============================
Sorts sidebar navigation at both module and sub-level
"""


def sort_navigation():
    """Sort navigation items alphabetically"""

    # Navigation structure to sort
    NAVIGATION = [
        {
            "group": "Administration",
            "icon": "⚙️",
            "items": [
                {
                    "id": "admin_panel",
                    "label": "Admin Panel",
                    "icon": "🛠️",
                    "path": "112_AdminPanel.py",
                },
                {
                    "id": "admin_tools",
                    "label": "Admin Tools",
                    "icon": "🔨",
                    "path": "120_AdminTools.py",
                },
                {
                    "id": "login_branding",
                    "label": "Login Branding",
                    "icon": "🎨",
                    "path": "095_LoginBranding.py",
                },
                {
                    "id": "logo_manager",
                    "label": "Logo Manager",
                    "icon": "🖼️",
                    "path": "960_LogoManager.py",
                },
                {
                    "id": "settings",
                    "label": "Settings",
                    "icon": "🔧",
                    "path": "10_Settings_WorkOS.py",
                },
                {
                    "id": "workspace_settings",
                    "label": "Workspace Settings",
                    "icon": "🏢",
                    "path": "100_WorkspaceSettings.py",
                },
            ],
        },
        {
            "group": "Authentication",
            "icon": "🔑",
            "items": [
                {
                    "id": "auth_callback",
                    "label": "Auth Callback",
                    "icon": "🔄",
                    "path": "011_AuthCallback.py",
                },
                {"id": "login", "label": "Login", "icon": "🔐", "path": "00_Login.py"},
                {
                    "id": "passwordless",
                    "label": "Passwordless Login",
                    "icon": "🔓",
                    "path": "PasswordlessLogin.py",
                },
                {
                    "id": "register",
                    "label": "Register",
                    "icon": "✍️",
                    "path": "Register.py",
                },
                {
                    "id": "reset_password",
                    "label": "Reset Password",
                    "icon": "🔒",
                    "path": "Reset_Password.py",
                },
                {
                    "id": "signup",
                    "label": "Sign Up",
                    "icon": "📝",
                    "path": "001_SignUp.py",
                },
            ],
        },
        {
            "group": "Email & Notifications",
            "icon": "📧",
            "items": [
                {
                    "id": "email_config",
                    "label": "Email Configuration",
                    "icon": "✉️",
                    "path": "200_EmailConfiguration.py",
                },
                {
                    "id": "email_templates",
                    "label": "Email Templates",
                    "icon": "📝",
                    "path": "910_EmailTemplates.py",
                },
                {
                    "id": "notifications_admin",
                    "label": "Notifications Admin",
                    "icon": "🔔",
                    "path": "991_NotificationsAdmin.py",
                },
                {
                    "id": "update_feed",
                    "label": "Update Feed",
                    "icon": "📰",
                    "path": "150_UpdateFeed.py",
                },
            ],
        },
        {
            "group": "Finance",
            "icon": "💰",
            "items": [
                {
                    "id": "analytics",
                    "label": "Analytics",
                    "icon": "📈",
                    "path": "11_Analytics_WorkOS.py",
                },
                {
                    "id": "financials",
                    "label": "Financials",
                    "icon": "💹",
                    "path": "Financials.py",
                },
                {
                    "id": "payments",
                    "label": "Payments",
                    "icon": "💳",
                    "path": "08_Payments_WorkOS.py",
                },
            ],
        },
        {
            "group": "Marketplace",
            "icon": "🛍️",
            "items": [
                {
                    "id": "fixzit_souq",
                    "label": "FixzitSouq",
                    "icon": "🏪",
                    "path": "110_FixzitSouq.py",
                },
                {
                    "id": "marketplace",
                    "label": "Marketplace",
                    "icon": "🛒",
                    "path": "04_Marketplace_WorkOS.py",
                },
                {
                    "id": "vendor_portal",
                    "label": "Vendor Portal",
                    "icon": "🏭",
                    "path": "111_VendorPortal.py",
                },
            ],
        },
        {
            "group": "Onboarding & Help",
            "icon": "🎯",
            "items": [
                {
                    "id": "app_marketplace",
                    "label": "App Marketplace",
                    "icon": "🏪",
                    "path": "101_AppMarketplace.py",
                },
                {
                    "id": "onboarding",
                    "label": "Onboarding",
                    "icon": "🚀",
                    "path": "50_Onboarding_WorkOS.py",
                },
                {
                    "id": "reports",
                    "label": "Reports",
                    "icon": "📊",
                    "path": "Reports.py",
                },
            ],
        },
        {
            "group": "Properties",
            "icon": "🏢",
            "items": [
                {
                    "id": "contracts",
                    "label": "Contracts",
                    "icon": "📄",
                    "path": "06_Contracts_WorkOS.py",
                },
                {
                    "id": "owner_profile",
                    "label": "Owner Profile",
                    "icon": "👤",
                    "path": "921_OwnerProfile.py",
                },
                {
                    "id": "owner_statements",
                    "label": "Owner Statements",
                    "icon": "📑",
                    "path": "920_OwnerStatements.py",
                },
                {
                    "id": "owners_directory",
                    "label": "Owners Directory",
                    "icon": "📁",
                    "path": "930_OwnersDirectory.py",
                },
                {
                    "id": "properties",
                    "label": "Properties",
                    "icon": "🏘️",
                    "path": "05_Properties_WorkOS.py",
                },
            ],
        },
        {
            "group": "Sharing & Moderation",
            "icon": "🔐",
            "items": [
                {
                    "id": "moderation_queue",
                    "label": "Moderation Queue",
                    "icon": "📥",
                    "path": "927_ShareModerationQueue.py",
                },
                {
                    "id": "moderation_settings",
                    "label": "Moderation Settings",
                    "icon": "⚖️",
                    "path": "924_ModerationSettings.py",
                },
                {
                    "id": "secure_verify",
                    "label": "Secure Share Verify",
                    "icon": "✅",
                    "path": "929_SecureShareVerify.py",
                },
                {
                    "id": "audit_logs",
                    "label": "Share Audit Logs",
                    "icon": "📋",
                    "path": "928_ShareAuditLogs.py",
                },
                {
                    "id": "share_management",
                    "label": "Share Management",
                    "icon": "🔗",
                    "path": "925_ShareManagement.py",
                },
                {
                    "id": "share_policy",
                    "label": "Share Policy Settings",
                    "icon": "📜",
                    "path": "926_SharePolicySettings.py",
                },
            ],
        },
        {
            "group": "Support",
            "icon": "🛟",
            "items": [
                {
                    "id": "csc_support",
                    "label": "CSC Support",
                    "icon": "🛠️",
                    "path": "113_CSCSupport.py",
                },
                {
                    "id": "feedback_analytics",
                    "label": "Feedback Analytics",
                    "icon": "💭",
                    "path": "151_FeedbackAnalytics.py",
                },
                {
                    "id": "support_analytics",
                    "label": "Support Analytics",
                    "icon": "📊",
                    "path": "202_SupportAnalytics.py",
                },
                {
                    "id": "support_tickets",
                    "label": "Support Tickets",
                    "icon": "🎫",
                    "path": "201_SupportTickets.py",
                },
            ],
        },
        {
            "group": "System & Monitoring",
            "icon": "🖥️",
            "items": [
                {
                    "id": "code_quality",
                    "label": "Code Quality",
                    "icon": "✨",
                    "path": "990_CodeQuality.py",
                },
                {
                    "id": "feature_flags",
                    "label": "Feature Flags",
                    "icon": "🚩",
                    "path": "985_FeatureFlags.py",
                },
                {
                    "id": "health_dashboard",
                    "label": "Health Dashboard",
                    "icon": "🩺",
                    "path": "955_HealthDashboard.py",
                },
                {
                    "id": "module_manager",
                    "label": "Module Manager",
                    "icon": "📦",
                    "path": "970_ModuleManager.py",
                },
                {
                    "id": "remote_config",
                    "label": "Remote Config",
                    "icon": "🔧",
                    "path": "980_RemoteConfig.py",
                },
                {
                    "id": "system_verify",
                    "label": "System Verification",
                    "icon": "🔍",
                    "path": "950_SystemVerification.py",
                },
                {
                    "id": "uptime_monitoring",
                    "label": "Uptime Monitoring",
                    "icon": "📡",
                    "path": "956_UptimeMonitoring.py",
                },
            ],
        },
        {
            "group": "Users & Access",
            "icon": "👥",
            "items": [
                {
                    "id": "board_viewer",
                    "label": "Board Viewer",
                    "icon": "👁️",
                    "path": "923_BoardViewer.py",
                },
                {
                    "id": "my_profile",
                    "label": "My Profile",
                    "icon": "🆔",
                    "path": "210_MyProfile.py",
                },
                {
                    "id": "team_directory",
                    "label": "Team Directory",
                    "icon": "👨‍👩‍👧‍👦",
                    "path": "922_TeamDirectory.py",
                },
                {
                    "id": "users",
                    "label": "Users",
                    "icon": "👤",
                    "path": "09_Users_WorkOS.py",
                },
            ],
        },
        {
            "group": "Work Management",
            "icon": "🏠",
            "items": [
                {
                    "id": "automations",
                    "label": "Automations",
                    "icon": "⚡",
                    "path": "03_Automations_WorkOS.py",
                },
                {
                    "id": "boards",
                    "label": "Boards",
                    "icon": "📋",
                    "path": "02_Boards_WorkOS.py",
                },
                {
                    "id": "dashboard",
                    "label": "Dashboard",
                    "icon": "📊",
                    "path": "01_Dashboard_WorkOS.py",
                },
                {
                    "id": "tickets",
                    "label": "Tickets",
                    "icon": "🎫",
                    "path": "03_Tickets_WorkOS.py",
                },
            ],
        },
    ]

    print("🔤 SORTING NAVIGATION ALPHABETICALLY")
    print("=" * 50)

    # Sort groups alphabetically
    sorted_nav = sorted(NAVIGATION, key=lambda x: x["group"])

    # Sort items within each group alphabetically
    for group in sorted_nav:
        group["items"] = sorted(group["items"], key=lambda x: x["label"])

    print("\n✅ Navigation Structure (Alphabetically Sorted):\n")

    for group in sorted_nav:
        print(f"📁 {group['group']}")
        for item in group["items"]:
            print(f"   • {item['label']}")

    return sorted_nav


def update_nav_config(sorted_nav):
    """Update the nav_config.py file with sorted navigation"""

    config_content = """# ===================================================================
# Fixzit Navigation Configuration with Alphabetically Sorted Modules
# Official Brand Colors: White #FFFFFF, Navy #023047, Orange #F6851F
# ===================================================================

APP_NAME = "Fixzit"

# Official Fixzit Brand Colors
BRAND = {
    "white": "#FFFFFF",
    "navy": "#023047", 
    "orange": "#F6851F",
    "navy_light": "#3B4A58",
    "orange_light": "#FDEAD8",
    "orange_dark": "#DD6D09",
    "border": "rgba(2,48,71,0.10)",
}

# Navigation Structure - Alphabetically Sorted at Both Levels
NAVIGATION = ["""

    # Add each group
    for i, group in enumerate(sorted_nav):
        if i > 0:
            config_content += ","

        config_content += f"""
    {{
        "group": "{group['group']}",
        "icon": "{group['icon']}",
        "items": ["""

        # Add items
        for j, item in enumerate(group["items"]):
            if j > 0:
                config_content += ","
            config_content += f"""
            {{"id": "{item['id']}", "label": "{item['label']}", "icon": "{item['icon']}", "path": "{item['path']}"}}"""

        config_content += """
        ]
    }"""

    config_content += "\n]"

    # Write to file
    with open("nav_config.py", "w", encoding="utf-8") as f:
        f.write(config_content)

    print("\n✅ Updated nav_config.py with alphabetically sorted navigation")


def main():
    """Main function"""
    sorted_nav = sort_navigation()
    update_nav_config(sorted_nav)
    print("\n🎉 NAVIGATION SORTING COMPLETE!")


if __name__ == "__main__":
    main()
