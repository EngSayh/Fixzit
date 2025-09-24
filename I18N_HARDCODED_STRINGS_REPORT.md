# I18n Hardcoded Strings Report

## Summary
Found multiple components importing `useI18n` but still using hardcoded strings instead of translations.

## Fixed Issues:
1. **app/admin/knowledge/page.tsx**
   - Fixed: `title="Edit"` → `title={language === 'ar' ? 'تعديل' : 'Edit'}`
   - Fixed: `title="Delete"` → `title={language === 'ar' ? 'حذف' : 'Delete'}`
   - Fixed: `title="Unpublish"/"Publish"` → Conditional with Arabic translations

2. **app/notifications/page.tsx**
   - Fixed: `title="Mark as read"` → `title={t('notifications.markAsRead', 'Mark as read')}`

## Remaining Issues to Fix:

### Alert Messages (High Priority)
- `app/fm/vendors/page.tsx`: `alert('Failed to create vendor');`
- `app/fm/tenants/page.tsx`: `alert('Failed to create tenant');`
- `app/fm/rfqs/page.tsx`: `alert('Failed to create RFQ');`
- `app/fm/properties/page.tsx`: `alert('Failed to create property');`
- `app/fm/projects/page.tsx`: `alert('Failed to create project');`
- `app/fm/invoices/page.tsx`: `alert('Failed to create invoice');`
- `app/fm/assets/page.tsx`: `alert('Failed to create asset');`
- `app/notifications/page.tsx`: `alert('Please select a specific category first to mute it');`

### Loading/Error Messages (Medium Priority)
- Loading states: "Loading...", "Loading notifications..."
- Error states: "Failed to load", "An error occurred"
- Empty states: "No data found"

### Placeholder Text (Low Priority)
- Form placeholders using hardcoded English text
- Tooltip titles without translations

### API Error Messages
- API routes returning English-only error messages
- Console.error messages (these can remain in English for debugging)

## Recommendations:
1. Create a comprehensive error messages dictionary in i18n files
2. Replace all `alert()` calls with a proper toast notification system that uses translations
3. Ensure all user-facing text uses the `t()` function
4. Keep console.error messages in English for debugging purposes

## Pattern to Follow:
```typescript
// Bad
alert('Failed to create vendor');

// Good
toast.error(t('errors.vendor.createFailed', 'Failed to create vendor'));
```
