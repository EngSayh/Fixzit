// Run this script to seed initial CMS pages
// Usage: node scripts/seed-cms.js

const seedPages = async () => {
  const baseUrl = "http://localhost:3000";
  const headers = {
    "content-type": "application/json",
    "x-user": JSON.stringify({
      id: "system",
      role: "SUPER_ADMIN",
      tenantId: "t0",
    }),
  };

  const pages = [
    {
      slug: "privacy",
      title: "Privacy Policy",
      content: `# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

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

If you have any questions about this Privacy Policy, please contact us at privacy@fixzit.co`,
      status: "PUBLISHED",
    },
    {
      slug: "terms",
      title: "Terms of Service",
      content: `# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

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

For questions about these Terms, contact us at legal@fixzit.co`,
      status: "PUBLISHED",
    },
    {
      slug: "about",
      title: "About Fixzit",
      content: `# About Fixzit

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
Address: Riyadh, Saudi Arabia`,
      status: "PUBLISHED",
    },
  ];

  for (const page of pages) {
    try {
      const response = await fetch(`${baseUrl}/api/cms/pages/${page.slug}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(page),
      });

      if (response.ok) {
        console.log(`✅ Seeded page: ${page.slug}`);
      } else {
        console.error(`❌ Failed to seed ${page.slug}:`, await response.text());
      }
    } catch (error) {
      console.error(`❌ Error seeding ${page.slug}:`, error);
    }
  }
};

// Seed help articles
const seedHelpArticles = async () => {
  const baseUrl = "http://localhost:3000";
  const headers = {
    "content-type": "application/json",
    "x-user": JSON.stringify({
      id: "system",
      role: "SUPER_ADMIN",
      tenantId: "t0",
    }),
  };

  const articles = [
    {
      slug: "getting-started",
      title: "Getting Started with Fixzit",
      content:
        "Learn how to set up your account and start managing properties...",
      category: "Getting Started",
      tags: ["basics", "tutorial"],
      status: "PUBLISHED",
    },
    {
      slug: "create-work-order",
      title: "How to Create a Work Order",
      content: "Step by step guide to creating and managing work orders...",
      category: "Work Orders",
      tags: ["work-orders", "maintenance"],
      status: "PUBLISHED",
    },
    {
      slug: "manage-tenants",
      title: "Managing Tenants",
      content:
        "Learn how to add tenants, manage leases, and handle communications...",
      category: "Property Management",
      tags: ["tenants", "properties"],
      status: "PUBLISHED",
    },
  ];

  for (const article of articles) {
    try {
      const response = await fetch(`${baseUrl}/api/help/articles`, {
        method: "POST",
        headers,
        body: JSON.stringify(article),
      });

      if (response.ok) {
        console.log(`✅ Seeded help article: ${article.slug}`);
      } else {
        console.error(
          `❌ Failed to seed ${article.slug}:`,
          await response.text(),
        );
      }
    } catch (error) {
      console.error(`❌ Error seeding ${article.slug}:`, error);
    }
  }
};

// Run the seeding
console.log("🌱 Starting CMS seeding...");
seedPages()
  .then(() => {
    console.log("🌱 Seeding help articles...");
    return seedHelpArticles();
  })
  .then(() => {
    console.log("✅ Seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
