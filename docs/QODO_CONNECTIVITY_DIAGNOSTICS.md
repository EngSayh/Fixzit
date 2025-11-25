# Qodo IDE Plugin - Connectivity Diagnostics

**Last Updated**: 2025-11-13  
**Status**: ✅ Platform Healthy  
**Purpose**: Quick troubleshooting guide for Qodo IDE Plugin connectivity issues

---

## 1. Quick Server Connectivity Test

### macOS / Linux

Run the following curl command to verify that your machine can reach the Qodo IDE Plugin server:

```bash
curl -v https://qodo-platform.qodo.ai/health
```

### Windows (PowerShell)

If curl is not available, use PowerShell:

```powershell
Invoke-WebRequest -Uri https://qodo-platform.qodo.ai/health -Method GET
```

---

## 2. How to Interpret the Results

### ✅ Success Indicators

Look for these indicators in the response:

- **HTTP Status**: `HTTP/2 200` or `HTTP/1.1 200 OK`
- **Response Body**: JSON with `"status":"healthy"`
- **Connection**: Completes without timing out
- **SSL**: Certificate verify OK

#### Example Successful Output (curl):

```
* Connected to qodo-platform.qodo.ai (34.36.244.145) port 443
* SSL connection using TLSv1.3 / AEAD-CHACHA20-POLY1305-SHA256
> GET /health HTTP/2
< HTTP/2 200
< content-type: application/json

{"status":"healthy","modules":{"self_service":{"is_healthy":true},...}}
```

#### Example Successful Output (PowerShell):

```
StatusCode        : 200
StatusDescription : OK
Content           : {"status":"healthy"}
```

---

## 3. Common Issues and What They Mean

### ❌ Issue 1: Cannot Reach Server

**Example Output**:

```
Failed to connect to qodo-platform.qodo.ai
curl: (6) Could not resolve host: qodo-platform.qodo.ai
curl: (7) Failed to connect to qodo-platform.qodo.ai port 443
```

**Likely Causes**:

- Local network or firewall blocking access
- DNS resolution issues
- VPN/Proxy configuration blocking traffic
- Port 443 (HTTPS) is blocked

**Resolution Steps**:

1. Check your internet connection
2. Verify firewall allows traffic to `qodo-platform.qodo.ai` over port 443
3. Check VPN/proxy settings
4. Try from a different network
5. Contact your IT department if on corporate network

---

### ⚠️ Issue 2: Server Responding with Errors

**Example Output**:

```
< HTTP/2 500
Internal Server Error
```

or

```
< HTTP/2 503
Service Unavailable
```

**Likely Causes**:

- Qodo server experiencing temporary issues
- Maintenance in progress
- Backend service degradation

**Resolution Steps**:

1. Check Qodo status page: https://status.qodo.ai/
2. Wait 5-10 minutes and retry
3. Check for service announcements
4. If persistent, contact Qodo support

---

### 🔒 Issue 3: SSL/TLS Certificate Issues

**Example Output**:

```
SSL certificate problem: unable to get local issuer certificate
```

**Likely Causes**:

- Outdated CA certificates
- Corporate SSL inspection/MITM proxy
- System date/time incorrect

**Resolution Steps**:

1. Update system CA certificates
2. Check system date/time is correct
3. If behind corporate proxy, configure SSL certificate validation
4. Use `-k` flag (insecure, not recommended for production)

---

## 4. Detailed Test Results

### Last Test: 2025-11-13 10:22 UTC

```
✅ Connection: SUCCESS
✅ Server: 34.36.244.145
✅ SSL/TLS: TLSv1.3 (AEAD-CHACHA20-POLY1305-SHA256)
✅ Certificate: Valid (expires 2026-01-16)
✅ HTTP Status: 200
✅ Response: {"status":"healthy"}

Modules Status:
✅ self_service: healthy
✅ auth: healthy
✅ insights: healthy
✅ rules: healthy
✅ billing: healthy
```

---

## 5. Additional Diagnostics

### Test DNS Resolution

```bash
# macOS/Linux
nslookup qodo-platform.qodo.ai
dig qodo-platform.qodo.ai

# Windows
nslookup qodo-platform.qodo.ai
```

### Test Network Connectivity

```bash
# Ping test (might be blocked)
ping qodo-platform.qodo.ai

# Traceroute
traceroute qodo-platform.qodo.ai  # macOS/Linux
tracert qodo-platform.qodo.ai     # Windows
```

### Test Port 443

```bash
# macOS/Linux
nc -zv qodo-platform.qodo.ai 443
telnet qodo-platform.qodo.ai 443

# Windows PowerShell
Test-NetConnection -ComputerName qodo-platform.qodo.ai -Port 443
```

---

## 6. VS Code Extension Settings

### Enable Qodo Extension Logging

Add to `.vscode/settings.json`:

```json
{
  "qodo.logLevel": "debug",
  "qodo.trace.server": "verbose"
}
```

### Check Extension Status

1. Open VS Code
2. View → Extensions
3. Search for "Qodo"
4. Verify extension is enabled and up to date

---

## 7. Getting Help

### If Issues Persist

1. **Collect Diagnostics**:

   ```bash
   # Run full test with output
   curl -v https://qodo-platform.qodo.ai/health > qodo-test.log 2>&1
   ```

2. **Check VS Code Logs**:
   - View → Output
   - Select "Qodo" from dropdown

3. **Contact Support**:
   - Status Page: https://status.qodo.ai/
   - GitHub Issues: https://github.com/Codium-ai/qodo/issues
   - Include: OS, VS Code version, test results

---

## 8. Firewall Whitelist

Add these to your firewall/proxy allowlist:

- **Domain**: `qodo-platform.qodo.ai`
- **IP**: `34.36.244.145` (subject to change)
- **Port**: `443` (HTTPS)
- **Protocol**: TCP

---

**Quick Test Command**:

```bash
curl -s https://qodo-platform.qodo.ai/health | grep -q "healthy" && echo "✅ Connected" || echo "❌ Failed"
```
