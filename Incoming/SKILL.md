---
name: fixzit-souq-frontend
description: |
  Frontend development skill for Fixzit Souq - a facility management platform.
  Use when working on the Fixzit Souq codebase, especially for:
  - Superadmin panel enhancements
  - Issue tracker improvements
  - Dashboard components
  - RTL-first Arabic/English interfaces
  - ZATCA-compliant financial interfaces
---

# Fixzit Souq Frontend Development Skill

## Project Context

Fixzit Souq is a comprehensive facility management platform for Saudi Arabia with:
- 13 core modules (Work Orders, Properties, Finance, HR, CRM, etc.)
- 14 user roles with RBAC
- Arabic/English with RTL support
- Hijri/Gregorian calendar support
- ZATCA e-invoicing compliance
- Multi-tenant architecture

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with RTL support
- **State**: Zustand + React Query/TanStack Query
- **UI Components**: shadcn/ui + Radix primitives
- **Database**: MongoDB with Mongoose
- **Auth**: JWT with refresh tokens
- **Real-time**: WebSockets

## Design System

### Brand Colors (MUST USE)
```css
--fixzit-blue: #0061A8;
--fixzit-dark-blue: #023047;
--fixzit-orange: #F6851F;
--fixzit-green: #00A859;
--fixzit-yellow: #FFB400;
```

### Typography
- **Headings**: Inter or IBM Plex Sans Arabic
- **Body**: System UI with Arabic fallbacks
- **Monospace**: JetBrains Mono (for IDs, codes)

### Dark Theme (Primary)
```css
--background: #0a0a0a;
--card: #1a1a1a;
--card-hover: #252525;
--border: #2a2a2a;
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
```

## Frontend Aesthetics Guidelines

<frontend_aesthetics>
CRITICAL: Avoid generic "AI slop" aesthetics. Create distinctive, professional interfaces.

Focus on:
- **Typography**: Use Inter for Latin, IBM Plex Sans Arabic for Arabic. Never use generic system fonts.
- **Color & Theme**: Commit to the Fixzit brand palette. Use CSS variables. Blue (#0061A8) as primary, Orange (#F6851F) for CTAs.
- **Motion**: Subtle animations on state changes. Use framer-motion or CSS transitions. 150-300ms durations.
- **Backgrounds**: Dark gradients with subtle noise texture. Layer depth with shadows.
- **Data Density**: Admin panels should be information-rich but not cluttered.

Avoid:
- Purple gradients (not in brand)
- Excessive rounded corners (use rounded-md max)
- Cookie-cutter dashboard layouts
- Light mode by default (Fixzit is dark-first)
</frontend_aesthetics>

## Component Patterns

### Data Tables
```tsx
// Always use TanStack Table for admin panels
// Include: sorting, filtering, column visibility, row selection
// Add hover actions, inline editing capability
// Support RTL column order

const columns = [
  { accessorKey: 'id', header: 'ID', cell: MonospaceCell },
  { accessorKey: 'priority', header: 'Priority', cell: PriorityBadge },
  { accessorKey: 'title', header: 'Title', cell: TitleWithIcon },
  { accessorKey: 'status', header: 'Status', cell: StatusBadge },
  { accessorKey: 'actions', header: '', cell: RowActions },
];
```

### Priority Badges
```tsx
// P0 Critical: Red with pulse animation
// P1 High: Orange 
// P2 Medium: Yellow
// P3 Low: Blue
// Always include visual icon + text for accessibility
```

### Status Badges
```tsx
// Open: Yellow/amber outline
// In Progress: Blue filled
// Resolved: Green filled
// Blocked: Red outline with pattern
// Stale: Gray with warning icon
```

### Loading States
```tsx
// ALWAYS use skeleton loading, never spinners for tables
// Match skeleton to actual content layout
// Animate with shimmer effect
// Show 5-8 skeleton rows for tables
```

### Empty States
```tsx
// Include: Relevant illustration, Clear message, Primary action
// Use Fixzit illustrations style
// Never show blank white space
```

## RTL Support Requirements

```tsx
// Use logical properties always
// ❌ padding-left: 16px
// ✅ padding-inline-start: 16px

// Tailwind RTL classes
// ❌ pl-4 ml-2 text-left
// ✅ ps-4 ms-2 text-start

// Icons that need flipping
// Arrows, chevrons, sliders need RTL transform
// Numbers, checkmarks do NOT flip
```

## API Patterns

### Server Actions (Next.js 14)
```tsx
'use server'

export async function updateIssueStatus(
  issueId: string, 
  status: IssueStatus
): Promise<ActionResult<Issue>> {
  // Validate with Zod
  // Check permissions
  // Update MongoDB
  // Revalidate path
  // Return typed result
}
```

### Error Handling
```tsx
// Always return typed results
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode };

// Show toast on error, don't crash
// Log errors to monitoring
```

## Keyboard Shortcuts (Required)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Command palette |
| `Cmd/Ctrl + /` | Toggle sidebar |
| `Cmd/Ctrl + N` | New issue |
| `Cmd/Ctrl + F` | Focus search |
| `Cmd/Ctrl + E` | Export |
| `Escape` | Close modals/panels |
| `J/K` | Navigate rows |
| `Enter` | Open selected |
| `Space` | Toggle selection |

## File Naming Conventions

```
components/
├── IssueTable.tsx         # PascalCase for components
├── issue-table.types.ts   # kebab-case for non-components
├── use-issue-selection.ts # kebab-case with use- prefix for hooks
└── index.ts               # barrel exports
```

## Testing Requirements

- Unit tests with Vitest
- Component tests with React Testing Library
- E2E tests with Playwright
- Test Arabic/RTL rendering
- Test keyboard navigation
- Test responsive breakpoints

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cumulative Layout Shift: < 0.1
- Bundle size per route: < 200KB
- Table scroll: 60fps

## Common Mistakes to Avoid

1. ❌ Using `left`/`right` instead of `start`/`end`
2. ❌ Hardcoding Arabic strings (use i18n)
3. ❌ Spinner loading in tables
4. ❌ Missing keyboard navigation
5. ❌ Forgetting to revalidate after mutations
6. ❌ Using client components unnecessarily
7. ❌ Not handling loading/error states
8. ❌ Ignoring mobile responsiveness
9. ❌ Using Hijri dates incorrectly
10. ❌ Missing ARIA labels for icons

## Examples

### Good Component Structure
```tsx
// components/superadmin/IssueRow.tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Issue } from '@/types';

interface IssueRowProps {
  issue: Issue;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onQuickAction: (action: string, id: string) => void;
}

export function IssueRow({ 
  issue, 
  isSelected, 
  onSelect, 
  onQuickAction 
}: IssueRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'group transition-colors duration-150',
        'hover:bg-card-hover',
        isSelected && 'bg-fixzit-blue/10'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="row"
      aria-selected={isSelected}
    >
      {/* Row content */}
    </motion.tr>
  );
}
```

### Good Server Action
```tsx
// app/actions/issues.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { Issue } from '@/models/Issue';

const UpdateStatusSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(['open', 'in_progress', 'resolved', 'blocked']),
});

export async function updateIssueStatus(formData: FormData) {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = UpdateStatusSchema.safeParse({
    issueId: formData.get('issueId'),
    status: formData.get('status'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  try {
    await Issue.findByIdAndUpdate(parsed.data.issueId, {
      status: parsed.data.status,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    });

    revalidatePath('/superadmin/issues');
    return { success: true };
  } catch (error) {
    console.error('Failed to update issue:', error);
    return { success: false, error: 'Database error' };
  }
}
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TanStack Table](https://tanstack.com/table)
- [Framer Motion](https://www.framer.com/motion/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind RTL](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)

