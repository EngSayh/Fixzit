# Fixzit Component Storybook Guide

## Overview

This guide documents the Fixzit component library and provides guidance for visual component development, testing, and documentation using Storybook patterns.

> **Note**: Full Storybook integration is planned for future sprints. This document serves as the component catalog and development guidelines.

---

## Component Library Structure

```
components/
├── ui/                     # Base UI primitives (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── table.tsx
│   └── ...
├── common/                 # Shared business components
│   ├── PageHeader.tsx
│   ├── DataTable.tsx
│   ├── StatusBadge.tsx
│   ├── LoadingSpinner.tsx
│   └── ...
├── auth/                   # Authentication components
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   ├── OTPInput.tsx
│   └── ...
├── dashboard/              # Dashboard widgets
│   ├── StatCard.tsx
│   ├── RecentActivity.tsx
│   ├── QuickActions.tsx
│   └── ...
├── work-orders/            # Work order components
│   ├── WorkOrderCard.tsx
│   ├── WorkOrderForm.tsx
│   ├── WorkOrderTimeline.tsx
│   └── ...
├── properties/             # Property management
│   ├── PropertyCard.tsx
│   ├── UnitList.tsx
│   ├── TenantInfo.tsx
│   └── ...
├── finance/                # Finance module
│   ├── InvoiceTable.tsx
│   ├── PaymentForm.tsx
│   ├── BudgetChart.tsx
│   └── ...
├── hr/                     # HR module
│   ├── EmployeeCard.tsx
│   ├── LeaveRequestForm.tsx
│   ├── PayrollTable.tsx
│   └── ...
├── souq/                   # Marketplace components
│   ├── ProductCard.tsx
│   ├── CartSummary.tsx
│   ├── SellerDashboard.tsx
│   └── ...
└── aqar/                   # Real estate components
    ├── PropertyListing.tsx
    ├── SearchFilters.tsx
    ├── MapView.tsx
    └── ...
```

---

## Base UI Components (shadcn/ui)

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email" 
    placeholder="email@example.com"
    disabled={false}
  />
</div>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description text
      </DialogDescription>
    </DialogHeader>
    <div>Dialog body content</div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Work Order #123</TableCell>
      <TableCell><StatusBadge status="open" /></TableCell>
      <TableCell className="text-right">SAR 500</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Business Components

### StatusBadge

```tsx
import { StatusBadge } from "@/components/common/StatusBadge";

// Work Order Status
<StatusBadge status="open" />        // 🟡 Yellow
<StatusBadge status="assigned" />    // 🔵 Blue
<StatusBadge status="in_progress" /> // 🟠 Orange
<StatusBadge status="completed" />   // 🟢 Green
<StatusBadge status="cancelled" />   // 🔴 Red

// Payment Status
<StatusBadge status="pending" type="payment" />
<StatusBadge status="paid" type="payment" />
<StatusBadge status="overdue" type="payment" />
```

### PageHeader

```tsx
import { PageHeader } from "@/components/common/PageHeader";

<PageHeader
  title="Work Orders"
  description="Manage maintenance requests and service orders"
  actions={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      New Work Order
    </Button>
  }
  breadcrumbs={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Work Orders", href: "/work-orders" },
  ]}
/>
```

### DataTable

```tsx
import { DataTable } from "@/components/common/DataTable";

<DataTable
  columns={columns}
  data={workOrders}
  searchKey="title"
  searchPlaceholder="Search work orders..."
  pagination={{
    page: 1,
    pageSize: 20,
    total: 150,
  }}
  onPageChange={(page) => setPage(page)}
  loading={isLoading}
  emptyState={
    <EmptyState
      icon={<ClipboardList />}
      title="No work orders"
      description="Create your first work order to get started"
      action={<Button>Create Work Order</Button>}
    />
  }
/>
```

### LoadingSpinner

```tsx
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

// Sizes
<LoadingSpinner size="sm" />   // 16px
<LoadingSpinner size="md" />   // 24px (default)
<LoadingSpinner size="lg" />   // 32px
<LoadingSpinner size="xl" />   // 48px

// Full page loading
<LoadingSpinner fullPage text="Loading..." />
```

---

## Form Components

### Standard Form Pattern

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "emergency"]),
});

function WorkOrderForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Handle form submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter title" {...field} />
              </FormControl>
              <FormDescription>
                Brief description of the work order
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## Module-Specific Components

### Work Orders

| Component | Description | Props |
|-----------|-------------|-------|
| `WorkOrderCard` | Card display of a work order | `workOrder`, `onView`, `onEdit` |
| `WorkOrderForm` | Create/edit form | `initialData?`, `onSubmit`, `loading` |
| `WorkOrderTimeline` | Activity timeline | `activities`, `loading` |
| `WorkOrderAssignment` | Vendor assignment UI | `workOrderId`, `vendors`, `onAssign` |
| `WorkOrderStatus` | Status badge with dropdown | `status`, `onChange`, `readonly` |

### Finance

| Component | Description | Props |
|-----------|-------------|-------|
| `InvoiceTable` | List of invoices | `invoices`, `onView`, `onPay` |
| `PaymentForm` | Payment processing | `invoice`, `onSubmit`, `gateways` |
| `BudgetChart` | Budget visualization | `data`, `type`, `period` |
| `ExpenseCard` | Expense summary | `expense`, `onApprove`, `onReject` |
| `ReceiptUploader` | Receipt attachment | `onUpload`, `maxSize`, `accept` |

### HR

| Component | Description | Props |
|-----------|-------------|-------|
| `EmployeeCard` | Employee profile card | `employee`, `compact?` |
| `LeaveCalendar` | Leave schedule view | `leaves`, `onSelect` |
| `PayrollTable` | Payroll summary | `payroll`, `period` |
| `AttendanceTracker` | Check-in/out UI | `employee`, `onCheckIn`, `onCheckOut` |
| `DocumentUploader` | HR document upload | `type`, `employee`, `onUpload` |

---

## Theme & Styling

### Color Palette

```css
/* Brand Colors */
--primary: 222.2 47.4% 11.2%;      /* Deep blue-gray */
--primary-foreground: 210 40% 98%; /* White */

/* Status Colors */
--success: 142.1 76.2% 36.3%;      /* Green */
--warning: 45.4 93.4% 47.5%;       /* Amber */
--destructive: 0 84.2% 60.2%;      /* Red */
--info: 199.4 95.5% 53.8%;         /* Blue */

/* Neutral */
--background: 0 0% 100%;
--foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;
```

### Typography

```tsx
// Headings
<h1 className="text-3xl font-bold">Page Title</h1>
<h2 className="text-2xl font-semibold">Section Title</h2>
<h3 className="text-xl font-medium">Subsection</h3>

// Body
<p className="text-base">Regular text</p>
<p className="text-sm text-muted-foreground">Secondary text</p>
<p className="text-xs">Small text</p>

// Special
<code className="font-mono text-sm">code</code>
```

### Spacing

```tsx
// Standard spacing scale (Tailwind)
// 0: 0px, 1: 4px, 2: 8px, 3: 12px, 4: 16px, 5: 20px, 6: 24px, 8: 32px

// Component spacing
<div className="space-y-4">   {/* 16px vertical gap */}
<div className="space-x-2">   {/* 8px horizontal gap */}
<div className="gap-6">       {/* 24px grid gap */}

// Page layout
<div className="p-6">         {/* 24px padding */}
<div className="py-4 px-6">   {/* 16px vertical, 24px horizontal */}
```

---

## Accessibility Guidelines

### Keyboard Navigation

All interactive components must support:
- `Tab` - Move focus forward
- `Shift+Tab` - Move focus backward
- `Enter/Space` - Activate buttons/links
- `Escape` - Close dialogs/dropdowns
- `Arrow keys` - Navigate within groups

### ARIA Labels

```tsx
// Buttons with icons
<Button aria-label="Add new work order">
  <Plus className="h-4 w-4" />
</Button>

// Form inputs
<Input 
  aria-label="Search work orders"
  aria-describedby="search-hint"
/>
<span id="search-hint" className="sr-only">
  Enter keywords to search
</span>

// Status indicators
<StatusBadge 
  status="completed"
  aria-label="Status: Completed"
/>
```

### Color Contrast

- Text on background: minimum 4.5:1 ratio
- Large text (18px+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio against adjacent colors

---

## RTL Support

All components support Right-to-Left (RTL) layout for Arabic:

```tsx
// Auto-detected from locale
import { useDirection } from "@/hooks/useDirection";

function Component() {
  const dir = useDirection(); // "ltr" or "rtl"
  
  return (
    <div dir={dir} className="flex gap-4">
      {/* Flex direction auto-flips in RTL */}
    </div>
  );
}
```

### RTL-Safe Classes

```css
/* Use logical properties */
.ps-4    /* padding-start (left in LTR, right in RTL) */
.pe-4    /* padding-end */
.ms-4    /* margin-start */
.me-4    /* margin-end */
.start-0 /* left in LTR, right in RTL */
.end-0   /* right in LTR, left in RTL */
```

---

## Future: Full Storybook Setup

When Storybook is fully integrated, stories will follow this pattern:

```tsx
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg", "icon"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "Button",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};
```

### Installation (Future)

```bash
# Install Storybook
pnpm add -D @storybook/react @storybook/nextjs

# Initialize
pnpm storybook init

# Run Storybook
pnpm storybook
```

---

## Component Testing

### Unit Tests

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText("Disabled")).toBeDisabled();
  });
});
```

### Visual Regression (Future)

With Storybook Chromatic integration:
```bash
pnpm chromatic --project-token=$CHROMATIC_TOKEN
```

---

## Contributing New Components

1. Create component in appropriate directory
2. Export from directory index
3. Add unit tests
4. Add to this documentation
5. (Future) Add Storybook story

**Checklist:**
- [ ] TypeScript types for all props
- [ ] Default props where appropriate
- [ ] Keyboard accessible
- [ ] ARIA labels for screen readers
- [ ] RTL support
- [ ] Responsive design
- [ ] Theme-aware (light/dark)
- [ ] Unit tests
- [ ] Documentation

---

**Last Updated**: 2025-12-11  
**Maintainer**: Engineering Team
