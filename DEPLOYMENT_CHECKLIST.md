# Fixzit Production Deployment Checklist

**Target Domain:** fixzit.co (GoDaddy)  
**Platform:** Vercel  
**Database:** MongoDB Atlas (Required)

---

## ✅ Pre-Deployment (COMPLETED)

- [x] All TypeScript errors fixed (0 errors)
- [x] All ESLint errors fixed (0 errors)
- [x] All tests passing (891 tests)
- [x] Code committed and pushed (commit: 3a0a1d827)
- [x] Vercel CLI installed at `/opt/homebrew/bin/vercel`
- [x] React act() warnings fixed in topbar test
- [x] Notifications default to background dispatch for <500ms API latency; set `sendNotification(..., { background: false })` if a route must block on delivery attempts.

---

## 🔴 CRITICAL: MongoDB Atlas Setup (REQUIRED FIRST)

### Option A: If You Have Atlas Already
1. Log in to https://cloud.mongodb.com
2. Get your connection string from your cluster
3. Format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/fixzit`
4. Update `.env.local` for local testing
5. **SKIP TO STEP 3** (Vercel Environment Variables)

### Option B: Create New Atlas Account (10 minutes)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up (free tier available - M0 Sandbox, 512MB storage)
3. Create organization: "Fixzit"
4. Create project: "Fixzit Production"
5. Build Database → Shared (FREE) → Create cluster
   - Provider: AWS
   - Region: US East (N. Virginia) or closest to your users
   - Cluster Name: "fixzit-production"
6. Security Quickstart:
   - Username: `fixzit-admin` (save this)
   - Password: Generate strong password (SAVE THIS - you'll need it!)
   - IP Access: `0.0.0.0/0` (Allow access from anywhere - Vercel needs this)
7. Wait 3-5 minutes for cluster provisioning
8. Click "Connect" → "Connect your application"
9. Copy connection string:
   ```
   mongodb+srv://fixzit-admin:<password>@fixzit-production.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
10. Replace `<password>` with your actual password
11. Add database name at end: `...mongodb.net/fixzit?retryWrites=true&w=majority`

**Final format:**
```
mongodb+srv://fixzit-admin:YOUR_SECURE_PASSWORD@fixzit-production.xxxxx.mongodb.net/fixzit?retryWrites=true&w=majority
```

---

## 📝 Step 1: Update Local Environment (Testing)

```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit

# Edit .env.local
nano .env.local
```

Replace:
```env
MONGODB_URI=mongodb://localhost:27017/fixzit
```

With your Atlas connection string:
```env
MONGODB_URI=mongodb+srv://fixzit-admin:YOUR_PASSWORD@fixzit-production.xxxxx.mongodb.net/fixzit?retryWrites=true&w=majority
```

**Test locally:**
```bash
pnpm build
pnpm dev
```

Visit http://localhost:3000 and verify:
- App loads without MongoDB connection errors
- You can log in
- Data persists

---

## 🔐 Step 2: Prepare Production Environment Variables

Create a file `production.env` (temporary, for reference):

```env
# Database
MONGODB_URI=mongodb+srv://fixzit-admin:YOUR_PASSWORD@fixzit-production.xxxxx.mongodb.net/fixzit

# NextAuth
NEXTAUTH_URL=https://fixzit.co
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# AWS S3 (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=fixzit-uploads-prod

# SendGrid (for emails)
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@fixzit.co

# Optional: Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

---

## ⚙️ Step 3: Configure Vercel Environment Variables

```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit

# Add all environment variables to Vercel
vercel env add MONGODB_URI production
# Paste your Atlas connection string when prompted

vercel env add NEXTAUTH_URL production
# Enter: https://fixzit.co

vercel env add NEXTAUTH_SECRET production
# Paste the output from openssl rand -base64 32

vercel env add AWS_ACCESS_KEY_ID production
# Enter your AWS key

vercel env add AWS_SECRET_ACCESS_KEY production
# Enter your AWS secret

vercel env add AWS_REGION production
# Enter: us-east-1

vercel env add AWS_S3_BUCKET production
# Enter: fixzit-uploads-prod

vercel env add SENDGRID_API_KEY production
# Enter your SendGrid API key

vercel env add SENDGRID_FROM_EMAIL production
# Enter: noreply@fixzit.co
```

**Or use environment variables from `.env.local`:**
```bash
vercel env pull .env.production
# Edit .env.production with production values
vercel env add < .env.production
```

---

## 🚀 Step 4: Deploy to Vercel

```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit

# Login to Vercel (if not already)
vercel login

# Link project (first time only)
vercel link

# Deploy to production
vercel --prod
```

**Expected output:**
```
✔ Linked to <your-username>/fixzit
✔ Build Completed in <time>
✔ Deployed to production: https://fixzit-<hash>.vercel.app
```

**Save this URL** - it's your temporary deployment URL.

---

## 🌐 Step 5: Configure Custom Domain (fixzit.co)

### 5a. Add Domain in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project "fixzit"
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `fixzit.co`
6. Click **Add**
7. Also add: `www.fixzit.co` (redirects to fixzit.co)

Vercel will show DNS configuration:

**Option A: Nameservers (Recommended)**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option B: A Record**
```
Type: A
Name: @
Value: 76.76.21.21
```

**Option C: CNAME Record**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 5b. Update GoDaddy DNS

1. Log in to https://www.godaddy.com
2. Go to **My Products** → **Domains**
3. Click **DNS** next to fixzit.co

**For Nameservers (Recommended):**
1. Click **Change** next to Nameservers
2. Select **Custom**
3. Enter:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
4. Click **Save**

**For A Record (Alternative):**
1. Add new record:
   - Type: A
   - Name: @
   - Value: 76.76.21.21
   - TTL: 600 seconds
2. Add CNAME:
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com
   - TTL: 600 seconds
3. Click **Save**

**DNS Propagation:** 5-30 minutes (sometimes up to 48 hours)

---

## ✅ Step 6: Verify Deployment

### 6a. Check Vercel Deployment
```bash
vercel ls
```

Visit your deployment URL and verify:
- [ ] App loads without errors
- [ ] HTTPS certificate is active (green padlock)
- [ ] Login works
- [ ] Database operations work (create, read, update)
- [ ] File uploads work (S3)
- [ ] Email sending works (test forgot password)

### 6b. Check Custom Domain
After DNS propagates:
- [ ] https://fixzit.co loads
- [ ] https://www.fixzit.co redirects to fixzit.co
- [ ] SSL certificate shows "Issued to: fixzit.co"

### 6c. Monitor Errors
```bash
# Watch real-time logs
vercel logs --follow

# Or in Vercel Dashboard:
# https://vercel.com/dashboard → Your Project → Logs
```

---

## 🔧 Troubleshooting

### Issue: "MongoDB connection failed"
**Solution:**
1. Check Atlas IP whitelist includes `0.0.0.0/0`
2. Verify MONGODB_URI is correct in Vercel env vars
3. Check cluster is running (not paused)

### Issue: "NEXTAUTH_URL must be provided"
**Solution:**
```bash
vercel env add NEXTAUTH_URL production
# Enter: https://fixzit.co
vercel --prod
```

### Issue: "Domain not working after 30 minutes"
**Solution:**
```bash
# Check DNS propagation
nslookup fixzit.co
dig fixzit.co

# Should show Vercel's IP: 76.76.21.21
```

### Issue: "Build failed"
**Solution:**
```bash
# Check build logs
vercel logs

# Test build locally
pnpm build
```

---

## 📊 Post-Deployment Tasks (Optional)

### 1. Set Up Monitoring
- [ ] Add Vercel Analytics (free, built-in)
- [ ] Set up Sentry error tracking
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)

### 2. Performance Optimization
- [ ] Enable Vercel Speed Insights
- [ ] Run Lighthouse audit
- [ ] Optimize images with Next.js Image component

### 3. Security
- [ ] Enable Vercel DDoS protection
- [ ] Set up rate limiting
- [ ] Review CORS policies
- [ ] Enable security headers (CSP, HSTS)

### 4. Backups
- [ ] Configure MongoDB Atlas automated backups (free tier: 1 day retention)
- [ ] Set up S3 bucket versioning
- [ ] Document disaster recovery plan

---

## 📞 Support

**Vercel Support:**
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**MongoDB Atlas Support:**
- Dashboard: https://cloud.mongodb.com
- Docs: https://www.mongodb.com/docs/atlas/
- Support: https://www.mongodb.com/cloud/atlas/support

**GoDaddy DNS:**
- DNS Management: https://dcc.godaddy.com/manage/dns
- Support: https://www.godaddy.com/help

---

## 🎯 Quick Start Summary

**Fastest path to production (30 minutes):**

1. **Set up MongoDB Atlas** (10 min)
   - Create free cluster
   - Get connection string
   - Update `.env.local` locally

2. **Configure Vercel** (5 min)
   ```bash
   vercel env add MONGODB_URI production
   vercel env add NEXTAUTH_URL production
   vercel env add NEXTAUTH_SECRET production
   ```

3. **Deploy** (5 min)
   ```bash
   vercel --prod
   ```

4. **Add domain in Vercel** (2 min)
   - Dashboard → Domains → Add fixzit.co

5. **Update GoDaddy nameservers** (3 min)
   - Point to ns1.vercel-dns.com, ns2.vercel-dns.com

6. **Wait for DNS** (5-30 min)
   - Visit https://fixzit.co

**Total:** 30 minutes + DNS propagation time

---

**Next Steps:** Start with MongoDB Atlas setup, then follow this checklist sequentially.
