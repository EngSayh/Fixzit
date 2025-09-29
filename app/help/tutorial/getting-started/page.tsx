'use client';

import { useState } from &apos;react&apos;;
import Link from &apos;next/link&apos;;
import { ArrowLeft, CheckCircle, Circle, Play, BookOpen, ChevronRight, Star, Clock } from &apos;lucide-react&apos;;

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  content: string;
  tips?: string[];
}

export default function GettingStartedTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const tutorial = {
    id: &apos;getting-started&apos;,
    title: &apos;Getting Started with Fixzit FM&apos;,
    description: &apos;Learn the basics of facility management in Fixzit&apos;,
    duration: &apos;15 min&apos;,
    difficulty: &apos;Beginner&apos; as const,
    steps: [
      {
        id: &apos;1',
        title: &apos;Welcome to Fixzit Enterprise&apos;,
        description: &apos;Overview of the platform and its capabilities&apos;,
        completed: false,
        content: `
# Welcome to Fixzit Enterprise

Fixzit Enterprise is a comprehensive facility management platform that combines property operations, maintenance workflows, and procurement into one unified solution.

## What You&apos;ll Learn

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
          &apos;Take your time to explore each section&apos;,
          &apos;Use the help widget for quick assistance&apos;,
          &apos;Bookmark important pages for easy access&apos;
        ]
      },
      {
        id: &apos;2',
        title: &apos;Understanding the Dashboard&apos;,
        description: &apos;Learn about the main dashboard and navigation&apos;,
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
          &apos;Pin frequently used sections to your favorites&apos;,
          &apos;Use keyboard shortcuts for faster navigation&apos;,
          &apos;Check notifications regularly for important updates&apos;
        ]
      },
      {
        id: &apos;3',
        title: &apos;Managing Properties&apos;,
        description: &apos;Learn how to add and manage properties&apos;,
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
          &apos;Take photos of your properties for documentation&apos;,
          &apos;Keep emergency contact information current&apos;,
          &apos;Regularly review and update property details&apos;,
          &apos;Use the property code for easy identification&apos;
        ]
      },
      {
        id: &apos;4',
        title: &apos;Creating Work Orders&apos;,
        description: &apos;Learn how to create and manage work orders&apos;,
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
          &apos;Include photos when creating work orders&apos;,
          &apos;Set realistic priorities based on impact&apos;,
          &apos;Provide clear instructions to avoid confusion&apos;,
          &apos;Follow up on important work orders regularly&apos;
        ]
      },
      {
        id: &apos;5',
        title: &apos;Vendor Management&apos;,
        description: &apos;Learn how to work with vendors and suppliers&apos;,
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
          &apos;Keep vendor contact information current&apos;,
          &apos;Document all vendor interactions&apos;,
          &apos;Rate vendors after each job completion&apos;,
          &apos;Maintain emergency vendor contacts&apos;,
          &apos;Regularly review vendor performance&apos;
        ]
      }
    ]
  };

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]));
  };

  const currentStepData = tutorial.steps[currentStep];
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{tutorial.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {tutorial.duration}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tutorial.difficulty === 'Beginner&apos; ? &apos;bg-green-100 text-green-800&apos; :
                  tutorial.difficulty === &apos;Intermediate&apos; ? &apos;bg-yellow-100 text-yellow-800&apos; :
                  &apos;bg-red-100 text-red-800&apos;
                }`}>
                  {tutorial.difficulty}
                </span>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {tutorial.steps.length} steps
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {currentStep + 1} of {tutorial.steps.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tutorial Steps</h3>
              <div className="space-y-2">
                {tutorial.steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      currentStep === index
                        ? 'border-blue-500 bg-blue-50 text-blue-700&apos;
                        : completedSteps.has(index)
                        ? &apos;border-green-500 bg-green-50 text-green-700&apos;
                        : &apos;border-gray-200 hover:border-gray-300&apos;
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {completedSteps.has(index) ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : currentStep === index ? (
                        <Circle className="w-4 h-4 text-blue-600 fill-current" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{step.title}</div>
                        <div className="text-xs text-gray-500">{step.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              {/* Step Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Step {currentStep + 1}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentStepData.title}</h2>
                <p className="text-gray-600">{currentStepData.description}</p>
              </div>

              {/* Step Content */}
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {currentStepData.content}
                </div>
              </div>

              {/* Tips */}
              {currentStepData.tips && (
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
                  <ul className="space-y-1">
                    {currentStepData.tips.map((tip, index) => (
                      <li key={index} className="text-blue-800 text-sm flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                <button
                  onClick={() => markStepComplete(currentStep)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>

                <button
                  onClick={() => setCurrentStep(Math.min(tutorial.steps.length - 1, currentStep + 1))}
                  disabled={currentStep === tutorial.steps.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
