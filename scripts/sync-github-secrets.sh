#!/bin/bash
# Sync GitHub Secrets to Local .env.local
# This script helps you manually copy secrets from GitHub to your local environment

echo "🔐 GitHub Secrets → Local .env.local Sync Helper"
echo "=================================================="
echo ""

# Check for required dependencies
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Error: python3 is required but not installed."
    echo "Please install Python 3 first:"
    echo "  - macOS: brew install python3"
    echo "  - Ubuntu/Debian: sudo apt-get install python3"
    echo "  - CentOS/RHEL: sudo yum install python3"
    exit 1
fi

# Resolve script directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if GitHub CLI is available
if command -v gh >/dev/null 2>&1; then
    REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
fi

# Fallback: derive from git remote
if [ -z "$REPO_SLUG" ]; then
    GIT_REMOTE=$(cd "$PROJECT_ROOT" && git remote get-url origin 2>/dev/null)
    if [ -n "$GIT_REMOTE" ]; then
        # Extract owner/repo from URLs like:
        # - git@github.com:owner/repo.git
        # - git@github.com:owner/repo
        # - https://github.com/owner/repo.git
        # - https://github.com/owner/repo
        
        # First, strip .git suffix if present
        GIT_REMOTE_CLEAN="${GIT_REMOTE%.git}"
        
        # Extract last two path segments (owner/repo)
        # Works for both SSH (git@github.com:owner/repo) and HTTPS (https://github.com/owner/repo)
        REPO_SLUG=$(echo "$GIT_REMOTE_CLEAN" | sed -E 's|^.*[:/]([^/]+/[^/]+)$|\1|')
        
        # Validate we got owner/repo format (contains exactly one /)
        if [[ ! "$REPO_SLUG" =~ ^[^/]+/[^/]+$ ]]; then
            REPO_SLUG=""
        fi
    fi
fi

# Final fallback: prompt user
if [ -z "$REPO_SLUG" ] || [ "$REPO_SLUG" = "$GIT_REMOTE" ]; then
    echo "⚠️  Could not detect repository automatically."
    read -p "Enter your GitHub repository (format: owner/repo): " REPO_SLUG
    if [ -z "$REPO_SLUG" ]; then
        echo "❌ Repository is required. Exiting."
        exit 1
    fi
fi

echo "⚠️  GitHub Secrets are encrypted and cannot be read via CLI."
echo "You need to manually copy them from:"
echo "👉 https://github.com/${REPO_SLUG}/settings/secrets/actions"
echo ""

# Check if .env.local exists BEFORE collecting credentials
ENV_FILE="$PROJECT_ROOT/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "❌ Error: .env.local not found at $PROJECT_ROOT"
    echo "Please copy env.example to .env.local first:"
    echo "  cd $PROJECT_ROOT"
    echo "  cp env.example .env.local"
    echo ""
    exit 1
fi

echo "📋 Required Secrets Mapping:"
echo "----------------------------"
echo ""
echo "From GitHub → To .env.local:"
echo "  SENDGRID_API_KEY     → SENDGRID_API_KEY"
echo "  TWILIO_ACCOUNT_SID   → TWILIO_ACCOUNT_SID" 
echo "  TWILIO_AUTH_TOKEN   → TWILIO_AUTH_TOKEN"
echo ""

# Interactive prompt
read -p "Press Enter to open GitHub Secrets page in browser..."
if command -v gh >/dev/null 2>&1 && [ -n "$REPO_SLUG" ]; then
    gh browse --repo "$REPO_SLUG" --settings --secrets 2>/dev/null || {
        echo "Please manually visit: https://github.com/${REPO_SLUG}/settings/secrets/actions"
    }
else
    echo "Please manually visit: https://github.com/${REPO_SLUG}/settings/secrets/actions"
fi

echo ""
echo "Now, please paste the values below:"
echo "⚠️  Input will be hidden for security"
echo "⚠️  Empty inputs will be skipped (existing values preserved)"
echo ""

# Prompt for each secret with validation
while true; do
    read -sp "SENDGRID_API_KEY (SendGrid API Key, or Enter to skip): " SENDGRID_KEY
    echo ""
    if [ -n "$SENDGRID_KEY" ] || [ -z "$SENDGRID_KEY" ]; then
        # Accept either non-empty value or explicit skip (empty)
        break
    fi
done

while true; do
    read -sp "TWILIO_ACCOUNT_SID (or Enter to skip): " TWILIO_SID
    echo ""
    break
done

while true; do
    read -sp "TWILIO_AUTH_TOKEN (or Enter to skip): " TWILIO_TOKEN
    echo ""
    break
done

while true; do
    read -p "TWILIO_PHONE_NUMBER (format: +966XXXXXXXXX, or Enter to skip): " TWILIO_PHONE
    break
done

echo ""
echo "Getting MongoDB user ID..."
MONGO_USER=$(mongosh "mongodb://localhost:27017/fixzit" --quiet --eval 'JSON.stringify(db.users.findOne({}, {_id: 1, email: 1, "contact.phone": 1}))' 2>/dev/null)

# Check if we got a valid user (not null or empty)
if [ -n "$MONGO_USER" ] && [ "$MONGO_USER" != "null" ]; then
    # Extract ObjectId correctly - MongoDB returns {_id: {$oid: "..."}}
    USER_ID=$(echo "$MONGO_USER" | jq -r '._id."$oid" // ._id // empty' 2>/dev/null)
    USER_EMAIL=$(echo "$MONGO_USER" | jq -r '.email // empty' 2>/dev/null)
    USER_PHONE=$(echo "$MONGO_USER" | jq -r '.contact.phone // empty' 2>/dev/null)
    
    # Validate USER_ID is 24 hex characters AND email/phone exist
    if [[ "$USER_ID" =~ ^[0-9a-fA-F]{24}$ ]] && [ -n "$USER_EMAIL" ] && [ -n "$USER_PHONE" ]; then
        echo "✓ Found user: $USER_EMAIL (ID: $USER_ID, Phone: $USER_PHONE)"
    else
        if [[ ! "$USER_ID" =~ ^[0-9a-fA-F]{24}$ ]]; then
            echo "⚠️  Invalid user ID format, falling back to manual input"
        elif [ -z "$USER_EMAIL" ]; then
            echo "⚠️  User found but email is missing, falling back to manual input"
        elif [ -z "$USER_PHONE" ]; then
            echo "⚠️  User found but phone is missing, falling back to manual input"
        fi
        USER_ID=""
        USER_EMAIL=""
        USER_PHONE=""
    fi
fi

# Fall back to manual input if auto-detection failed
if [ -z "$USER_ID" ]; then
    while true; do
        read -p "MongoDB user _id (24-char hex, or Enter to skip): " USER_ID
        break
    done
    while true; do
        read -p "Test email (or Enter to skip): " USER_EMAIL
        break
    done
    while true; do
        read -p "Test phone (+966XXXXXXXXX, or Enter to skip): " USER_PHONE
        break
    done
fi

# Update .env.local
echo ""
echo "📝 Updating .env.local..."

# Backup
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Helper function to update or append key-value pairs (only if value non-empty)
# Uses Python for safe replacement to handle special characters (&, |, \, newlines, etc.)
update_or_append() {
    local key="$1"
    local value="$2"
    
    # Skip if value is empty (preserves existing credentials)
    if [ -z "$value" ]; then
        echo "  ⏭️  Skipped $key (empty input, existing value preserved)"
        return
    fi
    
    if grep -q "^${key}=" "$ENV_FILE"; then
        # Key exists, update it using Python for safe replacement
        # Pass values via environment variables to avoid quoting issues
        if UPDATE_KEY="$key" UPDATE_VALUE="$value" UPDATE_FILE="$ENV_FILE" python3 - <<'PYEOF'
import os

key = os.environ['UPDATE_KEY']
value = os.environ['UPDATE_VALUE']
env_file = os.environ['UPDATE_FILE']

with open(env_file, 'r') as f:
    lines = f.readlines()

# Find and replace the line with the key
for i, line in enumerate(lines):
    if line.startswith(key + '='):
        lines[i] = key + '=' + value + '\n'
        break

with open(env_file, 'w') as f:
    f.writelines(lines)
PYEOF
        then
            echo "  ✓ Updated $key"
        else
            echo "  ❌ Failed to update $key (Python error)"
            return 1
        fi
    else
        # Key doesn't exist, append it using printf (safe for values starting with -)
        printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
        echo "  ✓ Added $key"
    fi
}

# Update or add all notification credentials (only non-empty values)
update_or_append "NOTIFICATIONS_SMOKE_USER_ID" "${USER_ID}"
update_or_append "NOTIFICATIONS_SMOKE_EMAIL" "${USER_EMAIL}"
update_or_append "NOTIFICATIONS_SMOKE_PHONE" "${USER_PHONE}"
update_or_append "SENDGRID_API_KEY" "${SENDGRID_KEY}"
update_or_append "TWILIO_ACCOUNT_SID" "${TWILIO_SID}"
update_or_append "TWILIO_AUTH_TOKEN" "${TWILIO_TOKEN}"
update_or_append "TWILIO_PHONE_NUMBER" "${TWILIO_PHONE}"

echo ""
echo "✅ Done! Updated .env.local with real credentials"
echo ""
echo "🧪 Next steps:"
echo "  1. Verify: pnpm tsx scripts/validate-notification-env.ts"
echo "  2. Test email: pnpm tsx qa/notifications/run-smoke.ts --channel email"
echo ""
