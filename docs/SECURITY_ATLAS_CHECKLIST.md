# MongoDB Atlas Security Checklist

**🚨 CRITICAL: These issues are LIVE in production Atlas right now (verified 2025-12-14)**

## 🔥 CONFIRMED CRITICAL ISSUES (User-Verified)

**STATUS: ACTIVE IN PRODUCTION**

### 1. **✗ INTERNET-EXPOSED CLUSTER** (P0 - HIGHEST RISK)
- **What:** `0.0.0.0/0 (Allow from anywhere)` is Active ✅ in Network Access
- **Risk:** Cluster is reachable from ANY IP on the internet
- **Impact:** The /32 IP entry is meaningless when 0.0.0.0/0 exists
- **MongoDB Warning:** "Allow access from anywhere" explicitly flagged as risky
- **Priority:** FIX THIS FIRST (before other items)

### 2. **✗ EXPOSED SECRET** (P0)
- **What:** User `fixzitadmin` has password/secret in Description field
- **Risk:** Any Atlas user can see this password (non-encrypted UI metadata)
- **Impact:** Compromised credential, must rotate immediately

### 3. **✗ EXCESSIVE PRIVILEGES** (P1)
- **What:** Both `EngSayh` and `fixzitadmin` have `atlasAdmin@admin`
- **Risk:** Full cluster admin access (create/delete databases, modify settings)
- **Impact:** App runtime has more privileges than needed

---

## 🚨 Immediate Actions (Execute in This Exact Order)

### STEP 0: Remove Internet Wildcard Access (DO THIS FIRST)

**Current State:** `0.0.0.0/0 (Allow from anywhere)` is Active  
**Target State:** Atlas accessible only from Vercel + your office/VPN

**Why This Matters:**  
MongoDB explicitly warns: "0.0.0.0/0 allows access from anywhere on the internet." This is the #1 red flag in your Atlas security posture.

---

#### **Option A: Production-Grade (Recommended) - Vercel Static IPs**

Vercel now supports Static IPs (egress) on Pro/Enterprise plans, designed specifically for database allowlisting.

**Prerequisites:**
- Vercel Pro or Enterprise plan
- Must NOT be using MongoDB Atlas <-> Vercel integration (which auto-adds 0.0.0.0/0)
- Connect via manual `MONGODB_URI` env var instead

**Steps:**

1. **Enable Vercel Static IPs**
   - Go to: [Vercel Dashboard](https://vercel.com/dashboard) → Your Team Settings
   - Navigate to: **Connectivity** → **Static IPs**
   - Click **Enable Static IPs**
   - Select region(s) closest to your Atlas cluster (e.g., `us-east-1` if Atlas is in Virginia)
   - **Copy the static egress IPs** (usually 2-3 IPs per region)

2. **Add Vercel IPs to Atlas**
   - Go to: [MongoDB Atlas](https://cloud.mongodb.com/) → Security → **Network Access**
   - Click **ADD IP ADDRESS**
   - For each Vercel static IP:
     - Paste the IP address
     - Use `/32` suffix (exact IP match)
     - Comment: `Vercel Production (Static IP)`
   - Click **Confirm**

3. **Add Your Office/VPN IPs** (Optional but recommended)
   - Click **ADD IP ADDRESS**
   - Enter your office/VPN IP (or your current IP)
   - Comment: `Office - ${LOCATION}`
   - Click **Confirm**

4. **Delete the Wildcard Entry**
   - Find: `0.0.0.0/0 (Allow from anywhere)`
   - Click **DELETE** (trash icon)
   - Confirm deletion

5. **Deploy & Verify**
   - Deploy your Vercel app (or trigger redeploy)
   - Check: `MONGODB_URI` in Vercel env vars uses manual connection string (not integration)
   - Verify: App connects successfully from Vercel
   - Verify: Cannot connect from unauthorized IPs

**Verification:**
```bash
# From Vercel deployment logs:
# Should see: ✅ Connected to MongoDB

# From local machine (if not in allowlist):
# Should see: MongoServerError: connection refused

# Test from allowed IP:
pnpm tsx scripts/verify-import.ts
# Should output: ✅ Connected, Total Issues: 12
```

**References:**
- [Vercel Static IPs Documentation](https://vercel.com/docs/security/static-ip)
- [MongoDB Network Access Best Practices](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

---

#### **Option B: Temporary Workaround (Not Ideal) - Keep 0.0.0.0/0**

**Only use this if:**
- You're using MongoDB Atlas <-> Vercel integration (which requires 0.0.0.0/0)
- You can't enable Vercel Static IPs yet (Free tier / waiting for approval)
- You need time to migrate to Option A

**If you must keep 0.0.0.0/0 temporarily:**

**Compensating Controls (Required):**
1. ✅ Least-privilege DB users (NO atlasAdmin for runtime) - see STEP 3 below
2. ✅ Strong passwords (64+ chars) + immediate rotation on exposure
3. ✅ Tight RBAC at app layer (tenant isolation, role checks)
4. ✅ Enable MongoDB Atlas audit logs and monitoring
5. ✅ Set up alerts for failed auth attempts
6. 📅 **Plan migration to Static IPs within 30 days**

**Treat Atlas as "internet-exposed" and compensate hard at app/DB layers.**

---

#### **Option C: Lock Down Governance (Prevent Future Wildcards)**

Once you remove 0.0.0.0/0, prevent anyone from adding it back:

**MongoDB Atlas Resource Policies** (Enterprise only):
- Can make it technically impossible to add wildcard IPs (org-wide)
- Requires Atlas Enterprise plan
- Contact MongoDB support to enable

**Alternative (all plans):**
- Document the policy in this file
- Add pre-commit hook to check Atlas API for 0.0.0.0/0
- Regular security audits (quarterly)

**Reference:**
- [MongoDB Atlas Resource Policies](https://www.mongodb.com/docs/atlas/security/resource-policies/)

---

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

## ✅ Final Verification Checklist

**After completing all steps, verify this checklist:**

### Network Security
- [ ] `0.0.0.0/0` DELETED from Network Access (or documented exception with compensating controls)
- [ ] Vercel Static IPs added (if using Option A)
- [ ] Office/VPN IPs added (optional)
- [ ] Test connection from Vercel: ✅ Success
- [ ] Test connection from unauthorized IP: ❌ Connection refused (expected)

### Database Users
- [ ] `fixzitadmin` Description field is BLANK (no secrets visible)
- [ ] `fixzitadmin` password rotated (new 64+ char password)
- [ ] `fixzit-app-dev` created with readWrite@fixzit only
- [ ] `fixzit-app-prod` created with readWrite@fixzit only
- [ ] `.env.local` updated with new dev credentials
- [ ] Vercel env vars updated with new prod credentials
- [ ] Old credentials stored in password manager (for rollback)

### User Privileges
- [ ] `EngSayh` (or `sultan-admin`) keeps atlasAdmin (human break-glass only)
- [ ] `fixzit-app-dev` has readWrite@fixzit ONLY (no atlasAdmin)
- [ ] `fixzit-app-prod` has readWrite@fixzit ONLY (no atlasAdmin)
- [ ] `fixzitadmin` user DELETED (after creating replacements)

### Application Testing
- [ ] Dev environment connects with `fixzit-app-dev`
- [ ] Production Vercel connects with `fixzit-app-prod`
- [ ] SSOT import works: `pnpm tsx scripts/import-backlog.ts --confirm`
- [ ] No console errors related to MongoDB connection
- [ ] Tenant scope queries working (org_id filtering)

### Secrets Management
- [ ] `.env.local` is gitignored (not in git)
- [ ] No plaintext passwords in code/comments/docs
- [ ] All passwords stored in password manager
- [ ] Vercel environment variables set correctly
- [ ] GitHub Actions secrets updated (if applicable)

---

## 🎯 What Good Security Looks Like

**Atlas Network Access page should show:**
```
IP Address List:
✅ 192.0.2.1/32     (Vercel Production - Static IP 1)
✅ 192.0.2.2/32     (Vercel Production - Static IP 2)
✅ 203.0.113.5/32   (Office - Riyadh)
❌ 0.0.0.0/0        (DELETED - no longer present)
```

**Atlas Database Access page should show:**
```
Database Users:
✅ sultan-admin      | atlasAdmin@admin       | [blank]
✅ fixzit-app-dev    | readWrite@fixzit       | Dev environment
✅ fixzit-app-prod   | readWrite@fixzit       | Production (Vercel)
❌ fixzitadmin       (DELETED - was compromised)
```

**Local .env.local should contain:**
```bash
# Development (least-privilege user)
MONGODB_URI="mongodb+srv://fixzit-app-dev:NEW_DEV_PASSWORD@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit"
```

**Vercel Production Environment Variables:**
```bash
# Production (least-privilege user + Static IP source)
MONGODB_URI=mongodb+srv://fixzit-app-prod:NEW_PROD_PASSWORD@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit
```

**Connection Test Output:**
```bash
$ pnpm tsx scripts/verify-import.ts
🔌 Connecting to MongoDB...
   URI: mongodb+srv://fixzit-app-dev:*****@fixzit.vgfiiff.mongodb.net/fixzit
✅ Connected
📊 Total Issues: 12
```

---

## 🚨 What to Do If Something Breaks

### Connection refused after removing 0.0.0.0/0
**Cause:** Your current IP is not in the Atlas allowlist  
**Fix:** Add your IP to Network Access (temporary for debugging)

### "Authentication failed" errors
**Cause:** Wrong username/password or user doesn't exist  
**Fix:** 
1. Verify username spelling in MONGODB_URI
2. Check password is URL-encoded correctly
3. Verify user exists in Atlas Database Access
4. Try regenerating password

### Vercel deployment fails to connect
**Cause:** Vercel Static IPs not added to Atlas  
**Fix:**
1. Verify Static IPs are enabled in Vercel Team Settings
2. Copy exact IP addresses from Vercel
3. Add each IP to Atlas Network Access as /32
4. Redeploy Vercel app

### SSOT import fails with "permission denied"
**Cause:** Dev user doesn't have write access to fixzit database  
**Fix:**
1. Check user has readWrite role (not read-only)
2. Check role is scoped to fixzit database (not admin)
3. Try with atlasAdmin user temporarily to isolate issue

---

## 📚 References

- [MongoDB Security Checklist](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [Atlas Database User Privileges](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- [Atlas Network Access](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
- [Vercel Static IPs](https://vercel.com/docs/security/static-ip)
- [Vercel MongoDB Integration](https://vercel.com/integrations/mongodbatlas)
- [Atlas Resource Policies](https://www.mongodb.com/docs/atlas/security/resource-policies/)
- [Connection String URL Encoding](https://www.mongodb.com/docs/manual/reference/connection-string/#components)
