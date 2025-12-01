# Components Directory

## 📋 Overview

This directory contains all reusable React components for the Fixzit application organized by feature and purpose.

## 📁 Structure

```
components/
├── auth/               # Authentication components (LoginForm, LoginHeader, etc.)
├── topbar/            # TopBar submodules (AppSwitcher, GlobalSearch, QuickActions)
├── ui/                # Shadcn UI components (Button, Dialog, Input, etc.)
├── i18n/              # Internationalization components (LanguageSelector)
├── admin/             # Admin panel components (UpgradeModal, etc.)
├── aqar/              # Real estate marketplace components
├── marketplace/       # General marketplace components
├── careers/           # Career/recruitment components
├── fm/                # Facility Management components
├── forms/             # Form-related components
├── accessibility/     # Accessibility testing components
├── __tests__/         # Component tests
├── TopBar.tsx         # Main navigation bar
├── Sidebar.tsx        # Side navigation
├── Footer.tsx         # Page footer
├── ClientLayout.tsx   # Client-side layout wrapper
├── ErrorBoundary.tsx  # Error handling component
└── [Other shared components]
```

## 🎯 Key Components

### Navigation

- **TopBar.tsx** - Main navigation bar with app switcher, search, and user menu
- **Sidebar.tsx** - Collapsible side navigation with role-based menu items
- **Footer.tsx** - Page footer with links and company info
- **ClientLayout.tsx** - Wraps pages with TopBar, Sidebar, and Footer

### Authentication

See [auth/README.md](./auth/README.md) for detailed authentication component documentation.

- **LoginPrompt.tsx** - Inline prompt for unauthenticated users
- **auth/LoginForm.tsx** - Main login form
- **auth/LoginHeader.tsx** - Login page branding
- **auth/LoginFooter.tsx** - Login page footer
- **auth/LoginSuccess.tsx** - Post-login success screen

### Core Utilities

- **ErrorBoundary.tsx** - Catches and displays React errors gracefully
- **SystemVerifier.tsx** - System health monitoring component
- **Portal.tsx** - React portal for modals and overlays
- **AIChat.tsx** - Copilot AI chat widget
- **CopilotWidget.tsx** - Copilot integration component

### Forms

- **forms/** - Reusable form components and utilities

### UI Components

- **ui/** - Shadcn UI component library (Button, Dialog, Input, Select, etc.)

## 🔧 Usage Guidelines

### Importing Components

```typescript
// Import from root components/
import { TopBar } from "@/components/TopBar";
import { ClientLayout } from "@/components/ClientLayout";

// Import from subdirectories
import { LoginForm } from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
```

### Component Conventions

1. **PascalCase** for component files: `TopBar.tsx`, `LoginForm.tsx`
2. **kebab-case** for UI library components: `button.tsx`, `dialog.tsx`
3. **Colocation** - Place related components in feature directories
4. **Tests** - Place in `__tests__/` with `.test.tsx` extension

### Creating New Components

```typescript
// components/MyComponent.tsx
'use client'; // If component uses client-side hooks

import { useTranslation } from '@/contexts/TranslationContext';

export default function MyComponent() {
  const t = useTranslation();

  return (
    <div>
      <h1>{t('myComponent.title', 'Default Title')}</h1>
    </div>
  );
}
```

## 🧪 Testing

Component tests are located in `__tests__/` subdirectories. Run tests with:

```bash
pnpm test
```

## 📚 Related Documentation

- [Auth Components](./auth/README.md) - Authentication component documentation
- [UI Components](./ui/) - Shadcn UI component library
- [TopBar Testing Guide](../docs/guides/TOPBAR_TESTING_GUIDE.md)
- [Form Save Events](../docs/archived/FORM_SAVE_EVENTS.md)

## 🎨 Styling

Components use:

- **Tailwind CSS** for utility-first styling
- **CSS Modules** for scoped styles when needed
- **Semantic tokens** from design system

## 🌍 Internationalization

Most components support i18n via `useTranslation()` hook:

```typescript
const t = useTranslation();
const text = t("key.path", "Default text");
```

## ♿ Accessibility

- All interactive components should have proper ARIA labels
- Keyboard navigation must be supported
- Focus management for modals and dialogs
- See `accessibility/` folder for testing utilities

## 📦 Dependencies

Key dependencies:

- `react` - UI framework
- `next` - React framework
- `lucide-react` - Icon library
- `@radix-ui/*` - Headless UI primitives
- `tailwindcss` - Utility-first CSS

## 🚀 Best Practices

1. **Keep components small** - Single responsibility principle
2. **Use TypeScript** - Proper type definitions
3. **Document props** - JSDoc comments for component interfaces
4. **Handle errors** - Use ErrorBoundary for error handling
5. **Optimize performance** - Use React.memo for expensive renders
6. **Accessibility first** - ARIA labels and keyboard support

---

**Last Updated:** 2025-11-01  
**Maintained by:** Fixzit Development Team
