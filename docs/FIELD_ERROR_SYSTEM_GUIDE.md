# Field-Level Error System Implementation Guide

## Overview
This system provides consistent, field-specific error handling across all forms in the Fixzit application, eliminating generic "something went wrong" messages and replacing them with precise, actionable feedback.

---

## 🎯 Core Principle
**Stop the guessing game**: Every error should highlight the exact failing field, display a clear message, and auto-focus the field for correction.

---

## 📦 What's Included

### 1. Error Code System (`lib/errors/field-errors.ts`)
```typescript
// 30+ standardized error codes
enum AuthErrorCode {
  MISSING_EMAIL,
  MISSING_PASSWORD,
  INVALID_EMAIL,
  INCORRECT_PASSWORD,
  EMAIL_ALREADY_EXISTS,
  PASSWORD_TOO_WEAK,
  ACCOUNT_LOCKED,
  // ... and more
}

// Human-readable messages
ERROR_MESSAGES: Record<AuthErrorCode, string>

// Auto-mapping error codes to field names
ERROR_CODE_TO_FIELD: Partial<Record<AuthErrorCode, AuthFieldName>>
```

### 2. Reusable Components (`components/ui/form-field.tsx`)
```typescript
<FormField
  name="email"
  label="Email Address"
  required
  type="email"
  value={email}
  onChange={setEmail}
  error={fieldErrors.email}
  showPasswordToggle  // for password fields
  helpText="Optional help text"
/>
```

### 3. Type Definitions
```typescript
// API response format
interface FieldErrorResponse {
  error: string;           // Human-readable message
  code: AuthErrorCode;     // Machine-readable code
  field?: AuthFieldName;   // Field that failed
  details?: Record<string, unknown>;
}

// Frontend state
type FieldErrors = Partial<Record<AuthFieldName, string>>;
```

---

## 🚀 Implementation Steps

### Step 1: Backend API Routes

**Before (Generic errors):**
```typescript
// ❌ Old way - generic error
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  if (!email) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 400 }
    );
  }
  
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }
  
  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }
  
  // ...
}
```

**After (Field-specific errors):**
```typescript
// ✅ New way - precise field errors
import { createFieldError, AuthErrorCode } from '@/lib/errors/field-errors';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  // Missing field validation
  if (!email?.trim()) {
    return NextResponse.json(
      createFieldError(AuthErrorCode.MISSING_EMAIL, 'email'),
      { status: 400 }
    );
  }
  
  if (!password) {
    return NextResponse.json(
      createFieldError(AuthErrorCode.MISSING_PASSWORD, 'password'),
      { status: 400 }
    );
  }
  
  // User lookup
  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      createFieldError(AuthErrorCode.INCORRECT_EMAIL, 'email'),
      { status: 401 }
    );
  }
  
  // Password verification
  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      createFieldError(AuthErrorCode.INCORRECT_PASSWORD, 'password'),
      { status: 401 }
    );
  }
  
  // Account state checks
  if (user.disabled) {
    return NextResponse.json(
      createFieldError(AuthErrorCode.ACCOUNT_DISABLED),
      { status: 403 }
    );
  }
  
  if (!user.emailVerified) {
    return NextResponse.json(
      createFieldError(AuthErrorCode.ACCOUNT_NOT_VERIFIED, 'email'),
      { status: 403 }
    );
  }
  
  // Success...
}
```

### Step 2: Frontend Forms

**Before (Manual error handling):**
```tsx
// ❌ Old way - manual everything
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Login failed');
      return;
    }
    
    router.push('/dashboard');
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="text-red-600">{error}</div>}
      
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Password</label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <button type="submit">Sign In</button>
    </form>
  );
}
```

**After (Using FormField + field errors):**
```tsx
// ✅ New way - using field error system
import { FormField } from '@/components/ui/form-field';
import { extractFieldErrors, focusField, validateAuthFields } from '@/lib/errors/field-errors';
import type { FieldErrors } from '@/lib/errors/field-errors';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');
    
    // Client-side validation before API call
    const clientErrors = validateAuthFields({ email, password });
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      // Auto-focus first failing field
      const firstField = Object.keys(clientErrors)[0];
      focusField(firstField);
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Extract field-specific errors
        if (data.field) {
          const errors = extractFieldErrors(data);
          setFieldErrors(errors);
          focusField(data.field);
          setGeneralError(data.error);
        } else {
          setGeneralError(data.error || 'Login failed');
        }
        return;
      }
      
      router.push('/dashboard');
    } catch (err) {
      setGeneralError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {generalError}
        </div>
      )}
      
      <FormField
        name="email"
        label="Email Address"
        required
        type="email"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
        autoComplete="email"
        placeholder="you@example.com"
      />
      
      <FormField
        name="password"
        label="Password"
        required
        type="password"
        value={password}
        onChange={setPassword}
        error={fieldErrors.password}
        autoComplete="current-password"
        placeholder="Enter your password"
        showPasswordToggle
      />
      
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

### Step 3: Signup Form Example

```tsx
import { FormField } from '@/components/ui/form-field';
import { validateAuthFields, focusField, type FieldErrors, AuthErrorCode } from '@/lib/errors/field-errors';

function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    
    // Client-side validation
    const errors = validateAuthFields(formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusField(Object.keys(errors)[0]);
      return;
    }
    
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    
    const data = await res.json();
    
    if (!res.ok && data.field) {
      setFieldErrors({ [data.field]: data.error });
      focusField(data.field);
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        name="name"
        label="Full Name"
        required
        value={formData.name}
        onChange={(v) => setFormData({ ...formData, name: v })}
        error={fieldErrors.name}
      />
      
      <FormField
        name="email"
        label="Email Address"
        required
        type="email"
        value={formData.email}
        onChange={(v) => setFormData({ ...formData, email: v })}
        error={fieldErrors.email}
      />
      
      <FormField
        name="phone"
        label="Phone Number"
        required
        type="tel"
        value={formData.phone}
        onChange={(v) => setFormData({ ...formData, phone: v })}
        error={fieldErrors.phone}
        helpText="Include country code (e.g., +966)"
      />
      
      <FormField
        name="password"
        label="Password"
        required
        type="password"
        value={formData.password}
        onChange={(v) => setFormData({ ...formData, password: v })}
        error={fieldErrors.password}
        showPasswordToggle
        helpText="At least 8 characters with letters and numbers"
      />
      
      <FormField
        name="confirmPassword"
        label="Confirm Password"
        required
        type="password"
        value={formData.confirmPassword}
        onChange={(v) => setFormData({ ...formData, confirmPassword: v })}
        error={fieldErrors.confirmPassword}
        showPasswordToggle
      />
      
      <Button type="submit">Create Account</Button>
    </form>
  );
}
```

---

## 📋 Migration Checklist

### API Routes to Update
- [ ] `app/api/auth/login/route.ts`
- [ ] `app/api/auth/signup/route.ts`
- [ ] `app/api/auth/forgot-password/route.ts`
- [ ] `app/api/auth/reset-password/route.ts`
- [ ] `app/api/users/route.ts` (create/update)
- [ ] Any route that validates form input

### Frontend Pages to Update
- [ ] `app/login/page.tsx`
- [ ] `app/signup/page.tsx`
- [ ] `app/forgot-password/page.tsx`
- [ ] `app/forgot-password/reset/page.tsx`
- [ ] User settings/profile forms
- [ ] Any form with validation

---

## 🎨 Visual UX Improvements

### What Users See Now:

**1. Empty field error:**
```
Email Address *
[empty input with red border]
Email address is required  ← Red text below field
```

**2. Invalid format:**
```
Email Address *
[invalid@] ← Red border
Please enter a valid email address  ← Red text
```

**3. Incorrect credentials:**
```
Password *
[••••••••] 👁️ ← Red border
Password is incorrect  ← Red text
```

**4. Account state:**
```
[Banner at top]
⚠️ Your email is not verified. Please check your inbox.

Email Address *
[user@example.com] ← Red border
```

---

## 🔍 Testing Strategy

### Manual Testing Checklist:
1. **Empty submission**
   - Leave all fields empty → See specific "X is required" for each field
   - First empty required field should auto-focus

2. **Invalid format**
   - Type "invalid" in email field → "Please enter a valid email"
   - Type "123" in password → "Password must be at least 8 characters"

3. **Server errors**
   - Use wrong password → "Password is incorrect" (not generic)
   - Try duplicate email on signup → "An account with this email already exists"

4. **Account states**
   - Locked account → "Account is locked" message
   - Unverified email → "Please verify your email" message

5. **Auto-focus**
   - Submit with errors → Cursor automatically jumps to first failing field
   - Fix first error, submit → Cursor jumps to next failing field

---

## 💡 Benefits

✅ **Precision**: Users know exactly which field has an issue  
✅ **Speed**: Auto-focus eliminates manual field location  
✅ **Consistency**: Same error UX across entire app  
✅ **Accessibility**: Proper ARIA attributes (aria-invalid, aria-describedby)  
✅ **Type Safety**: TypeScript prevents typos in field names  
✅ **Maintainability**: Centralized error messages easy to update  
✅ **i18n Ready**: Error messages ready for translation  
✅ **Security**: Still vague enough to not leak sensitive info  

---

## 🚨 Common Pitfalls to Avoid

❌ **Don't return sensitive info in errors:**
```typescript
// BAD - leaks whether email exists
createFieldError(AuthErrorCode.USER_NOT_FOUND, 'email')

// GOOD - stays vague for security
createFieldError(AuthErrorCode.INCORRECT_EMAIL, 'email')
```

❌ **Don't skip client-side validation:**
```typescript
// BAD - server round-trip for obvious errors
async function submit() {
  await fetch('/api/auth/login', { ... });
}

// GOOD - catch obvious errors immediately
async function submit() {
  const errors = validateAuthFields({ email, password });
  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return;
  }
  await fetch('/api/auth/login', { ... });
}
```

❌ **Don't forget to focus the field:**
```typescript
// BAD - user has to hunt for the error
setFieldErrors({ email: 'Invalid email' });

// GOOD - cursor automatically goes to the field
setFieldErrors({ email: 'Invalid email' });
focusField('email');
```

---

## 📝 Next Steps

1. **Update API routes** (1-2 hours per route)
   - Replace generic error responses
   - Use `createFieldError()` helper
   - Test each error code path

2. **Update frontend forms** (30-60 min per form)
   - Replace manual Input components with FormField
   - Add client-side validation with `validateAuthFields`
   - Handle API errors with `extractFieldErrors`

3. **Add new error codes** (as needed)
   - Extend `AuthErrorCode` enum
   - Add messages to `ERROR_MESSAGES`
   - Map codes to fields in `ERROR_CODE_TO_FIELD`

4. **Test thoroughly**
   - Manual testing for each error path
   - Verify auto-focus behavior
   - Check ARIA attributes with screen reader

---

**Status**: Infrastructure complete ✅  
**Commit**: 09344c06b  
**Ready for**: System-wide rollout across all forms  
