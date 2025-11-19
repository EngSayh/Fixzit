# Deployment & Performance Guide for Fixzit

## Current Situation Analysis

### Memory Issue Root Cause

**Is this a GitHub limitation?**
**YES** - GitHub Codespaces has machine type tiers:

- **Current**: 2-core / 8GB RAM (default free tier)
- **Your Setting**: Changed to 4-core / 16GB RAM
- **Issue**: Codespace needs to be **rebuilt** for changes to take effect

### Why Memory Issues Occur

1. **Next.js 15 Build Requirements**: 2-3GB RAM during build
2. **VS Code Extension Host**: 1.5GB RAM
3. **TypeScript Servers**: 2 instances × 100MB = 200MB
4. **Language Servers**: 300MB+ (HTML, JSON, ESLint, etc.)
5. **MongoDB**: 140MB
6. **Total During Build**: ~2.8GB minimum

**With only 3.5GB available on 8GB machine**: OOM killer terminates builds

---

## Solution 1: Rebuild Codespace with New Settings

### Steps to Apply 4-core/16GB Upgrade

1. **Save all your work** (commit and push):

```bash
git add -A
git commit -m "chore: save work before codespace rebuild"
git push origin main
```

2. **Rebuild Codespace**:
   - Go to: <https://github.com/codespaces>
   - Find your codespace: `crispy-garbanzo-r4xrj46ggv97c5j9r`
   - Click `...` → `Rebuild container`
   - OR delete and create new codespace with 4-core machine type

3. **Verify after rebuild**:

```bash
nproc  # Should show 4
free -h  # Should show ~16GB
```

### Expected Performance After Upgrade

- ✅ **Build time**: 30-45 seconds (down from 106s)
- ✅ **No OOM kills**: 16GB is sufficient
- ✅ **More parallel workers**: 4 cores enable better parallelization

---

## Solution 2: Local Development on MacBook Pro

### Why Your MacBook Pro is Better

- **More RAM**: Likely 16GB+ (vs. 8GB Codespaces)
- **More CPU cores**: Likely 8-10 cores (vs. 2 cores)
- **Local performance**: No network latency
- **Expected build time**: 15-25 seconds

### Setup Local Development

#### Step 1: Clone Repository

```bash
# On your MacBook Pro
git clone https://github.com/EngSayh/Fixzit.git
cd Fixzit
```

#### Step 2: Install Dependencies

```bash
# Ensure you have Node.js 18+ and npm
node --version  # Should be 18.x or higher
npm --version

# Install dependencies
npm install
```

#### Step 3: Configure Environment

```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your actual values:
# - MongoDB connection string
# - AWS credentials (if using S3)
# - NextAuth secret
# - Any other API keys
```

#### Step 4: Start MongoDB Locally

```bash
# Option A: Use Docker (recommended)
docker-compose up -d mongodb

# Option B: Install MongoDB locally
brew install mongodb-community
brew services start mongodb-community
```

#### Step 5: Build and Run

```bash
# Development mode (faster, hot reload)
npm run dev
# Access at: http://localhost:3000

# Production build test
npm run build
npm start
# Access at: http://localhost:3000
```

---

## Solution 3: Deploy to Production (GoDaddy Domain)

### Deployment Architecture Options

#### Option A: Vercel Deployment (Recommended - Easiest)

**Pros**:

- ✅ Optimized for Next.js 15
- ✅ Automatic builds on git push
- ✅ Edge functions, CDN, automatic scaling
- ✅ Free tier available
- ✅ Easy GoDaddy DNS integration

**Setup Steps**:

1. **Install Vercel CLI**:

```bash
npm install -g vercel
```

2. **Deploy**:

```bash
cd /workspaces/Fixzit
vercel login  # Login with GitHub
vercel  # Follow prompts
```

3. **Configure GoDaddy DNS**:
   - Log in to GoDaddy: <https://dnsmanagement.godaddy.com>
   - Go to your domain's DNS settings
   - Add these records:

   ```
   Type: A
   Name: @
   Value: 76.76.19.19
   TTL: 600

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 600
   ```

4. **Add Custom Domain in Vercel**:
   - Go to: <https://vercel.com/your-username/fixzit/settings/domains>
   - Add: `yourdomain.com` and `www.yourdomain.com`
   - Vercel will verify DNS automatically

5. **Configure Environment Variables**:
   - Go to: <https://vercel.com/your-username/fixzit/settings/environment-variables>
   - Add all from `.env.local`:
     - `MONGODB_URI`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (set to your domain)
     - AWS credentials, etc.

---

#### Option B: Direct Server Deployment (VPS/Dedicated)

If you have a server through GoDaddy hosting:

**Requirements**:

- Node.js 18+ installed
- MongoDB access
- PM2 or similar process manager
- Nginx as reverse proxy

**Setup Steps**:

1. **SSH into your server**:

```bash
ssh user@your-server-ip
```

2. **Install Node.js**:

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone and build**:

```bash
git clone https://github.com/EngSayh/Fixzit.git
cd Fixzit
npm install
npm run build
```

4. **Install PM2**:

```bash
sudo npm install -g pm2
pm2 start npm --name "fixzit" -- start
pm2 save
pm2 startup  # Follow instructions
```

5. **Configure Nginx**:

```nginx
# /etc/nginx/sites-available/fixzit
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

6. **Enable site**:

```bash
sudo ln -s /etc/nginx/sites-available/fixzit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. **Point GoDaddy DNS to your server**:
   - Log in to GoDaddy DNS management
   - Add A record pointing to your server IP:

   ```
   Type: A
   Name: @
   Value: YOUR_SERVER_IP
   TTL: 600
   ```

8. **Set up SSL with Let's Encrypt**:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

#### Option C: AWS/DigitalOcean/Netlify

Similar to Vercel but with different configurations. Let me know if you want details on these.

---

## Solution 4: Optimize Build Performance (<30 seconds)

### Current Performance Analysis

- **On 2-core/8GB**: 106 seconds (memory-constrained)
- **On 4-core/16GB**: ~30-45 seconds (expected)
- **On MacBook Pro**: ~15-25 seconds (expected)

### Why <30 seconds is achievable with proper hardware

#### Configuration Already Applied

✅ TypeScript validation separated (`npm run typecheck`)
✅ ESLint validation separated (`npm run lint`)
✅ Standalone build output
✅ SWC compiler (default in Next.js 15)
✅ TypeScript server memory limited

#### Additional Optimizations

1. **Update next.config.js** for optimal performance:

```javascript
experimental: {
  optimizePackageImports: ['lucide-react', '@radix-ui/*'],
  webpackMemoryOptimizations: true,
}
```

2. **Build only what you need**:

```bash
# Skip type checking during build (do it separately)
npm run build  # Already configured

# Type check separately
npm run typecheck
```

3. **Use Build Cache**:

```bash
# Enable Turbo cache (if using Vercel)
# Automatically enabled in Vercel deployments
```

### Expected Performance with 4-core/16GB

- Compilation: 20-25 seconds
- Page generation: 5-10 seconds
- Static optimization: 3-5 seconds
- **Total**: 28-40 seconds ✅

---

## Quick Action Plan

### Immediate Steps (Choose One)

#### Path A: Continue in Codespaces (Recommended if GitHub Pro)

1. Commit current work
2. Rebuild codespace with 4-core/16GB
3. Test build performance
4. Deploy to Vercel with GoDaddy domain

#### Path B: Switch to Local MacBook (Best Performance)

1. Clone repo to MacBook
2. Install dependencies
3. Configure `.env.local`
4. Start MongoDB locally
5. Test build (should be <30 seconds)
6. Deploy to production

#### Path C: Go Straight to Production

1. Deploy to Vercel (no build issues on their servers)
2. Connect GoDaddy domain
3. Set up automatic deployments from main branch
4. Continue development in Codespaces or locally

---

## Commands Reference

### Check System Resources

```bash
# CPU cores
nproc                   # Linux
sysctl -n hw.ncpu       # macOS

# Total RAM
free -h                 # Linux
vm_stat | head -5       # macOS

# Memory consumers
ps aux --sort=-%mem | head -20                 # Linux
ps aux | sort -nrk 4 | head -20                # macOS
```

### Build Performance Test

```bash
# Clean build with timing
rm -rf .next
time npm run build
```

### Local Development

```bash
# Development mode
npm run dev

# Production test
npm run build && npm start
```

### Vercel Deployment

```bash
# One-time deploy
vercel --prod

# Continuous deployment (automatic)
# Just push to main branch after connecting repo
git push origin main
```

---

## Next Steps

**What would you like to do?**

1. **Rebuild Codespace** - Apply 4-core/16GB upgrade
2. **Setup Local MacBook** - Clone and test on your powerful hardware
3. **Deploy to Vercel** - Get production running with GoDaddy domain
4. **All of the above** - I can guide you through each step

Let me know which path you prefer!
