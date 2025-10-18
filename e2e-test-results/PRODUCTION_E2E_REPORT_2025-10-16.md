# Production E2E Test Report

**Generated:** 2025-10-16T03:51:49.392Z

**Environment:** Production

**Base URL:** <https://fixzit-souq.com>

---

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Tests | 22 |
| ✅ Passed | 0 (0.0%) |
| ❌ Failed | 17 |
| ⚠️ Skipped | 5 |
| ⏱️ Duration | 1.26s |
| Status | ❌ **SOME TESTS FAILED** |

---

## 📋 Detailed Test Results

### Public Pages

| Test | Status | Details |
|------|--------|----------|
| Landing Page | ❌ failed | ❌ Error: Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/>" |
| Login Page | ❌ failed | ❌ Error: Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/login>" |

### Login Tests

| Test | Status | Details |
|------|--------|----------|
| Login Page | ❌ failed | ❌ Error: Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/login>" |
| Login as admin | ⚠️ skipped | ⚠️ No password configured |
| Login as propertyManager | ⚠️ skipped | ⚠️ No password configured |
| Login as tenant | ⚠️ skipped | ⚠️ No password configured |
| Login as vendor | ⚠️ skipped | ⚠️ No password configured |
| Login as hrManager | ⚠️ skipped | ⚠️ No password configured |

### API Health Checks

| Test | Status | Details |
|------|--------|----------|
| API Health Check | ❌ failed | ❌ Error: Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/api/health>" |
| Database Health Check | ❌ failed | ❌ Error: Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/api/health/database>" |

---

## ❌ Failed Tests Details

### Landing Page

- **URL:** <https://fixzit-souq.com/>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/>"

### Login Page

- **URL:** <https://fixzit-souq.com/login>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/login>"

### Marketplace

- **URL:** <https://fixzit-souq.com/marketplace>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/marketplace>"

### Help Center

- **URL:** <https://fixzit-souq.com/help>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/help>"

### Careers

- **URL:** <https://fixzit-souq.com/careers>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/careers>"

### Dashboard

- **URL:** <https://fixzit-souq.com/dashboard>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/dashboard>"

### Properties

- **URL:** <https://fixzit-souq.com/properties>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/properties>"

### Work Orders

- **URL:** <https://fixzit-souq.com/work-orders>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/work-orders>"

### Tenants

- **URL:** <https://fixzit-souq.com/tenants>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/tenants>"

### Vendors

- **URL:** <https://fixzit-souq.com/vendors>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/vendors>"

### RFQs

- **URL:** <https://fixzit-souq.com/rfqs>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/rfqs>"

### Finance

- **URL:** <https://fixzit-souq.com/finance>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/finance>"

### HR Employees

- **URL:** <https://fixzit-souq.com/hr/employees>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/hr/employees>"

### HR Attendance

- **URL:** <https://fixzit-souq.com/hr/attendance>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/hr/attendance>"

### Settings

- **URL:** <https://fixzit-souq.com/settings>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/settings>"

### API Health Check

- **URL:** <https://fixzit-souq.com/api/health>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/api/health>"

### Database Health Check

- **URL:** <https://fixzit-souq.com/api/health/database>
- **User Role:** anonymous
- **Status Code:** N/A
- **Error:** Command failed: curl -s -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "<https://fixzit-souq.com/api/health/database>"

---

## 🔧 Configuration

```json
{
  "baseUrl": "https://fixzit-souq.com",
  "timeout": 30000,
  "testUsers": [
    "admin",
    "propertyManager",
    "tenant",
    "vendor",
    "hrManager"
  ],
  "pagesCount": 15
}
```

---

*Report generated by Production E2E Test Suite*
