# MongoDB Atlas Security Checklist

**CRITICAL: Execute these steps immediately**

## 🚨 CONFIRMED ISSUES (2025-12-14)

**VERIFIED BY USER:**
1. ✗ User `fixzitadmin` has password/secret in Description field (EXPOSED)
2. ✗ Both `EngSayh` and `fixzitadmin` have `atlasAdmin@admin` (TOO PERMISSIVE)
3. ⚠️ IP Access List may include `0.0.0.0/0` (needs verification)

---

## 🚨 Immediate Actions (Execute in This Order)

### STEP 1: Remove Secret from Description Field (IMMEDIATE)

**User:** `fixzitadmin`  
**Issue:** Password/secret visible in Description field

**Action:**
1. Go to: [MongoDB Atlas](https://cloud.mongodb.com/) → Security → Database Access
2. Find user: `fixzitadmin`
3. Click **Edit** (pencil icon)
4. **Clear** the Description field (remove all content)
5. Click **Update User**

**Why:** Description is visible to anyone with Atlas UI access. MongoDB stores it as non-encrypted metadata.

**Verification:**
```bash
# After clearing, verify Description is empty in Atlas UI
# User list should show: fixzitadmin | atlasAdmin | [blank description]
```

---

### STEP 2: Rotate Compromised Password (IMMEDIATE)

**User:** `fixzitadmin` (password was exposed in Description)

**Action:**
1. Atlas → Security → Database Access → Edit `fixzitadmin`
2. Click **Edit Password**
3. Click **Autogenerate Secure Password** (or use password manager)
4. **Copy** the new password immediately
5. Click **Update User**

**Update Credentials:**
```bash
# .env.local (development)
MONGODB_URI="mongodb+srv://fixzitadmin:NEW_PASSWORD_HERE@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit"

# URL-encode special characters:
# @ → %40
# # → %23
# / → %2F
# : → %3A

# Example with special chars:
# Password: MyP@ss#123
# Encoded: MyP%40ss%23123
```

**Store Securely:**
- 1Password / LastPass / Bitwarden
- Vercel Environment Variables (production)
- Never commit to git

**Verification:**
```bash
# Test connection with new password
pnpm tsx scripts/check-superadmin.ts
# Should output: ✅ Connected to database
```

---

### STEP 3: Create Least-Privilege App Users (REQUIRED)

**Current Issue:** Both DB users have `atlasAdmin@admin` (full cluster access)  
**MongoDB Best Practice:** Unique users per app/environment + least privilege

#### A) Development User

**Action:**
1. Atlas → Security → Database Access → **ADD NEW DATABASE USER**
2. Authentication Method: **Password**
3. Username: `fixzit-app-dev`
4. Password: Click **Autogenerate Secure Password** → Copy
5. Database User Privileges:
   - Select **Built-in Role**
   - Role: **readWrite**
   - Database: **fixzit** (NOT admin)
6. Restrict Access to Specific Clusters: (optional)
   - Select your dev cluster only
7. Click **Add User**

**Update .env.local:**
```bash
MONGODB_URI="mongodb+srv://fixzit-app-dev:NEW_PASSWORD@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit"
```

#### B) Production User

**Action:**
1. Atlas → Security → Database Access → **ADD NEW DATABASE USER**
2. Username: `fixzit-app-prod`
3. Password: Autogenerate → Store in Vercel
4. Privileges: **readWrite** on database **fixzit**
5. Click **Add User**

**Update Vercel:**
1. Vercel Dashboard → Project Settings → Environment Variables
2. Update `MONGODB_URI` for Production environment
3. Redeploy after updating

#### C) Keep Admin User for Humans Only

**Rename `EngSayh` user:**
1. Atlas → Database Access → Edit `EngSayh`
2. Rename to: `sultan-admin` (human identity, not app)
3. Keep `atlasAdmin@admin` (for break-glass scenarios)
4. **Never use in app connection strings**

**Delete or Disable `fixzitadmin`:**
1. After rotating password and creating least-privilege users
2. Atlas → Database Access → Delete `fixzitadmin`
3. OR: Change password again and document as "deprecated"

---

### STEP 4: Verify IP Access List (PRODUCTION SAFETY)

**Check Current Configuration:**
1. Atlas → Network Access → IP Access List
2. Look for: `0.0.0.0/0` (CIDR) with comment "Allow access from anywhere"

**If `0.0.0.0/0` exists:**
- ⚠️ **Remove for production clusters**
- ✅ **OK for development/testing** (but document)

**Production Best Practice:**
```
Vercel IPs (production):
- Add Vercel's static IP ranges
- OR: Use Vercel integration (automatic IP management)

Development:
- Add your office/home IP
- OR: Use VPN with known IP range
```

**Action:**
1. Click **ADD IP ADDRESS**
2. For Vercel:
   - Use [Vercel IP Ranges](https://vercel.com/docs/concepts/edge-network/headers#x-forwarded-for)
   - OR: Enable Vercel MongoDB Atlas Integration
3. Remove `0.0.0.0/0` after adding specific IPs

**Verification:**
```bash
# Test connection still works after IP restriction
pnpm tsx scripts/check-superadmin.ts
```

---

## 📋 Completion Checklist

Execute in order and check off:

- [ ] **STEP 1:** Cleared Description field for `fixzitadmin` user
- [ ] **STEP 2:** Rotated `fixzitadmin` password + updated .env.local
- [ ] **STEP 3A:** Created `fixzit-app-dev` user (readWrite@fixzit)
- [ ] **STEP 3B:** Created `fixzit-app-prod` user (readWrite@fixzit) 
- [ ] **STEP 3C:** Renamed `EngSayh` → `sultan-admin` (human admin only)
- [ ] **STEP 3D:** Deleted or disabled `fixzitadmin` user
- [ ] **STEP 4:** Verified IP Access List (no wildcard in production)
- [ ] **VERIFY:** Ran `pnpm tsx scripts/check-superadmin.ts` successfully
- [ ] **VERIFY:** App connects with least-privilege user
- [ ] **VERIFY:** Updated Vercel production env vars

---

## 🔐 Final Verification Commands

```bash
# 1. Test local connection
pnpm tsx scripts/check-superadmin.ts
# Expected: ✅ Connected to database (using least-privilege user)

# 2. Import backlog (no auth required)
pnpm tsx scripts/import-backlog.ts
# Expected: Created: X, Updated: Y, Errors: 0

# 3. Verify production (Vercel)
# Deploy and check logs for MongoDB connection success
```

---

## 📚 References

- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [Atlas Database User Privileges](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- [Connection String URL Encoding](https://www.mongodb.com/docs/manual/reference/connection-string/#components)
- [Vercel MongoDB Integration](https://vercel.com/integrations/mongodbatlas)

---

## 🔐 Credential Management Rules

**NEVER:**
- Store passwords in Atlas UI Description fields
- Use `atlasAdmin` role for app connections
- Hardcode credentials in code/comments/docs
- Commit .env.local to git
- Share passwords via chat/email/Slack

**ALWAYS:**
- Use secure password manager (1Password, LastPass, etc.)
- URL-encode special characters (@, #, /, etc.)
- Use separate DB users per environment
- Apply principle of least privilege
- Rotate credentials on suspected compromise
- Use IP Access Lists (not 0.0.0.0/0)

---

## 📚 References

- [MongoDB Security Best Practices](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [Atlas Database User Privileges](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- [Connection String URL Encoding](https://www.mongodb.com/docs/manual/reference/connection-string/#components)
