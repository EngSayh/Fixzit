# SuperAdmin Login Troubleshooting Guide

## Current Situation
- ❌ MONGODB_URI is set to `mongodb://localhost:27017/fixzit`
- ❌ No local MongoDB is running
- ❌ Docker daemon is not running
- ✅ SuperAdmin check script created at [scripts/check-superadmin.ts](scripts/check-superadmin.ts)

## Solution Options

### Option 1: Connect to Production Database (RECOMMENDED)

1. **Get your production MongoDB URI** from Vercel:
   ```bash
   # If you have Vercel CLI:
   vercel env pull .env.production
   
   # Or manually copy from: https://vercel.com/your-team/fixzit/settings/environment-variables
   ```

2. **Update .env.local** (or copy from Vercel):
   ```bash
   # Replace placeholder values with your actual credentials
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
   ```

3. **Check SuperAdmin accounts**:
   ```bash
   pnpm exec tsx scripts/check-superadmin.ts
   ```

4. **If no SuperAdmin exists, create one**:
   ```bash
   SUPERADMIN_EMAIL=sultan.a.hassni@gmail.com SUPERADMIN_PASSWORD=YourSecurePass123! pnpm exec tsx scripts/setup-production-superadmin.ts
   ```

---

### Option 2: Start Local MongoDB with Docker

1. **Start Docker Desktop** (if installed)

2. **Set MongoDB password** in .env.local:
   ```bash
   MONGO_INITDB_ROOT_PASSWORD=fixzit2024
   MEILI_MASTER_KEY=test-master-key-fixzit-search
   ```

3. **Start MongoDB**:
   ```bash
   docker-compose up -d mongodb
   ```

4. **Create local SuperAdmin**:
   ```bash
   SUPERADMIN_EMAIL=admin@fixzit.local SUPERADMIN_PASSWORD=Admin123! pnpm exec tsx scripts/setup-production-superadmin.ts
   ```

---

### Option 3: Use MongoDB Compass to Check Production DB

1. **Open MongoDB Compass** (download from mongodb.com/try/download/compass)

2. **Connect** using your production MongoDB URI

3. **Navigate** to: `fixzit` database → `users` collection

4. **Find SuperAdmin** with query:
   ```json
   { "role": "SUPER_ADMIN" }
   ```
   or
   ```json
   { "isSuperAdmin": true }
   ```

5. **Check the user details**:
   - Email: This is your login username
   - Password: Should be hashed (bcrypt)
   - Status: Should be "ACTIVE"
   - isActive: Should be true
   - security.locked: Should be false

---

## Expected SuperAdmin Structure

A valid SuperAdmin user should have:

```javascript
{
  _id: ObjectId("..."),
  email: "sultan.a.hassni@gmail.com",
  password: "$2a$12$...", // bcrypt hash
  username: "sultan.a.hassni",
  role: "SUPER_ADMIN",
  isSuperAdmin: true,
  status: "ACTIVE",
  isActive: true,
  orgId: "68dc8955a1ba6ed80ff372dc",
  professional: {
    role: "SUPER_ADMIN"
  },
  personal: {
    firstName: "Super",
    lastName: "Admin"
  },
  security: {
    locked: false,
    loginAttempts: 0
  },
  emailVerifiedAt: ISODate("..."),
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## Common Login Issues

### Issue: "Invalid credentials"
**Cause:** Wrong password or user doesn't exist  
**Fix:** Reset password using `setup-production-superadmin.ts` script

### Issue: "Account locked"
**Cause:** Too many failed login attempts  
**Fix:** Run this in MongoDB shell or Compass:
```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { 
    $set: { 
      "security.locked": false,
      "security.loginAttempts": 0
    }
  }
)
```

### Issue: "User not found"
**Cause:** No SuperAdmin account exists  
**Fix:** Create one using `setup-production-superadmin.ts`

### Issue: OTP required but no SMS sent
**Cause:** OTP is enabled but TAQNYAT credentials missing  
**Fix:** Add to Vercel environment variables:
```bash
NEXTAUTH_BYPASS_OTP_ALL=true
NEXTAUTH_BYPASS_OTP_CODE=your-12-char-code
REQUIRE_SMS_OTP=false
```

---

## Scripts Available

| Script | Purpose | Command |
|--------|---------|---------|
| Check SuperAdmin | List all SuperAdmin accounts | `pnpm exec tsx scripts/check-superadmin.ts` |
| Create/Update SuperAdmin | Create new or reset password | `SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... pnpm exec tsx scripts/setup-production-superadmin.ts` |

---

## Next Steps

1. Choose **Option 1** (production DB) or **Option 2** (local Docker)
2. Run the check script to see if SuperAdmin exists
3. If no SuperAdmin: Create one using the setup script
4. Try logging in at https://fixzit.co/login or http://localhost:3000/login
5. If still failing, check the Vercel logs for the actual error message

---

## Environment Variables Required

For production SuperAdmin login, ensure these are set in Vercel:

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Auth
NEXTAUTH_SECRET=... (32+ chars)
AUTH_SECRET=... (same as NEXTAUTH_SECRET)
NEXTAUTH_URL=https://fixzit.co

# SuperAdmin Bypass (if OTP issues)
NEXTAUTH_BYPASS_OTP_ALL=true
NEXTAUTH_BYPASS_OTP_CODE=... (12+ chars)
REQUIRE_SMS_OTP=false

# Organization
PUBLIC_ORG_ID=68dc8955a1ba6ed80ff372dc
DEFAULT_ORG_ID=68dc8955a1ba6ed80ff372dc
```

---

## Need Help?

Run this command to see your current environment:
```bash
node -e "console.log('MONGODB_URI:', process.env.MONGODB_URI?.includes('localhost') ? 'LOCALHOST (no DB)' : 'CLOUD (connected)')"
```
