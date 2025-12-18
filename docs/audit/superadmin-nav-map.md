# Superadmin Navigation Map

Generated: 2025-12-18 14:05 (Asia/Riyadh)

## Route Status Summary

| Status | Count |
|--------|-------|
| ✅ Implemented | 5 |
| 🚧 Coming Soon | 17 |

## Detailed Route Map

| Menu Label | Route Path | Page File | Status |
|------------|------------|-----------|--------|
| Issues | /superadmin/issues | app/superadmin/issues/page.tsx | ✅ Implemented |
| Tenants | /superadmin/tenants | app/superadmin/tenants/page.tsx | 🚧 Coming Soon |
| Users | /superadmin/users | app/superadmin/users/page.tsx | 🚧 Coming Soon |
| Roles | /superadmin/roles | app/superadmin/roles/page.tsx | 🚧 Coming Soon |
| Audit | /superadmin/audit | app/superadmin/audit/page.tsx | 🚧 Coming Soon |
| Features | /superadmin/features | app/superadmin/features/page.tsx | 🚧 Coming Soon |
| Integrations | /superadmin/integrations | app/superadmin/integrations/page.tsx | 🚧 Coming Soon |
| Jobs | /superadmin/jobs | app/superadmin/jobs/page.tsx | 🚧 Coming Soon |
| System | /superadmin/system | app/superadmin/system/page.tsx | ✅ Implemented |
| Billing | /superadmin/billing | app/superadmin/billing/page.tsx | 🚧 Coming Soon |
| Translations | /superadmin/translations | app/superadmin/translations/page.tsx | 🚧 Coming Soon |
| Database | /superadmin/database | app/superadmin/database/page.tsx | 🚧 Coming Soon |
| Security | /superadmin/security | app/superadmin/security/page.tsx | 🚧 Coming Soon |
| Analytics | /superadmin/analytics | app/superadmin/analytics/page.tsx | 🚧 Coming Soon |
| Notifications | /superadmin/notifications | app/superadmin/notifications/page.tsx | 🚧 Coming Soon |
| Impersonate | /superadmin/impersonate | app/superadmin/impersonate/page.tsx | ✅ Implemented |
| Search | /superadmin/search | app/superadmin/search/page.tsx | ✅ Implemented |
| Login | /superadmin/login | app/superadmin/login/page.tsx | ✅ Implemented |

## Additional Routes (Not in sidebar)

| Route Path | Page File | Status |
|------------|-----------|--------|
| /superadmin/catalog | app/superadmin/catalog/page.tsx | 🚧 Coming Soon |
| /superadmin/vendors | app/superadmin/vendors/page.tsx | 🚧 Coming Soon |
| /superadmin/support | app/superadmin/support/page.tsx | 🚧 Coming Soon |
| /superadmin/import-export | app/superadmin/import-export/page.tsx | 🚧 Coming Soon |
| /superadmin/reports | app/superadmin/reports/page.tsx | 🚧 Coming Soon |

## UX Fix Applied

- Added `comingSoon` property to NavItem interface
- Sidebar now shows "Soon" badge for unimplemented routes
- Muted styling for coming soon items (text-slate-500)
- Hover tooltip shows "Coming Soon" text

## Next Steps (Priority Order)

1. **Tenants/Orgs** - Wire to existing org APIs
2. **Users** - Wire to existing user APIs
3. **Roles** - Wire to RBAC model
4. **Audit** - Wire to audit log model
5. **Features** - Wire to feature flags
