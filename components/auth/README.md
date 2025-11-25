# Authentication Components

This directory contains reusable UI components for authentication flows.

## Components

### `LoginHeader.tsx`

**Purpose:** Branded header for login page (logo + title)  
**Used by:** `app/login/page.tsx`  
**Features:**

- Displays app logo
- Shows localized welcome message
- RTL layout support

---

### `LoginForm.tsx`

**Purpose:** Main login form for email/password credentials  
**Used by:** `app/login/page.tsx`  
**Features:**

- Email/Employee Number & password credential login
- Robust client-side validation and error handling
- `rememberMe` functionality
- Redirects to dashboard on success

**Dependencies:**

- `next-auth/react` - `signIn` function
- `components/ui/button` - Button component
- `components/ui/input` - Input fields
- `contexts/TranslationContext` - i18n support

---

### `SSOButtons.tsx`

**Purpose:** Renders a divider and all configured SSO (OAuth) provider buttons  
**Used by:** `app/login/page.tsx`  
**Features:**

- Displays "Or continue with" localized divider
- Acts as a container for one or more SSO buttons
- RTL layout support

---

### `GoogleSignInButton.tsx`

**Purpose:** A self-contained button to initiate the Google OAuth flow  
**Used by:** `components/auth/SSOButtons.tsx`  
**Features:**

- Renders the Google brand icon and localized text
- Handles `signIn('google')` flow
- Manages its own loading and error states

---

### `LoginFooter.tsx`

**Purpose:** Footer with "Request a Demo" and "Back to Home" links  
**Used by:** `app/login/page.tsx`  
**Features:**

- Localized footer links
- "Request a Demo" link for new enterprise leads
- "Back to Home" link with RTL-aware arrow

---

### `LoginSuccess.tsx`

**Purpose:** Post-login success screen with loading state  
**Used by:** `app/login/page.tsx` (or parent logic)  
**Features:**

- Success message display
- Animated loading indicator
- Shown briefly before auto-redirect

---

### `LoginPrompt.tsx`

**Purpose:** Inline prompt for unauthenticated users viewing protected content  
**Used by:** Marketplace/Aqar Souq components (e.g., "Save" button)  
**Features:**

- Lightweight auth check using `useSession`
- "Sign in to continue" message
- Link to `/login` page

**Dependencies:**

- `next-auth/react` - `useSession` hook
- `next/link` - Navigation
- `contexts/TranslationContext` - i18n

---

## Flow Diagram

```
User visits /login
    ↓
LoginHeader (branding)
    ↓
LoginForm (email/password)
    ↓
SSOButtons (divider + OAuth)
    ↓
LoginFooter (links)

--- (On Form Submit) ---
    ↓
    ├─ Success → LoginSuccess → redirect to /dashboard
    └─ Error → Show error message in LoginForm
```

## Usage Examples

### Main Login Page

```tsx
// app/login/page.tsx
import LoginHeader from "@/components/auth/LoginHeader";
import LoginForm from "@/components/auth/LoginForm";
import SSOButtons from "@/components/auth/SSOButtons";
import LoginFooter from "@/components/auth/LoginFooter";

export default function LoginPage() {
  return (
    <div>
      <LoginHeader />
      <LoginForm />
      <SSOButtons />
      <LoginFooter />
    </div>
  );
}
```

### Inline Login Prompt

```tsx
// Any component that needs auth check
import LoginPrompt from "@/components/LoginPrompt";

export default function ProtectedContent() {
  return (
    <div>
      <LoginPrompt />
      {/* Content only shown to authenticated users */}
    </div>
  );
}
```

## Authentication Flow

1. **Unauthenticated User**
   - User visits protected route
   - Middleware redirects to `/login` OR
   - Component shows `<LoginPrompt />` inline

2. **Login Page**
   - User sees `LoginHeader` + `LoginForm` + `SSOButtons` + `LoginFooter`
   - User submits credentials or clicks Google button
   - `LoginForm` or `GoogleSignInButton` calls `signIn()` from NextAuth

3. **Authentication Success**
   - NextAuth creates session
   - `LoginSuccess` component shows
   - Auto-redirect to `/dashboard` or `callbackUrl`

4. **Session Management**
   - Session stored in HTTP-only cookie
   - `middleware.ts` validates session on each request
   - `TopBar` component shows user profile when authenticated

## Configuration

### NextAuth Setup

- **Provider:** Google OAuth (configured in `auth.config.ts`)
- **Provider:** Credentials (email/password)
- **Session:** JWT-based (stored in secure HTTP-only cookie)
- **Callbacks:** Custom `signIn`, `jwt`, `session` callbacks for role/user data

### Environment Variables

Required in `.env.local`:

```bash
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

## Testing

### Unit Tests

- `components/__tests__/LoginForm.test.tsx` (if exists)
- Test credential validation
- Test OAuth button rendering
- Test error handling

### E2E Tests

- Test full login flow with Playwright
- Test redirect after login
- Test session persistence
- Test logout flow

## Related Files

- `app/login/page.tsx` - Login page route
- `app/api/auth/[...nextauth]/route.ts` - NextAuth catch-all API route
- `auth.config.ts` - NextAuth configuration
- `middleware.ts` - Route protection middleware
- `components/TopBar.tsx` - Shows user profile/logout when authenticated

## Notes

- All components use `useTranslation` hook for i18n support
- Form validation happens client-side before submission
- OAuth flow handled entirely by NextAuth (no custom server code needed)
- Login errors are shown inline in `LoginForm` (not toast notifications)
