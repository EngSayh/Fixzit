# 🔐 Fixzit Credentials Setup Guide

**Date:** October 20, 2025  
**Status:** Ready for user configuration  
**Estimated Time:** 20-25 minutes

---

## 📋 Todo List Overview

✅ = Done | ⏳ = In Progress | ⚠️ = Blocked | 🔴 = Not Started

| # | Task | Status | Time |
|---|------|--------|------|
| 1 | Get MongoDB Atlas URI | 🔴 | 5 min |
| 2 | Get Google OAuth credentials | 🔴 | 5 min |
| 3 | Get Google Maps API key | 🔴 | 2 min |
| 4 | Generate security secrets | 🔴 | 1 min |
| 5 | Configure .env.local | 🔴 | 3 min |
| 6 | Fix Node.js environment | 🔴 | 2-3 min |
| 7 | Install & start server | 🔴 | 5 min |
| 8 | Apply remaining MongoDB fixes | 🔴 | 5 min |
| 9 | Test in browser | 🔴 | 5 min |

---

## 🎯 Task 1: MongoDB Atlas Connection String

### Steps:
1. **Navigate to:** https://cloud.mongodb.com
2. **Login** (or create free account)
3. **Create cluster:**
   - Click "Build a Database"
   - Choose "FREE" tier (M0 Sandbox)
   - Select region closest to you
   - Cluster name: `fixzit`
4. **Create database user:**
   - Security → Database Access
   - Add new user: `fixzit-user`
   - Password: Generate strong password (save it!)
   - Role: Read and write to any database
5. **Whitelist IP:**
   - Security → Network Access
   - Add IP Address → Allow access from anywhere (0.0.0.0/0) for development
6. **Get connection string:**
   - Click "Connect" on your cluster
   - "Connect your application"
   - Driver: Node.js, Version: 5.5 or later
   - Copy connection string

### Example:
```
mongodb+srv://fixzit-user:<password>@fixzit.abc123.mongodb.net/fixzit?retryWrites=true&w=majority
```

### ⚠️ Important:
- Replace `<password>` with your actual password
- Database name: `fixzit`

---

## 🎯 Task 2: Google OAuth Credentials

### Steps:
1. **Navigate to:** https://console.cloud.google.com/apis/credentials
2. **Create/select project:**
   - Click project dropdown (top bar)
   - "New Project" → Name: `Fixzit` → Create
3. **Configure OAuth consent screen:**
   - APIs & Services → OAuth consent screen
   - User Type: External → Create
   - App name: `Fixzit`
   - User support email: Your email
   - Developer contact: Your email
   - Save and Continue
4. **Create OAuth 2.0 Client ID:**
   - Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Name: `Fixzit Web App`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Create
5. **Copy credentials:**
   - Client ID: (looks like `123456789-abc...apps.googleusercontent.com`)
   - Client Secret: (looks like `GOCSPX-abc123...`)

### Example:
```
GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789
```

---

## 🎯 Task 3: Google Maps API Key

### Steps:
1. **Same Google Cloud Console:** https://console.cloud.google.com/apis/credentials
2. **Enable APIs:**
   - Navigation menu → APIs & Services → Library
   - Search "Maps JavaScript API" → Enable
   - Search "Geocoding API" → Enable (optional, recommended)
3. **Create API Key:**
   - Credentials → Create Credentials → API Key
   - Copy the key immediately
4. **Restrict key (recommended):**
   - Click "Restrict Key"
   - API restrictions: Select "Maps JavaScript API"
   - Application restrictions: HTTP referrers
   - Add: `http://localhost:3000/*`
   - Save

### Example:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAbc123Def456Ghi789Jkl012Mno345Pqr
```

---

## 🎯 Task 4: Generate Security Secrets

### Option A: Using openssl (if available)
```bash
# Generate NEXTAUTH_SECRET (44 characters)
openssl rand -base64 32

# Generate JWT_SECRET (64 hex characters)
openssl rand -hex 32

# Generate INTERNAL_API_TOKEN (32 hex characters)
openssl rand -hex 16
```

### Option B: Node.js crypto module (cross-platform)
```bash
# Generate NEXTAUTH_SECRET (32 bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_SECRET (64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate INTERNAL_API_TOKEN (32 hex characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Option C: Online generators (⚠️ Use with caution - offline methods preferred)
**Security Warning**: Online generators send secrets over the network. Use offline methods (Options A or B) for production.

- NEXTAUTH_SECRET: https://generate-secret.vercel.app/32
- JWT_SECRET: https://www.random.org/strings/?num=1&len=64&digits=on&loweralpha=on&unique=on&format=plain
- INTERNAL_API_TOKEN: https://www.random.org/strings/?num=1&len=32&digits=on&loweralpha=on&unique=on&format=plain

### Example output:
```
NEXTAUTH_SECRET=Abc123Def456Ghi789Jkl012Mno345Pqr678Stu==
JWT_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
INTERNAL_API_TOKEN=0123456789abcdef0123456789abcdef
```

---

## 🎯 Task 5: Configure .env.local

### Steps:
1. **Open file:**
   ```bash
   nano /workspaces/Fixzit/.env.local
   ```

2. **Replace ALL CHANGEME values:**

```bash
# Database - MongoDB Atlas (from Task 1)
MONGODB_URI=mongodb+srv://fixzit-user:YOUR_ACTUAL_PASSWORD@fixzit.abc123.mongodb.net/fixzit?retryWrites=true&w=majority&tls=true
MONGODB_DB=fixzit

# JWT Secret (from Task 4)
JWT_SECRET=YOUR_64_HEX_CHARACTERS_HERE

# NextAuth v5 (from Task 4)
NEXTAUTH_SECRET=YOUR_BASE64_SECRET_HERE
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (from Task 2)
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Google Maps API (from Task 3)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_MAPS_API_KEY

# Internal API Token (from Task 4)
INTERNAL_API_TOKEN=YOUR_32_HEX_CHARACTERS_HERE

# Keep these as-is
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

3. **Save and exit:**
   - Press `Ctrl+O` (write out)
   - Press `Enter` (confirm)
   - Press `Ctrl+X` (exit)

### ✅ Verification:
```bash
# Check no CHANGEME values remain
grep -c "CHANGEME" /workspaces/Fixzit/.env.local
# Should output: 0
```

---

## 🎯 Task 6: Fix Node.js Environment

### Current Status:
```
❌ Node.js NOT in PATH
❌ npm NOT available
❌ pnpm NOT available
```

### Option A: Rebuild Container (Recommended)
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Dev Containers: Rebuild Container`
3. Press `Enter`
4. Wait 2-3 minutes for rebuild
5. Terminal will reconnect automatically
6. Verify:
   ```bash
   node --version  # Should show v20.x
   npm --version   # Should show 10.x
   ```

### Option B: Quick Install (30 seconds)
```bash
# Install Node.js and npm in Alpine
apk add nodejs npm

# Verify installation
node --version  # Should show v20.x or v22.x
npm --version   # Should show 10.x
```

---

## 🎯 Task 7: Install Dependencies & Start Server

### After Node.js is available:

```bash
# Navigate to project root
cd /workspaces/Fixzit

# Option A: Use quick-start script (recommended)
./quick-start.sh

# Option B: Manual installation
npm install
npm run dev
```

### Expected output:
```
▲ Next.js 15.5.4
- Local:        http://localhost:3000
- Network:      http://172.x.x.x:3000

✓ Ready in 3.2s
○ Compiling / ...
✓ Compiled / in 2.1s
```

### If you see errors:
- **"Cannot find module"**: Run `npm install` first
- **"Port 3000 in use"**: Kill process: `lsof -ti:3000 | xargs kill -9`
- **"MongoDB connection failed"**: Check MONGODB_URI in .env.local
- **"CHANGEME detected"**: You didn't complete Task 5

---

## 🎯 Task 8: Apply Remaining MongoDB Fixes

### Files to fix (3 remaining):

#### 1. app/api/aqar/favorites/route.ts (line ~101)
**Find:**
```typescript
{ $inc: { 'analytics.favorites': 1 }, 'analytics.lastFavoritedAt': new Date() }
```

**Replace with:**
```typescript
{ $inc: { 'analytics.favorites': 1 }, $set: { 'analytics.lastFavoritedAt': new Date() } }
```

#### 2. app/api/aqar/favorites/[id]/route.ts (line ~45)
**Find:**
```typescript
{ $inc: { 'analytics.favorites': -1 }, 'analytics.lastUpdatedAt': new Date() }
```

**Replace with:**
```typescript
{ $inc: { 'analytics.favorites': -1 }, $set: { 'analytics.lastUpdatedAt': new Date() } }
```

#### 3. app/api/aqar/leads/route.ts (line ~89)
**Find:**
```typescript
{ $inc: { 'analytics.leads': 1 }, 'analytics.lastLeadAt': new Date() }
```

**Replace with:**
```typescript
{ $inc: { 'analytics.leads': 1 }, $set: { 'analytics.lastLeadAt': new Date() } }
```

### Quick fix command:
```bash
# I can help with these if you want me to apply the fixes automatically
```

---

## 🎯 Task 9: Test in Browser

### 1. Access the application:
- In VS Code, click **"PORTS"** tab (bottom panel)
- Find port **3000**
- Click the **globe icon** (🌐) to open in browser
- Or manually visit: http://localhost:3000

### 2. Test Google Sign-In:
- Click **"Sign in with Google"** button
- Select your Google account
- Authorize the app
- Should redirect back to app with your profile

### 3. Test Google Maps:
- Navigate to any property listing
- Verify map loads with markers
- Check map controls work (zoom, pan)

### 4. Test Favorites:
- Add a property to favorites
- Check favorites list updates
- Remove from favorites

### 5. Check browser console:
- Press `F12` (Developer Tools)
- Console tab should have no red errors
- Network tab: All API calls should return 200

---

## 🆘 Troubleshooting

### Problem: "CHANGEME detected in .env.local"
**Solution:** You didn't replace all placeholder values. Go back to Task 5 and complete it.

### Problem: "Cannot connect to MongoDB"
**Solutions:**
1. Verify MONGODB_URI is correct in .env.local
2. Check your IP is whitelisted in MongoDB Atlas (0.0.0.0/0 for dev)
3. Test connection: `mongosh "YOUR_MONGODB_URI"`
4. Verify username/password are correct

### Problem: "Google Sign-In fails"
**Solutions:**
1. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
2. Verify redirect URI in Google Console: `http://localhost:3000/api/auth/callback/google`
3. Check OAuth consent screen is configured
4. Try clearing browser cookies

### Problem: "Google Maps not loading"
**Solutions:**
1. Verify NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
2. Check API key is restricted to correct referrer
3. Ensure "Maps JavaScript API" is enabled in Google Console
4. Check browser console for specific error messages

### Problem: "Port 3000 already in use"
**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Problem: "Module not found" errors
**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Problem: "npm: command not found"
**Solution:** You skipped Task 6. Go back and fix Node.js environment.

---

## 📊 Summary Checklist

Before starting the server, ensure:

- [ ] MongoDB Atlas cluster created and connection string obtained
- [ ] Google OAuth credentials (Client ID + Secret) obtained
- [ ] Google Maps API key obtained and Maps JavaScript API enabled
- [ ] All security secrets generated (NEXTAUTH_SECRET, JWT_SECRET, INTERNAL_API_TOKEN)
- [ ] .env.local file has NO CHANGEME values (verify with `grep CHANGEME .env.local`)
- [ ] Node.js installed and available (`node --version` works)
- [ ] Dependencies installed (`node_modules` folder exists)

---

## 🚀 Quick Start Commands (After Setup)

```bash
# Check prerequisites
./quick-start.sh

# Or manually
cd /workspaces/Fixzit
npm install
npm run dev

# In another terminal, run tests
npm test

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

---

## 📞 Need Help?

If you get stuck:
1. Check the troubleshooting section above
2. Review the error message carefully
3. Verify each task was completed correctly
4. Check SYSTEM_FIXES_COMPLETE_2025_10_20.md for detailed technical docs

---

**Good luck! 🎉**
