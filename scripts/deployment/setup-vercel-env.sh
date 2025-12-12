#!/bin/bash
# Fixzit - Vercel Environment Variables Setup Script
# This script will configure all necessary environment variables for production

set -e

echo "🚀 Fixzit - Vercel Production Environment Setup"
echo "================================================"
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "📋 Setting up environment variables for production..."
echo ""

# Function to add environment variable
add_env() {
    local key=$1
    local value=$2
    local env_type=${3:-production}
    
    echo "Adding $key to $env_type..."
    echo "$value" | vercel env add "$key" "$env_type" --force 2>&1 | grep -v "Debugger"
}

# ==============================================================================
# STEP 1: MongoDB Atlas (CRITICAL)
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 STEP 1: MongoDB Atlas Connection String"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  You MUST have MongoDB Atlas set up first!"
echo ""
echo "If you don't have MongoDB Atlas yet:"
echo "1. Visit: https://www.mongodb.com/cloud/atlas/register"
echo "2. Create free cluster (M0 Sandbox)"
echo "3. Get connection string in format:"
echo "   Format: mongodb+srv://USERNAME:PASSWORD[at]CLUSTER-HOST/fixzit"
echo ""
echo "If you have MongoDB Atlas:"
echo "1. Log in to https://cloud.mongodb.com"
echo "2. Click 'Connect' on your cluster"
echo "3. Choose 'Connect your application'"
echo "4. Copy the connection string"
echo ""

read -p "Enter your MongoDB Atlas connection string (or 'skip' to use localhost): " MONGODB_URI

if [ "$MONGODB_URI" = "skip" ]; then
    echo "⚠️  WARNING: Using localhost will NOT work in production!"
    MONGODB_URI="mongodb://localhost:27017/fixzit"
else
    if [[ ! "$MONGODB_URI" =~ ^mongodb(\+srv)?:// ]]; then
        echo "❌ Invalid MongoDB URI format. Should start with mongodb:// or mongodb+srv://"
        exit 1
    fi
fi

echo "$MONGODB_URI" | vercel env add MONGODB_URI production --force

echo ""
echo "✅ MongoDB URI configured"
echo ""

# ==============================================================================
# STEP 2: NextAuth Configuration (CRITICAL)
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 STEP 2: NextAuth Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate NEXTAUTH_SECRET
echo "Generating secure NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production --force
echo "✅ NEXTAUTH_SECRET generated and configured"
echo ""

# Set NEXTAUTH_URL
echo "Setting NEXTAUTH_URL to https://fixzit.co..."
echo "https://fixzit.co" | vercel env add NEXTAUTH_URL production --force
echo "✅ NEXTAUTH_URL configured"
echo ""

# ==============================================================================
# STEP 3: Email (SendGrid) - Already configured in .env.local
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📧 STEP 3: SendGrid (Email)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Read from .env.local
SENDGRID_API_KEY=$(grep "^SENDGRID_API_KEY=" .env.local | cut -d'=' -f2)
SENDGRID_FROM_EMAIL=$(grep "^SENDGRID_FROM_EMAIL=" .env.local | cut -d'=' -f2)
SENDGRID_FROM_NAME=$(grep "^SENDGRID_FROM_NAME=" .env.local | cut -d'=' -f2 | tr -d '"')

if [ -n "$SENDGRID_API_KEY" ]; then
    echo "$SENDGRID_API_KEY" | vercel env add SENDGRID_API_KEY production --force
    echo "$SENDGRID_FROM_EMAIL" | vercel env add SENDGRID_FROM_EMAIL production --force
    echo "$SENDGRID_FROM_NAME" | vercel env add SENDGRID_FROM_NAME production --force
    echo "✅ SendGrid configured"
else
    echo "⚠️  SendGrid not found in .env.local - skipping"
fi
echo ""

# ==============================================================================
# STEP 4: SMS (Taqnyat) - Already configured in .env.local
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 STEP 4: Taqnyat (SMS)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TAQNYAT_BEARER_TOKEN=$(grep "^TAQNYAT_BEARER_TOKEN=" .env.local | cut -d'=' -f2)
TAQNYAT_SENDER_NAME=$(grep "^TAQNYAT_SENDER_NAME=" .env.local | cut -d'=' -f2)

if [ -n "$TAQNYAT_BEARER_TOKEN" ]; then
    echo "$TAQNYAT_BEARER_TOKEN" | vercel env add TAQNYAT_BEARER_TOKEN production --force
    echo "$TAQNYAT_SENDER_NAME" | vercel env add TAQNYAT_SENDER_NAME production --force
    echo "✅ Taqnyat configured"
else
    echo "⚠️  Taqnyat not found in .env.local - skipping"
fi
echo ""

# ==============================================================================
# STEP 5: Firebase (Push Notifications)
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔔 STEP 5: Firebase (Push Notifications)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FIREBASE_ADMIN_PROJECT_ID=$(grep "^FIREBASE_ADMIN_PROJECT_ID=" .env.local | cut -d'=' -f2)
FIREBASE_ADMIN_CLIENT_EMAIL=$(grep "^FIREBASE_ADMIN_CLIENT_EMAIL=" .env.local | cut -d'=' -f2)
FIREBASE_ADMIN_PRIVATE_KEY=$(grep "^FIREBASE_ADMIN_PRIVATE_KEY=" .env.local | cut -d'=' -f2)

if [ -n "$FIREBASE_ADMIN_PROJECT_ID" ]; then
    echo "$FIREBASE_ADMIN_PROJECT_ID" | vercel env add FIREBASE_ADMIN_PROJECT_ID production --force
    echo "$FIREBASE_ADMIN_CLIENT_EMAIL" | vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production --force
    echo "$FIREBASE_ADMIN_PRIVATE_KEY" | vercel env add FIREBASE_ADMIN_PRIVATE_KEY production --force
    echo "✅ Firebase configured"
else
    echo "⚠️  Firebase not found in .env.local - skipping"
fi
echo ""

# ==============================================================================
# STEP 6: Other Environment Variables
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  STEP 6: Additional Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copy other important variables from .env.local
for var in PUBLIC_ORG_ID TEST_ORG_ID DEFAULT_ORG_ID MARKETPLACE_ENABLED \
           NEXTAUTH_SUPERADMIN_FALLBACK_PHONE NOTIFICATIONS_SMOKE_USER_ID \
           NOTIFICATIONS_SMOKE_NAME NOTIFICATIONS_SMOKE_EMAIL NOTIFICATIONS_SMOKE_PHONE \
           WHATSAPP_BUSINESS_API_KEY WHATSAPP_PHONE_NUMBER_ID \
           NOTIFICATIONS_TELEMETRY_WEBHOOK ZATCA_API_KEY ZATCA_API_SECRET \
           ZATCA_ENVIRONMENT ZATCA_SELLER_NAME ZATCA_VAT_NUMBER ZATCA_SELLER_ADDRESS \
           MEILI_HOST MEILI_MASTER_KEY; do
    
    value=$(grep "^${var}=" .env.local | cut -d'=' -f2- | tr -d '"')
    if [ -n "$value" ]; then
        echo "$value" | vercel env add "$var" production --force 2>&1 | grep -v "Debugger" || true
    fi
done

echo "✅ Additional variables configured"
echo ""

# ==============================================================================
# STEP 7: Optional AWS S3 (for file uploads)
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 7: AWS S3 (Optional - for file uploads)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Do you want to configure AWS S3? (y/N): " configure_aws
if [[ "$configure_aws" =~ ^[Yy]$ ]]; then
    read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    read -p "AWS Region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    read -p "S3 Bucket Name: " AWS_S3_BUCKET
    
    echo "$AWS_ACCESS_KEY_ID" | vercel env add AWS_ACCESS_KEY_ID production --force
    echo "$AWS_SECRET_ACCESS_KEY" | vercel env add AWS_SECRET_ACCESS_KEY production --force
    echo "$AWS_REGION" | vercel env add AWS_REGION production --force
    echo "$AWS_S3_BUCKET" | vercel env add AWS_S3_BUCKET production --force
    
    echo "✅ AWS S3 configured"
else
    echo "⏭️  Skipping AWS S3 configuration"
fi
echo ""

# ==============================================================================
# Summary
# ==============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment Variables Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configured variables:"
echo "   ✅ MONGODB_URI"
echo "   ✅ NEXTAUTH_SECRET (auto-generated)"
echo "   ✅ NEXTAUTH_URL (https://fixzit.co)"
echo "   ✅ SendGrid (email)"
echo "   ✅ Taqnyat (SMS)"
echo "   ✅ Firebase (push notifications)"
echo "   ✅ Additional app config"
if [[ "$configure_aws" =~ ^[Yy]$ ]]; then
    echo "   ✅ AWS S3 (file uploads)"
fi
echo ""
echo "🚀 Next step: Deploy to production"
echo ""
echo "Run this command to deploy:"
echo "   cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit"
echo "   vercel --prod"
echo ""
echo "After deployment:"
echo "1. Visit https://fixzit.co (may take 1-2 minutes to update)"
echo "2. Check logs: vercel logs https://fixzit.co --follow"
echo "3. Test login and features"
echo ""
echo "🎉 Your Fixzit application is ready for production!"
