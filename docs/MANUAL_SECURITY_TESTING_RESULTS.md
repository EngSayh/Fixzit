# Manual Security Testing Results

**Purpose:** Record manual verification steps for rate limiting, CORS, and MongoDB URI constraints.

**Status:** Not executed locally (environment requires running on staging).

## Rate Limiting Checks (OTP/Claims/Aqar/Support)
| Endpoint | Limit | Expected Result | Actual Status |
| --- | --- | --- | --- |
| `POST /api/auth/otp/send` | 10/min | requests 11-15 return 429 | Pending (requires staging execution) |
| `POST /api/auth/otp/verify` | 10/min | requests 11-15 return 429 | Pending |
| `POST /api/souq/claims` | 20/min | requests 21-25 return 429 | Pending |
| `POST /api/souq/claims/[id]/evidence` | 30/2min | requests >30 return 429 | Pending |
| `POST /api/souq/claims/[id]/response` | 30/2min | requests >30 return 429 | Pending |
| `GET /api/aqar/pricing` | 30/min | requests >30 return 429 | Pending |
| `GET /api/aqar/recommendations` | 60/min | requests >60 return 429 | Pending |
| `POST /api/support/tickets/[id]/reply` | 60/min | requests >60 return 429 | Pending |

> **Notes:** Run these loops from a staging instance, collecting response codes and `X-RateLimit` headers. Append results once executed.

## CORS Validation Checks
| Scenario | Expected Behavior | Actual Status |
| --- | --- | --- |
| Origin `https://fixzit.sa` (prod) | Allowed with matching header | Pending
| Origin `https://evil.com` | Blocked with 403 | Pending
| Origin `http://localhost:3000` (dev mode) | Allowed when `NODE_ENV!==production` | Pending
| Origin `http://localhost:3000` (production) | Denied | Pending

> **Notes:** Confirm `Access-Control-Allow-Origin` header is emitted only for allowed origins. Capture curl outputs via `curl -i`.

## MongoDB URI Checks
| Scenario | Expected Behavior | Actual Status |
| --- | --- | --- |
| `NODE_ENV=production` without `MONGODB_URI` | Error thrown (`MONGODB_URI is required...`) | Pending
| `NODE_ENV=production` with `mongodb://localhost` | Error (`Local MongoDB URIs not allowed...`) | Pending
| `NODE_ENV=production` with `mongodb+srv://` | Successful connection | Pending
| `NODE_ENV=development` with no URI | Connects to `mongodb://127.0.0.1` fallback | Pending

> **Notes:** These checks require running the binary with the respective env combinations. Document console output when done.

## Next Actions
1. Execute the above steps on staging; append timestamps & outputs under each table row.
2. Convert these results into a summary table within `DEPLOYMENT_READINESS_REPORT.md`.
3. Re-run this document after each manual verification for traceability.
