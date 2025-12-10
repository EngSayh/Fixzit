# SMS OTP Login Enhancement - Implementation Guide

> **Provider Update:** SMS OTP now uses **Taqnyat** as the sole provider. Twilio references below are legacy and retained for historical context only.

## Overview

Enhanced the login flow with SMS OTP (One-Time Password) verification using Taqnyat. Users must now verify their identity via SMS after entering valid credentials, adding an extra layer of security.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN WITH SMS OTP FLOW                  │
└─────────────────────────────────────────────────────────────┘

1. User enters credentials (email/employee number + password)
   ↓
2. System validates credentials against database
   ↓
3. System sends 6-digit OTP to user's registered phone via Taqnyat
   ↓
4. User receives SMS with OTP code
   ↓
5. User enters OTP in verification screen
   ↓
6. System validates OTP
   ↓
7. User successfully logged in (NextAuth session created)
```

## Architecture

### Files Created/Modified

#### **New Files:**

1. **`lib/otp-store.ts`** (50 lines)
   - Shared OTP storage (in-memory)
   - Rate limiting storage
   - Constants for OTP expiry, attempts, etc.
   - Periodic cleanup of expired OTPs

2. **`app/api/auth/otp/send/route.ts`** (250 lines)
   - POST /api/auth/otp/send
   - Validates credentials
   - Sends OTP via Taqnyat SMS
   - Rate limiting (5 sends per 15 minutes)
   - Returns masked phone number

3. **`app/api/auth/otp/verify/route.ts`** (180 lines)
   - POST /api/auth/otp/verify
   - Verifies OTP code
   - Tracks failed attempts (max 3)
   - Returns short-lived OTP session token (server-managed)

4. **`components/auth/OTPVerification.tsx`** (280 lines)
   - React component for OTP input
   - Countdown timer (5 minutes)
   - Resend functionality with cooldown (60 seconds)
   - Auto-focus and numeric keyboard
   - Accessibility features (aria-labels, roles)

#### **Modified Files:**

5. **`app/login/page.tsx`**
   - Added OTP flow state management
   - Modified onSubmit to call OTP send endpoint
   - Added OTP verification success handler
   - Conditional rendering (login form vs OTP screen)

6. **`i18n/dictionaries/en.ts`**
   - Added `otp.*` translation keys
   - Added `login.errors.*` for OTP-specific errors

7. **`i18n/dictionaries/ar.ts`**
   - Added Arabic translations for OTP flow

## API Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/auth/otp/send`

**Request Body:**

```json
{
  "identifier": "user@example.com", // Email or employee number
  "password": "user_password"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "+966 50****4567", // Masked phone
    "expiresIn": 300, // Seconds (5 minutes)
    "attemptsRemaining": 3
  }
}
```

**Error Responses:**

- `400`: Validation error, invalid credentials, no phone number
- `401`: Invalid credentials
- `403`: Account not active
- `429`: Rate limit exceeded (5 sends per 15 minutes)
- `500`: Server error (Taqnyat failure, database error)

**Rate Limiting:**

- Max 5 OTP sends per 15 minutes per identifier
- Resets after 15 minutes

### 2. Verify OTP

**Endpoint:** `POST /api/auth/otp/verify`

**Request Body:**

```json
{
  "identifier": "user@example.com",
  "otp": "123456"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "otpToken": "d45f8c... (server-managed token)",
    "userId": "507f1f77bcf86cd799439011"
  }
}
```

**Error Responses:**

- `400`: Invalid OTP, expired OTP, OTP not found
- `429`: Too many incorrect attempts (max 3)
- `500`: Server error

**Attempt Limiting:**

- Max 3 incorrect attempts
- OTP deleted after 3 failed attempts
- User must request new OTP

## Security Features

### 1. Rate Limiting

- **Send OTP:** 5 sends per 15 minutes per identifier
- Prevents SMS spam and abuse
- Uses in-memory store (migrate to Redis for production)

### 2. OTP Expiration

- OTPs expire after 5 minutes
- Expired OTPs automatically deleted from store
- Clear error message when OTP expires

### 3. Attempt Limiting

- Max 3 incorrect verification attempts
- OTP invalidated after 3 failed attempts
- Forces user to request new OTP

### 4. Phone Number Masking

- Only last 4 digits shown to user
- Format: `+966 50****4567`
- Prevents phone number exposure in UI

### 5. Credential Validation

- Password verified before sending OTP
- Prevents OTP spam to random phone numbers
- User account status checked (must be active)

### 5.1 Super Admin Fallback (optional)

- Set `NEXTAUTH_SUPERADMIN_FALLBACK_PHONE` (or legacy `SUPER_ADMIN_FALLBACK_PHONE`) if your seeded SUPER_ADMIN account lacks a phone.
- The fallback is only used for SUPER_ADMINs with no stored phone; a warning is logged whenever it is used.

### 6. SMS Content

```
Your Fixzit verification code is: 123456

This code expires in 5 minutes. Do not share this code with anyone.
```

### 7. OTP Session Tokens

- `otpToken` values never embed the OTP code itself.
- Tokens are stored server-side in `otpSessionStore` and expire after 5 minutes.
- Each token can be used exactly once. After NextAuth consumes it, it is deleted immediately.
- Credentials provider rejects sign-ins that do not include a valid `otpToken` (enforced unless `NEXTAUTH_REQUIRE_SMS_OTP=false`).

## UI/UX Features

### OTP Verification Screen

**Features:**

- Large numeric input field (6 digits)
- Auto-focus on mount
- Numeric keyboard on mobile (`inputMode="numeric"`)
- Real-time validation (only numbers, max 6 digits)
- Countdown timer (MM:SS format)
- Resend button with cooldown (60 seconds)
- Back to login button
- Error messages with icons
- Loading states for verify/resend actions

**Accessibility:**

- ARIA labels for screen readers
- Role="alert" for error messages
- High contrast colors for visibility
- Clear focus indicators

**Internationalization:**

- Full RTL support for Arabic
- All text translatable via `t()` function
- Date/time formatting respects locale

## Database Schema

### Users Collection (Existing)

```typescript
{
  _id: ObjectId,
  email: string,
  username?: string,  // Employee number for corporate users
  password: string,   // Hashed with bcrypt
  contact: {
    phone: string,    // Required for OTP (Saudi format: +966501234567)
  },
  personal: {
    phone?: string,   // Fallback phone number
  },
  isActive: boolean,
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  security: {
    lastLogin: Date,
  },
  // ... other fields
}
```

**Phone Number Requirements:**

- Must be in Saudi format: `+966501234567` or `0501234567`
- Validated by `isValidSaudiPhone()` function
- Automatically formatted to E.164 format by `formatSaudiPhoneNumber()`

### OTP Store (In-Memory)

```typescript
// Map<identifier, OTPData>
interface OTPData {
  otp: string; // 6-digit code
  expiresAt: number; // Unix timestamp (ms)
  attempts: number; // Failed verification attempts (max 3)
  userId: string; // MongoDB ObjectId
  phone: string; // E.164 format phone number
}
```

**Storage Notes:**

- Currently in-memory (not persistent)
- ⚠️ For production: Migrate to Redis for distributed systems
- Periodic cleanup every 10 minutes
- Automatically deleted after expiry or successful verification

### Rate Limit Store (In-Memory)

```typescript
// Map<identifier, RateLimitData>
interface RateLimitData {
  count: number; // Number of OTP sends
  resetAt: number; // Unix timestamp (ms) when limit resets
}
```

### OTP Login Session Store (In-Memory)

```typescript
// Map<otpToken, OTPLoginSession>
interface OTPLoginSession {
  userId: string;
  identifier: string;
  expiresAt: number; // Unix timestamp (ms)
}
```

**Usage Notes:**

- Tokens are random 32-byte hex strings generated after successful OTP verification.
- Stored only in memory/Redis on the server (never exposed as JWTs or cookies).
- NextAuth credentials provider requires a valid `otpToken` to complete sign-in.
- Entries expire after 5 minutes and are cleaned up automatically.

## Environment Variables

```env
# Taqnyat SMS (Required)
TAQNYAT_BEARER_TOKEN=your_taqnyat_api_token
TAQNYAT_SENDER_NAME=YOUR_REGISTERED_SENDER

# NextAuth (Required)
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000

# Optional: fallback phone for seeded super admin (OTP only)
# NEXTAUTH_SUPERADMIN_FALLBACK_PHONE=+966501234567
```

**Testing:**

1. Ensure `TAQNYAT_BEARER_TOKEN` and `TAQNYAT_SENDER_NAME` are set
2. Use Saudi mobile numbers in E.164 format (`+9665XXXXXXXX`)
3. For dev-only dry runs, set `SMS_DEV_MODE=true` to avoid live sends

## Testing Guide

### Manual Testing

#### Test Case 1: Successful Login with OTP

1. Navigate to `/login`
2. Enter valid credentials (email + password)
3. Click "Sign In"
4. Wait for SMS to arrive (~5 seconds)
5. Enter 6-digit OTP code
6. Click "Verify & Continue"
7. ✅ Successfully redirected to dashboard

#### Test Case 2: Expired OTP

1. Complete Test Case 1 steps 1-4
2. Wait 5+ minutes (or modify OTP_EXPIRY_MS for faster testing)
3. Enter OTP code
4. ✅ Error: "Code expired. Please request a new one."

#### Test Case 3: Incorrect OTP

1. Complete Test Case 1 steps 1-4
2. Enter wrong OTP (e.g., "111111")
3. ✅ Error: "Incorrect OTP. 2 attempt(s) remaining."
4. Enter wrong OTP again
5. ✅ Error: "Incorrect OTP. 1 attempt(s) remaining."
6. Enter wrong OTP third time
7. ✅ Error: "Too many incorrect attempts. Please request a new code."

#### Test Case 4: Resend OTP

1. Complete Test Case 1 steps 1-4
2. Click "Resend Code"
3. ✅ New SMS sent, timer reset to 5:00
4. ✅ Resend button disabled for 60 seconds
5. Enter new OTP
6. ✅ Successfully verified

#### Test Case 5: Rate Limiting

1. Attempt to send OTP 5 times within 15 minutes
2. ✅ 6th attempt: Error "Too many OTP requests. Please try again later."

#### Test Case 6: No Phone Number

1. Remove phone number from user profile in database
2. Attempt login
3. ✅ Error: "No phone number registered. Please contact support."

#### Test Case 7: Invalid Credentials

1. Enter wrong password
2. ✅ Error: "Invalid credentials" (OTP not sent)

### Automated Testing

```typescript
// TODO: Add Playwright tests
describe("OTP Login Flow", () => {
  test("should send OTP after valid credentials", async ({ page }) => {
    // Test implementation
  });

  test("should verify OTP and complete login", async ({ page }) => {
    // Test implementation
  });

  test("should show error for expired OTP", async ({ page }) => {
    // Test implementation
  });
});
```

## Production Deployment Checklist

- [ ] **Replace in-memory OTP store with Redis**
  - Install `ioredis` package
  - Configure Redis connection
  - Update `lib/otp-store.ts` to use Redis
  - Set TTL for OTP keys (5 minutes)
- [ ] **Monitor SMS costs**
  - Monitor Taqnyat usage and costs
  - Implement SMS cost tracking
  - Consider SMS budget limits per user
- [ ] **Implement OTP backup methods**
  - Email fallback for failed SMS
  - TOTP authenticator app support
  - Recovery codes
- [ ] **Add logging and monitoring**
  - Log all OTP send/verify attempts
  - Track success/failure rates
  - Monitor Taqnyat delivery status
  - Set up alerts for high failure rates
- [ ] **Security enhancements**
  - Implement CAPTCHA before sending OTP
  - Add IP-based rate limiting
  - Detect and block suspicious patterns
  - Add device fingerprinting
- [ ] **User experience improvements**
  - Add "Trust this device" option (skip OTP for 30 days)
  - SMS delivery status tracking
  - Support for WhatsApp OTP as alternative
  - Voice call fallback for SMS failures

## Troubleshooting

### Common Issues

#### 1. OTP Not Received

**Possible Causes:**

- Invalid phone number format
- Phone number not verified/allowed (Taqnyat) or invalid format
- Taqnyat account suspended or out of credits
- SMS blocked by carrier

**Debug Steps:**

```bash
# Check Taqnyat logs/portal

# Test phone number format (dev mode)
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+966501234567", "message": "Test", "testConfig": true}'

# Check user phone number in database
db.users.findOne({ email: "user@example.com" }, { "contact.phone": 1 })
```

#### 2. OTP Verification Fails

**Possible Causes:**

- OTP expired (>5 minutes)
- Incorrect OTP entered
- Too many attempts (>3)
- OTP store cleared (server restart)

**Debug Steps:**

```typescript
// Check OTP store (add logging in verify endpoint)
console.log("OTP Data:", otpStore.get(identifier));

// Check expiration
const now = Date.now();
const otpData = otpStore.get(identifier);
if (otpData && now > otpData.expiresAt) {
  console.log("OTP expired:", new Date(otpData.expiresAt));
}
```

#### 3. Rate Limit Errors

**Possible Causes:**

- User requesting OTP too frequently
- Multiple users sharing same IP (rare)
- Testing with same account repeatedly

**Debug Steps:**

```typescript
// Check rate limit data
console.log("Rate Limit:", rateLimitStore.get(identifier));

// Reset rate limit for testing
rateLimitStore.delete(identifier);
```

## Future Enhancements

### Phase 2 Features (Priority: High)

1. **Redis Integration** - Replace in-memory store
2. **WhatsApp OTP** - Alternative to SMS
3. **Backup Codes** - Recovery mechanism
4. **Trust Device** - Skip OTP for known devices

### Phase 3 Features (Priority: Medium)

5. **TOTP Support** - Authenticator app integration
6. **Biometric Auth** - Face ID / Touch ID on mobile
7. **Risk-Based Auth** - Skip OTP for low-risk logins
8. **SMS Templates** - Multi-language SMS content

### Phase 4 Features (Priority: Low)

9. **Voice Call OTP** - Accessibility feature
10. **Email OTP** - Fallback for SMS failures
11. **Passwordless Login** - OTP-only authentication
12. **Session Management** - View/revoke active sessions

## Performance Metrics

### Target Metrics

- **OTP Send Time:** <3 seconds (credential validation + Taqnyat API)
- **OTP Delivery Time:** <10 seconds (Taqnyat → User's phone)
- **Verification Time:** <1 second (in-memory lookup + validation)
- **Success Rate:** >95% (OTP delivery + verification)

### Monitoring

- Track average OTP send time
- Monitor Taqnyat delivery rates
- Log failed verification attempts
- Alert on high failure rates (>10%)

## Cost Analysis

### Taqnyat SMS Pricing (Saudi Arabia)

- **Outbound SMS:** ~$0.05 - $0.10 per message
- **Estimated Monthly Cost (1000 users):**
  - 1 login/day: $1,500 - $3,000
  - Rate limit (5 OTP/15min): Max $25,000 per day (unlikely)

### Cost Optimization

- Implement "Trust Device" to reduce OTP frequency
- Use WhatsApp (cheaper alternative) when available
- Monitor and block SMS abuse
- Consider SMS-free authentication for trusted devices

## Support

### User Support

- **Help Center:** Add FAQ for OTP login
- **Contact Support:** support@fixzit.com
- **Phone:** +966 11 234 5678

### Developer Support

- **Internal Documentation:** This file
- **API Documentation:** OpenAPI spec at `/docs/api`
- **Slack Channel:** #auth-team

## Changelog

### v1.0.0 (Current)

- ✅ Initial SMS OTP implementation
- ✅ Taqnyat integration
- ✅ Rate limiting (5 sends / 15 min)
- ✅ Attempt limiting (3 attempts max)
- ✅ UI with countdown timer
- ✅ Bilingual support (EN/AR)
- ✅ Phone number masking

### Upcoming

- 🔄 Redis integration (v1.1.0)
- 🔄 WhatsApp OTP (v1.2.0)
- 🔄 Trust device feature (v1.3.0)

---

**Last Updated:** December 2024  
**Author:** Fixzit Engineering Team  
**Status:** Production Ready (with Redis migration pending)
