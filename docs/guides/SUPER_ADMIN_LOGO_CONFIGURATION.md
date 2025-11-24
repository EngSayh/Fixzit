# 🎨 Super Admin: How to Configure Organization Logo

## Overview

The Fixzit system now supports **dynamic organization branding** where the Super Admin can configure the company logo that appears in the TopBar for all users.

---

## 📊 Current Status

### What's Implemented ✅

- **API Endpoint**: `/api/organization/settings` - Fetches organization branding
- **TopBar Integration**: Displays logo from database automatically
- **Fallback Design**: Shows gradient placeholder with org initials if no logo
- **Database Schema**: Organization model has `logo` field ready

### What's Needed 🔧

- Super Admin UI for logo upload (Admin Settings page)
- Image upload to cloud storage (S3, Cloudinary, etc.)
- Organization management API endpoints

---

## 🚀 How Super Admin Will Upload Logo

### Option 1: Via Admin UI (Future Enhancement)

1. **Login as Super Admin**
2. **Navigate to**: `/admin/settings` or `/admin/organization`
3. **Upload Logo**:
   - Click "Upload Logo" button
   - Select image file (PNG, JPG, SVG recommended)
   - Recommended size: 128x128px or 256x256px
   - System uploads to cloud storage
   - Logo URL automatically saved to database
4. **Preview**: See logo in TopBar immediately

### Option 2: Via Database (Current Method)

Until the admin UI is built, Super Admin can update the logo directly in MongoDB:

```javascript
// Connect to MongoDB
use fixzit_dev

// Find your organization
db.organizations.findOne({ name: "Your Company Name" })

// Update with logo URL
db.organizations.updateOne(
  { name: "Your Company Name" },
  {
    $set: {
      logo: "https://your-storage.com/path/to/logo.png",
      name: "Your Organization Name",  // Update if needed
      branding: {
        primaryColor: "#0061A8",
        secondaryColor: "#00A859"
      }
    }
  }
)

// Verify the update
db.organizations.findOne({ name: "Your Company Name" })
```

### Option 3: Via API (For Developers)

```bash
# Update organization via API
curl -X PATCH http://localhost:3000/api/admin/organization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "logo": "https://your-storage.com/path/to/logo.png",
    "name": "Your Organization Name",
    "branding": {
      "primaryColor": "#0061A8",
      "secondaryColor": "#00A859"
    }
  }'
```

---

## 📁 Organization Schema

The Organization model in MongoDB has these fields for branding:

```typescript
{
  name: string,              // Organization name (displays in TopBar)
  logo: string | null,       // URL to logo image
  branding: {
    primaryColor: string,    // Hex color code (e.g., "#0061A8")
    secondaryColor: string   // Hex color code (e.g., "#00A859")
  }
}
```

---

## 🎨 Logo Requirements

### Technical Specs

- **Format**: PNG, JPG, or SVG
- **Size**: 32x32px minimum (will be scaled to 32x32 in TopBar)
- **Recommended**: 128x128px or 256x256px for high-DPI displays
- **Background**: Transparent PNG recommended
- **File Size**: Under 500KB

### Design Guidelines

- **Square aspect ratio** (1:1) works best
- **Simple design** - readable at small sizes
- **High contrast** - visible on blue/gradient background
- **Brand colors** - consistent with your organization

---

## 🔄 How It Works

1. **User visits site** → TopBar component loads
2. **TopBar fetches** → `/api/organization/settings`
3. **API queries** → MongoDB Organization collection
4. **Returns settings**:
   ```json
   {
     "name": "Your Organization Name",
     "logo": "https://storage.com/logo.png",
     "primaryColor": "#0061A8",
     "secondaryColor": "#00A859"
   }
   ```
5. **TopBar displays**:
   - If `logo` exists → Shows image
   - If `logo` is null → Shows gradient placeholder with initials

---

## 🖼️ Upload Logo to Cloud Storage

### Recommended Services

#### Option 1: AWS S3

```bash
# Upload to S3
aws s3 cp logo.png s3://your-bucket/logos/company-logo.png --acl public-read

# Get URL
https://your-bucket.s3.amazonaws.com/logos/company-logo.png
```

#### Option 2: Cloudinary

```javascript
// Upload via Cloudinary SDK
const result = await cloudinary.uploader.upload("logo.png", {
  folder: "fixzit/logos",
  public_id: "company-logo",
});

// Get URL
console.log(result.secure_url);
// https://res.cloudinary.com/your-cloud/image/upload/v1234/fixzit/logos/company-logo.png
```

#### Option 3: Vercel Blob Storage

```javascript
import { put } from "@vercel/blob";

const blob = await put("company-logo.png", file, {
  access: "public",
});

console.log(blob.url);
```

---

## 🧪 Testing the Logo

### Test Current Setup

1. Visit: http://localhost:3000
2. Check TopBar - should see gradient placeholder with "FI" (Fixzit initials)
3. Check API: http://localhost:3000/api/organization/settings
   - Should return default settings

### Test After Upload

1. Update Organization in MongoDB with logo URL
2. Hard refresh browser (Ctrl+Shift+R)
3. Logo should appear in TopBar
4. Verify on mobile - logo should still be visible

---

## 🛠️ Next Steps for Implementation

### Phase 1: Logo Upload UI ✅ IN PROGRESS

- [ ] Create `/admin/organization` page
- [ ] Add logo upload component
- [ ] Integrate with cloud storage (S3/Cloudinary)
- [ ] Create `PATCH /api/admin/organization` endpoint
- [ ] Add image validation (size, format, dimensions)

### Phase 2: Advanced Branding

- [ ] Primary/Secondary color pickers
- [ ] Real-time preview
- [ ] Multiple logo variants (dark mode, mobile)
- [ ] Favicon generation
- [ ] Email template branding

### Phase 3: Multi-tenancy

- [ ] Per-organization logo support
- [ ] Tenant-specific branding
- [ ] White-label capabilities

---

## 📝 Code References

### Files Created/Modified

- `app/api/organization/settings/route.ts` - API endpoint
- `components/TopBar.tsx` - Logo display logic
- `server/models/Organization.ts` - Database schema

### Key Functions

```typescript
// Fetch organization settings
const fetchOrgSettings = async () => {
  const response = await fetch('/api/organization/settings');
  const data = await response.json();
  setOrgSettings(data);
};

// Render logo
{orgSettings.logo ? (
  <Image src={orgSettings.logo} alt={orgSettings.name} />
) : (
  <div className="gradient-placeholder">
    {orgSettings.name.substring(0, 2).toUpperCase()}
  </div>
)}
```

---

## ❓ FAQ

**Q: Can I use a local file path for the logo?**  
A: No, the logo must be a publicly accessible URL (HTTP/HTTPS). Upload to cloud storage first.

**Q: What happens if the logo URL is broken?**  
A: The system shows the gradient placeholder with organization initials as fallback.

**Q: Can different organizations have different logos?**  
A: Yes! Each organization document has its own `logo` field. The API can be extended to fetch based on user's organization.

**Q: How do I update the organization name?**  
A: Update the `name` field in the Organization document. It will reflect in the TopBar automatically.

**Q: Does the logo support dark mode?**  
A: Currently displays on blue gradient background. Future enhancement can support dark mode variants.

---

## 🎯 Quick Start Checklist

- [ ] Upload logo to cloud storage (S3, Cloudinary, etc.)
- [ ] Copy the public URL
- [ ] Update Organization document in MongoDB with logo URL
- [ ] Refresh browser to see logo in TopBar
- [ ] Test on mobile and desktop
- [ ] (Optional) Update organization name and colors

---

**Last Updated**: October 24, 2025  
**Status**: ✅ Backend Complete | ⏳ Admin UI Pending  
**Commit**: 00041daaa
