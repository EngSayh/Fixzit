# Direct GoDaddy Deployment Guide for Fixzit

## Why Deploy Directly to GoDaddy?

✅ **You own the hosting** - Already paying for it, why pay elsewhere?  
✅ **Full control** - No third-party limitations  
✅ **Cost effective** - Use what you're already paying for  
✅ **Direct domain connection** - No DNS complexity

## GoDaddy Hosting Types & Compatibility

### 1. **Shared Hosting** ❌ (NOT COMPATIBLE)

- **Does NOT support Node.js**
- Only supports PHP, HTML, static files
- **Solution**: Upgrade to VPS or use static export

### 2. **VPS Hosting** ✅ (RECOMMENDED)

- **Supports Node.js** fully
- Full server control with SSH access
- Can install any dependencies
- **This guide assumes VPS**

### 3. **Dedicated Server** ✅ (BEST)

- Same as VPS but more powerful
- Same setup process as VPS

### 4. **cPanel Hosting** ⚠️ (LIMITED)

- Some plans support Node.js apps
- Limited control, uses Node.js Selector
- Not ideal for Next.js

---

## Deployment Options for GoDaddy

### Option A: Direct VPS Deployment (Full Next.js)

**Best if you have**: GoDaddy VPS or Dedicated Server

#### What You'll Deploy

- Full Next.js 15 application with API routes
- Server-side rendering (SSR)
- Dynamic features
- MongoDB connection
- File uploads, real-time features

#### Requirements

- ✅ Node.js 18+ installed on server
- ✅ SSH access to your GoDaddy server
- ✅ PM2 or systemd for process management
- ✅ Nginx as reverse proxy
- ✅ MongoDB (either on same server or external)

---

### Option B: Static Export (For Shared Hosting)

**Best if you have**: GoDaddy Shared Hosting (cPanel)

#### What You'll Deploy

- Static HTML/CSS/JS files
- No server-side rendering
- No API routes (need external backend)
- Just the frontend

#### Limitations

- ❌ No dynamic server-side features
- ❌ No API routes in Next.js
- ❌ No authentication through NextAuth
- ✅ Fast and simple
- ✅ Works on any hosting

---

## FULL GUIDE: Deploy to GoDaddy VPS

### Step 1: Check Your GoDaddy Hosting Type

**Log in to GoDaddy**:

1. Go to: <https://account.godaddy.com/products>
2. Find your hosting plan
3. Look for:
   - "VPS Hosting" or "Virtual Private Server" ✅
   - "Dedicated Server" ✅
   - "Web Hosting" or "cPanel" ❌

**If you have VPS or Dedicated**, continue below.  
**If you have Shared Hosting**, scroll to "Static Export Option"

---

### Step 2: Connect to Your GoDaddy VPS

#### Get Your SSH Credentials

1. Go to GoDaddy → My Products → VPS Hosting
2. Click "Manage"
3. Find SSH access details:
   - **IP Address**: e.g., 123.45.67.89
   - **Username**: Usually `root` or your username
   - **Port**: Usually 22

#### Connect via SSH

```bash
# From your MacBook Terminal
ssh root@YOUR_SERVER_IP

# Or if custom port
ssh -p 2222 root@YOUR_SERVER_IP
```

If you need to set up SSH key authentication:

```bash
# On your MacBook, generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to server
ssh-copy-id root@YOUR_SERVER_IP
```

---

### Step 3: Prepare Your GoDaddy Server

Once connected via SSH, run these commands:

#### Update System

```bash
# For Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# For CentOS/RHEL
sudo yum update -y
```

#### Install Node.js 18+

```bash
# For Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

#### Install Git

```bash
sudo apt-get install -y git

# Or for CentOS
sudo yum install -y git
```

#### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

#### Install Nginx (Reverse Proxy)

```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### Step 4: Set Up MongoDB

#### Option A: MongoDB on Same Server

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database user
mongosh
> use fixzit
> db.createUser({
    user: "fixzituser",
    pwd: "your_secure_password",
    roles: ["readWrite"]
  })
> exit
```

#### Option B: Use MongoDB Atlas (Recommended)

- Go to: <https://www.mongodb.com/cloud/atlas>
- Create free cluster
- Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/fixzit`

---

### Step 5: Deploy Your Application

#### Create Application Directory

```bash
cd /var/www
sudo mkdir fixzit
sudo chown $USER:$USER fixzit
cd fixzit
```

#### Clone Your Repository

```bash
# Using HTTPS
git clone https://github.com/EngSayh/Fixzit.git .

# Or using SSH (if you set up deploy keys)
git clone git@github.com:EngSayh/Fixzit.git .
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

```bash
# Create .env.local
nano .env.local
```

Add your environment variables:

```env
# MongoDB
MONGODB_URI=mongodb://fixzituser:your_secure_password@localhost:27017/fixzit
# Or if using Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fixzit

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_very_long_random_secret_key_here

# AWS S3 (if using)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Add any other environment variables from your env.example
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

#### ⚠️ Security Warning: Protect Your Environment Variables

**IMPORTANT**: Never commit `.env.local` to version control!

1. **Verify `.gitignore`**: Ensure `.env.local` is listed in your `.gitignore` file. Add it if missing:

   ```bash
   echo ".env.local" >> .gitignore
   ```

2. **Restrict file permissions**: Make the file readable only by the owner:

   ```bash
   chmod 600 .env.local
   ```

3. **Use strong secrets**: Generate random secrets with a secure tool:

   ```bash
   # Generate a secure secret (use this for NEXTAUTH_SECRET)
   openssl rand -base64 32
   ```

4. **Separate credentials**: Use different passwords/keys for production and development. Never reuse production credentials in development environments.

#### Build the Application

```bash
npm run build
```

This should complete successfully on the VPS (it has better resources than Codespaces).

---

### Step 6: Configure PM2 to Run Your App

#### Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

Add this configuration:

```javascript
module.exports = {
  apps: [
    {
      name: "fixzit",
      script: "npm",
      args: "start",
      cwd: "/var/www/fixzit",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

#### Start Your Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

The last command will output a command to run - **copy and run it**.

#### Check App Status

```bash
pm2 status
pm2 logs fixzit
```

Your app is now running on port 3000!

---

### Step 7: Configure Nginx as Reverse Proxy

#### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/fixzit
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req zone=general burst=20 nodelay;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/fixzit_access.log;
    error_log /var/log/nginx/fixzit_error.log;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files with caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    # Public files
    location /public {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 1h;
    }
}
```

#### Enable the Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/fixzit /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Step 8: Point Your GoDaddy Domain to VPS

#### Get Your VPS IP Address

```bash
curl ifconfig.me
# Note this IP address, e.g., 123.45.67.89
```

#### Update DNS Records in GoDaddy

1. Go to: <https://dnsmanagement.godaddy.com>
2. Find your domain
3. Click "DNS" or "Manage DNS"
4. Update/Add these records:

   ```
   Type: A
   Name: @
   Value: YOUR_VPS_IP_ADDRESS (e.g., 123.45.67.89)
   TTL: 600 (10 minutes)

   Type: A
   Name: www
   Value: YOUR_VPS_IP_ADDRESS (e.g., 123.45.67.89)
   TTL: 600
   ```

5. Save changes

**DNS propagation takes 10-60 minutes**. You can check progress:

```bash
# On your MacBook
dig yourdomain.com
nslookup yourdomain.com
```

---

### Step 9: Set Up SSL Certificate (HTTPS)

#### Install Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

#### Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:

- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

#### Auto-Renewal

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

**Your site is now live with HTTPS!** 🎉

---

### Step 10: Set Up Automatic Deployments

#### Option A: Manual Deployment Script

Create a deployment script on your server:

```bash
nano /var/www/fixzit/deploy.sh
```

Add:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Fixzit..."

# Pull latest code
cd /var/www/fixzit
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart app
pm2 restart fixzit

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x /var/www/fixzit/deploy.sh
```

To deploy updates:

```bash
cd /var/www/fixzit
./deploy.sh
```

---

#### Option B: GitHub Actions Auto-Deploy

Create `.github/workflows/deploy-godaddy.yml` in your repository:

```yaml
name: Deploy to GoDaddy VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/fixzit
            git pull origin main
            npm install
            npm run build
            pm2 restart fixzit
```

**Set up deploy key and GitHub secrets**:

⚠️ **Security Best Practice**: Never use your personal SSH key for automation. Create a dedicated deploy key instead.

1. **Generate a dedicated deploy key** (on your local machine):

   ```bash
   # Create a dedicated key pair for deployment
   ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -C "fixzit-deploy"
   # Press Enter when prompted for passphrase (no passphrase for CI/CD)
   ```

2. **Copy the public key to your VPS**:

   ```bash
   # Copy the public key
   cat ~/.ssh/deploy_key.pub

   # SSH to your VPS and add it to authorized_keys
   ssh root@YOUR_VPS_IP
   mkdir -p ~/.ssh
   chmod 700 ~/.ssh
   echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   exit
   ```

3. **Add secrets to GitHub**:
   - Go to: <https://github.com/EngSayh/Fixzit/settings/secrets/actions>
   - Add these secrets:
     - `VPS_HOST`: Your VPS IP address
     - `VPS_USERNAME`: Usually `root` or your deploy user
     - `DEPLOY_SSH_KEY`: The **private** deploy key (from `~/.ssh/deploy_key`, NOT your personal key)

   ```bash
   # Display the private key to copy to GitHub Secrets
   cat ~/.ssh/deploy_key
   ```

4. **Security notes**:
   - ⚠️ Never use personal SSH keys (`~/.ssh/id_ed25519`) for automation
   - 🔒 The deploy key should only have access to the deployment server
   - 🔄 Rotate the deploy key periodically (every 90-180 days)
   - 🗑️ Revoke the key immediately if compromised

Now every push to `main` will auto-deploy securely! 🚀

---

## Quick Reference Commands

### On Your VPS

```bash
# View app status
pm2 status

# View logs
pm2 logs fixzit

# Restart app
pm2 restart fixzit

# Deploy updates manually
cd /var/www/fixzit && ./deploy.sh

# Check Nginx status
sudo systemctl status nginx

# Reload Nginx config
sudo systemctl reload nginx
```

### Troubleshooting

```bash
# Check if port 3000 is listening
netstat -tlnp | grep 3000

# Check Nginx error logs
sudo tail -f /var/log/nginx/fixzit_error.log

# Check PM2 logs
pm2 logs fixzit --lines 100

# Check MongoDB status
sudo systemctl status mongod
```

---

## Cost Comparison

| Service                       | Monthly Cost         | Build Time          | Setup Complexity |
| ----------------------------- | -------------------- | ------------------- | ---------------- |
| **GoDaddy VPS** (your option) | $5-20 (already paid) | Fast on VPS         | Medium           |
| **Vercel**                    | Free tier / $20+     | Very fast           | Easy             |
| **AWS EC2**                   | $5-50+               | Depends on instance | Complex          |
| **DigitalOcean**              | $6-40                | Fast                | Medium           |

**Bottom line**: If you already have GoDaddy VPS, use it! No additional cost.

---

## What Type of GoDaddy Hosting Do You Have?

Please tell me:

1. **What GoDaddy plan do you have?** (VPS, Shared, Dedicated)
2. **Do you have SSH access?** (Can you log in via terminal?)
3. **What's your domain name?** (so I can help configure DNS)

Based on your answers, I'll give you the exact steps for your situation! 🎯
