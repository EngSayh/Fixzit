# 🔐 COMPLETE REMOTE KEY SETUP GUIDE

## STEP 1: CONFIGURE AWS CLI

You have AWS configuration in your `.env.local` but with placeholder values. You need real AWS credentials:

```bash
aws configure
```

Enter your real AWS credentials:

- **AWS Access Key ID**: Replace `your_access_key` with your actual key
- **AWS Secret Access Key**: Replace `your_secret_key` with your actual key
- **Default region name**: `me-south-1` (already correct)
- **Default output format**: `json`

## STEP 2: RUN THE AUTOMATED SETUP

Once AWS CLI is configured, run the setup script:

```bash
./setup-aws-secrets.sh
```

This script will:

- ✅ Verify AWS CLI configuration
- 🔑 Create the JWT secret in AWS Secrets Manager
- 🧪 Test secret retrieval
- 📋 Provide integration code examples

## STEP 3: UPDATE YOUR APPLICATION

### Add AWS SDK Dependency

```bash
npm install aws-sdk
# or
yarn add aws-sdk
```

### Create Secret Management Module

```javascript
// lib/secrets.js
const AWS = require("aws-sdk");

const secretsManager = new AWS.SecretsManager({
  region: process.env.AWS_REGION || "me-south-1",
});

let cachedSecret = null;

async function getJWTSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }

  try {
    const result = await secretsManager
      .getSecretValue({
        SecretId: "fixzit/production/jwt-secret",
      })
      .promise();

    cachedSecret = result.SecretString;
    return cachedSecret;
  } catch (error) {
    console.error("Error retrieving JWT secret:", error);
    // Fallback to environment variable in development
    return process.env.JWT_SECRET;
  }
}

module.exports = { getJWTSecret };
```

### Update Your JWT Configuration

```javascript
// In your main app file
const { getJWTSecret } = require("./lib/secrets");

// Initialize JWT secret at startup
let jwtSecret;
async function initializeApp() {
  try {
    jwtSecret = await getJWTSecret();
    console.log("JWT secret loaded from AWS Secrets Manager");
  } catch (error) {
    console.error("Failed to load JWT secret:", error);
    process.exit(1);
  }

  // Continue with app initialization
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

initializeApp();
```

## STEP 4: ENVIRONMENT VARIABLES

Update your production environment (NOT in .env.local):

```bash
# Production environment variables
AWS_REGION=me-south-1
# Remove JWT_SECRET - it's now in Secrets Manager!
```

## STEP 5: DOCKER DEPLOYMENT UPDATE

### Update docker-compose.yml

```yaml
services:
  web:
    environment:
      - AWS_REGION=me-south-1
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      # JWT_SECRET is now retrieved from Secrets Manager
```

### IAM Policy for Secrets Access

Your AWS user/role needs this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:me-south-1:*:secret:fixzit/production/jwt-secret-*"
    }
  ]
}
```

## STEP 6: VERIFICATION CHECKLIST

- [ ] AWS CLI configured with real credentials
- [ ] `./setup-aws-secrets.sh` runs successfully
- [ ] Secret visible in AWS Console: Secrets Manager → `fixzit/production/jwt-secret`
- [ ] Application code updated to use `getJWTSecret()`
- [ ] AWS SDK installed (`npm install aws-sdk`)
- [ ] Environment variables updated (remove hardcoded JWT_SECRET)
- [ ] IAM permissions configured for secret access
- [ ] Application starts and can retrieve secret
- [ ] Authentication works with remote secret

## SECURITY BENEFITS

✅ **No Secrets in Code**: JWT secret never appears in source code
✅ **Centralized Management**: Single source of truth in AWS
✅ **Access Control**: Fine-grained IAM permissions
✅ **Audit Trail**: AWS CloudTrail logs all secret access
✅ **Automatic Encryption**: Secrets encrypted at rest and in transit
✅ **Rotation Ready**: Can implement automatic secret rotation

## NEXT ACTIONS

1. **Get Real AWS Credentials**: Replace placeholders in `.env.local`
2. **Run Setup Script**: `./setup-aws-secrets.sh`
3. **Update Application Code**: Implement secret retrieval
4. **Test Integration**: Verify app works with remote secret
5. **Clean Git History**: Remove exposed secret from commits
6. **Deploy to Production**: With remote key management

---

**🚨 CRITICAL**: The old JWT secret `***REMOVED***` is still in your git history and must be removed before production deployment!
