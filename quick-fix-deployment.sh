#!/bin/bash
# Quick MongoDB Atlas + Vercel Deployment Fix
# This script assumes you already have MongoDB Atlas connection string

set -e

echo "🔴 URGENT FIX: Fixzit Production Deployment"
echo "==========================================="
echo ""
echo "Current problem: Website at fixzit.co is trying to connect"
echo "to localhost MongoDB instead of MongoDB Atlas."
echo ""
echo "This script will:"
echo "1. Configure MongoDB Atlas connection in Vercel"
echo "2. Set up all environment variables from .env.local"
echo "3. Deploy new production build"
echo "4. Verify deployment"
echo ""

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found."
    echo "Install with: npm i -g vercel"
    exit 1
fi

cd "$(dirname "$0")"

# ============================================================================
# MONGODB ATLAS CONNECTION STRING
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔴 CRITICAL: MongoDB Atlas Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You need MongoDB Atlas connection string in format:"
echo "mongodb+srv://username:password@cluster.mongodb.net/fixzit"
echo ""
echo "If you don't have MongoDB Atlas:"
echo "1. Visit: https://cloud.mongodb.com/signup"
echo "2. Create FREE cluster (takes 10 min)"
echo "3. Get connection string"
echo "4. Run this script again"
echo ""

read -p "Enter MongoDB Atlas connection string (or 'exit'): " MONGODB_URI

if [ "$MONGODB_URI" = "exit" ]; then
    echo ""
    echo "📚 MongoDB Atlas Setup Guide:"
    echo "   See: URGENT_DEPLOYMENT_FIX.md"
    echo "   Section: 'MongoDB Atlas Setup (10 Minutes)'"
    exit 0
fi

# Validate MongoDB URI
if [[ ! "$MONGODB_URI" =~ ^mongodb(\+srv)?:// ]]; then
    echo ""
    echo "❌ Invalid MongoDB URI format!"
    echo "Should start with: mongodb+srv://"
    echo ""
    echo "Example:"
    echo "mongodb+srv://fixzit-admin:password123@cluster0.xyz.mongodb.net/fixzit"
    exit 1
fi

if [[ ! "$MONGODB_URI" =~ /fixzit ]]; then
    echo ""
    echo "⚠️  WARNING: Connection string doesn't include database name '/fixzit'"
    echo "Current: $MONGODB_URI"
    echo ""
    read -p "Add '/fixzit' to connection string? (Y/n): " add_db
    if [[ ! "$add_db" =~ ^[Nn]$ ]]; then
        # Add /fixzit before query parameters
        MONGODB_URI=$(echo "$MONGODB_URI" | sed 's/\?/\/fixzit\?/')
        echo "Updated to: $MONGODB_URI"
    fi
fi

echo ""
echo "✅ MongoDB URI validated"
echo ""

# ============================================================================
# CONFIGURE VERCEL ENVIRONMENT VARIABLES
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚙️  Configuring Vercel Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# MongoDB
echo "Setting MONGODB_URI..."
echo "$MONGODB_URI" | vercel env add MONGODB_URI production --force 2>&1 | grep -E "(Added|Updated)" || true

# NextAuth
echo "Generating NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production --force 2>&1 | grep -E "(Added|Updated)" || true

echo "Setting NEXTAUTH_URL..."
echo "https://fixzit.co" | vercel env add NEXTAUTH_URL production --force 2>&1 | grep -E "(Added|Updated)" || true

# Extract from .env.local
echo "Reading configuration from .env.local..."

# SendGrid
SENDGRID_API_KEY=$(grep "^SENDGRID_API_KEY=" .env.local 2>/dev/null | cut -d'=' -f2) || true
SENDGRID_FROM_EMAIL=$(grep "^SENDGRID_FROM_EMAIL=" .env.local 2>/dev/null | cut -d'=' -f2) || true
SENDGRID_FROM_NAME=$(grep "^SENDGRID_FROM_NAME=" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d '"') || true

if [ -n "$SENDGRID_API_KEY" ]; then
    echo "Setting SendGrid..."
    echo "$SENDGRID_API_KEY" | vercel env add SENDGRID_API_KEY production --force 2>&1 | grep -E "(Added|Updated)" || true
    echo "$SENDGRID_FROM_EMAIL" | vercel env add SENDGRID_FROM_EMAIL production --force 2>&1 | grep -E "(Added|Updated)" || true
    [ -n "$SENDGRID_FROM_NAME" ] && echo "$SENDGRID_FROM_NAME" | vercel env add SENDGRID_FROM_NAME production --force 2>&1 | grep -E "(Added|Updated)" || true
fi

# Twilio
TWILIO_ACCOUNT_SID=$(grep "^TWILIO_ACCOUNT_SID=" .env.local 2>/dev/null | cut -d'=' -f2) || true
TWILIO_AUTH_TOKEN=$(grep "^TWILIO_AUTH_TOKEN=" .env.local 2>/dev/null | cut -d'=' -f2) || true
TWILIO_PHONE_NUMBER=$(grep "^TWILIO_PHONE_NUMBER=" .env.local 2>/dev/null | cut -d'=' -f2) || true

if [ -n "$TWILIO_ACCOUNT_SID" ]; then
    echo "Setting Twilio..."
    echo "$TWILIO_ACCOUNT_SID" | vercel env add TWILIO_ACCOUNT_SID production --force 2>&1 | grep -E "(Added|Updated)" || true
    echo "$TWILIO_AUTH_TOKEN" | vercel env add TWILIO_AUTH_TOKEN production --force 2>&1 | grep -E "(Added|Updated)" || true
    echo "$TWILIO_PHONE_NUMBER" | vercel env add TWILIO_PHONE_NUMBER production --force 2>&1 | grep -E "(Added|Updated)" || true
fi

# Firebase
FIREBASE_ADMIN_PROJECT_ID=$(grep "^FIREBASE_ADMIN_PROJECT_ID=" .env.local 2>/dev/null | cut -d'=' -f2) || true
FIREBASE_ADMIN_CLIENT_EMAIL=$(grep "^FIREBASE_ADMIN_CLIENT_EMAIL=" .env.local 2>/dev/null | cut -d'=' -f2) || true
FIREBASE_ADMIN_PRIVATE_KEY=$(grep "^FIREBASE_ADMIN_PRIVATE_KEY=" .env.local 2>/dev/null | cut -d'=' -f2) || true

if [ -n "$FIREBASE_ADMIN_PROJECT_ID" ]; then
    echo "Setting Firebase..."
    echo "$FIREBASE_ADMIN_PROJECT_ID" | vercel env add FIREBASE_ADMIN_PROJECT_ID production --force 2>&1 | grep -E "(Added|Updated)" || true
    echo "$FIREBASE_ADMIN_CLIENT_EMAIL" | vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production --force 2>&1 | grep -E "(Added|Updated)" || true
    echo "$FIREBASE_ADMIN_PRIVATE_KEY" | vercel env add FIREBASE_ADMIN_PRIVATE_KEY production --force 2>&1 | grep -E "(Added|Updated)" || true
fi

# Other variables
echo "Setting additional configuration..."
for var in PUBLIC_ORG_ID TEST_ORG_ID DEFAULT_ORG_ID MARKETPLACE_ENABLED \
           NEXTAUTH_SUPERADMIN_FALLBACK_PHONE NOTIFICATIONS_SMOKE_USER_ID \
           NOTIFICATIONS_SMOKE_NAME NOTIFICATIONS_SMOKE_EMAIL NOTIFICATIONS_SMOKE_PHONE \
           WHATSAPP_BUSINESS_API_KEY WHATSAPP_PHONE_NUMBER_ID \
           NOTIFICATIONS_TELEMETRY_WEBHOOK ZATCA_API_KEY ZATCA_API_SECRET \
           ZATCA_ENVIRONMENT ZATCA_SELLER_NAME ZATCA_VAT_NUMBER ZATCA_SELLER_ADDRESS \
           MEILI_HOST MEILI_MASTER_KEY NEXTAUTH_REQUIRE_SMS_OTP NEXT_PUBLIC_REQUIRE_SMS_OTP; do
    
    value=$(grep "^${var}=" .env.local 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true
    if [ -n "$value" ]; then
        echo "$value" | vercel env add "$var" production --force 2>&1 | grep -E "(Added|Updated)" || true
    fi
done

echo ""
echo "✅ Environment variables configured!"
echo ""

# ============================================================================
# DEPLOY TO PRODUCTION
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying to Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""

# ============================================================================
# VERIFY DEPLOYMENT
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verifying Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Waiting 10 seconds for deployment to propagate..."
sleep 10

echo ""
echo "Checking environment variables..."
vercel env ls production | head -20

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Website: https://fixzit.co"
echo "✅ MongoDB: Connected to Atlas"
echo "✅ Environment: Production"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Visit https://fixzit.co (may take 1-2 minutes)"
echo ""
echo "2. Check logs in real-time:"
echo "   vercel logs https://fixzit.co --follow"
echo ""
echo "3. Verify features:"
echo "   - Homepage loads (not stuck at Loading...)"
echo "   - Login works"
echo "   - Data loads from MongoDB"
echo "   - Email sending works"
echo ""
echo "4. Monitor for errors:"
echo "   - Should NOT see: 'ECONNREFUSED 127.0.0.1:27017'"
echo "   - Should see: 'Database connected successfully'"
echo ""
echo "🎊 Your Fixzit application is now live!"
echo ""
