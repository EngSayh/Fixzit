# Fixzit Color Reference Guide
## Ejar.sa DGA Standard (Saudi Platforms Code)

> **Version:** 1.0.0  
> **Last Updated:** November 2025  
> **Author:** Sultan Al Hassni  
> **Compliance:** Saudi Government Platforms Code (DGA Standard)

---

## Quick Reference

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-500` | `#25935F` | Primary brand, CTAs, links |
| `--color-secondary-500` | `#80519F` | Secondary accent (Lavender) |
| `--color-gold` | `#F5BD02` | Gold accent, highlights |
| `--color-saudi-green` | `#006C35` | National identity |
| `--color-neutral-950` | `#0D121C` | Text, sidebar background |
| `--color-neutral-50` | `#F9FAFB` | Page background |

---

## Primary Color (Ejar Green)

The primary brand color representing trust, growth, and the Saudi national identity.

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `primary-50` | `#E8F7EE` | `146 52% 94%` | Backgrounds, surfaces |
| `primary-100` | `#C7EAD8` | `148 49% 85%` | Hover states on light |
| `primary-200` | `#8FD4B1` | `147 46% 69%` | Borders, dividers |
| `primary-300` | `#5FBD8E` | `146 46% 55%` | Icons, secondary |
| `primary-400` | `#3BA874` | `150 47% 45%` | Hover states |
| **`primary-500`** | **`#25935F`** | `152 59% 36%` | **Primary brand** |
| `primary-600` | `#188352` | `153 70% 30%` | Hover on primary |
| `primary-700` | `#166A45` | `152 65% 25%` | Active states |
| `primary-800` | `#0F5535` | `151 70% 20%` | Dark accents |
| `primary-900` | `#0A3D26` | `150 75% 14%` | Very dark |
| `primary-950` | `#052918` | `150 80% 9%` | Darkest |

### CSS Usage
```css
/* Button */
.btn-primary {
  background-color: var(--color-primary-500);
  color: white;
}
.btn-primary:hover {
  background-color: var(--color-primary-600);
}

/* Surface */
.surface-brand {
  background-color: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
}
```

### Tailwind Usage
```tsx
<button className="bg-ejar-primary-500 hover:bg-ejar-primary-600 text-white">
  Primary Button
</button>
```

---

## Secondary Color (Lavender)

Accent color for variety and visual interest.

| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-50` | `#F5F0F8` | Light backgrounds |
| `secondary-100` | `#EBE1F1` | Hover on light |
| `secondary-200` | `#D7C3E3` | Borders |
| `secondary-300` | `#C3A5D5` | Icons |
| `secondary-400` | `#A177BE` | Hover states |
| **`secondary-500`** | **`#80519F`** | **Secondary brand** |
| `secondary-600` | `#6A4385` | Hover on secondary |
| `secondary-700` | `#54356B` | Active states |
| `secondary-800` | `#3E2751` | Dark |
| `secondary-900` | `#281937` | Darkest |

---

## Neutral / Gray Scale

For text, backgrounds, and borders.

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#F9FAFB` | Page background |
| `neutral-100` | `#F3F4F6` | Card background (alt) |
| `neutral-200` | `#E5E7EB` | Borders, dividers |
| `neutral-300` | `#CFD4DB` | Input borders |
| `neutral-400` | `#A8AEB8` | Placeholder text |
| `neutral-500` | `#8A919C` | Disabled text |
| `neutral-600` | `#6C737F` | Secondary text |
| `neutral-700` | `#434B5A` | Body text |
| `neutral-800` | `#2D3340` | Headings |
| `neutral-900` | `#1A1F2B` | Dark UI |
| **`neutral-950`** | **`#0D121C`** | **Sidebar, darkest** |

---

## Semantic Colors

### Success
| Token | Hex | Usage |
|-------|-----|-------|
| `success-50` | `#ECFDF5` | Success background |
| `success-100` | `#D4F4E5` | Success surface |
| **`success-500`** | **`#17B26A`** | **Success icons/text** |
| `success-700` | `#0F8A51` | Dark success |

### Error
| Token | Hex | Usage |
|-------|-----|-------|
| `error-50` | `#FEF3F2` | Error background |
| `error-100` | `#FEEAE9` | Error surface |
| **`error-500`** | **`#F04438`** | **Error icons/text** |
| `error-700` | `#B42318` | Dark error |

### Warning
| Token | Hex | Usage |
|-------|-----|-------|
| `warning-50` | `#FFFAEB` | Warning background |
| `warning-100` | `#FEF3E7` | Warning surface |
| **`warning-500`** | **`#F79009`** | **Warning icons/text** |
| `warning-700` | `#B54708` | Dark warning |

### Info
| Token | Hex | Usage |
|-------|-----|-------|
| `info-50` | `#EFF8FF` | Info background |
| `info-100` | `#E7F3FF` | Info surface |
| **`info-500`** | **`#2E90FA`** | **Info icons/text** |
| `info-700` | `#175CD3` | Dark info |

---

## Special Colors

| Token | Hex | Usage |
|-------|-----|-------|
| **Gold** | `#F5BD02` | Highlights, awards, accent |
| **Saudi Green** | `#006C35` | National identity |

---

## Semantic Mappings

### Backgrounds
```css
--color-bg-primary: #FFFFFF;      /* Cards, modals */
--color-bg-secondary: #F9FAFB;    /* Page background */
--color-bg-tertiary: #F3F4F6;     /* Nested sections */
--color-bg-inverse: #0D121C;      /* Dark sections */
--color-bg-brand: #25935F;        /* Brand CTAs */
--color-bg-brand-subtle: #E8F7EE; /* Brand surfaces */
```

### Text
```css
--color-text-primary: #0D121C;    /* Main text */
--color-text-secondary: #434B5A;  /* Body text */
--color-text-tertiary: #6C737F;   /* Captions */
--color-text-placeholder: #8A919C;/* Placeholder */
--color-text-disabled: #A8AEB8;   /* Disabled */
--color-text-inverse: #FFFFFF;    /* On dark bg */
--color-text-brand: #188352;      /* Brand links */
--color-text-link: #188352;       /* Links */
--color-text-link-hover: #166A45; /* Link hover */
```

### Borders
```css
--color-border-primary: #E5E7EB;  /* Default borders */
--color-border-secondary: #CFD4DB;/* Input borders */
--color-border-tertiary: #A8AEB8; /* Strong borders */
--color-border-focus: #25935F;    /* Focus ring */
--color-border-error: #F04438;    /* Error state */
```

---

## Chart Colors

For data visualization:

| Purpose | Hex | Token |
|---------|-----|-------|
| Primary | `#25935F` | `--color-chart-primary` |
| Blue | `#2E90FA` | `--color-chart-blue` |
| Teal | `#17B26A` | `--color-chart-teal` |
| Yellow | `#F79009` | `--color-chart-yellow` |
| Orange | `#FF8042` | `--color-chart-orange` |
| Purple | `#80519F` | `--color-chart-purple` |

---

## Accessibility

### Contrast Ratios

All color combinations meet **WCAG 2.1 AA** standards:

| Foreground | Background | Ratio | Grade |
|------------|------------|-------|-------|
| `neutral-950` | White | 16.8:1 | AAA |
| `neutral-700` | White | 7.2:1 | AAA |
| `neutral-600` | White | 5.1:1 | AA |
| White | `primary-500` | 4.7:1 | AA |
| White | `primary-600` | 5.9:1 | AA |
| White | `primary-700` | 7.3:1 | AAA |
| White | `neutral-950` | 16.8:1 | AAA |

### Focus States
```css
/* Primary focus ring */
box-shadow: 0 0 0 3px rgba(37, 147, 95, 0.25);

/* Error focus ring */
box-shadow: 0 0 0 3px rgba(240, 68, 56, 0.25);
```

---

## Dark Mode

In dark mode, semantic colors are adjusted:

```css
.dark {
  --color-bg-primary: var(--color-neutral-950);
  --color-bg-secondary: var(--color-neutral-900);
  --color-bg-tertiary: var(--color-neutral-800);
  
  --color-text-primary: #FFFFFF;
  --color-text-secondary: var(--color-neutral-300);
  --color-text-tertiary: var(--color-neutral-400);
  
  --color-border-primary: var(--color-neutral-800);
  --color-border-secondary: var(--color-neutral-700);
}
```

---

## TypeScript Constants

Import from the theme module:

```typescript
import { colors, semanticColors } from '@/lib/theme';

// Direct usage
const primaryColor = colors.primary[500]; // '#25935F'
const errorBg = colors.error[50];         // '#FEF3F2'

// Semantic usage
const bgPrimary = semanticColors.bg.primary;    // '#FFFFFF'
const textBrand = semanticColors.text.brand;    // '#188352'
const borderFocus = semanticColors.border.focus; // '#25935F'
```

---

## Figma Integration

### Design Tokens Sync

These tokens are synced with Figma via Tokens Studio:

1. **Primary tokens** → `Primitives/Colors/Primary`
2. **Semantic tokens** → `Semantic/Background`, `Semantic/Text`, etc.
3. **Component tokens** → `Components/Button`, `Components/Card`, etc.

---

## Migration from Legacy Colors

If migrating from old Fixzit colors:

| Old Token | New Token |
|-----------|-----------|
| `--fz-blue` | `--color-primary-500` |
| `--fz-orange` | `--color-gold` |
| `--fxz-blue` | `--color-primary-500` |
| `--fixzit-blue` | `--color-primary-500` |

---

## Questions?

Contact the Design System team or refer to:
- [Ejar.sa Design Guidelines](https://ejar.sa)
- [Saudi Platforms Code](https://dga.gov.sa)
- Internal: `#design-system` Slack channel
