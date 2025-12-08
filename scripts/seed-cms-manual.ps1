if ($env:NODE_ENV -eq "production" -or $env:CI -eq "true") {
    Write-Error "Seeding blocked in production/CI. Set ALLOW_SEED=1 only in non-production." -ErrorAction Stop
    exit 1
}
if ($env:ALLOW_SEED -ne "1") {
    Write-Error "Set ALLOW_SEED=1 to run seed scripts in non-production." -ErrorAction Stop
    exit 1
}

Write-Host "🌱 Seeding CMS Pages..." -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json"
    "x-user" = '{"id":"admin","role":"SUPER_ADMIN","tenantId":"t0"}'
}

$pages = @(
    @{
        slug = "privacy"
        title = "Privacy Policy"
        content = @"
# Privacy Policy

Last updated: $(Get-Date -Format "MMMM dd, yyyy")

## Information We Collect

We collect information you provide directly to us, such as when you:
- Create an account
- Use our facility management services
- Contact our support team

## How We Use Your Information

We use the information we collect to:
- Provide and maintain our services
- Process transactions and manage your properties
- Send you technical notices and support messages
- Respond to your requests and provide customer service

## Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at privacy@fixzit.co
"@
        status = "PUBLISHED"
    },
    @{
        slug = "terms"
        title = "Terms of Service"
        content = @"
# Terms of Service

Last updated: $(Get-Date -Format "MMMM dd, yyyy")

## Acceptance of Terms

By accessing and using Fixzit Enterprise Platform, you accept and agree to be bound by these Terms of Service.

## Use of Service

You may use our Service only for lawful purposes and in accordance with these Terms.

## User Accounts

You are responsible for:
- Maintaining the confidentiality of your account
- All activities that occur under your account
- Notifying us immediately of any unauthorized use

## Property Management Services

Our platform provides tools for:
- Managing properties and tenants
- Processing work orders
- Handling financial transactions
- Marketplace procurement

## Limitation of Liability

In no event shall Fixzit be liable for any indirect, incidental, special, consequential, or punitive damages.

## Contact Information

For questions about these Terms, contact us at legal@fixzit.co
"@
        status = "PUBLISHED"
    },
    @{
        slug = "about"
        title = "About Fixzit"
        content = @"
# About Fixzit

## Our Mission

Fixzit is revolutionizing facility management by combining property operations, maintenance workflows, and procurement into one unified platform.

## What We Do

### Property Management
Complete tools for managing residential and commercial properties, from tenant onboarding to lease management.

### Work Order Management
Streamline maintenance requests, dispatch technicians, and track SLAs with our intelligent work order system.

### Marketplace Integration
Access a curated marketplace of vendors, materials, and services directly within your facility management workflow.

## Our Values

- **Innovation**: Continuously improving our platform with cutting-edge technology
- **Reliability**: Ensuring 99.9% uptime for critical facility operations
- **Security**: Protecting your data with enterprise-grade security measures
- **Support**: Providing 24/7 customer support for all users

## Contact Us

Email: info@fixzit.co
Phone: +966 XX XXX XXXX
Address: Riyadh, Saudi Arabia
"@
        status = "PUBLISHED"
    }
)

foreach ($page in $pages) {
    $body = ConvertTo-Json $page -Depth 10
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/cms/pages/$($page.slug)" -Method PATCH -Headers $headers -Body $body
        Write-Host "✅ Seeded: $($page.slug)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed: $($page.slug) - $_" -ForegroundColor Red
    }
}
