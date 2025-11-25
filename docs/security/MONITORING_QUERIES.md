# Security Monitoring Dashboard Queries

# Use these with your logging/monitoring service (DataDog, New Relic, etc.)

## Rate Limit Events

```
service:fixzit event:RateLimit
| group by identifier, endpoint
| count
| top 10
```

## CORS Violations

```
service:fixzit event:CORS
| group by origin, endpoint
| count
| where count > 10
```

## Authentication Failures

```
service:fixzit event:Auth status:failed
| group by identifier, reason
| count
| where count > 5
```

## Security Metrics (Last 24 Hours)

```
service:fixzit (event:RateLimit OR event:CORS OR event:Auth)
| timeseries sum(count) by event
| timeframe last_24h
```
