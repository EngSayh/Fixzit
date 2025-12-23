"use client";
import { logger } from "@/lib/logger";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Play,
  BookOpen,
  Clock,
} from "lucide-react";
import { renderMarkdownSanitized } from "@/lib/markdown";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";
import { SafeHtml } from "@/components/SafeHtml";

// HTML escape utility for fallback rendering
const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function GettingStartedTutorial() {
  const auto = useAutoTranslator("help.gettingStarted");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [renderedContent, setRenderedContent] = useState<string>("");

  const tutorial = {
    id: "getting-started",
    title: "Getting Started with Fixzit FM",
    description: "Learn the basics of facility management in Fixzit",
    duration: "15 min",
    difficulty: "Beginner" as const,
    steps: [
      {
        id: "1",
        title: "Welcome to Fixzit Enterprise",
        description: "Overview of the platform and its capabilities",
        completed: false,
        content: `
# Welcome to Fixzit Enterprise

Fixzit Enterprise is a comprehensive facility management platform that combines property operations, maintenance workflows, and procurement into one unified solution.

## What You'll Learn

- Navigate the platform interface
- Understand the main modules
- Set up your first property
- Create your first work order
- Manage vendors and suppliers
- Track invoices and payments

## Key Features

- **Properties**: Manage residential and commercial properties
- **Work Orders**: Create, assign, and track maintenance requests
- **Vendors**: Source materials and manage supplier relationships
- **Finance**: Handle invoicing, payments, and reporting
- **Reports**: Comprehensive analytics and insights

## Platform Benefits

✅ Unified dashboard for all operations
✅ Real-time tracking and notifications
✅ Automated workflows and approvals
✅ Comprehensive reporting and analytics
✅ Mobile-friendly interface
✅ Multi-language support

Ready to get started? Click "Next" to begin your journey!
        `,
        tips: [
          "Take your time to explore each section",
          "Use the help widget for quick assistance",
          "Bookmark important pages for easy access",
        ],
      },
      {
        id: "2",
        title: "Understanding the Dashboard",
        description: "Learn about the main dashboard and navigation",
        completed: false,
        content: `
# Understanding the Dashboard

The Fixzit dashboard is your command center for all facility management activities.

## Dashboard Sections

### 1. **Top Navigation Bar**
- Brand logo and search functionality
- Notifications dropdown
- Language selector
- User profile menu

### 2. **Sidebar Navigation**
- **Dashboard**: Overview and key metrics
- **Work Orders**: Maintenance requests and tasks
- **Properties**: Property management
- **Assets**: Equipment and inventory
- **Tenants**: Customer management
- **Vendors**: Supplier network
- **Projects**: Project management
- **RFQs**: Procurement requests
- **Invoices**: Financial management
- **Finance**: Accounting and reporting
- **HR**: Human resources management
- **CRM**: Customer relationship management
- **Support**: Help and support tickets
- **Compliance**: Regulatory requirements
- **Reports**: Analytics and insights
- **System**: Administrative settings

### 3. **Main Content Area**
- Quick actions and shortcuts
- Recent activities and notifications
- Key performance indicators (KPIs)
- Upcoming tasks and deadlines
- System health and status

## Navigation Tips

- Use the sidebar to quickly access different modules
- The search bar helps you find specific items
- Notifications keep you updated on important activities
- The user menu provides access to settings and profile

## Quick Actions

From the dashboard, you can:
- Create new work orders
- Add properties
- Generate reports
- Access support
- Manage user settings

Continue to the next step to learn about properties!
        `,
        tips: [
          "Pin frequently used sections to your favorites",
          "Use keyboard shortcuts for faster navigation",
          "Check notifications regularly for important updates",
        ],
      },
      {
        id: "3",
        title: "Managing Properties",
        description: "Learn how to add and manage properties",
        completed: false,
        content: `
# Managing Properties

Properties are the foundation of Fixzit Enterprise. Learn how to add and manage your properties effectively.

## Adding a New Property

1. **Navigate to Properties**:
   - Click "Properties" in the sidebar
   - Click the "Add Property" button

2. **Basic Information**:
   - **Property Name**: Enter a descriptive name
   - **Type**: Select Commercial, Residential, or Mixed
   - **Address**: Complete address with coordinates
   - **Description**: Detailed property description

3. **Property Details**:
   - **Total Area**: Square footage/meters
   - **Floors**: Number of floors
   - **Units**: Number of units/spaces
   - **Year Built**: Construction year
   - **Occupancy Rate**: Current occupancy percentage

4. **Contact Information**:
   - Property Manager details
   - Emergency contacts
   - Maintenance contacts
   - Security contacts

5. **Features & Amenities**:
   - List available amenities
   - Specify utilities providers
   - Note accessibility features
   - Add any special requirements

## Property Management Features

### **Unit Management**
- Track individual units/apartments
- Monitor occupancy status
- Manage lease agreements
- Handle tenant information

### **Maintenance Tracking**
- Schedule preventive maintenance
- Track work order history
- Monitor equipment warranties
- Plan capital improvements

### **Financial Overview**
- Track rental income
- Monitor operating expenses
- Generate financial reports
- Budget planning tools

## Best Practices

- Keep property information up-to-date
- Regularly update contact information
- Document all maintenance activities
- Maintain accurate financial records
- Use consistent naming conventions

## Next Steps

After adding your properties, you'll be ready to:
- Create work orders for maintenance
- Add tenants and manage leases
- Set up vendor relationships
- Generate financial reports

Ready to learn about work orders? Click "Next"!
        `,
        tips: [
          "Take photos of your properties for documentation",
          "Keep emergency contact information current",
          "Regularly review and update property details",
          "Use the property code for easy identification",
        ],
      },
      {
        id: "4",
        title: "Creating Work Orders",
        description: "Learn how to create and manage work orders",
        completed: false,
        content: `
# Creating Work Orders

Work orders are the backbone of facility maintenance management in Fixzit.

## Creating a Work Order

1. **Access Work Orders**:
   - Navigate to "Work Orders" in the sidebar
   - Click "New Work Order"

2. **Basic Details**:
   - **Title**: Clear, descriptive title
   - **Description**: Detailed problem description
   - **Priority**: Low, Medium, High, or Urgent
   - **Category**: Select appropriate category
   - **Property**: Choose affected property
   - **Location**: Specific location within property

3. **Assignment**:
   - **Assignee**: Select technician or team
   - **Supervisor**: Assign oversight if needed
   - **Due Date**: Set completion deadline
   - **SLA**: Service level agreement requirements

4. **Additional Information**:
   - **Estimated Cost**: Budget for the work
   - **Required Materials**: List needed supplies
   - **Attachments**: Photos, documents, diagrams
   - **Special Instructions**: Any important notes

## Work Order Lifecycle

### **1. New** (Draft)
- Work order created but not submitted
- Can be edited and saved as draft
- Not visible to technicians

### **2. Open** (Active)
- Submitted and assigned to technician
- Visible in technician's queue
- Work in progress tracking begins

### **3. In Progress**
- Technician has started working
- Regular updates and status changes
- Time tracking and material usage

### **4. Pending**
- Waiting for materials or approval
- Requires additional information
- Cannot proceed until resolved

### **5. Completed**
- Work has been finished
- Quality check performed
- Ready for closure and billing

### **6. Closed**
- Work order completed and approved
- Invoice generated if applicable
- Added to property maintenance history

## Priority Levels

- **Low**: Non-urgent maintenance (cosmetic repairs)
- **Medium**: Important but not critical (equipment maintenance)
- **High**: Urgent issues affecting operations
- **Urgent**: Critical issues requiring immediate attention

## Best Practices

- Provide detailed descriptions with photos
- Set realistic due dates and priorities
- Include all necessary materials in the request
- Follow up on work order progress
- Document all work performed
- Rate the quality of completed work

## Tracking and Reporting

- Real-time status updates
- Progress notifications
- Completion reports
- Quality feedback
- Cost tracking
- Performance metrics

Continue to learn about vendor management!
        `,
        tips: [
          "Include photos when creating work orders",
          "Set realistic priorities based on impact",
          "Provide clear instructions to avoid confusion",
          "Follow up on important work orders regularly",
        ],
      },
      {
        id: "5",
        title: "Vendor Management",
        description: "Learn how to work with vendors and suppliers",
        completed: false,
        content: `
# Vendor Management

Effective vendor management is crucial for successful facility operations.

## Adding Vendors

1. **Navigate to Vendors**:
   - Click "Vendors" in the sidebar
   - Click "Add Vendor"

2. **Vendor Information**:
   - **Company Name**: Official business name
   - **Contact Person**: Primary contact details
   - **Services**: List of services provided
   - **Coverage Areas**: Geographic service areas
   - **Response Time**: Average response time
   - **Certifications**: Licenses and certifications

3. **Contact Details**:
   - Primary phone and email
   - Emergency contact information
   - Business address
   - Service hours
   - Preferred communication method

4. **Service Categories**:
   - **Electrical**: Wiring, panels, lighting
   - **Plumbing**: Pipes, fixtures, drainage
   - **HVAC**: Heating, cooling, ventilation
   - **Construction**: Building, renovation, repair
   - **Cleaning**: Janitorial, deep cleaning
   - **Security**: Systems, personnel, monitoring
   - **Landscaping**: Grounds, plants, maintenance
   - **IT Services**: Network, hardware, software

## Vendor Evaluation

### **Performance Metrics**
- Response time to requests
- Work completion rate
- Quality of work performed
- Adherence to schedules
- Communication effectiveness
- Cost competitiveness

### **Rating System**
- 5 Stars: Exceptional service
- 4 Stars: Good service with minor issues
- 3 Stars: Satisfactory service
- 2 Stars: Needs improvement
- 1 Star: Poor service

### **Approval Process**
- **New Vendors**: Require management approval
- **Preferred Vendors**: Fast-track approval
- **Emergency Vendors**: Immediate access

## Request for Quote (RFQ) Process

1. **Create RFQ**:
   - Define project requirements
   - Set budget parameters
   - Specify timeline requirements
   - List technical specifications

2. **Vendor Selection**:
   - Send RFQ to qualified vendors
   - Evaluate proposals and quotes
   - Compare pricing and capabilities
   - Check vendor availability

3. **Contract Management**:
   - Review terms and conditions
   - Negotiate pricing and terms
   - Execute contracts
   - Monitor compliance

4. **Performance Tracking**:
   - Track project milestones
   - Monitor quality standards
   - Manage change orders
   - Process payments

## Best Practices

- Maintain updated vendor database
- Regular performance reviews
- Clear communication expectations
- Document all interactions
- Emergency contact procedures
- Regular vendor meetings
- Performance-based selection
- Competitive bidding processes

## Cost Management

- **Bulk Purchasing**: Combine orders for better pricing
- **Preferred Vendors**: Negotiate volume discounts
- **Seasonal Planning**: Schedule work during off-peak times
- **Preventive Maintenance**: Reduce emergency repair costs
- **Warranty Tracking**: Maximize warranty benefits

Continue to learn about tenant relations!
        `,
        tips: [
          "Keep vendor contact information current",
          "Document all vendor interactions",
          "Rate vendors after each job completion",
          "Maintain emergency vendor contacts",
          "Regularly review vendor performance",
        ],
      },
    ],
  };

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) => new Set([...prev, stepIndex]));
  };

  const localizedTutorial = {
    ...tutorial,
    title: auto(tutorial.title, "tutorial.title"),
    description: auto(tutorial.description, "tutorial.description"),
    duration: auto(tutorial.duration, "tutorial.duration"),
    difficulty: auto(tutorial.difficulty, "tutorial.difficulty"),
    steps: tutorial.steps.map((step) => ({
      ...step,
      title: auto(step.title, `steps.${step.id}.title`),
      description: auto(step.description, `steps.${step.id}.description`),
      content: auto(step.content, `steps.${step.id}.content`),
      tips:
        step.tips?.map((tip, index) =>
          auto(tip, `steps.${step.id}.tips.${index}`),
        ) ?? [],
    })),
  };

  const currentStepData = localizedTutorial.steps[currentStep];
  const progress = ((currentStep + 1) / localizedTutorial.steps.length) * 100;

  // Render markdown content when step changes
  useEffect(() => {
    if (currentStepData?.content) {
      renderMarkdownSanitized(currentStepData.content)
        .then((html) => {
          setRenderedContent(html);
        })
        .catch((err) => {
          logger.error("Failed to render markdown:", { error: err });
          // Safe fallback: escape HTML and preserve whitespace
          setRenderedContent(
            `<div class="whitespace-pre-wrap">${escapeHtml(currentStepData.content)}</div>`,
          );
        });
    }
  }, [currentStep, currentStepData]);

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="max-w-6xl mx-auto p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-primary hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {auto("Back to Help Center", "header.backLink")}
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {localizedTutorial.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {localizedTutorial.duration}
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tutorial.difficulty === "Beginner"
                      ? "bg-success/10 text-success"
                      : tutorial.difficulty === "Intermediate"
                        ? "bg-warning/10 text-warning"
                        : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {localizedTutorial.difficulty}
                </span>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {localizedTutorial.steps.length}{" "}
                  {auto("steps", "header.stepsLabel")}
                </div>
              </div>
            </div>
            <div className="text-end">
              <div className="text-sm text-muted-foreground">
                {auto("Progress", "progress.label")}
              </div>
              <div className="w-32 bg-muted rounded-full h-2 mt-1">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {currentStep + 1} {auto("of", "progress.of")}{" "}
                {localizedTutorial.steps.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-4 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">
                {auto("Tutorial Steps", "sidebar.title")}
              </h3>
              <div className="space-y-2">
                {localizedTutorial.steps.map((step, index) => (
                  <button type="button"
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={`w-full text-start p-3 rounded-2xl border transition-colors ${
                      currentStep === index
                        ? "border-primary bg-primary/10 text-primary"
                        : completedSteps.has(index)
                          ? "border-success bg-success/10 text-success"
                          : "border-border hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {completedSteps.has(index) ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : currentStep === index ? (
                        <Circle className="w-4 h-4 text-primary fill-current" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{step.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
              {/* Step Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {auto("Step {{number}}", "content.stepLabel").replace(
                      "{{number}}",
                      String(currentStep + 1),
                    )}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {currentStepData.title}
                </h2>
                <p className="text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>

              {/* Step Content */}
              <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
                <SafeHtml html={renderedContent} />
              </div>

              {/* Tips */}
              {currentStepData.tips && (
                <div className="mt-8 p-4 bg-primary/10 rounded-2xl">
                  <h4 className="font-semibold text-primary mb-2">
                    💡 {auto("Tips", "content.tipsTitle")}
                  </h4>
                  <ul className="space-y-1">
                    {currentStepData.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-primary text-sm flex items-start gap-2"
                      >
                        <span className="text-primary mt-1">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <button type="button"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← {auto("Previous", "actions.previous")}
                </button>

                <button type="button"
                  onClick={() => markStepComplete(currentStep)}
                  className="flex items-center gap-2 px-4 py-2 bg-success text-white rounded-2xl hover:bg-success transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {auto("Mark Complete", "actions.markComplete")}
                </button>

                <button type="button"
                  onClick={() =>
                    setCurrentStep(
                      Math.min(
                        localizedTutorial.steps.length - 1,
                        currentStep + 1,
                      ),
                    )
                  }
                  disabled={currentStep === localizedTutorial.steps.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {auto("Next", "actions.next")} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
