# Fixzit Performance Testing Suite

Performance testing scripts using [k6](https://k6.io/) for API load testing.

Created by [AGENT-0039]

## Prerequisites

1. **Install k6:**
   ```bash
   # macOS
   brew install k6

   # Windows (Chocolatey)
   choco install k6

   # Windows (winget)
   winget install k6

   # Docker
   docker pull grafana/k6
   ```

2. **Set environment variables:**
   ```bash
   export K6_BASE_URL="http://localhost:3000"  # Target URL
   export K6_API_TOKEN="your-bearer-token"      # For authenticated endpoints
   export K6_ORG_ID="your-org-id"               # Multi-tenant organization ID
   ```

## Test Types

### Smoke Test (Quick Validation)
Validates that critical endpoints are responding. Fast feedback loop.

```bash
k6 run tests/performance/api-smoke.js
```

- Duration: ~2 minutes
- Virtual Users: 5
- Use case: Pre-deployment validation

### Load Test (Capacity Planning)
Sustained load to validate production capacity.

```bash
k6 run tests/performance/api-load.js
```

- Duration: ~16 minutes
- Virtual Users: 50-100 (ramp)
- Use case: Capacity planning, bottleneck identification

### Stress Test (Breaking Point)
Push system beyond normal capacity to find limits.

```bash
k6 run tests/performance/api-stress.js
```

- Duration: ~26 minutes
- Virtual Users: 100-300 (stress ramp)
- Use case: Find breaking points, recovery testing
- ⚠️ **Only run against staging/test environments!**

## Configuration

Edit `tests/performance/config.js` to customize:

- **Thresholds:** SLA targets (p95, p99, error rates)
- **Stages:** Load patterns for each test type
- **Endpoints:** API endpoints to test
- **Test Data:** Random data generators

## Results

Test results are saved to `tests/performance/results/`:

- `smoke-summary.json` - Smoke test results
- `load-summary.json` - Load test results
- `stress-summary.json` - Stress test results

## CI/CD Integration

Add to your CI pipeline:

```yaml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install k6
      run: |
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    - name: Run smoke test
      env:
        K6_BASE_URL: ${{ secrets.STAGING_URL }}
        K6_API_TOKEN: ${{ secrets.K6_API_TOKEN }}
      run: k6 run tests/performance/api-smoke.js
```

## Thresholds (SLA Targets)

| Metric | Target | Critical |
|--------|--------|----------|
| P95 Response Time | < 500ms | < 1000ms |
| P99 Response Time | < 1000ms | < 2000ms |
| Error Rate | < 1% | < 5% |
| Requests/sec | > 100 | > 50 |

## Troubleshooting

### "Connection refused"
- Ensure the target server is running
- Check `K6_BASE_URL` is correct

### "401 Unauthorized"
- Set `K6_API_TOKEN` with a valid token
- Token must have read permissions for tested endpoints

### High error rate
- Check server logs for errors
- Verify database connections
- Check rate limiting settings
