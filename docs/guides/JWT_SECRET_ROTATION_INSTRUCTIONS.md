# 🔐 JWT SECRET ROTATION - INSTRUCTIONS

## HOW TO GENERATE A NEW JWT SECRET

**Generate a new secret** using this command:

```bash
# Generate a secure 256-bit secret
openssl rand -hex 32
# Output: [YOUR_NEW_SECRET_HERE]
```

## CRITICAL ACTIONS - EXECUTE IMMEDIATELY

### 1. UPDATE PRODUCTION ENVIRONMENT

```bash
# Set the new JWT_SECRET in your production environment
export JWT_SECRET="[YOUR_NEW_SECRET_HERE]"
```

### 2. UPDATE DOCKER DEPLOYMENT

Your docker-compose.yml correctly uses environment variables. Update your .env file:

```bash
# In your deployment .env file (NOT IN REPO):
JWT_SECRET=[YOUR_NEW_SECRET_HERE]
```

### 3. RESTART ALL SERVICES

```bash
# Restart to use new secret
docker-compose down && docker-compose up -d
```

### 4. VERIFY NO HARDCODED SECRETS

✅ **GOOD**: docker-compose.yml uses ${JWT_SECRET} environment variable
✅ **GOOD**: No GitHub Actions using JWT_SECRET found
✅ **GOOD**: .env.local now has secure placeholder

## COMPROMISED SECRET (DO NOT USE)

🚨 **NEVER USE AGAIN**: `***REMOVED***`

## NEXT STEPS

1. **IMMEDIATE**: Update production with new secret above
2. **WITHIN 1 HOUR**: Clean git history to remove exposed secret
3. **WITHIN 24 HOURS**: Force logout all users (invalidate all JWT tokens)
4. **THIS WEEK**: Implement secret scanning in CI/CD

## GIT HISTORY CLEANUP COMMAND

```bash
# Install BFG Repo Cleaner
curl -O https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Create file with secrets to remove
echo "***REMOVED***" > secrets.txt

# Clean git history
java -jar bfg-1.14.0.jar --replace-text secrets.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push clean history
git push --force-with-lease origin --all
```

⚠️ **WARNING**: Force pushing will rewrite git history. Coordinate with your team!
