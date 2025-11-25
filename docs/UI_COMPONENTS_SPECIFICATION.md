# Fixzit UI Components Specification

## 🎯 Header/Topbar Behaviors & Functions

### Global Header (All Pages)

The header should be consistent across ALL pages with the following elements:

#### Left Section

1. **Logo & Brand**
   - Fixzit logo (image)
   - "Fixzit Enterprise" text
   - Clickable to home page

#### Center Section (Desktop Only)

2. **Search Bar**
   - Global search functionality
   - Placeholder: "Search Work Orders, Properties, Tenants..."
   - Search icon on left
   - Hidden on mobile

#### Right Section

3. **Language Dropdown**
   - Single dropdown (NOT two buttons)
   - Shows flag + native name
   - Dropdown contains:
     - 🇬🇧 English (EN) - United Kingdom
     - 🇸🇦 العربية (AR) - المملكة العربية السعودية
   - Type-ahead search in dropdown
   - Persists selection
   - Triggers RTL/LTR change

4. **Currency Selector**
   - Dropdown showing: SAR, AED, USD, EUR, GBP
   - Current selection visible

5. **Notifications Bell**
   - Shows notification count badge
   - Click opens dropdown with recent notifications

6. **Profile Menu**
   - User avatar/icon
   - Dropdown arrow
   - Opens menu with:
     - User name & email
     - Profile
     - Settings
     - Billing
     - Logout

### Page-Specific Header Variations

#### Landing Page Header

- Transparent/glass effect over hero
- Changes to solid on scroll
- CTA buttons: "Login" instead of profile menu

#### Dashboard/Internal Pages Header

- Solid background (--fixzit-blue)
- Full navigation visible
- User is authenticated

## 📊 Sidebar Behaviors & Functions

### Sidebar Structure (Internal Pages Only)

The sidebar appears on:

- Dashboard
- Work Orders
- Properties
- Finance
- HR
- Administration
- CRM
- Marketplace
- Support
- Compliance
- Reports
- System Management

#### Sidebar Elements

1. **Module Navigation**
   - Icons + Labels
   - Active state highlighting
   - Hover effects
   - Collapsible on mobile

2. **Module Order (STRICT)**:

   ```
   Core Operations:
   - 🏠 Dashboard
   - 🔧 Work Orders
   - 🏢 Properties
   - 💰 Finance
   - 👥 Human Resources
   - ⚙️ Administration

   Business Functions:
   - 📊 CRM
   - 🛍️ Marketplace
   - 🎧 Support
   - 🛡️ Compliance & Legal
   - 📈 Reports & Analytics
   - 🔐 System Management
   ```

3. **Sidebar Behaviors**:
   - Fixed position on desktop
   - Drawer/overlay on mobile
   - Active route highlighting
   - Smooth transitions
   - Role-based visibility

## 🦶 Footer Behaviors & Functions

### Global Footer (All Pages)

#### Left Section

1. **Copyright**
   - "© 2025 Fixzit Enterprise"
   - Version number

#### Center Section

2. **Quick Links**
   - Privacy Policy
   - Terms of Service
   - Legal
   - Support
   - Back to Home

#### Right Section

3. **NO Language Toggle** (removed - now in header only)

### Footer Variations

#### Landing Page Footer

- Full width
- Additional sections:
  - Company info
  - Product links
  - Contact info
  - Social media icons

#### Dashboard/Internal Pages Footer

- Minimal version
- Sticky to bottom
- Less prominent

## 🏠 Landing Page Specific Requirements

### Hero Section

1. **Background**: Gradient (--fixzit-blue to --fixzit-green)
2. **Content**:
   - Main title
   - Subtitle
   - **3 CTA Buttons** (per your specification):
     - العربية (Language toggle)
     - Fixzit Souq (Marketplace)
     - Access Fixzit (Login)

### Features Grid Icons

The module cards MUST have icons:

```
🏠 Properties & Units
🔧 Work Orders
💰 Finance & Accounting
🛍️ Marketplace (Souq)
🛡️ Compliance & Legal
📊 Analytics & Reports
```

## 🎨 Visual Consistency Rules

### Colors (Brand Tokens)

```css
--fixzit-blue: #0061a8;
--fixzit-green: #00a859;
--fixzit-yellow: #ffb400;
--fixzit-dark: #023047;
--fixzit-orange: #f6851f;
```

### Typography

- Font: Inter, "Noto Sans Arabic", system fonts
- RTL support with proper font stacks

### Shadows & Effects

- Header: `box-shadow: 0 1px 8px rgba(0,0,0,.15)`
- Cards: `box-shadow: 0 2px 6px rgba(0,0,0,0.1)`
- Hover states: Smooth transitions

## 🔄 State Management

### Persistent States

1. Language preference (localStorage + cookie)
2. Currency selection
3. Sidebar collapsed state
4. Theme preference

### Session States

1. User authentication
2. Notification count
3. Active module/page
4. Search history

## 📱 Responsive Behaviors

### Mobile (< 768px)

- Hamburger menu for sidebar
- Hidden search bar (show on tap)
- Stacked header elements
- Bottom navigation for key modules

### Tablet (768px - 1024px)

- Collapsible sidebar
- Condensed header
- Touch-optimized

### Desktop (> 1024px)

- Full sidebar always visible
- All header elements visible
- Hover states enabled

## ⚠️ Common Issues to Avoid

1. **NO Duplicate Headers/Footers**
   - Use single layout wrapper
   - Consistent across all pages

2. **NO Missing Icons**
   - All modules must have icons
   - Landing page cards need visual elements

3. **NO Multiple Language Buttons**
   - Single dropdown in header only
   - Not in footer or elsewhere

4. **NO Placeholder Text**
   - All content must be real
   - No "Lorem ipsum" or "Coming soon"

5. **NO Broken RTL**
   - UI must flip properly
   - Icons and layout must mirror

This specification ensures consistency across all pages and prevents duplication or missing elements.
