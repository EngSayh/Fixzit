# Fixzit Design System

> Based on **Ejar.sa** (Saudi Government Platforms Code)  
> RTL-First Arabic Support for **Next.js 14 + Tailwind CSS**

---

## 📦 Package Contents

```
fixzit-theme/
├── tailwind.config.ts      # Full Tailwind configuration
├── globals.css             # CSS custom properties & base styles
├── theme.constants.ts      # TypeScript theme constants
├── fonts.config.ts         # Next.js Google Fonts setup
├── COLOR-REFERENCE.md      # Quick color reference chart
└── README.md               # This file
```

---

## 🚀 Installation

### Step 1: Install Dependencies

```bash
# Required Tailwind plugins
npm install -D @tailwindcss/forms @tailwindcss/typography @tailwindcss/container-queries

# Optional: RTL plugin
npm install -D tailwindcss-rtl
```

### Step 2: Copy Theme Files

```bash
# Copy to your project
cp tailwind.config.ts /path/to/your-project/
cp globals.css /path/to/your-project/app/
cp theme.constants.ts /path/to/your-project/lib/
cp fonts.config.ts /path/to/your-project/lib/
```

### Step 3: Update Your Layout

```tsx
// app/[locale]/layout.tsx
import { fontVariables } from '@/lib/fonts.config';
import '@/app/globals.css';

export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  
  return (
    <html 
      lang={locale} 
      dir={dir}
      className={fontVariables}
    >
      <body className="font-sans antialiased bg-neutral-50 text-neutral-950">
        {children}
      </body>
    </html>
  );
}
```

---

## 🎨 Color Palette Overview

### Primary (Ejar Green)
- **Main:** `#25935F` → `bg-primary-500`
- **Hover:** `#188352` → `bg-primary-600`
- **Active:** `#166A45` → `bg-primary-700`

### Secondary (Lavender)
- **Main:** `#80519F` → `bg-secondary-500`

### Semantic Colors
- **Success:** `#17B26A` → `text-success-500`
- **Error:** `#F04438` → `text-error-500`
- **Warning:** `#F79009` → `text-warning-500`
- **Info:** `#2E90FA` → `text-info-500`

### Special
- **Gold:** `#F5BD02` → `text-gold`
- **Saudi Green:** `#006C35` → `text-saudi-green`

---

## 🔤 Typography

### Font Families

| Purpose | Font | Variable |
|---------|------|----------|
| Arabic Body | IBM Plex Sans Arabic | `--font-ibm-plex-arabic` |
| English Body | IBM Plex Sans | `--font-ibm-plex-sans` |
| Headings | Inter | `--font-inter` |
| Fallback Arabic | Tajawal | `--font-tajawal` |
| Code | IBM Plex Mono | `--font-ibm-plex-mono` |

### Usage in Tailwind

```html
<!-- Default (uses Arabic-first stack) -->
<p class="font-sans">مرحبا / Hello</p>

<!-- Explicit Arabic -->
<p class="font-arabic">مرحبا بكم</p>

<!-- Explicit English -->
<p class="font-english">Welcome</p>

<!-- Headings -->
<h1 class="font-heading">Title</h1>

<!-- Code -->
<code class="font-mono">const x = 1;</code>
```

---

## 📐 Usage Examples

### Buttons

```tsx
// Primary Button
<button className="btn btn-primary">
  إرسال / Submit
</button>

// Secondary Button
<button className="btn btn-secondary">
  إلغاء / Cancel
</button>

// Outline Button
<button className="btn btn-outline">
  المزيد / More
</button>

// With Tailwind classes directly
<button className="
  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
  text-white font-semibold
  px-6 py-3 rounded-md
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-primary-500/25
">
  Custom Button
</button>
```

### Cards

```tsx
<div className="card">
  <h3 className="text-xl font-bold text-neutral-900">
    عنوان البطاقة
  </h3>
  <p className="text-neutral-700 mt-2">
    محتوى البطاقة هنا
  </p>
</div>

// Or with Tailwind classes
<div className="
  bg-white 
  border border-neutral-200 
  rounded-lg 
  shadow-card 
  hover:shadow-card-hover
  p-6
  transition-shadow duration-200
">
  Content
</div>
```

### Form Inputs

```tsx
<label className="label">البريد الإلكتروني</label>
<input 
  type="email" 
  className="input" 
  placeholder="example@domain.com"
/>
<p className="helper-text">أدخل بريدك الإلكتروني</p>

// Error state
<input className="input input-error" />
<p className="helper-text helper-text-error">هذا الحقل مطلوب</p>
```

### Badges

```tsx
<span className="badge badge-success">نشط / Active</span>
<span className="badge badge-error">معلق / Suspended</span>
<span className="badge badge-warning">قيد المراجعة / Pending</span>
<span className="badge badge-info">جديد / New</span>
```

---

## 🌐 RTL Support

The theme is **RTL-first** with automatic direction handling.

### Using RTL utilities

```html
<!-- Auto-flip icons in RTL -->
<svg className="flip-rtl">...</svg>

<!-- Logical margin/padding -->
<div className="ms-4 me-auto">
  <!-- ms = margin-start, me = margin-end -->
</div>

<!-- Text alignment follows direction -->
<p className="text-start">Right in RTL, Left in LTR</p>
<p className="text-end">Left in RTL, Right in LTR</p>
```

### Direction-aware layouts

```tsx
// This flexbox will reverse direction in RTL automatically
<div className="flex flex-row">
  <div>First (Right in RTL)</div>
  <div>Second (Left in RTL)</div>
</div>
```

---

## 📱 Responsive Design

### Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| `xs` | 475px | Large phones |
| `sm` | 640px | Tablets (portrait) |
| `md` | 768px | Tablets (landscape) |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Example

```tsx
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  lg:grid-cols-3 
  xl:grid-cols-4 
  gap-4 
  md:gap-6 
  lg:gap-8
">
  {items.map(item => (
    <Card key={item.id} />
  ))}
</div>
```

---

## 🌙 Dark Mode

Enable dark mode by adding the `dark` class to `<html>`:

```tsx
<html className="dark">
```

Colors automatically adjust. You can also use dark variants:

```tsx
<div className="bg-white dark:bg-neutral-900">
  <p className="text-neutral-950 dark:text-white">
    Content
  </p>
</div>
```

---

## 🔧 Using Theme Constants in Code

```tsx
import { colors, spacing, typography, shadows } from '@/lib/theme.constants';

// In styled-components or inline styles
const customStyle = {
  backgroundColor: colors.primary[500],
  padding: spacing[4],
  fontSize: typography.fontSize.md,
  boxShadow: shadows.card,
};

// In conditional rendering
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return colors.success[500];
    case 'error': return colors.error[500];
    case 'pending': return colors.warning[500];
    default: return colors.neutral[500];
  }
};
```

---

## 📚 Files Reference

### `tailwind.config.ts`
Complete Tailwind configuration with all design tokens.

### `globals.css`
- CSS custom properties (design tokens)
- Base layer styles
- Component layer (`.btn`, `.card`, `.input`, `.badge`)
- Utility layer (RTL helpers, scrollbar, etc.)

### `theme.constants.ts`
TypeScript constants for programmatic access to all theme values.

### `fonts.config.ts`
Next.js font configuration with proper preloading.

### `COLOR-REFERENCE.md`
Quick reference chart for all colors with hex codes and Tailwind classes.

---

## 📋 Checklist for New Projects

- [ ] Install Tailwind CSS plugins
- [ ] Copy `tailwind.config.ts`
- [ ] Copy `globals.css` and import in layout
- [ ] Copy `fonts.config.ts` and set up fonts in layout
- [ ] Copy `theme.constants.ts` for programmatic access
- [ ] Set up RTL middleware (if using i18n)
- [ ] Configure dark mode toggle (optional)

---

## 🤝 Support

For questions or issues related to this design system, refer to:
- [Ejar.sa](https://ejar.sa) - Original design reference
- [Saudi DGA Platforms Code](https://design.dga.gov.sa) - Official design system
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Tailwind documentation

---

**Created for Fixzit Platform**  
**Based on Ejar.sa Design System**  
**Sultan Al Hassni © 2025**
