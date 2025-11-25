# TopBar Popup Testing Guide

## How to Test the Fixes

### 1. Access the Application

1. In VS Code, open the **"Ports"** tab at the bottom
2. Find port **3000**
3. Click the **🌐 globe icon** to open in browser
4. Navigate to any page with the TopBar (e.g., `/fm/dashboard`)

### 2. Test Popup Overlap Prevention

#### Test 1: Single Popup at a Time

1. Click the **Notifications bell** icon (if logged in)
   - ✅ Notification dropdown should appear
2. While notifications are open, click the **User menu** (profile icon)
   - ✅ Notifications should close automatically
   - ✅ User menu should open
3. While user menu is open, click **Language selector** (globe icon)
   - ✅ User menu should close automatically
   - ✅ Language dropdown should open

**Expected**: Only ONE popup is visible at any time

#### Test 2: Click Outside to Close

1. Open any popup (notifications, user menu, language, currency, app switcher)
2. Click anywhere outside the popup (on the page background)
   - ✅ Popup should close

#### Test 3: Escape Key

1. Open any popup
2. Press the **Escape** key
   - ✅ Popup should close

### 3. Test Screen Fitting (Mobile Responsive)

#### Desktop Test (> 768px)

1. Open your browser at normal desktop width
2. Open each popup:
   - Notifications
   - User menu
   - Language selector
   - Currency selector
   - App switcher
3. Check:
   - ✅ All popups fit within the screen
   - ✅ Arrow pointers are visible above each dropdown
   - ✅ No horizontal scrolling

#### Mobile Test (< 640px)

1. Open browser DevTools (F12)
2. Click "Toggle device toolbar" (phone icon) or press `Ctrl+Shift+M`
3. Select a mobile device (e.g., iPhone 12, Pixel 5)
4. Open each popup:
   - Notifications
   - User menu
   - Language selector
   - Currency selector
   - App switcher
5. Check:
   - ✅ All popups fit within mobile viewport
   - ✅ No horizontal overflow or scrolling
   - ✅ Arrow pointers are hidden on mobile
   - ✅ Popups are properly aligned (right or left)

#### Tablet Test (640px - 768px)

1. In DevTools, select iPad or set custom width to 768px
2. Test all popups
3. Check:
   - ✅ Popups adapt to screen size
   - ✅ Content is readable and accessible

### 4. Test RTL (Right-to-Left) Mode

1. Open the **Language selector**
2. Select **Arabic (العربية)**
3. Page should switch to RTL mode
4. Open each popup again:
   - ✅ Popups should align to the correct side (right becomes left)
   - ✅ Arrow pointers should be on the correct side
   - ✅ Text should be right-aligned
   - ✅ All functionality should work the same

### 5. Test Specific Components

#### App Switcher

1. Click the app name next to the logo (e.g., "Facility Management")
2. ✅ Dropdown shows FM, Souq, Aqar options
3. ✅ Current app is highlighted
4. ✅ Clicking outside closes dropdown
5. Select a different app
6. ✅ Dropdown closes after selection
7. ✅ Page navigates to new app

#### Language Selector

1. Click the **globe icon** with language flag
2. ✅ Searchable language list appears
3. Type in search box (e.g., "french")
4. ✅ List filters to matching languages
5. ✅ Scrollbar appears if needed
6. ✅ Custom scrollbar styling visible
7. Select a language
8. ✅ Dropdown closes
9. ✅ Interface language changes

#### Currency Selector

1. Click the **dollar icon** with currency code
2. ✅ Searchable currency list appears
3. Type in search box (e.g., "euro")
4. ✅ List filters to matching currencies
5. Use arrow keys to navigate
6. ✅ Active item highlighted
7. Press Enter to select
8. ✅ Dropdown closes
9. ✅ Currency changes

#### Notifications (Authenticated Users Only)

1. Log in to the system
2. Click the **bell icon**
3. ✅ Notification list appears
4. ✅ Unread notifications have blue dot
5. ✅ Loading spinner shows while fetching
6. ✅ Scroll to see more notifications
7. Click "View all notifications"
8. ✅ Navigates to /notifications page
9. ✅ Dropdown closes

#### User Menu

1. Click the **user icon** with dropdown arrow
2. ✅ Menu shows Profile, Settings, Sign out
3. Hover over items
4. ✅ Background color changes on hover
5. ✅ Sign out is in red
6. Click a menu item
7. ✅ Menu closes
8. ✅ Navigates to selected page

### 6. Visual Quality Check

Open each popup and verify:

✅ **Shadows**: All popups have deep, consistent shadows
✅ **Animations**: Smooth slide-in animation from top
✅ **Arrow Pointers**: Small white triangles point to trigger button (desktop only)
✅ **Borders**: Clean, consistent border styling
✅ **Scrollbars**: Custom styled scrollbars (thin, gray)
✅ **Spacing**: Consistent padding and margins
✅ **Typography**: Clear, readable text at all sizes
✅ **Colors**: Consistent color scheme

### 7. Performance Check

1. Open DevTools (F12) → Performance tab
2. Record while opening/closing popups
3. Check:
   - ✅ No layout shifts (CLS score)
   - ✅ Smooth 60fps animations
   - ✅ No memory leaks
   - ✅ Event listeners properly cleaned up

### 8. Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 9. Accessibility Check

1. Use Tab key to navigate
   - ✅ Can focus trigger buttons
   - ✅ Can focus items within open dropdowns
2. Use screen reader (optional)
   - ✅ ARIA labels are read correctly
   - ✅ Popup states announced
3. Keyboard navigation
   - ✅ Arrow keys work in currency/language selectors
   - ✅ Enter key selects items
   - ✅ Escape closes popups

## Common Issues to Watch For

### ❌ If Multiple Popups Open Simultaneously

- **Problem**: Click handlers not working
- **Check**: Browser console for JavaScript errors
- **Solution**: Refresh page and try again

### ❌ If Popup Doesn't Close on Click Outside

- **Problem**: Event listener not attached
- **Check**: Popup has correct container class
- **Solution**: Verify class names match (`.notification-container`, `.user-menu-container`, etc.)

### ❌ If Popup Overflows Screen

- **Problem**: Responsive classes not applied
- **Check**: Inspect element to verify `max-w-[calc(100vw-2rem)]` class exists
- **Solution**: Clear cache and reload

### ❌ If Arrow Pointer Misaligned

- **Problem**: RTL or positioning issue
- **Check**: Verify language direction
- **Solution**: Toggle language and back

## Test Results Template

```
Date: _________________
Browser: _________________
Screen Size: _________________

Popup Overlap Prevention:     [ ] Pass  [ ] Fail
Click Outside Detection:       [ ] Pass  [ ] Fail
Escape Key Functionality:      [ ] Pass  [ ] Fail
Mobile Screen Fitting:         [ ] Pass  [ ] Fail
Desktop Screen Fitting:        [ ] Pass  [ ] Fail
RTL Mode Support:              [ ] Pass  [ ] Fail
Visual Consistency:            [ ] Pass  [ ] Fail
Animation Smoothness:          [ ] Pass  [ ] Fail
Accessibility:                 [ ] Pass  [ ] Fail

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
```

## Quick Verification

Run this checklist for a quick test (2 minutes):

1. [ ] Open notifications → Click user menu (notifications close automatically)
2. [ ] Click outside user menu (menu closes)
3. [ ] Press Escape with any popup open (popup closes)
4. [ ] Switch to mobile view (all popups fit screen)
5. [ ] Change to Arabic language (popups align correctly)
6. [ ] Open language selector and search "french" (filters work)
7. [ ] Check arrow pointers visible on desktop, hidden on mobile

If all 7 pass: **✅ Fixes working correctly**

---

**Server Status**: ✅ Running on port 3000  
**PID**: 154963  
**Access**: VS Code Ports tab → Open port 3000 in browser
