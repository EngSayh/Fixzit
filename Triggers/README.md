# MongoDB Atlas App Services Configuration

**App Name:** Triggers  
**App ID:** `triggers-qvevnvh`  
**Client App ID:** `68e1374772f6cc59c9e53423`  
**Group ID:** `68c4655a947b201f060f807d`  
**Region:** AWS US-East-1  
**Deployment Model:** LOCAL

## Current Status

- **Functions:** 0 configured
- **Triggers:** 0 configured
- **Data Sources:** 1 (Fixzit cluster - MongoDB Atlas)
- **Environments:** development, testing, qa, production, no-environment

## Export/Import Commands

### Export Configuration (Pull)
```bash
# Authenticate (rotate keys after use!)
appservices login --api-key <PUBLIC_KEY> --private-api-key <PRIVATE_KEY>

# Pull latest configuration
appservices pull --remote triggers-qvevnvh
```

### Import Configuration (Push)
```bash
# Push local changes to Atlas
appservices push --remote triggers-qvevnvh
```

### Logout
```bash
appservices logout
```

## Security Notes

⚠️ **CRITICAL**: This directory is gitignored to prevent exposure of:
- App IDs and Group IDs
- Configuration metadata
- Potential secrets in environment values

**Always rotate API keys after export/import operations.**

## Data Source Configuration

```json
{
  "name": "Fixzit",
  "type": "mongodb-atlas",
  "config": {
    "clusterName": "Fixzit",
    "readPreference": "primary",
    "wireProtocolEnabled": false
  }
}
```

## Future Development

This app can be used for:
- MongoDB triggers (database change events)
- Scheduled functions (cron jobs)
- Webhook endpoints
- GraphQL API (deprecated as of Sept 2025)
- Data API access

## Deprecation Notice

⚠️ Device Sync, Realm SDKs, HTTPS Endpoints, Data API, GraphQL and related features reached their end of life on **September 30th 2025**.

Focus on:
- Database triggers only
- Scheduled functions (if needed)
- Migration to native MongoDB/Next.js APIs

## References

- [Atlas App Services CLI](https://www.mongodb.com/docs/atlas/app-services/cli/)
- [App Services Documentation](https://www.mongodb.com/docs/atlas/app-services/)
- Export Date: 2025-12-16 17:00 (Asia/Riyadh)
