#!/bin/bash

# 🔐 Notification Credentials Setup Script
# This script helps you populate .env.local with notification service credentials

set -e

echo "🚀 Fixzit Notification Credentials Setup"
echo "=========================================="
echo ""
echo "This script will help you configure notification services."
echo "You can skip any service by pressing Enter without typing anything."
echo ""

ENV_FILE=".env.local"

# Backup existing .env.local
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "✅ Backed up existing .env.local"
fi

# Helper function to update or append env var
update_env_var() {
  local key=$1
  local value=$2
  
  if [ -z "$value" ]; then
    echo "⏭️  Skipping $key (empty)"
    return
  fi
  
  # Remove existing line if present
  sed -i.tmp "/^${key}=/d" "$ENV_FILE" 2>/dev/null || true
  rm -f "${ENV_FILE}.tmp"
  
  # Append new value
  echo "${key}=${value}" >> "$ENV_FILE"
  echo "✅ Set $key"
}

echo ""
echo "📧 STEP 1: Common Smoke Test Settings"
echo "--------------------------------------"

# Check MongoDB for test user
echo ""
echo "Looking for test users in MongoDB..."
MONGODB_URI=$(grep "^MONGODB_URI=" "$ENV_FILE" | cut -d'=' -f2)

if [ -n "$MONGODB_URI" ]; then
  echo "MongoDB URI found: ${MONGODB_URI:0:30}..."
  echo ""
  echo "To find a test user ID, run:"
  echo "  mongosh \"$MONGODB_URI\" --eval 'db.users.findOne({role: \"SUPER_ADMIN\"}, {_id: 1, email: 1, contact: 1})'"
  echo ""
fi

read -p "Enter NOTIFICATIONS_SMOKE_USER_ID (MongoDB user _id): " user_id
read -p "Enter NOTIFICATIONS_SMOKE_EMAIL (test email): " user_email
read -p "Enter NOTIFICATIONS_SMOKE_PHONE (format: +966XXXXXXXXX): " user_phone

update_env_var "NOTIFICATIONS_SMOKE_USER_ID" "$user_id"
update_env_var "NOTIFICATIONS_SMOKE_NAME" "Ops On-Call"
update_env_var "NOTIFICATIONS_SMOKE_EMAIL" "$user_email"
update_env_var "NOTIFICATIONS_SMOKE_PHONE" "$user_phone"

echo ""
echo "📨 STEP 2: SendGrid Email (Optional)"
echo "-------------------------------------"
echo "Get your API key from: https://app.sendgrid.com/settings/api_keys"
echo ""

read -p "Enter SENDGRID_API_KEY (starts with SG., or press Enter to skip): " sendgrid_key
read -p "Enter SENDGRID_FROM_EMAIL [noreply@fixzit.co]: " sendgrid_from
sendgrid_from=${sendgrid_from:-noreply@fixzit.co}

update_env_var "SENDGRID_API_KEY" "$sendgrid_key"
update_env_var "SENDGRID_FROM_EMAIL" "$sendgrid_from"
update_env_var "SENDGRID_FROM_NAME" "Fixzit Notifications"

echo ""
echo "📱 STEP 3: Taqnyat SMS (Required for production SMS)"
echo "----------------------------------------------------"
echo "Get credentials from: https://www.taqnyat.sa"
echo ""

read -p "Enter TAQNYAT_BEARER_TOKEN (or press Enter to skip): " taqnyat_token
read -p "Enter TAQNYAT_SENDER_NAME (registered sender ID): " taqnyat_sender

update_env_var "TAQNYAT_BEARER_TOKEN" "$taqnyat_token"
update_env_var "TAQNYAT_SENDER_NAME" "$taqnyat_sender"

echo ""
echo "🔔 STEP 4: Firebase Push (Optional)"
echo "------------------------------------"
echo "Get service account JSON from: https://console.firebase.google.com"
echo "Project Settings → Service Accounts → Generate New Private Key"
echo ""

read -p "Do you have a Firebase service account JSON file? (y/n): " has_firebase

if [ "$has_firebase" = "y" ]; then
  # Check for jq with retry loop
  while ! command -v jq &> /dev/null; do
    echo "❌ jq is required to parse Firebase JSON. Install it first:"
    echo "   macOS: brew install jq"
    echo "   Linux: sudo apt-get install jq"
    echo ""
    echo "⚠️  Without jq, Firebase push notifications cannot be configured."
    echo "⚠️  Push smoke tests will fail until jq is installed."
    echo ""
    read -p "Install jq now and retry? (y/n): " retry_jq
    if [ "$retry_jq" != "y" ]; then
      echo "⏭️  Skipping Firebase setup"
      break
    fi
    echo ""
    echo "Install jq (open a new terminal if needed), then press Enter to retry..."
    read -p "Press Enter when jq is installed: "
  done
  
  # Only proceed if jq is now available
  if command -v jq &> /dev/null; then
    read -p "Enter path to service account JSON file: " firebase_json
    
    if [ -f "$firebase_json" ]; then
      project_id=$(jq -r '.project_id' "$firebase_json")
      client_email=$(jq -r '.client_email' "$firebase_json")
      private_key=$(jq -r '.private_key' "$firebase_json")
      
      update_env_var "FIREBASE_ADMIN_PROJECT_ID" "$project_id"
      update_env_var "FIREBASE_ADMIN_CLIENT_EMAIL" "$client_email"
      update_env_var "FIREBASE_ADMIN_PRIVATE_KEY" "$private_key"
    else
      echo "❌ File not found: $firebase_json"
    fi
  fi
else
  echo "⏭️  Skipping Firebase setup"
fi

echo ""
echo "💬 STEP 5: WhatsApp Business (Optional)"
echo "---------------------------------------"
echo "Get credentials from: https://business.facebook.com"
echo ""

read -p "Enter WHATSAPP_BUSINESS_API_KEY (or press Enter to skip): " whatsapp_key
read -p "Enter WHATSAPP_PHONE_NUMBER_ID: " whatsapp_phone_id

update_env_var "WHATSAPP_BUSINESS_API_KEY" "$whatsapp_key"
update_env_var "WHATSAPP_PHONE_NUMBER_ID" "$whatsapp_phone_id"

echo ""
echo "🎯 STEP 6: Telemetry Webhook (REQUIRED)"
echo "---------------------------------------"
echo "⚠️  CRITICAL: Required for monitoring notification metrics"
echo "Without this, ops teams won't see alerts in Datadog/PagerDuty/Slack"
echo ""
echo "Examples:"
echo "  Datadog: https://api.datadoghq.com/api/v1/events?api_key=YOUR_KEY"
echo "  PagerDuty: https://events.pagerduty.com/v2/enqueue"
echo "  Slack: https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
echo ""

while true; do
  read -p "Enter NOTIFICATIONS_TELEMETRY_WEBHOOK (REQUIRED): " telemetry_webhook
  if [ -z "$telemetry_webhook" ]; then
    echo "❌ ERROR: Telemetry webhook is required for production monitoring."
    echo "   Notification metrics will not be tracked without this."
    read -p "Do you want to skip anyway? (NOT RECOMMENDED) [y/N]: " skip_telemetry
    if [ "$skip_telemetry" = "y" ]; then
      echo "⚠️  WARNING: Skipping telemetry webhook (monitoring will be dark)"
      break
    fi
  else
    update_env_var "NOTIFICATIONS_TELEMETRY_WEBHOOK" "$telemetry_webhook"
    break
  fi
done

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Validate configuration:"
echo "   pnpm tsx scripts/validate-notification-env.ts"
echo ""
echo "2. Run smoke tests:"
echo "   pnpm tsx qa/notifications/run-smoke.ts --channel email"
echo ""
echo "Backups saved to: ${ENV_FILE}.backup.*"
echo ""
