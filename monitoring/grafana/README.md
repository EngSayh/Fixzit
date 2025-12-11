# Grafana Monitoring Configuration

This directory contains versioned Grafana dashboards and alert rules for Fixzit production monitoring.

## Directory Structure

```
monitoring/grafana/
├── README.md                 # This file
├── dashboards/               # JSON dashboard definitions
│   ├── fixzit-overview.json  # Application health overview
│   ├── fixzit-database.json  # MongoDB metrics
│   └── fixzit-payments.json  # TAP/PayTabs payment flows
└── alerts/
    └── fixzit-alerts.yaml    # Alert rules
```

## Dashboards

### Overview Dashboard (`fixzit-overview.json`)
- Application health status
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Active users and sessions
- Memory and CPU utilization

### Database Dashboard (`fixzit-database.json`)
- MongoDB connection pool status
- Query latency by collection
- Index usage statistics
- Slow query tracking
- Disk I/O metrics

### Payments Dashboard (`fixzit-payments.json`)
- TAP payment success/failure rates
- Payment processing latency
- Webhook delivery status
- Revenue tracking
- Refund metrics

## Alerts

Alert rules are defined in `alerts/fixzit-alerts.yaml` and cover:
- High error rate (>5% for 5 minutes)
- Slow response time (p99 > 2s for 10 minutes)
- Database connection failures
- Payment processing failures
- Memory threshold warnings
- Disk space alerts

## Importing to Grafana

1. **Dashboards**: Import JSON files via Grafana UI → Dashboards → Import
2. **Alerts**: Use Grafana provisioning or import via HTTP API

## Environment Variables Required

```env
GRAFANA_URL=https://grafana.fixzit.co
GRAFANA_API_KEY=your-api-key
PROMETHEUS_URL=https://prometheus.fixzit.co
```

## Validation

Run validation before deployment:
```bash
# Validate JSON syntax
node scripts/validate-grafana.mjs

# Dry-run alert rule deployment
grizzly preview monitoring/grafana/alerts/
```

## Ownership

- **Dashboard Owner**: Platform Team
- **Alert Owner**: SRE Team
- **Review Cadence**: Monthly during SRE review

---

**Last Updated**: 2025-12-11
