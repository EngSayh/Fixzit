#!/bin/bash

# 🔐 AWS Secrets Manager Setup Script for JWT Secret
# This script will store your JWT secret securely in AWS Secrets Manager

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# JWT Secret (must be provided as environment variable or argument)
# NEVER hardcode secrets in scripts - generate with: openssl rand -hex 32
JWT_SECRET="${JWT_SECRET:-}"

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET environment variable is required${NC}"
    echo -e "${YELLOW}Generate one with: openssl rand -hex 32${NC}"
    echo -e "${YELLOW}Then run: JWT_SECRET=<your_secret> $0${NC}"
    exit 1
fi

echo -e "${BLUE}🔐 AWS Secrets Manager JWT Secret Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if AWS CLI is configured
echo -e "${YELLOW}Checking AWS CLI configuration...${NC}"
if ! aws sts get-caller-identity &>/dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Please run:${NC}"
    echo -e "${BLUE}aws configure${NC}"
    echo ""
    echo "You'll need:"
    echo "- AWS Access Key ID: (from your .env.local AWS_ACCESS_KEY_ID)"
    echo "- AWS Secret Access Key: (from your .env.local AWS_SECRET_ACCESS_KEY)"
    echo "- Default region name: me-south-1"
    echo "- Default output format: json"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"
echo ""

# Get current AWS identity
CURRENT_USER=$(aws sts get-caller-identity --query "Arn" --output text)
echo -e "${BLUE}Current AWS identity: ${CURRENT_USER}${NC}"
echo ""

# Create the secret in AWS Secrets Manager
echo -e "${YELLOW}Creating JWT secret in AWS Secrets Manager...${NC}"

SECRET_NAME="fixzit/production/jwt-secret"
SECRET_DESCRIPTION="Production JWT Secret for Fixzit Authentication System"

# Try to create the secret
if aws secretsmanager create-secret \
    --name "$SECRET_NAME" \
    --description "$SECRET_DESCRIPTION" \
    --secret-string "$JWT_SECRET" \
    --region "me-south-1" &>/dev/null; then
    
    echo -e "${GREEN}✅ Successfully created secret: ${SECRET_NAME}${NC}"
    echo ""
    
    # Get the secret ARN
    SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "me-south-1" --query "ARN" --output text)
    echo -e "${BLUE}Secret ARN: ${SECRET_ARN}${NC}"
    echo ""
    
else
    # Secret might already exist, try to update it
    echo -e "${YELLOW}Secret might already exist, attempting to update...${NC}"
    
    if aws secretsmanager update-secret \
        --secret-id "$SECRET_NAME" \
        --secret-string "$JWT_SECRET" \
        --region "me-south-1" &>/dev/null; then
        
        echo -e "${GREEN}✅ Successfully updated existing secret: ${SECRET_NAME}${NC}"
        echo ""
    else
        echo -e "${RED}❌ Failed to create or update secret${NC}"
        echo "Please check your AWS permissions and try again."
        exit 1
    fi
fi

# Test retrieving the secret
echo -e "${YELLOW}Testing secret retrieval...${NC}"
RETRIEVED_SECRET=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "me-south-1" --query "SecretString" --output text 2>/dev/null)

if [ "$RETRIEVED_SECRET" == "$JWT_SECRET" ]; then
    echo -e "${GREEN}✅ Secret retrieval test successful${NC}"
else
    echo -e "${RED}❌ Secret retrieval test failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 SUCCESS! JWT Secret stored in AWS Secrets Manager${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}1.${NC} Update your application to retrieve the secret from AWS"
echo -e "${BLUE}2.${NC} Set environment variable: AWS_REGION=me-south-1"
echo -e "${BLUE}3.${NC} Test your application with the remote secret"
echo -e "${BLUE}4.${NC} Clean git history to remove the exposed secret"
echo ""

echo -e "${YELLOW}Example code to retrieve the secret in your app:${NC}"
echo ""
cat << 'EOF'
// lib/aws-secrets.js
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager({
  region: process.env.AWS_REGION || 'me-south-1'
});

async function getJWTSecret() {
  try {
    const result = await secretsManager.getSecretValue({ 
      SecretId: 'fixzit/production/jwt-secret' 
    }).promise();
    return result.SecretString;
  } catch (error) {
    console.error('Error retrieving JWT secret:', error);
    throw error;
  }
}

module.exports = { getJWTSecret };
EOF

echo ""
echo -e "${RED}🚨 IMPORTANT SECURITY REMINDER:${NC}"
echo -e "${RED}The compromised secret is still in your git history!${NC}"
echo -e "${RED}You MUST clean the git history before pushing to production.${NC}"
echo ""
echo -e "${YELLOW}Run this after testing:${NC}"
echo -e "${BLUE}git filter-repo --replace-text <(echo '***REMOVED***==>***REMOVED***')${NC}"